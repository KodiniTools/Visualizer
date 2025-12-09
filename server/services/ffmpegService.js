/**
 * FFmpeg Service
 *
 * Bietet Video-Verarbeitung mit FFmpeg für:
 * - Video-Encoding (H.264/H.265)
 * - Audio-Encoding (AAC)
 * - Format-Konvertierung (WebM → MP4)
 * - Qualitätsoptimierung
 * - Thumbnail-Generierung
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';

// FFmpeg Pfad (Standard oder aus Umgebungsvariable)
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

/**
 * Prüft ob FFmpeg verfügbar ist
 */
export async function checkFFmpeg() {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG_PATH, ['-version']);
    let version = '';

    proc.stdout.on('data', (data) => {
      version += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const match = version.match(/ffmpeg version ([^\s]+)/);
        resolve({
          available: true,
          version: match ? match[1] : 'unknown',
          path: FFMPEG_PATH
        });
      } else {
        resolve({ available: false, error: 'FFmpeg not found' });
      }
    });

    proc.on('error', () => {
      resolve({ available: false, error: 'FFmpeg not installed' });
    });
  });
}

/**
 * Holt Video-Metadaten mit ffprobe
 */
export async function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath
    ];

    const proc = spawn(FFPROBE_PATH, args);
    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => { output += data; });
    proc.stderr.on('data', (data) => { error += data; });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error('Failed to parse video info'));
        }
      } else {
        reject(new Error(`FFprobe failed: ${error}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFprobe error: ${err.message}`));
    });
  });
}

/**
 * Encoding-Presets für verschiedene Qualitätsstufen
 * Optimiert für Server mit 4 Kernen - verwendet schnellere presets
 */
const ENCODING_PRESETS = {
  // Maximale Qualität (für Archiv) - aber trotzdem schnell
  highest: {
    videoCodec: 'libx264',
    videoBitrate: '8M',
    crf: '20',
    preset: 'fast',        // War: 'slow' - viel zu langsam!
    audioCodec: 'aac',
    audioBitrate: '256k',
    audioSampleRate: '48000'
  },

  // Hohe Qualität (Standard für Export)
  high: {
    videoCodec: 'libx264',
    videoBitrate: '6M',
    crf: '22',
    preset: 'fast',        // War: 'medium' - zu langsam für Server
    audioCodec: 'aac',
    audioBitrate: '192k',
    audioSampleRate: '48000'
  },

  // Mittlere Qualität (für Web)
  medium: {
    videoCodec: 'libx264',
    videoBitrate: '4M',
    crf: '24',
    preset: 'veryfast',    // War: 'medium'
    audioCodec: 'aac',
    audioBitrate: '160k',
    audioSampleRate: '44100'
  },

  // Social Media optimiert
  social: {
    videoCodec: 'libx264',
    videoBitrate: '5M',
    crf: '23',
    preset: 'fast',
    audioCodec: 'aac',
    audioBitrate: '192k',
    audioSampleRate: '48000',
    // Zusätzliche Optimierungen für Social Media
    pixelFormat: 'yuv420p',
    profile: 'high',
    level: '4.2'
  },

  // Schnelle Vorschau
  preview: {
    videoCodec: 'libx264',
    videoBitrate: '2M',
    crf: '28',
    preset: 'ultrafast',
    audioCodec: 'aac',
    audioBitrate: '128k',
    audioSampleRate: '44100'
  }
};

/**
 * Konvertiert WebM zu MP4 mit optimalen Einstellungen
 */
export async function convertToMP4(inputPath, outputPath, options = {}) {
  const preset = ENCODING_PRESETS[options.quality] || ENCODING_PRESETS.high;

  // Timeout für FFmpeg: 10 Minuten pro Video, mit Heartbeat-Überwachung
  const FFMPEG_TIMEOUT = options.timeout || 600000; // 10 Minuten
  const HEARTBEAT_TIMEOUT = 60000; // 60 Sekunden ohne Output = hängt

  return new Promise((resolve, reject) => {
    // Parse Bitrate für Buffer-Berechnung (z.B. '6M' -> 6)
    const bitrateNum = parseInt(preset.videoBitrate);

    const args = [
      '-y',                           // Überschreiben ohne Nachfrage
      '-threads', '0',                // Alle CPU-Kerne nutzen (auto-detect)
      '-i', inputPath,                // Input
      '-c:v', preset.videoCodec,      // Video Codec
      '-crf', preset.crf,             // Constant Rate Factor (Qualität)
      '-preset', preset.preset,       // Encoding Speed/Quality Tradeoff
      '-tune', 'fastdecode',          // Optimiert für schnelles Decoding
      '-b:v', preset.videoBitrate,    // Video Bitrate
      '-maxrate', `${Math.round(bitrateNum * 1.5)}M`,  // 1.5x für Peaks
      '-bufsize', `${bitrateNum * 2}M`,               // 2x Bitrate Buffer
      '-c:a', preset.audioCodec,      // Audio Codec
      '-b:a', preset.audioBitrate,    // Audio Bitrate
      '-ar', preset.audioSampleRate,  // Audio Sample Rate
      '-ac', '2',                     // Stereo
    ];

    // Social Media Optimierungen
    if (preset.pixelFormat) {
      args.push('-pix_fmt', preset.pixelFormat);
    }
    if (preset.profile) {
      args.push('-profile:v', preset.profile);
    }
    if (preset.level) {
      args.push('-level', preset.level);
    }

    // Zusätzliche Optionen
    if (options.fps) {
      args.push('-r', String(options.fps));
    }

    // Schneller Start für Web-Playback
    args.push('-movflags', '+faststart');

    // Output
    args.push(outputPath);

    console.log('🎬 FFmpeg Command:', FFMPEG_PATH, args.join(' '));

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';
    let lastOutputTime = Date.now();
    let isFinished = false;
    let lastTimeMatch = null;

    // Heartbeat-Timer: Überwacht ob FFmpeg noch Ausgabe produziert
    const heartbeatInterval = setInterval(() => {
      if (isFinished) {
        clearInterval(heartbeatInterval);
        return;
      }

      const timeSinceLastOutput = Date.now() - lastOutputTime;

      // Während der Finalisierung (faststart) gibt es keine Ausgabe
      // Das ist normal und kann etwas dauern
      if (timeSinceLastOutput > HEARTBEAT_TIMEOUT) {
        // Prüfe ob FFmpeg noch läuft
        if (proc.killed) {
          clearInterval(heartbeatInterval);
          return;
        }

        console.warn(`⚠️ FFmpeg: Keine Ausgabe seit ${Math.round(timeSinceLastOutput / 1000)}s - prüfe Prozess...`);

        // Nach 2 Minuten ohne Output abbrechen
        if (timeSinceLastOutput > HEARTBEAT_TIMEOUT * 2) {
          console.error('❌ FFmpeg: Timeout - keine Aktivität, breche ab');
          proc.kill('SIGKILL');
          clearInterval(heartbeatInterval);
          isFinished = true;
          reject(new Error('FFmpeg timeout: Prozess hängt (keine Ausgabe)'));
          return;
        }
      }
    }, 10000); // Alle 10 Sekunden prüfen

    // Globaler Timeout
    const globalTimeout = setTimeout(() => {
      if (!isFinished) {
        console.error('❌ FFmpeg: Globaler Timeout erreicht');
        proc.kill('SIGKILL');
        clearInterval(heartbeatInterval);
        isFinished = true;
        reject(new Error(`FFmpeg timeout: Maximale Laufzeit (${FFMPEG_TIMEOUT / 1000}s) überschritten`));
      }
    }, FFMPEG_TIMEOUT);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      lastOutputTime = Date.now(); // Heartbeat aktualisieren

      // Progress Parsing
      const timeMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/g);
      if (timeMatch && timeMatch.length > 0) {
        const latestTime = timeMatch[timeMatch.length - 1].replace('time=', '');
        if (latestTime !== lastTimeMatch) {
          lastTimeMatch = latestTime;
          if (options.onProgress) {
            options.onProgress(latestTime);
          }
        }
      }
    });

    proc.on('close', (code) => {
      isFinished = true;
      clearInterval(heartbeatInterval);
      clearTimeout(globalTimeout);

      if (code === 0) {
        resolve({
          success: true,
          output: outputPath,
          preset: options.quality || 'high'
        });
      } else if (code === null) {
        // Prozess wurde getötet (timeout)
        reject(new Error('FFmpeg wurde wegen Timeout beendet'));
      } else {
        reject(new Error(`FFmpeg failed (code ${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      isFinished = true;
      clearInterval(heartbeatInterval);
      clearTimeout(globalTimeout);
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Optimiert ein Video ohne Re-Encoding (nur Container-Konvertierung)
 */
export async function remuxToMP4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-c', 'copy',           // Keine Re-Encoding
      '-movflags', '+faststart',
      outputPath
    ];

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        reject(new Error(`Remux failed: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Generiert Thumbnail aus Video
 */
export async function generateThumbnail(inputPath, outputPath, options = {}) {
  const timestamp = options.timestamp || '00:00:01';
  const width = options.width || 320;

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-ss', timestamp,
      '-vframes', '1',
      '-vf', `scale=${width}:-1`,
      '-q:v', '2',
      outputPath
    ];

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        reject(new Error(`Thumbnail generation failed: ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Extrahiert Audio aus Video
 */
export async function extractAudio(inputPath, outputPath, options = {}) {
  const format = options.format || 'mp3';
  const bitrate = options.bitrate || '192k';

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vn',                    // Kein Video
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'aac',
      '-b:a', bitrate,
      outputPath
    ];

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        reject(new Error(`Audio extraction failed: ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Fügt Audio zu Video hinzu (ersetzt oder mischt)
 */
export async function addAudioToVideo(videoPath, audioPath, outputPath, options = {}) {
  const mode = options.mode || 'replace'; // 'replace' oder 'mix'

  return new Promise((resolve, reject) => {
    let args;

    if (mode === 'mix') {
      // Audio mischen
      args = [
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[aout]',
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', '+faststart',
        outputPath
      ];
    } else {
      // Audio ersetzen
      args = [
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-shortest',
        '-movflags', '+faststart',
        outputPath
      ];
    }

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        reject(new Error(`Add audio failed: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Schneidet Video (ohne Re-Encoding wenn möglich)
 */
export async function trimVideo(inputPath, outputPath, startTime, endTime, options = {}) {
  const accurate = options.accurate || false; // Genaueres Schneiden erfordert Re-Encoding

  return new Promise((resolve, reject) => {
    let args;

    if (accurate) {
      // Genaues Schneiden mit Re-Encoding
      args = [
        '-y',
        '-i', inputPath,
        '-ss', startTime,
        '-to', endTime,
        '-c:v', 'libx264',
        '-crf', '20',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', '+faststart',
        outputPath
      ];
    } else {
      // Schnelles Schneiden (Keyframe-basiert)
      args = [
        '-y',
        '-ss', startTime,
        '-i', inputPath,
        '-to', endTime,
        '-c', 'copy',
        '-movflags', '+faststart',
        outputPath
      ];
    }

    const proc = spawn(FFMPEG_PATH, args);
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: outputPath });
      } else {
        reject(new Error(`Trim failed: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

export default {
  checkFFmpeg,
  getVideoInfo,
  convertToMP4,
  remuxToMP4,
  generateThumbnail,
  extractAudio,
  addAudioToVideo,
  trimVideo,
  ENCODING_PRESETS
};
