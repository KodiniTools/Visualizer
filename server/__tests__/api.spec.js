// @vitest-environment node
// @ts-check
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import router from '../routes/api.js'

const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')

/** @type {import('http').Server} */
let server
let base = ''
const createdDirs = /** @type {string[]} */ ([])

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api', router)
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve(undefined))
  })
  const address = server.address()
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)))
  for (const dir of createdDirs) await fs.rm(dir, { recursive: true, force: true })
})

describe('POST /convert-blob', () => {
  it('quality mehrfach angegeben → 400 statt stillem Rückfall auf high', async () => {
    const res = await fetch(`${base}/convert-blob?quality=low&quality=high`, {
      method: 'POST',
      headers: { 'Content-Type': 'video/webm' },
      body: new Uint8Array([1, 2, 3]),
    })
    expect(res.status).toBe(400)
    expect(/** @type {{ error: string }} */ (await res.json()).error).toMatch(/quality/)
  })
})

describe('POST /frame-export/:jobId/frames', () => {
  it('Batch ohne Dateien → 400 statt 500', async () => {
    const start = await fetch(`${base}/frame-export/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps: 30 }),
    })
    expect(start.status).toBe(200)
    const { jobId } = /** @type {{ jobId: string }} */ (await start.json())
    createdDirs.push(path.join(UPLOADS_DIR, `frames_${jobId}`))

    const form = new FormData()
    form.append('startIndex', '0')
    const res = await fetch(`${base}/frame-export/${jobId}/frames`, { method: 'POST', body: form })
    expect(res.status).toBe(400)
    expect(/** @type {{ error: string }} */ (await res.json()).error).toBe('Keine Frames empfangen')
  })
})
