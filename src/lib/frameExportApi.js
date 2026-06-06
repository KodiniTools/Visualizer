/**
 * Frame Export API Client
 *
 * Kommuniziert mit dem Frame-Export-Backend:
 * - Session starten
 * - JPEG-Frame-Batches hochladen (während Aufnahme)
 * - Audio hochladen
 * - FFmpeg-Assemblierung triggern
 */

const API_BASE = '/visualizer/api'

export async function startFrameExportSession(fps = 30) {
  const res = await fetch(`${API_BASE}/frame-export/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `fps=${fps}`,
  })
  if (!res.ok) throw new Error(`Start failed: ${res.status}`)
  return (await res.json()).jobId
}

/**
 * Sendet einen Batch von JPEG-Blobs zum Server
 * @param {string} jobId
 * @param {Blob[]} frameBlobs  - Array von JPEG-Blobs
 * @param {number} startIndex  - Frame-Index des ersten Blobs
 */
export async function uploadFrameBatch(jobId, frameBlobs, startIndex) {
  const form = new FormData()
  form.append('startIndex', String(startIndex))
  frameBlobs.forEach((blob, i) => {
    form.append('frames', blob, `frame_${String(startIndex + i).padStart(6, '0')}.jpg`)
  })

  const res = await fetch(`${API_BASE}/frame-export/${jobId}/frames`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Frame upload failed: ${res.status}`)
  return res.json()
}

/**
 * Lädt die Audio-Datei hoch
 * @param {string} jobId
 * @param {Blob}   audioBlob - WebM-Audio-Blob
 */
export async function uploadAudio(jobId, audioBlob) {
  const form = new FormData()
  form.append('audio', audioBlob, 'audio.webm')

  const res = await fetch(`${API_BASE}/frame-export/${jobId}/audio`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Audio upload failed: ${res.status}`)
  return res.json()
}

/**
 * Startet die FFmpeg-Assemblierung
 * @param {string} jobId
 * @param {number} durationMs - Tatsächliche Aufnahmedauer in ms
 * @returns {Promise<string>} assemblyJobId für Status-Polling
 */
export async function assembleFrameExport(jobId, durationMs) {
  const res = await fetch(`${API_BASE}/frame-export/${jobId}/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ durationMs: durationMs || 0 }),
  })
  if (!res.ok) throw new Error(`Assemble failed: ${res.status}`)
  const data = await res.json()
  return data.jobId
}

/**
 * Bricht einen laufenden Frame-Export ab
 */
export async function cancelFrameExport(jobId) {
  await fetch(`${API_BASE}/frame-export/${jobId}/cancel`, { method: 'POST' }).catch(() => {})
}

export default {
  startFrameExportSession,
  uploadFrameBatch,
  uploadAudio,
  assembleFrameExport,
  cancelFrameExport,
}
