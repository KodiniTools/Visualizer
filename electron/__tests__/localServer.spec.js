// @vitest-environment node
// @ts-check
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { startLocalServer, BASE_PATH } from '../localServer.mjs'

/** @type {import('../localServer.mjs').LocalServer} */
let server
let tmp = ''

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'visualizer-desktop-'))
  const distDir = path.join(tmp, 'dist')
  await fs.mkdir(path.join(distDir, 'assets'), { recursive: true })
  await fs.mkdir(path.join(distDir, 'fonts'), { recursive: true })
  await fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>App</title>')
  await fs.writeFile(path.join(distDir, 'assets', 'app.js'), 'export {}')
  await fs.writeFile(path.join(distDir, 'fonts', 'Test.woff2'), 'font')
  server = await startLocalServer({ distDir, dataDir: path.join(tmp, 'data') })
})

afterAll(async () => {
  await server.close()
  await fs.rm(tmp, { recursive: true, force: true })
})

describe('startLocalServer', () => {
  it('lauscht nur lokal und nennt die Start-URL der App', () => {
    expect(server.origin).toBe(`http://127.0.0.1:${server.port}`)
    expect(server.appUrl).toBe(`${server.origin}${BASE_PATH}/app`)
  })

  it('legt Upload- und Ergebnis-Ordner im Datenverzeichnis an', async () => {
    const entries = await fs.readdir(path.join(tmp, 'data'))
    expect(entries.sort()).toEqual(['files', 'uploads'])
    expect(process.env.VISUALIZER_UPLOADS_DIR).toBe(path.join(tmp, 'data', 'uploads'))
    expect(process.env.VISUALIZER_FILES_DIR).toBe(path.join(tmp, 'data', 'files'))
  })

  it('leitet / auf die App um', async () => {
    const res = await fetch(`${server.origin}/`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${BASE_PATH}/app`)
  })

  it.each([`${BASE_PATH}`, `${BASE_PATH}/app`, `${BASE_PATH}/blog/artikel`])(
    'liefert für die Route %s die index.html (History-Modus)',
    async (route) => {
      const res = await fetch(`${server.origin}${route}`)
      expect(res.status).toBe(200)
      expect(await res.text()).toContain('<title>App</title>')
    },
  )

  it('liefert Build-Dateien und Schriften aus', async () => {
    const asset = await fetch(`${server.origin}${BASE_PATH}/assets/app.js`)
    expect(asset.status).toBe(200)
    expect(await asset.text()).toBe('export {}')
    const font = await fetch(`${server.origin}/fonts/Test.woff2`)
    expect(font.status).toBe(200)
  })

  it('liefert fertige Exporte unter /visualizer/files aus (MP4-Download)', async () => {
    await fs.writeFile(path.join(tmp, 'data', 'files', 'converted_1.mp4'), 'mp4-daten')
    const res = await fetch(`${server.origin}${BASE_PATH}/files/converted_1.mp4`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('video/mp4')
    expect(await res.text()).toBe('mp4-daten')
    const missing = await fetch(`${server.origin}${BASE_PATH}/files/fehlt.mp4`)
    expect(missing.status).toBe(404)
  })

  it('antwortet für fehlende Dateien mit 404 statt mit der index.html', async () => {
    const res = await fetch(`${server.origin}${BASE_PATH}/assets/fehlt.js`)
    expect(res.status).toBe(404)
  })

  it('bindet die FFmpeg-Routen unter /visualizer/api ein', async () => {
    const res = await fetch(`${server.origin}${BASE_PATH}/api/info`)
    expect(res.status).toBe(200)
    const info = await res.json()
    expect(info).toHaveProperty('ffmpeg')
    expect(info).toHaveProperty('presets')
  })

  it('unbekannte API-Pfade → 404 als JSON', async () => {
    const res = await fetch(`${server.origin}${BASE_PATH}/api/gibt-es-nicht`)
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'Not Found' })
  })

  it('lehnt Anfragen mit fremdem Origin ab', async () => {
    const res = await fetch(`${server.origin}${BASE_PATH}/api/info`, {
      headers: { Origin: 'https://example.com' },
    })
    expect(res.status).toBe(403)
  })

  it('lässt Anfragen der eigenen Oberfläche zu', async () => {
    const res = await fetch(`${server.origin}${BASE_PATH}/api/info`, {
      headers: { Origin: server.origin },
    })
    expect(res.status).toBe(200)
  })

  it('scheitert verständlich, wenn der Web-Build fehlt', async () => {
    await expect(
      startLocalServer({ distDir: path.join(tmp, 'nicht-da'), dataDir: path.join(tmp, 'data2') }),
    ).rejects.toThrow(/index\.html/)
  })
})
