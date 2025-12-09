/**
 * API Routes für Visualizer Backend
 *
 * Endpoints:
 * - POST /api/upload       - Video hochladen
 * - POST /api/convert      - Video konvertieren (WebM → MP4)
 * - POST /api/process      - Video verarbeiten mit Optionen
 * - GET  /api/status/:id   - Job-Status abfragen
 * - GET  /api/download/:id - Verarbeitetes Video herunterladen
 * - GET  /api/info         - Server-Info (FFmpeg Version etc.)
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import ffmpegService from '../services/ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const FILES_DIR = path.join(__dirname, '..', 'files');

// Job-Tracking (in Produktion: Redis oder DB verwenden)
const jobs = new Map();

// Multer Konfiguration für Video-Uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `upload_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(webm|mp4|mov|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Ungültiger Dateityp: ${file.mimetype}`), false);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function generateJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function createJob(inputFile, options = {}) {
  const jobId = generateJobId();
  const job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    inputFile,
    outputFile: null,
    options,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: null
  };
  jobs.set(jobId, job);
  return job;
}

function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    jobs.set(jobId, job);
  }
  return job;
}

// Cleanup alter Dateien (älter als 1 Stunde)
async function cleanupOldFiles() {
  const maxAge = 60 * 60 * 1000; // 1 Stunde
  const now = Date.now();

  for (const dir of [UPLOADS_DIR, FILES_DIR]) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log(`🧹 Gelöscht: ${file}`);
        }
      }
    } catch (error) {
      // Verzeichnis existiert möglicherweise nicht
    }
  }
}

// Periodische Cleanup (alle 30 Minuten)
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/info
 * Server-Informationen und FFmpeg-Status
 */
router.get('/info', async (req, res) => {
  try {
    const ffmpegStatus = await ffmpegService.checkFFmpeg();

    res.json({
      server: 'Visualizer Backend',
      version: '1.0.0',
      ffmpeg: ffmpegStatus,
      presets: Object.keys(ffmpegService.ENCODING_PRESETS),
      limits: {
        maxFileSize: '500 MB',
        supportedFormats: ['webm', 'mp4', 'mov', 'mkv']
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/upload
 * Video hochladen für spätere Verarbeitung
 */
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' });
    }

    const videoInfo = await ffmpegService.getVideoInfo(req.file.path);

    res.json({
      success: true,
      file: {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      },
      info: videoInfo
    });
  } catch (error) {
    // Cleanup bei Fehler
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/convert
 * Schnelle WebM → MP4 Konvertierung
 */
router.post('/convert', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' });
    }

    const quality = req.body.quality || 'high';
    const job = createJob(req.file.path, { quality, action: 'convert' });

    // Starte Konvertierung asynchron
    processConversion(job.id, req.file.path, quality);

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      message: 'Konvertierung gestartet. Status unter /api/status/' + job.id
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Parst FFmpeg Zeit-String zu Sekunden
 */
function parseFFmpegTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Asynchrone Konvertierung
 */
async function processConversion(jobId, inputPath, quality) {
  const outputFilename = `converted_${Date.now()}.mp4`;
  const outputPath = path.join(FILES_DIR, outputFilename);

  updateJob(jobId, { status: 'processing', progress: 5 });
  console.log(`🎬 [Job ${jobId}] Starte Konvertierung: ${inputPath} → ${outputFilename}`);

  try {
    // Hole Video-Dauer für Progress-Berechnung
    let totalDuration = 0;
    try {
      const info = await ffmpegService.getVideoInfo(inputPath);
      totalDuration = parseFloat(info.format?.duration) || 0;
      console.log(`📊 [Job ${jobId}] Video-Dauer: ${totalDuration.toFixed(2)}s`);
    } catch (e) {
      console.warn(`⚠️ [Job ${jobId}] Konnte Video-Dauer nicht ermitteln`);
    }

    await ffmpegService.convertToMP4(inputPath, outputPath, {
      quality,
      onProgress: (time) => {
        if (totalDuration > 0) {
          const currentTime = parseFFmpegTime(time);
          // Progress von 10-90% für Konvertierung (10% Upload, 10% Finalisierung)
          const progressPercent = Math.min(90, Math.round(10 + (currentTime / totalDuration) * 80));
          updateJob(jobId, { progress: progressPercent });
          console.log(`📊 [Job ${jobId}] Progress: ${progressPercent}% (${time})`);
        } else {
          // Fallback: Inkrementeller Progress
          const job = jobs.get(jobId);
          const currentProgress = job?.progress || 10;
          if (currentProgress < 85) {
            updateJob(jobId, { progress: currentProgress + 5 });
          }
        }
      }
    });

    console.log(`✅ [Job ${jobId}] FFmpeg Konvertierung abgeschlossen`);

    // Thumbnail ist optional - Fehler nicht fatal
    let thumbnailFilename = null;
    try {
      const thumbnailPath = path.join(FILES_DIR, `thumb_${Date.now()}.jpg`);
      await ffmpegService.generateThumbnail(outputPath, thumbnailPath);
      thumbnailFilename = path.basename(thumbnailPath);
      console.log(`✅ [Job ${jobId}] Thumbnail erstellt`);
    } catch (thumbError) {
      console.warn(`⚠️ [Job ${jobId}] Thumbnail-Fehler (nicht fatal):`, thumbError.message);
    }

    // Video-Info ist optional - Fehler nicht fatal
    let videoInfo = {};
    try {
      const info = await ffmpegService.getVideoInfo(outputPath);
      const stats = await fs.stat(outputPath);
      videoInfo = {
        duration: info.format?.duration,
        size: stats.size,
        format: 'mp4'
      };
    } catch (infoError) {
      console.warn(`⚠️ [Job ${jobId}] Video-Info Fehler (nicht fatal):`, infoError.message);
      // Fallback: Nur Dateigröße
      try {
        const stats = await fs.stat(outputPath);
        videoInfo = { size: stats.size, format: 'mp4' };
      } catch {}
    }

    // Job als COMPLETED markieren
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      thumbnail: thumbnailFilename,
      info: videoInfo
    });

    console.log(`✅ [Job ${jobId}] Abgeschlossen: ${outputFilename}`);

    // Cleanup Input
    await fs.unlink(inputPath).catch(() => {});

  } catch (error) {
    console.error(`❌ [Job ${jobId}] Konvertierung fehlgeschlagen:`, error.message);
    updateJob(jobId, {
      status: 'failed',
      error: error.message
    });

    // Cleanup
    await fs.unlink(inputPath).catch(() => {});
  }
}

/**
 * POST /api/process
 * Erweiterte Video-Verarbeitung mit Optionen
 */
router.post('/process', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' });
    }

    const options = {
      action: req.body.action || 'convert', // convert, trim, thumbnail, extract-audio
      quality: req.body.quality || 'high',
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      fps: req.body.fps,
      format: req.body.format
    };

    const job = createJob(req.file.path, options);

    // Starte Verarbeitung asynchron
    processVideo(job.id, req.file.path, options);

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      options
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Asynchrone Video-Verarbeitung
 */
async function processVideo(jobId, inputPath, options) {
  updateJob(jobId, { status: 'processing', progress: 10 });

  try {
    let outputPath;
    let outputFilename;

    switch (options.action) {
      case 'trim':
        if (!options.startTime || !options.endTime) {
          throw new Error('startTime und endTime erforderlich für trim');
        }
        outputFilename = `trimmed_${Date.now()}.mp4`;
        outputPath = path.join(FILES_DIR, outputFilename);
        await ffmpegService.trimVideo(inputPath, outputPath, options.startTime, options.endTime);
        break;

      case 'thumbnail':
        outputFilename = `thumb_${Date.now()}.jpg`;
        outputPath = path.join(FILES_DIR, outputFilename);
        await ffmpegService.generateThumbnail(inputPath, outputPath, {
          timestamp: options.startTime || '00:00:01'
        });
        break;

      case 'extract-audio':
        outputFilename = `audio_${Date.now()}.${options.format || 'mp3'}`;
        outputPath = path.join(FILES_DIR, outputFilename);
        await ffmpegService.extractAudio(inputPath, outputPath, {
          format: options.format || 'mp3'
        });
        break;

      case 'convert':
      default:
        outputFilename = `converted_${Date.now()}.mp4`;
        outputPath = path.join(FILES_DIR, outputFilename);
        await ffmpegService.convertToMP4(inputPath, outputPath, {
          quality: options.quality,
          fps: options.fps
        });
        break;
    }

    const stats = await fs.stat(outputPath);

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      info: {
        size: stats.size,
        action: options.action
      }
    });

    // Cleanup Input
    await fs.unlink(inputPath).catch(() => {});

    console.log(`✅ Job ${jobId} (${options.action}) abgeschlossen`);
  } catch (error) {
    updateJob(jobId, {
      status: 'failed',
      error: error.message
    });
    console.error(`❌ Job ${jobId} fehlgeschlagen:`, error.message);
    await fs.unlink(inputPath).catch(() => {});
  }
}

/**
 * GET /api/status/:jobId
 * Job-Status abfragen
 */
router.get('/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job nicht gefunden' });
  }

  res.json(job);
});

/**
 * GET /api/download/:filename
 * Verarbeitete Datei herunterladen
 * Query: ?cleanup=true - Löscht Datei nach Download
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Sicherheit: nur Dateiname
    const filePath = path.join(FILES_DIR, filename);
    const shouldCleanup = req.query.cleanup === 'true';

    // Prüfe ob Datei existiert
    await fs.access(filePath);

    // Content-Type basierend auf Erweiterung
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png'
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Bei cleanup=true: Lösche nach vollständigem Download
    if (shouldCleanup) {
      res.on('finish', async () => {
        try {
          await fs.unlink(filePath);
          console.log(`🧹 [Download] Datei nach Download gelöscht: ${filename}`);
        } catch (e) {
          console.warn(`⚠️ [Download] Cleanup fehlgeschlagen: ${filename}`);
        }
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ error: 'Datei nicht gefunden' });
  }
});

/**
 * POST /api/cleanup/:filename
 * Manuelles Cleanup einer Datei
 */
router.post('/cleanup/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(FILES_DIR, filename);

    await fs.unlink(filePath);
    console.log(`🧹 [Cleanup] Datei gelöscht: ${filename}`);

    res.json({ success: true, message: 'Datei gelöscht' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: true, message: 'Datei existiert nicht mehr' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * DELETE /api/job/:jobId
 * Job und zugehörige Dateien löschen
 */
router.delete('/job/:jobId', async (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job nicht gefunden' });
  }

  // Lösche Output-Datei
  if (job.outputFile) {
    await fs.unlink(path.join(FILES_DIR, job.outputFile)).catch(() => {});
  }

  // Lösche Thumbnail
  if (job.thumbnail) {
    await fs.unlink(path.join(FILES_DIR, job.thumbnail)).catch(() => {});
  }

  jobs.delete(req.params.jobId);

  res.json({ success: true, message: 'Job gelöscht' });
});

/**
 * POST /api/convert-blob
 * Direkte Blob-Konvertierung (für Browser-seitige Aufnahmen)
 */
router.post('/convert-blob', express.raw({ type: 'video/webm', limit: '500mb' }), async (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'Keine Videodaten empfangen' });
  }

  const inputFilename = `blob_${Date.now()}.webm`;
  const inputPath = path.join(UPLOADS_DIR, inputFilename);

  try {
    // Schreibe Blob zu Datei
    await fs.writeFile(inputPath, req.body);

    const quality = req.query.quality || 'high';
    const job = createJob(inputPath, { quality, action: 'convert-blob' });

    // Starte Konvertierung
    processConversion(job.id, inputPath, quality);

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing'
    });
  } catch (error) {
    await fs.unlink(inputPath).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

export default router;
