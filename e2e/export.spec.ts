import fs from 'node:fs'
import { test, expect, currentTimeText, loadAudio, placeImage, playButton } from './helpers/app'

// Kernablauf Export: aufnehmen, Ergebnis ansehen, WebM speichern (ohne Server).

test('Aufnahme liefert ein abspielbares WebM zum Speichern', async ({ app }) => {
  await placeImage(app)
  await loadAudio(app)
  const controls = app.locator('.spb-popover-recorder .recorder-controls')

  await app.locator('.spb-record-btn').click()
  await controls.locator('.btn-prepare').click()
  await controls.locator('.btn-start').click()
  await expect(controls.locator('.btn-stop')).toBeVisible()
  await playButton(app).click()
  await expect(currentTimeText(app)).toHaveText(/0:0[2-9]/)
  await controls.locator('.btn-stop').click()

  // Ergebnis-Dialog mit Vorschau in Canvas-Auflösung
  const preview = app.locator('.results-modal video#preview')
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(1920)

  await app.locator('.results-modal .cancel-btn').click()
  await expect(preview).toBeHidden()

  // Speichern über den Fallback-Dialog
  const downloadPromise = app.waitForEvent('download')
  await app.locator('.webm-download-btn').click()
  await app.getByTestId('save-dialog-confirm').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.webm$/)
  const size = fs.statSync(await download.path()).size
  expect(size).toBeGreaterThan(10_000)
})
