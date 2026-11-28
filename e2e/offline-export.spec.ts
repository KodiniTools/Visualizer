import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, centerPixel, loadAudio, placeImage, RED, WHITE } from './helpers/app'
import type { Page } from '@playwright/test'

/** Testvideo 320×180, 30 fps: 0–1 s rot, 1–2 s grün, 2–3 s blau; Ton 2 kHz */
const COLOR_STEPS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'color-steps.webm',
)
/** Stärkster Farbkanal eines Pixels "r,g,b" (Farbraum-Umrechnung verschiebt die Werte) */
const dominant = (pixel: string) => {
  const [r, g, b] = pixel.split(',').map(Number) as [number, number, number]
  if (r > g + 80 && r > b + 80) return 'rot'
  if (g > r + 80 && g > b + 80) return 'grün'
  if (b > r + 80 && b > g + 80) return 'blau'
  return pixel
}

// Offline-Export: Szene Bild für Bild als MP4 rendern (ohne Live-Aufnahme, ohne Server).

/** Startet den Offline-Export im Recorder und speichert die fertige MP4. */
async function exportOffline(page: Page): Promise<Buffer> {
  await page.locator('.spb-record-btn').click()
  const section = page.locator('.spb-popover-recorder .offline-section')
  await section.locator('.offline-start').click()

  // Fortschritt im modalen Dialog, danach Ergebnis im Panel
  const dialog = page.getByRole('dialog', { name: 'Offline-Export' })
  await expect(dialog).toBeVisible()
  await expect(section.locator('.offline-done')).toBeVisible({ timeout: 90_000 })
  await expect(dialog).toBeHidden()

  const downloadPromise = page.waitForEvent('download')
  await section.locator('.mp4-download-btn').click()
  await page.getByTestId('save-dialog-confirm').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/_offline\.mp4$/)
  return fs.readFileSync(await download.path())
}

/** Farbe in der Bildmitte der MP4 zu den Zeitpunkten (s), im Browser dekodiert. */
function videoCenterPixels(page: Page, mp4: Buffer, times: number[]): Promise<string[]> {
  return page.evaluate(
    async ({ base64, times }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const video = document.createElement('video')
      video.muted = true
      video.src = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }))
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve
        video.onerror = () => reject(new Error(video.error?.message || 'decode'))
      })
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      const result: string[] = []
      for (const time of times) {
        video.currentTime = time
        await new Promise((resolve) => (video.onseeked = resolve))
        ctx.drawImage(video, 0, 0)
        const [r, g, b] = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data
        result.push(`${r},${g},${b}`)
      }
      URL.revokeObjectURL(video.src)
      return result
    },
    { base64: mp4.toString('base64'), times },
  )
}

/** Nahe genug an einer Farbe (Kompression verschiebt Werte leicht) */
const near = (actual: string, expected: string) =>
  actual.split(',').every((v, i) => Math.abs(Number(v) - Number(expected.split(',')[i])) <= 6)

/**
 * Tonspur der MP4 im Browser dekodieren und die Stärke der Frequenzen
 * (Goertzel, Mittel über die Datei) liefern.
 */
function audioLevels(
  page: Page,
  mp4: Buffer,
  frequencies: number[],
  [from, to]: [number, number] = [0, Infinity],
): Promise<number[]> {
  return page
    .evaluate(
      async ({ base64, frequencies, from, to }) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        const ctx = new OfflineAudioContext(1, 1, 48000)
        const buffer = await ctx.decodeAudioData(bytes.buffer)
        const rate = buffer.sampleRate
        const data = buffer
          .getChannelData(0)
          .subarray(Math.floor(from * rate), to === null ? undefined : Math.floor(to * rate))
        return frequencies.map((f) => {
          const k = (2 * Math.PI * f) / rate
          const coeff = 2 * Math.cos(k)
          let s1 = 0
          let s2 = 0
          for (let i = 0; i < data.length; i++) {
            const s = (data[i] as number) + coeff * s1 - s2
            s2 = s1
            s1 = s
          }
          return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2) / data.length
        })
      },
      { base64: mp4.toString('base64'), frequencies, from, to: Number.isFinite(to) ? to : null },
    )
    .then((levels) => levels)
}

const VIDEO_POPOVER = '.spb-popover-video'

/** Testvideo hochladen, auf den Canvas legen und hörbar machen (Lautstärke 80 %). */
async function placeAudibleVideo(page: Page) {
  const popover = VIDEO_POPOVER
  await page.locator('[data-popover="video"]').click()
  await page.locator(`${popover} input[type=file]`).setInputFiles(COLOR_STEPS)
  await page.locator(`${popover} .gallery-grid .thumbnail-item`).click()
  await page.locator(`${popover} .btn-place`).click()
  const item = page.locator(`${popover} .canvas-video-item`)
  await expect(item).toHaveCount(1)
  await item.click()
  await page.locator(`${popover} .volume-control input[type=range]`).fill('0.8')
  return item
}

/** Testvideo hörbar auf den Canvas legen und abspielen. */
async function placePlayingVideo(page: Page) {
  const item = await placeAudibleVideo(page)
  await item.locator('.video-controls button').first().click()
  await expect(item.locator('.video-status')).toHaveClass(/playing/)
  await expect.poll(() => centerPixel(page)).not.toBe(WHITE)
  // Live ein Stück laufen lassen: der Export beginnt das Video trotzdem bei 0 s
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
}

test('Offline-Export liefert eine MP4 mit Bild und Ton', async ({ app }) => {
  test.setTimeout(120_000)
  await placeImage(app)
  await loadAudio(app, 3)

  const mp4 = await exportOffline(app)

  expect(mp4.subarray(4, 8).toString('latin1')).toBe('ftyp')
  expect(mp4.length).toBeGreaterThan(10_000)
  const [pixel] = await videoCenterPixels(app, mp4, [1.5])
  expect(near(pixel as string, RED), pixel).toBe(true)
})

test('Beat-Marker greifen im Export frame-genau, danach ist die Szene wieder frei', async ({
  app,
}) => {
  test.setTimeout(120_000)
  await placeImage(app)
  await loadAudio(app, 3)
  // Marker bei 0:01.00 blendet das Bild ein
  await app.keyboard.press('m')
  const form = app.locator('.spb-popover-markers .marker-add-form')
  await form.locator('.marker-time-input').fill('0:01.00')
  await form.locator('.marker-time-input').press('Tab')
  await form.locator('select.marker-placed-image').selectOption({ index: 1 })
  await form.locator('.form-buttons .ui-button--primary').click()
  await expect(app.locator('.spb-popover-markers .marker-item')).toHaveCount(1)

  const mp4 = await exportOffline(app)

  const [before, justBefore, after] = await videoCenterPixels(app, mp4, [0.5, 0.95, 1.05])
  expect(near(before as string, WHITE), before).toBe(true)
  expect(near(justBefore as string, WHITE), justBefore).toBe(true)
  expect(near(after as string, RED), after).toBe(true)

  // Export vorbei: Player angehalten, Marker greifen nicht mehr, Bild sichtbar
  await expect.poll(() => centerPixel(app)).toBe(RED)
})

test('Videos laufen im Export frame-genau, ihr Ton ist im Mix', async ({ app }) => {
  test.setTimeout(150_000)
  await placePlayingVideo(app)
  await loadAudio(app, 3)

  const mp4 = await exportOffline(app)

  const times = [0.5, 0.95, 1.05, 1.95, 2.05, 2.5]
  const pixels = await videoCenterPixels(app, mp4, times)
  expect(pixels.map(dominant)).toEqual(['rot', 'rot', 'grün', 'grün', 'blau', 'blau'])

  // Song (220 Hz) und Video-Ton (2 kHz) sind beide in der Datei, ein Fremdton nicht
  const [song, video, none] = await audioLevels(app, mp4, [220, 2000, 1300])
  expect(song).toBeGreaterThan(0.01)
  expect(video).toBeGreaterThan(0.01)
  expect(none as number).toBeLessThan((video as number) / 10)

  // Nach dem Export läuft das Video live weiter
  await expect.poll(() => centerPixel(app)).not.toBe(WHITE)
})

test('Marker-Video erscheint frame-genau und senkt den Song (Ducking)', async ({ app }) => {
  test.setTimeout(150_000)
  await placeAudibleVideo(app)
  await app.keyboard.press('Escape')
  // Tastenkürzel greifen nicht, solange der Lautstärke-Regler den Fokus hat
  await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await loadAudio(app, 3)
  // Marker bei 0:01.00: Video erscheint von vorn, Song auf 30 %
  await app.keyboard.press('m')
  const form = app.locator('.spb-popover-markers .marker-add-form')
  await form.locator('.marker-time-input').fill('0:01.00')
  await form.locator('.marker-time-input').press('Tab')
  await form.locator('select.marker-canvas-video').selectOption({ index: 1 })
  // „Musik absenken“ ist für Marker-Videos voreingestellt (30 %)
  await expect(form.getByRole('switch', { name: 'Musik absenken (Ducking)' })).toBeChecked()
  await form.locator('.form-buttons .ui-button--primary').click()
  await expect(app.locator('.spb-popover-markers .marker-item')).toHaveCount(1)

  const mp4 = await exportOffline(app)

  const times = [0.5, 0.95, 1.05, 1.95, 2.05]
  const pixels = await videoCenterPixels(app, mp4, times)
  expect(pixels[0]).toBe(WHITE)
  expect(pixels[1]).toBe(WHITE)
  expect(pixels.slice(2).map(dominant)).toEqual(['rot', 'rot', 'grün'])

  // Vor dem Marker: nur der Song. Danach: Video-Ton, Song auf ~30 %
  const [songBefore, videoBefore] = await audioLevels(app, mp4, [220, 2000], [0.1, 0.9])
  const [songAfter, videoAfter] = await audioLevels(app, mp4, [220, 2000], [1.5, 2.9])
  expect(videoBefore as number).toBeLessThan((songBefore as number) / 20)
  expect(videoAfter as number).toBeGreaterThan(0.01)
  const ratio = (songAfter as number) / (songBefore as number)
  expect(ratio, `Song nach dem Marker: ${ratio.toFixed(2)}`).toBeGreaterThan(0.2)
  expect(ratio).toBeLessThan(0.4)
})
