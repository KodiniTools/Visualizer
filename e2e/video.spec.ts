import { test, expect, centerPixel, VIDEO_CLIP, WHITE } from './helpers/app'
import type { Page } from '@playwright/test'

// Kernablauf Video: hochladen, auf den Canvas legen, abspielen, löschen.

const popover = '.spb-popover-video'

async function placeVideo(page: Page) {
  await page.locator('[data-popover="video"]').click()
  await page.locator(`${popover} input[type=file]`).setInputFiles(VIDEO_CLIP)
  await page.locator(`${popover} .gallery-grid .thumbnail-item`).click()
  await page.locator(`${popover} .btn-place`).click()
  await expect(page.locator(`${popover} .canvas-video-item`)).toHaveCount(1)
}

test('Video wird platziert und beim Abspielen auf dem Canvas gezeichnet', async ({ app }) => {
  await placeVideo(app)

  await app.locator(`${popover} .canvas-video-item .video-controls button`).first().click()

  await expect(app.locator(`${popover} .canvas-video-item .video-status`)).toHaveClass(/playing/)
  await expect.poll(() => centerPixel(app)).not.toBe(WHITE)
})

test('Löschen in der Galerie entfernt das Video auch vom Canvas', async ({ app }) => {
  await placeVideo(app)

  await app.locator(`${popover} .gallery-grid .btn-delete-thumb`).click()

  await expect(app.locator(`${popover} .gallery-grid .thumbnail-item`)).toHaveCount(0)
  await expect(app.locator(`${popover} .canvas-video-item`)).toHaveCount(0)
})
