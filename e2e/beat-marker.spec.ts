import {
  test,
  expect,
  centerPixel,
  currentTimeText,
  loadAudio,
  placeImage,
  playButton,
  RED_IMAGE,
  RED,
  WHITE,
} from './helpers/app'
import type { Page } from '@playwright/test'

// Kernablauf Beat-Marker: Ein platziertes Bild erscheint erst zum Marker-Zeitpunkt.

/** Legt bei 0:01.00 einen Marker an, der das platzierte Bild einblendet. */
async function addImageMarker(page: Page) {
  await page.keyboard.press('m')
  const form = page.locator('.spb-popover-markers .marker-add-form')
  await form.locator('.marker-time-input').fill('0:01.00')
  await form.locator('.marker-time-input').press('Tab')
  await form.locator('select.marker-placed-image').selectOption({ index: 1 })
  await form.locator('.form-buttons .ui-button--primary').click()
  await expect(page.locator('.spb-popover-markers .marker-item')).toHaveCount(1)
}

test('Wiedergabe läuft und die Zeit zählt hoch', async ({ app }) => {
  await loadAudio(app)
  await expect(currentTimeText(app)).toHaveText('0:00')

  await playButton(app).click()

  await expect(currentTimeText(app)).toHaveText(/0:0[1-9]/)
})

test('Marker erscheint in Liste und Fortschrittsbalken', async ({ app }) => {
  await placeImage(app)
  await loadAudio(app)

  await addImageMarker(app)

  await expect(app.locator('.spb-popover-markers .marker-time')).toHaveText('0:01.00')
  await expect(app.locator('.spb-progress .beat-marker-indicator')).toHaveCount(1)
})

test('Bild bleibt bis zum Marker verborgen und erscheint danach', async ({ app }) => {
  await placeImage(app)
  await loadAudio(app)
  await addImageMarker(app)
  const marker = app.locator('.spb-popover-markers .marker-item')

  await playButton(app).click()

  // Vor dem Marker: Bild ausgeblendet
  await expect.poll(() => centerPixel(app)).toBe(WHITE)
  await expect(marker).not.toHaveClass(/triggered/)

  // Nach dem Marker: Bild sichtbar
  await expect(marker).toHaveClass(/triggered/)
  await expect.poll(() => centerPixel(app)).toBe(RED)
})

test('Zurückspulen vor den Marker blendet das Bild wieder aus', async ({ app }) => {
  await placeImage(app)
  await loadAudio(app)
  await addImageMarker(app)
  const marker = app.locator('.spb-popover-markers .marker-item')
  await playButton(app).click()
  await expect(marker).toHaveClass(/triggered/)
  await expect.poll(() => centerPixel(app)).toBe(RED)

  await playButton(app).click() // Pause
  await app.locator('.spb-progress .progress-bar-container').press('Home')
  await expect(currentTimeText(app)).toHaveText('0:00')
  await expect(marker).not.toHaveClass(/triggered/)

  // Beim Weiterspielen gilt wieder der Stand vor dem Marker, danach löst er erneut aus
  await playButton(app).click()
  await expect.poll(() => centerPixel(app)).toBe(WHITE)
  await expect(marker).toHaveClass(/triggered/)
  await expect.poll(() => centerPixel(app)).toBe(RED)
})

test('Hintergrundbild eines Markers bleibt bei einem späteren Marker ohne Bild stehen', async ({
  app,
}) => {
  // Bild nur in die Galerie laden (nicht platzieren)
  await app.setInputFiles('input[type=file][accept="image/*"]', RED_IMAGE)
  await expect(app.locator('.upload-section .thumbnail-item')).toHaveCount(1)
  await loadAudio(app)
  const form = app.locator('.spb-popover-markers .marker-add-form')
  const markers = app.locator('.spb-popover-markers .marker-item')

  async function addMarker(time: string, withImage: boolean) {
    await app.keyboard.press('m')
    await form.locator('.marker-time-input').fill(time)
    await form.locator('.marker-time-input').press('Tab')
    await form.getByRole('switch', { name: 'Visualizer anzeigen' }).click()
    if (withImage) await form.getByLabel('Hintergrund-Bild').selectOption({ index: 1 })
    await form.locator('.form-buttons .ui-button--primary').click()
  }
  await addMarker('0:00.50', true)
  await addMarker('0:01.00', false)
  await expect(markers).toHaveCount(2)

  await playButton(app).click()
  await expect(markers.nth(1)).toHaveClass(/triggered/)
  await app.waitForTimeout(300)
  expect(await centerPixel(app)).toBe(RED)
})
