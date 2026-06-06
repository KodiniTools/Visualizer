/**
 * Frame Export Service
 *
 * Assembliert Frame-by-Frame Exports zu MP4 via FFmpeg.
 * Ablauf: JPEG-Frames + Audio-WebM → FFmpeg concat → MP4
 */

import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg'

/**
 * Assembliert JPEG-Frames + Audio zu MP4
 *
 * @param {string} framesDir  - Verzeichnis mit frame_000001.jpg etc.
 * @param {string} audioPath  - Pfad zur Audio-Datei (WebM/WAV)
 * @param {string} outputPath - Ziel-MP4-Pfad
 * @param {Object} options
 * @param {number} options.fps       - Frames per second (default 30)
 * @param {function} options.onProgress - Callback (0-100)
 * @returns {Promise<void>}
 */
export async function assembleFrames(framesDir, audioPath, outputPath, options = {}) {
  const fps = options.fps || 30
  const onProgress = options.onProgress || (() => {})

  // Frame-Liste ermitteln und sortieren
  const files = (await fs.readdir(framesDir)).filter((f) => f.match(/^frame_\d+\.jpg$/)).sort()

  if (files.length === 0) throw new Error('No frames found in directory')

  const totalFrames = files.length
  const durationSeconds = totalFrames / fps

  console.log(`[FrameExport] ${totalFrames} frames @ ${fps}fps = ${durationSeconds.toFixed(1)}s`)

  // Concat-Liste erstellen (für präzises Timing)
  const listPath = path.join(framesDir, 'frames.txt')
  const frameDuration = 1 / fps
  const listContent = files
    .map((f) => `file '${path.join(framesDir, f)}'\nduration ${frameDuration}`)
    .join('\n')
  await fs.writeFile(listPath, listContent)

  const args = [
    '-y',
    // Frames via concat demuxer (präzises Timing, kein Stutter)
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
  ]

  // Audio hinzufügen wenn vorhanden
  if (audioPath) {
    args.push('-i', audioPath)
  }

  args.push(
    // Video: H.264, qualitativ hochwertig
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    // Audio
    ...(audioPath ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'] : []),
    // Auf Videolänge beschränken (Audio kann länger sein)
    '-shortest',
    // Web-optimiert
    '-movflags',
    '+faststart',
    outputPath,
  )

  console.log('[FrameExport] FFmpeg:', FFMPEG_PATH, args.join(' '))

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args)
    let stderr = ''

    proc.stderr.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk

      // Progress aus "frame=N" lesen
      const frameMatch = chunk.match(/frame=\s*(\d+)/)
      if (frameMatch) {
        const doneFrames = parseInt(frameMatch[1])
        onProgress(Math.min(99, Math.round((doneFrames / totalFrames) * 100)))
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`FFmpeg assembly failed (exit ${code}): ${stderr.slice(-500)}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`))
    })
  })
}

/**
 * Schreibt einen Frame-Batch in das Frames-Verzeichnis
 *
 * @param {string} framesDir   - Ziel-Verzeichnis
 * @param {Array}  frames      - Array von { index, buffer }
 */
export async function writeFrames(framesDir, frames) {
  await Promise.all(
    frames.map(({ index, buffer }) => {
      const filename = `frame_${String(index).padStart(6, '0')}.jpg`
      return fs.writeFile(path.join(framesDir, filename), buffer)
    }),
  )
}

export default { assembleFrames, writeFrames }
