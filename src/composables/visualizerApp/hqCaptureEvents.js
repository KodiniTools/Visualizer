/**
 * HQ-Frame-Capture über window-Events steuern (vom HQ-Export ausgelöst):
 * 'hq:startCapture' startet die Aufnahme vom Aufnahme-Canvas,
 * 'hq:stopCapture' stoppt sie und meldet die restlichen Frames per
 * 'hq:captureRemaining'.
 *
 * @param {object} deps
 * @param {() => HTMLCanvasElement|null} deps.getRecordingCanvas
 * @param {(canvas: HTMLCanvasElement, fps: number, onBatch: Function) => void} deps.startCapture
 * @param {() => Promise<unknown>} deps.stopCapture
 */
export function bindHqCaptureEvents({ getRecordingCanvas, startCapture, stopCapture }) {
  window.addEventListener('hq:startCapture', (e) => {
    const { fps, onBatch } = e.detail
    const canvas = getRecordingCanvas()
    if (!canvas) return
    startCapture(canvas, fps, onBatch)
  })
  window.addEventListener('hq:stopCapture', async () => {
    const remaining = await stopCapture()
    window.dispatchEvent(new CustomEvent('hq:captureRemaining', { detail: remaining }))
  })
}
