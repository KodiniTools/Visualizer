/**
 * HQ-Frame-Capture über window-Events steuern (vom HQ-Export ausgelöst):
 * 'hq:startCapture' startet die Aufnahme vom Aufnahme-Canvas,
 * 'hq:stopCapture' stoppt sie und meldet die restlichen Frames per
 * 'hq:captureRemaining'.
 */

import type { FrameBatchCallback } from '../useFrameCapture'

/** Abhängigkeiten von bindHqCaptureEvents */
export interface HqCaptureDeps {
  getRecordingCanvas: () => HTMLCanvasElement | null | undefined
  startCapture: (canvas: HTMLCanvasElement, fps: number, onBatch: FrameBatchCallback) => void
  stopCapture: () => Promise<unknown>
}

export function bindHqCaptureEvents({
  getRecordingCanvas,
  startCapture,
  stopCapture,
}: HqCaptureDeps): void {
  window.addEventListener('hq:startCapture', (e) => {
    const { fps, onBatch } = (e as CustomEvent<{ fps: number; onBatch: FrameBatchCallback }>).detail
    const canvas = getRecordingCanvas()
    if (!canvas) return
    startCapture(canvas, fps, onBatch)
  })
  window.addEventListener('hq:stopCapture', async () => {
    const remaining = await stopCapture()
    window.dispatchEvent(new CustomEvent('hq:captureRemaining', { detail: remaining }))
  })
}
