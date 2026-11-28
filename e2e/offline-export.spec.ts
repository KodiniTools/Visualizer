import fs from 'node:fs'
import {
  test,
  expect,
  centerPixel,
  loadAudio,
  placeImage,
  RED,
  RED_IMAGE,
  WHITE,
} from './helpers/app'
import type { Page } from '@playwright/test'

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

test('Hintergrund-Bild eines Markers bleibt im Export bei späteren Markern ohne eigenes Bild', async ({
  app,
}) => {
  test.setTimeout(120_000)
  // Bild nur in die Galerie laden (nicht platzieren)
  await app.setInputFiles('input[type=file][accept="image/*"]', RED_IMAGE)
  await expect(app.locator('.upload-section .thumbnail-item')).toHaveCount(1)
  await loadAudio(app, 4)
  const form = app.locator('.spb-popover-markers .marker-add-form')
  const addMarker = async (time: string, withImage: boolean) => {
    await app.keyboard.press('m')
    await form.locator('.marker-time-input').fill(time)
    await form.locator('.marker-time-input').press('Tab')
    if (withImage) await form.getByLabel('Hintergrund-Bild').selectOption({ index: 1 })
    await form.locator('.form-buttons .ui-button--primary').click()
  }
  // 0:01 setzt das Bild als Hintergrund, 0:02 und 0:03 setzen keins
  await addMarker('0:01.00', true)
  await addMarker('0:02.00', false)
  await addMarker('0:03.00', false)
  await expect(app.locator('.spb-popover-markers .marker-item')).toHaveCount(3)

  const mp4 = await exportOffline(app)

  const [before, after, later, end] = await videoCenterPixels(app, mp4, [0.5, 1.5, 2.5, 3.5])
  expect(near(before as string, WHITE), before).toBe(true)
  expect(near(after as string, RED), after).toBe(true)
  expect(near(later as string, RED), later).toBe(true)
  expect(near(end as string, RED), end).toBe(true)
})
