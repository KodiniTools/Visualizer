import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  test,
  expect,
  centerPixel,
  placeImage,
  loadAudio,
  RED,
  VIDEO_CLIP,
  WHITE,
} from './helpers/app'
import type { Page } from '@playwright/test'

// Kernablauf Projekt: Bild, Video und Audio anlegen, als Datei speichern,
// Seite neu laden (alles weg), Datei öffnen → alles wieder da.

const projectPopover = '.spb-popover-project'
const videoPopover = '.spb-popover-video'

async function openProjectPopover(page: Page) {
  if (!(await page.locator(projectPopover).isVisible())) {
    await page.locator('[data-popover="project"]').click()
  }
  await expect(page.locator(projectPopover)).toBeVisible()
}

async function counts(page: Page) {
  await page.locator('[data-popover="video"]').click()
  // Popover wird nachgeladen: auf den Upload-Bereich warten
  await expect(page.locator(`${videoPopover} input[type=file]`)).toBeAttached()
  const videos = await page.locator(`${videoPopover} .gallery-grid .thumbnail-item`).count()
  const canvasVideos = await page.locator(`${videoPopover} .canvas-video-item`).count()
  await page.locator('[data-popover="video"]').dblclick()
  return {
    canvasImages: await page.locator('.canvas-images-bar .canvas-thumb').count(),
    galleryImages: await page.locator('.upload-section .thumbnail-item').count(),
    videos,
    canvasVideos,
    track: await page.locator('.spb-track-name').textContent(),
  }
}

test('Projekt-Datei speichern und nach Neuladen wieder öffnen', async ({ app }) => {
  await placeImage(app)
  await loadAudio(app)
  await app.locator('[data-popover="video"]').click()
  await app.locator(`${videoPopover} input[type=file]`).setInputFiles(VIDEO_CLIP)
  await app.locator(`${videoPopover} .gallery-grid .thumbnail-item`).click()
  await app.locator(`${videoPopover} .btn-place`).click()
  await expect(app.locator(`${videoPopover} .canvas-video-item`)).toHaveCount(1)
  await app.locator('[data-popover="video"]').dblclick()

  const before = await counts(app)
  expect(before).toEqual({
    canvasImages: 1,
    galleryImages: 1,
    videos: 1,
    canvasVideos: 1,
    track: 'tone.wav',
  })

  // Speichern (ohne nativen Dialog → Download)
  await openProjectPopover(app)
  await app.getByTestId('project-name').fill('E2E Projekt')
  const downloadPromise = app.waitForEvent('download')
  await app.getByTestId('project-save-file').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('E2E Projekt.vzproj')
  // ASCII-Pfad: setInputFiles ignoriert Dateien unter Pfaden mit Umlauten
  const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'vzproj-')), 'projekt.vzproj')
  await download.saveAs(file)
  expect((await fs.stat(file)).size).toBeGreaterThan(10_000)

  // Neu laden: alles leer
  await app.reload()
  await expect.poll(() => centerPixel(app)).toBe(WHITE)
  await expect(app.locator('.canvas-images-bar .canvas-thumb')).toHaveCount(0)

  // Öffnen mit Bestätigung
  await openProjectPopover(app)
  await app.getByTestId('project-file-input').setInputFiles(file)
  await app.getByTestId('project-confirm-open').click()

  await expect.poll(() => centerPixel(app)).toBe(RED)
  await expect(app.locator('.spb-track-name')).toHaveText('tone.wav')
  expect(await counts(app)).toEqual(before)
  await expect(app.getByTestId('project-name')).toHaveValue('E2E Projekt')
  // Geladenes Projekt beginnt ohne Undo-Schritte
  await expect(app.getByTestId('history-undo')).toBeDisabled()
})

test('fremde Datei wird abgelehnt, ohne etwas zu verändern', async ({ app }) => {
  await placeImage(app)
  const file = {
    name: 'kaputt.vzproj',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('kein Projekt'),
  }

  await openProjectPopover(app)
  await app.getByTestId('project-file-input').setInputFiles(file)
  await app.getByTestId('project-confirm-open').click()

  await expect(app.getByTestId('project-error')).toBeVisible()
  await expect.poll(() => centerPixel(app)).toBe(RED)
})
