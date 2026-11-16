import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

/** Rotes Testbild (320×200, RGB 200/40/40) */
export const RED_IMAGE = path.join(FIXTURES, 'red.png')
/** Farbe des Testbilds als "r,g,b" */
export const RED = '200,40,40'
/** Farbe des leeren Canvas als "r,g,b" */
export const WHITE = '255,255,255'
/** Kurzes Testvideo (320×180, 4 s, mit Ton) */
export const VIDEO_CLIP = path.join(FIXTURES, 'clip.webm')

/**
 * Erzeugt einen Sinuston als WAV (mono, 16 Bit, 8 kHz). Im Speicher statt als
 * Datei im Repo, damit die Fixtures klein bleiben.
 */
export function toneWav(seconds = 20): { name: string; mimeType: string; buffer: Buffer } {
  const sampleRate = 8000
  const samples = sampleRate * seconds
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples * 2, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) {
    const value = Math.round(12000 * Math.sin((2 * Math.PI * 220 * i) / sampleRate))
    buffer.writeInt16LE(value, 44 + i * 2)
  }
  return { name: 'tone.wav', mimeType: 'audio/wav', buffer }
}

/**
 * Test-Fixture für die Kernabläufe:
 * - feste Sprache, kein nativer Speichern-Dialog (der Fallback-Dialog ist testbar)
 * - Backend nicht erreichbar, damit die Tests ohne Server gleich laufen
 * - jeder unbehandelte Fehler auf der Seite lässt den Test scheitern
 */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.addInitScript(() => {
      localStorage.setItem('locale', 'de')
      Reflect.deleteProperty(window, 'showSaveFilePicker')
    })
    await page.route('**/api/**', (route) => route.abort())
    await page.goto('/app')
    await expect(page.locator('#app-container')).toBeVisible()

    await use(page)

    expect(pageErrors, 'Unbehandelte Fehler auf der Seite').toEqual([])
  },
})

export { expect }

/** Farbe des Pixels in der Canvas-Mitte als "r,g,b" */
export function centerPixel(page: Page): Promise<string> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.canvas-wrapper canvas')
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return 'kein-canvas'
    const [r, g, b] = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data
    return `${r},${g},${b}`
  })
}

/** Aktuelle Wiedergabezeit laut Anzeige in der Player-Leiste ("m:ss") */
export function currentTimeText(page: Page) {
  return page.locator('.spb-progress .time-display').first()
}

/** Lädt das Testbild hoch und legt es in die Canvas-Mitte. */
export async function placeImage(page: Page) {
  await page.setInputFiles('input[type=file][accept="image/*"]', RED_IMAGE)
  await page.locator('.upload-section .thumbnail-item').first().click()
  await page.locator('.placement-buttons .ui-button--primary').click()
  await expect.poll(() => centerPixel(page)).toBe(RED)
}

/** Lädt den Testton in die Playlist. */
export async function loadAudio(page: Page, seconds = 20) {
  await page.locator('input[type=file][accept="audio/*"]').first().setInputFiles(toneWav(seconds))
  await expect(page.locator('.spb-track-name')).toHaveText('tone.wav')
}

/** Play/Pause-Knopf der Player-Leiste */
export function playButton(page: Page) {
  return page.locator('.spb-transport .spb-ctrl-main')
}
