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

import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import crypto from 'crypto'
import ffmpegService from '../services/ffmpegService.js'
import { assembleFrames, writeFrames } from '../services/frameExportService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// ═══════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
const FILES_DIR = path.join(__dirname, '..', 'files')

// Job-Tracking (in Produktion: Redis oder DB verwenden)
const jobs = new Map()

// Multer Konfiguration für Video-Uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `upload_${uniqueId}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5 GB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska']
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(webm|mp4|mov|mkv)$/i)) {
      cb(null, true)
    } else {
      cb(new Error(`Ungültiger Dateityp: ${file.mimetype}`), false)
    }
  },
})

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function generateJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

function createJob(inputFile, options = {}) {
  const jobId = generateJobId()
  const job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    inputFile,
    outputFile: null,
    options,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: null,
  }
  jobs.set(jobId, job)
  return job
}

function updateJob(jobId, updates) {
  const job = jobs.get(jobId)
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date().toISOString() })
    jobs.set(jobId, job)
  }
  return job
}

// Cleanup alter Dateien (älter als 1 Stunde)
async function cleanupOldFiles() {
  const maxAge = 60 * 60 * 1000 // 1 Stunde
  const now = Date.now()

  for (const dir of [UPLOADS_DIR, FILES_DIR]) {
    try {
      const files = await fs.readdir(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stats = await fs.stat(filePath)
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath)
          console.log(`🧹 Gelöscht: ${file}`)
        }
      }
    } catch (error) {
      // Verzeichnis existiert möglicherweise nicht
    }
  }
}

// Periodische Cleanup (alle 30 Minuten)
setInterval(cleanupOldFiles, 30 * 60 * 1000)

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/info
 * Server-Informationen und FFmpeg-Status
 */
router.get('/info', async (req, res) => {
  try {
    const ffmpegStatus = await ffmpegService.checkFFmpeg()

    res.json({
      server: 'Visualizer Backend',
      version: '1.0.0',
      ffmpeg: ffmpegStatus,
      presets: Object.keys(ffmpegService.ENCODING_PRESETS),
      limits: {
        maxFileSize: '5 GB',
        supportedFormats: ['webm', 'mp4', 'mov', 'mkv'],
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/upload
 * Video hochladen für spätere Verarbeitung
 */
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' })
    }

    const videoInfo = await ffmpegService.getVideoInfo(req.file.path)

    res.json({
      success: true,
      file: {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
      },
      info: videoInfo,
    })
  } catch (error) {
    // Cleanup bei Fehler
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/convert
 * Schnelle WebM → MP4 Konvertierung
 */
router.post('/convert', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' })
    }

    const quality = req.body.quality || 'high'
    const job = createJob(req.file.path, { quality, action: 'convert' })

    // Starte Konvertierung asynchron
    processConversion(job.id, req.file.path, quality)

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      message: 'Konvertierung gestartet. Status unter /api/status/' + job.id,
    })
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * Parst FFmpeg Zeit-String zu Sekunden
 */
function parseFFmpegTime(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  const [hours, minutes, seconds] = parts.map(parseFloat)
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Vollständiges Re-Encoding (für VP8/VP9/andere Codecs)
 */
async function doFullEncoding(
  jobId,
  inputPath,
  outputPath,
  quality,
  totalDuration,
  inputFileSize = 0,
) {
  let lastProgressTime = 0

  // Timeout basierend auf Videolänge UND Dateigröße
  // VP8/VP9: ~3s pro Sekunde Video für Encoding
  // Große Dateien: +1 Minute pro 100 MB für faststart-Finalisierung
  const durationBasedTimeout = (totalDuration * 3 + 60) * 1000
  const sizeBasedTimeout = (inputFileSize / (100 * 1024 * 1024)) * 60000 // 1 Min pro 100 MB
  const estimatedTimeout = Math.max(300000, durationBasedTimeout + sizeBasedTimeout) // Min 5 Minuten
  console.log(
    `⏱️ [Job ${jobId}] Encoding-Timeout: ${Math.round(estimatedTimeout / 1000)}s (Dauer: ${totalDuration.toFixed(0)}s, Größe: ${(inputFileSize / 1024 / 1024).toFixed(0)}MB)`,
  )

  await ffmpegService.convertToMP4(inputPath, outputPath, {
    quality,
    timeout: estimatedTimeout,
    onProgress: (time) => {
      const currentTime = parseFFmpegTime(time)
      if (currentTime - lastProgressTime < 2) return
      lastProgressTime = currentTime

      if (totalDuration > 0) {
        const progressPercent = Math.min(85, Math.round(10 + (currentTime / totalDuration) * 75))
        updateJob(jobId, { progress: progressPercent })
        console.log(`📊 [Job ${jobId}] Progress: ${progressPercent}% (${time})`)
      } else {
        const estimatedProgress = Math.min(82, Math.round(10 + (currentTime / 300) * 72))
        updateJob(jobId, { progress: estimatedProgress })
      }
    },
  })
}

/**
 * Asynchrone Konvertierung
 */
async function processConversion(jobId, inputPath, quality) {
  const outputFilename = `converted_${Date.now()}.mp4`
  const outputPath = path.join(FILES_DIR, outputFilename)

  updateJob(jobId, { status: 'processing', progress: 5 })
  console.log(`🎬 [Job ${jobId}] Starte Konvertierung: ${inputPath} → ${outputFilename}`)

  try {
    // Hole Video-Info für Codec-Erkennung und Progress-Berechnung
    let totalDuration = 0
    let inputFileSize = 0
    let videoCodec = 'unknown'
    let audioCodec = 'unknown'

    try {
      const info = await ffmpegService.getVideoInfo(inputPath)
      totalDuration = parseFloat(info.format?.duration) || 0
      const stats = await fs.stat(inputPath)
      inputFileSize = stats.size

      // Codec aus Streams extrahieren
      const videoStream = info.streams?.find((s) => s.codec_type === 'video')
      const audioStream = info.streams?.find((s) => s.codec_type === 'audio')
      videoCodec = videoStream?.codec_name || 'unknown'
      audioCodec = audioStream?.codec_name || 'unknown'

      console.log(
        `📊 [Job ${jobId}] Video: ${totalDuration.toFixed(2)}s, ${(inputFileSize / 1024 / 1024).toFixed(1)}MB, Codec: ${videoCodec}/${audioCodec}`,
      )
    } catch (e) {
      console.warn(`⚠️ [Job ${jobId}] Konnte Video-Info nicht ermitteln`)
    }

    // ⚡ SCHNELLER PFAD: Wenn bereits H.264, nur Remux (kein Re-Encoding!)
    const isH264 = videoCodec === 'h264' || videoCodec === 'avc1'
    const isAAC = audioCodec === 'aac'

    if (isH264) {
      console.log(`⚡ [Job ${jobId}] H.264 erkannt - verwende schnelles Remux statt Re-Encoding!`)
      updateJob(jobId, { progress: 50 })

      try {
        await ffmpegService.remuxToMP4(inputPath, outputPath)
        updateJob(jobId, { progress: 92 })
        console.log(`✅ [Job ${jobId}] Remux abgeschlossen (SCHNELL!)`)
      } catch (remuxError) {
        console.warn(
          `⚠️ [Job ${jobId}] Remux fehlgeschlagen, fallback zu Re-Encoding:`,
          remuxError.message,
        )
        // Fallback zu normalem Encoding
        await doFullEncoding(jobId, inputPath, outputPath, quality, totalDuration, inputFileSize)
      }
    } else {
      // Normales Encoding für VP8/VP9/andere Codecs
      console.log(
        `🔄 [Job ${jobId}] ${videoCodec} erkannt - vollständiges Re-Encoding erforderlich`,
      )
      await doFullEncoding(jobId, inputPath, outputPath, quality, totalDuration, inputFileSize)
    }

    // FFmpeg Encoding/Remux fertig
    updateJob(jobId, { progress: 92 })
    console.log(`✅ [Job ${jobId}] FFmpeg abgeschlossen, finalisiere...`)

    // Thumbnail ist optional - Fehler nicht fatal
    let thumbnailFilename = null
    try {
      const thumbnailPath = path.join(FILES_DIR, `thumb_${Date.now()}.jpg`)
      await ffmpegService.generateThumbnail(outputPath, thumbnailPath)
      thumbnailFilename = path.basename(thumbnailPath)
      console.log(`✅ [Job ${jobId}] Thumbnail erstellt`)
    } catch (thumbError) {
      console.warn(`⚠️ [Job ${jobId}] Thumbnail-Fehler (nicht fatal):`, thumbError.message)
    }

    // Video-Info ist optional - Fehler nicht fatal
    let videoInfo = {}
    try {
      const info = await ffmpegService.getVideoInfo(outputPath)
      const stats = await fs.stat(outputPath)
      videoInfo = {
        duration: info.format?.duration,
        size: stats.size,
        format: 'mp4',
      }
    } catch (infoError) {
      console.warn(`⚠️ [Job ${jobId}] Video-Info Fehler (nicht fatal):`, infoError.message)
      // Fallback: Nur Dateigröße
      try {
        const stats = await fs.stat(outputPath)
        videoInfo = { size: stats.size, format: 'mp4' }
      } catch {}
    }

    // Job als COMPLETED markieren
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      thumbnail: thumbnailFilename,
      info: videoInfo,
    })

    console.log(`✅ [Job ${jobId}] Abgeschlossen: ${outputFilename}`)

    // Cleanup Input
    await fs.unlink(inputPath).catch(() => {})
  } catch (error) {
    console.error(`❌ [Job ${jobId}] Konvertierung fehlgeschlagen:`, error.message)

    // Bessere Fehlermeldung für den Benutzer
    let userFriendlyError = error.message
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      userFriendlyError =
        'Konvertierung abgebrochen: Das Video ist zu komplex oder der Server ist überlastet. Versuche eine niedrigere Qualitätseinstellung.'
    } else if (error.message.includes('SIGKILL')) {
      userFriendlyError = 'Konvertierung wurde wegen Zeitüberschreitung abgebrochen.'
    }

    updateJob(jobId, {
      status: 'failed',
      error: userFriendlyError,
    })

    // Cleanup input und ggf. partielles output
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})
  }
}

/**
 * POST /api/process
 * Erweiterte Video-Verarbeitung mit Optionen
 */
router.post('/process', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' })
    }

    const options = {
      action: req.body.action || 'convert', // convert, trim, thumbnail, extract-audio
      quality: req.body.quality || 'high',
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      fps: req.body.fps,
      format: req.body.format,
    }

    const job = createJob(req.file.path, options)

    // Starte Verarbeitung asynchron
    processVideo(job.id, req.file.path, options)

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      options,
    })
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * Asynchrone Video-Verarbeitung
 */
async function processVideo(jobId, inputPath, options) {
  updateJob(jobId, { status: 'processing', progress: 10 })

  try {
    let outputPath
    let outputFilename

    switch (options.action) {
      case 'trim':
        if (!options.startTime || !options.endTime) {
          throw new Error('startTime und endTime erforderlich für trim')
        }
        outputFilename = `trimmed_${Date.now()}.mp4`
        outputPath = path.join(FILES_DIR, outputFilename)
        await ffmpegService.trimVideo(inputPath, outputPath, options.startTime, options.endTime)
        break

      case 'thumbnail':
        outputFilename = `thumb_${Date.now()}.jpg`
        outputPath = path.join(FILES_DIR, outputFilename)
        await ffmpegService.generateThumbnail(inputPath, outputPath, {
          timestamp: options.startTime || '00:00:01',
        })
        break

      case 'extract-audio':
        outputFilename = `audio_${Date.now()}.${options.format || 'mp3'}`
        outputPath = path.join(FILES_DIR, outputFilename)
        await ffmpegService.extractAudio(inputPath, outputPath, {
          format: options.format || 'mp3',
        })
        break

      case 'convert':
      default:
        outputFilename = `converted_${Date.now()}.mp4`
        outputPath = path.join(FILES_DIR, outputFilename)
        await ffmpegService.convertToMP4(inputPath, outputPath, {
          quality: options.quality,
          fps: options.fps,
        })
        break
    }

    const stats = await fs.stat(outputPath)

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      info: {
        size: stats.size,
        action: options.action,
      },
    })

    // Cleanup Input
    await fs.unlink(inputPath).catch(() => {})

    console.log(`✅ Job ${jobId} (${options.action}) abgeschlossen`)
  } catch (error) {
    updateJob(jobId, {
      status: 'failed',
      error: error.message,
    })
    console.error(`❌ Job ${jobId} fehlgeschlagen:`, error.message)
    await fs.unlink(inputPath).catch(() => {})
  }
}

/**
 * GET /api/status/:jobId
 * Job-Status abfragen
 */
router.get('/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job nicht gefunden' })
  }

  res.json(job)
})

/**
 * GET /api/download/:filename
 * Verarbeitete Datei herunterladen
 * Query: ?cleanup=true - Löscht Datei nach Download
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename) // Sicherheit: nur Dateiname
    const filePath = path.join(FILES_DIR, filename)
    const shouldCleanup = req.query.cleanup === 'true'

    // Prüfe ob Datei existiert
    await fs.access(filePath)

    // Content-Type basierend auf Erweiterung
    const ext = path.extname(filename).toLowerCase()
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
    }

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    // Bei cleanup=true: Lösche nach vollständigem Download
    if (shouldCleanup) {
      res.on('finish', async () => {
        try {
          await fs.unlink(filePath)
          console.log(`🧹 [Download] Datei nach Download gelöscht: ${filename}`)
        } catch (e) {
          console.warn(`⚠️ [Download] Cleanup fehlgeschlagen: ${filename}`)
        }
      })
    }

    res.sendFile(filePath)
  } catch (error) {
    res.status(404).json({ error: 'Datei nicht gefunden' })
  }
})

/**
 * POST /api/cleanup/:filename
 * Manuelles Cleanup einer Datei
 */
router.post('/cleanup/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename)
    const filePath = path.join(FILES_DIR, filename)

    await fs.unlink(filePath)
    console.log(`🧹 [Cleanup] Datei gelöscht: ${filename}`)

    res.json({ success: true, message: 'Datei gelöscht' })
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ success: true, message: 'Datei existiert nicht mehr' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

/**
 * DELETE /api/job/:jobId
 * Job und zugehörige Dateien löschen
 */
router.delete('/job/:jobId', async (req, res) => {
  const job = jobs.get(req.params.jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job nicht gefunden' })
  }

  // Lösche Output-Datei
  if (job.outputFile) {
    await fs.unlink(path.join(FILES_DIR, job.outputFile)).catch(() => {})
  }

  // Lösche Thumbnail
  if (job.thumbnail) {
    await fs.unlink(path.join(FILES_DIR, job.thumbnail)).catch(() => {})
  }

  jobs.delete(req.params.jobId)

  res.json({ success: true, message: 'Job gelöscht' })
})

/**
 * POST /api/convert-gif
 * WebM → GIF Konvertierung via 2-Pass FFmpeg (palettegen + paletteuse)
 */
router.post('/convert-gif', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei empfangen' })
    }

    const gifOptions = {
      fps: Math.min(30, Math.max(1, parseInt(req.body.fps) || 15)),
      width: Math.min(1920, Math.max(120, parseInt(req.body.width) || 480)),
      colors: Math.min(256, Math.max(2, parseInt(req.body.colors) || 256)),
    }

    const job = createJob(req.file.path, { action: 'convert-gif', ...gifOptions })

    processGifConversion(job.id, req.file.path, gifOptions)

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      message: `GIF-Konvertierung gestartet (${gifOptions.fps}fps, ${gifOptions.width}px). Status: /api/status/${job.id}`,
    })
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {})
    res.status(500).json({ error: error.message })
  }
})

/**
 * Asynchrone GIF-Konvertierung
 */
async function processGifConversion(jobId, inputPath, options) {
  const outputFilename = `gif_${Date.now()}.gif`
  const outputPath = path.join(FILES_DIR, outputFilename)

  updateJob(jobId, { status: 'processing', progress: 5 })
  console.log(
    `🎨 [Job ${jobId}] GIF-Konvertierung: fps=${options.fps} width=${options.width} colors=${options.colors}`,
  )

  try {
    // Hole Videodauer für Progress-Berechnung
    let totalDuration = 0
    try {
      const info = await ffmpegService.getVideoInfo(inputPath)
      totalDuration = parseFloat(info.format?.duration) || 0
    } catch (e) {
      console.warn(`⚠️ [Job ${jobId}] Video-Info nicht verfügbar`)
    }

    updateJob(jobId, { progress: 10 })

    let lastProgressTime = 0

    await ffmpegService.convertToGif(inputPath, outputPath, {
      ...options,
      onProgress: (time) => {
        const currentTime = parseFFmpegTime(time)
        if (currentTime - lastProgressTime < 1) return
        lastProgressTime = currentTime

        if (totalDuration > 0) {
          // Pass 1 = 10–50%, Pass 2 = 50–90%
          // onProgress wird nur von Pass 2 aufgerufen
          const progressPercent = Math.min(88, Math.round(50 + (currentTime / totalDuration) * 38))
          updateJob(jobId, { progress: progressPercent })
          console.log(`📊 [Job ${jobId}] GIF Progress: ${progressPercent}% (${time})`)
        }
      },
    })

    updateJob(jobId, { progress: 92 })

    // Dateigröße ermitteln
    let gifInfo = { format: 'gif', fps: options.fps, width: options.width }
    try {
      const stats = await fs.stat(outputPath)
      gifInfo.size = stats.size
    } catch (e) {}

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      info: gifInfo,
    })

    console.log(`✅ [Job ${jobId}] GIF fertig: ${outputFilename}`)
    await fs.unlink(inputPath).catch(() => {})
  } catch (error) {
    console.error(`❌ [Job ${jobId}] GIF-Konvertierung fehlgeschlagen:`, error.message)

    updateJob(jobId, {
      status: 'failed',
      error:
        error.message.includes('palettegen') || error.message.includes('render')
          ? 'GIF-Erstellung fehlgeschlagen. Versuche kürzere Aufnahme oder kleinere Auflösung.'
          : error.message,
    })

    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})
  }
}

/**
 * POST /api/convert-blob
 * Direkte Blob-Konvertierung (für Browser-seitige Aufnahmen)
 */
router.post(
  '/convert-blob',
  express.raw({ type: 'video/webm', limit: '5gb' }),
  async (req, res) => {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'Keine Videodaten empfangen' })
    }

    const inputFilename = `blob_${Date.now()}.webm`
    const inputPath = path.join(UPLOADS_DIR, inputFilename)

    try {
      // Schreibe Blob zu Datei
      await fs.writeFile(inputPath, req.body)

      const quality = req.query.quality || 'high'
      const job = createJob(inputPath, { quality, action: 'convert-blob' })

      // Starte Konvertierung
      processConversion(job.id, inputPath, quality)

      res.json({
        success: true,
        jobId: job.id,
        status: 'processing',
      })
    } catch (error) {
      await fs.unlink(inputPath).catch(() => {})
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * POST /api/concat-segments
 * Fügt mehrere Video-Segmente nahtlos zusammen (für Pause/Resume Recording)
 * Erwartet multipart/form-data mit mehreren 'segment' Dateien
 */
router.post('/concat-segments', upload.array('segment', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Keine Video-Segmente empfangen' })
    }

    console.log(`📥 [Concat] ${req.files.length} Segmente empfangen`)

    const quality = req.body.quality || 'high'
    const segmentPaths = req.files.map((f) => f.path)

    const job = createJob(segmentPaths[0], {
      quality,
      action: 'concat-segments',
      segmentCount: req.files.length,
    })

    // Starte Zusammenfügung asynchron
    processConcatenation(job.id, segmentPaths, quality)

    res.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      segmentCount: req.files.length,
      message: `Füge ${req.files.length} Segmente zusammen. Status unter /api/status/${job.id}`,
    })
  } catch (error) {
    // Cleanup bei Fehler
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {})
      }
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * Asynchrone Segment-Zusammenfügung
 */
async function processConcatenation(jobId, segmentPaths, quality) {
  const outputFilename = `concat_${Date.now()}.mp4`
  const outputPath = path.join(FILES_DIR, outputFilename)

  updateJob(jobId, { status: 'processing', progress: 5 })
  console.log(
    `🎬 [Job ${jobId}] Starte Concat: ${segmentPaths.length} Segmente → ${outputFilename}`,
  )

  try {
    // Hole Gesamtdauer aller Segmente für Progress
    let totalDuration = 0
    for (const segmentPath of segmentPaths) {
      try {
        const info = await ffmpegService.getVideoInfo(segmentPath)
        totalDuration += parseFloat(info.format?.duration) || 0
      } catch (e) {
        // Ignoriere Fehler bei einzelnen Segmenten
      }
    }
    console.log(`📊 [Job ${jobId}] Gesamtdauer: ${totalDuration.toFixed(2)}s`)

    updateJob(jobId, { progress: 10 })

    let lastProgressTime = 0

    // Führe Concat durch
    await ffmpegService.concatenateSegments(segmentPaths, outputPath, {
      quality,
      onProgress: (time) => {
        const currentTime = parseFFmpegTime(time)
        if (currentTime - lastProgressTime < 2) return
        lastProgressTime = currentTime

        if (totalDuration > 0) {
          const progressPercent = Math.min(85, Math.round(10 + (currentTime / totalDuration) * 75))
          updateJob(jobId, { progress: progressPercent })
          console.log(`📊 [Job ${jobId}] Concat Progress: ${progressPercent}% (${time})`)
        }
      },
    })

    updateJob(jobId, { progress: 90 })
    console.log(`✅ [Job ${jobId}] Concat abgeschlossen`)

    // Thumbnail generieren (optional)
    let thumbnailFilename = null
    try {
      const thumbnailPath = path.join(FILES_DIR, `thumb_${Date.now()}.jpg`)
      await ffmpegService.generateThumbnail(outputPath, thumbnailPath)
      thumbnailFilename = path.basename(thumbnailPath)
    } catch (thumbError) {
      console.warn(`⚠️ [Job ${jobId}] Thumbnail-Fehler (nicht fatal):`, thumbError.message)
    }

    // Video-Info holen
    let videoInfo = {}
    try {
      const info = await ffmpegService.getVideoInfo(outputPath)
      const stats = await fs.stat(outputPath)
      videoInfo = {
        duration: info.format?.duration,
        size: stats.size,
        format: 'mp4',
        segmentCount: segmentPaths.length,
      }
    } catch (infoError) {
      try {
        const stats = await fs.stat(outputPath)
        videoInfo = { size: stats.size, format: 'mp4', segmentCount: segmentPaths.length }
      } catch {}
    }

    // Job als COMPLETED markieren
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
      thumbnail: thumbnailFilename,
      info: videoInfo,
    })

    console.log(`✅ [Job ${jobId}] Fertig: ${outputFilename} (${segmentPaths.length} Segmente)`)

    // Cleanup: Alle Segment-Dateien löschen
    for (const segmentPath of segmentPaths) {
      await fs.unlink(segmentPath).catch(() => {})
    }
    console.log(`🧹 [Job ${jobId}] ${segmentPaths.length} Segment-Dateien gelöscht`)
  } catch (error) {
    console.error(`❌ [Job ${jobId}] Concat fehlgeschlagen:`, error.message)

    updateJob(jobId, {
      status: 'failed',
      error: error.message,
    })

    // Cleanup bei Fehler
    for (const segmentPath of segmentPaths) {
      await fs.unlink(segmentPath).catch(() => {})
    }
    await fs.unlink(outputPath).catch(() => {})
  }
}

// ═══════════════════════════════════════════════════════════════════
// FRAME EXPORT ROUTES
// ═══════════════════════════════════════════════════════════════════

// In-Memory store for frame export sessions (separate from jobs)
const frameJobs = new Map()

const frameStorage = multer.memoryStorage()
const frameUpload = multer({
  storage: frameStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per batch
})

const audioStorage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, `audio_${req.params.jobId}.webm`)
  },
})
const audioUpload = multer({ storage: audioStorage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } })

/**
 * POST /api/frame-export/start
 * Startet einen neuen Frame-Export-Job, erstellt Frames-Verzeichnis
 */
router.post('/frame-export/start', async (req, res) => {
  try {
    const jobId = generateJobId()
    const framesDir = path.join(UPLOADS_DIR, `frames_${jobId}`)
    await fs.mkdir(framesDir, { recursive: true })

    frameJobs.set(jobId, {
      id: jobId,
      framesDir,
      frameCount: 0,
      fps: parseInt(req.body.fps) || 30,
      status: 'collecting',
      createdAt: Date.now(),
    })

    console.log(`📹 [FrameExport] Job gestartet: ${jobId}`)
    res.json({ success: true, jobId })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/frame-export/:jobId/frames
 * Empfängt einen Batch von JPEG-Frames (multipart)
 * Felder: frame_000001, frame_000002, ... (JPEG buffer)
 *         startIndex: erster Frame-Index dieses Batches
 */
router.post('/frame-export/:jobId/frames', frameUpload.any(), async (req, res) => {
  const job = frameJobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'Frame job not found' })

  try {
    const startIndex = parseInt(req.body.startIndex) || 0
    const frames = req.files.map((file, i) => ({
      index: startIndex + i,
      buffer: file.buffer,
    }))

    await writeFrames(job.framesDir, frames)
    job.frameCount = Math.max(job.frameCount, startIndex + frames.length)

    res.json({ success: true, received: frames.length, total: job.frameCount })
  } catch (error) {
    console.error(`❌ [FrameExport] Batch error:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/frame-export/:jobId/audio
 * Empfängt die Audio-Datei für den Frame-Export
 */
router.post('/frame-export/:jobId/audio', audioUpload.single('audio'), async (req, res) => {
  const job = frameJobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'Frame job not found' })

  job.audioPath = req.file?.path || null
  console.log(`🎵 [FrameExport] Audio empfangen: ${job.audioPath}`)
  res.json({ success: true })
})

/**
 * POST /api/frame-export/:jobId/assemble
 * Startet FFmpeg-Assemblierung (frames + audio → MP4)
 */
router.post('/frame-export/:jobId/assemble', async (req, res) => {
  const frameJob = frameJobs.get(req.params.jobId)
  if (!frameJob) return res.status(404).json({ error: 'Frame job not found' })

  // Normalen Job für Status-Polling erstellen
  const outputFilename = `hq_${Date.now()}.mp4`
  const outputPath = path.join(FILES_DIR, outputFilename)
  const job = createJob(null, { type: 'frame-export' })
  updateJob(job.id, { status: 'processing', progress: 0 })

  res.json({ success: true, jobId: job.id })

  // Assemblierung im Hintergrund
  processFrameAssembly(job.id, frameJob, outputPath, outputFilename)
})

async function processFrameAssembly(jobId, frameJob, outputPath, outputFilename) {
  try {
    console.log(`🎬 [FrameExport] Assembliere ${frameJob.frameCount} Frames...`)

    await assembleFrames(frameJob.framesDir, frameJob.audioPath || null, outputPath, {
      fps: frameJob.fps,
      onProgress: (progress) => updateJob(jobId, { progress }),
    })

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      outputFile: outputFilename,
    })

    console.log(`✅ [FrameExport] Fertig: ${outputFilename}`)
  } catch (error) {
    console.error(`❌ [FrameExport] Assembly fehlgeschlagen:`, error.message)
    updateJob(jobId, { status: 'failed', error: error.message })
  } finally {
    // Temp-Dateien bereinigen
    await fs.rm(frameJob.framesDir, { recursive: true, force: true }).catch(() => {})
    if (frameJob.audioPath) await fs.unlink(frameJob.audioPath).catch(() => {})
    frameJobs.delete(frameJob.id)
  }
}

/**
 * POST /api/frame-export/:jobId/cancel
 * Bricht einen laufenden Frame-Export ab und räumt auf
 */
router.post('/frame-export/:jobId/cancel', async (req, res) => {
  const job = frameJobs.get(req.params.jobId)
  if (!job) return res.json({ success: true }) // bereits aufgeräumt

  await fs.rm(job.framesDir, { recursive: true, force: true }).catch(() => {})
  if (job.audioPath) await fs.unlink(job.audioPath).catch(() => {})
  frameJobs.delete(req.params.jobId)

  res.json({ success: true })
})

export default router
