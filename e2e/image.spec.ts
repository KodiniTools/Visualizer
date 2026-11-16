import { test, expect, centerPixel, placeImage, RED, WHITE } from './helpers/app'

// Kernablauf Bild: hochladen, platzieren, rückgängig, wiederholen.

test('Bild landet auf dem Canvas und in der Bilder-Leiste', async ({ app }) => {
  await expect.poll(() => centerPixel(app)).toBe(WHITE)

  await placeImage(app)

  await expect(app.locator('.canvas-images-bar .canvas-thumb')).toHaveCount(1)
})

test('Rückgängig entfernt das Bild, Wiederholen bringt es zurück', async ({ app }) => {
  const undo = app.getByTestId('history-undo')
  const redo = app.getByTestId('history-redo')
  await expect(undo).toBeDisabled()

  await placeImage(app)
  await undo.click()

  await expect.poll(() => centerPixel(app)).toBe(WHITE)
  await expect(app.locator('.canvas-images-bar .canvas-thumb')).toHaveCount(0)

  await redo.click()

  await expect.poll(() => centerPixel(app)).toBe(RED)
  await expect(app.locator('.canvas-images-bar .canvas-thumb')).toHaveCount(1)
})
