// @vitest-environment node
// @ts-check
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { createProjectsRouter } from '../routes/projects.js'

/** @type {import('http').Server} */
let server
let base = ''
let dir = ''

const PROJECT = Buffer.concat([
  Buffer.from('VZPROJ01'),
  Buffer.from([2, 0, 0, 0]),
  Buffer.from('{}'),
])
const auth = { Authorization: 'Bearer ok' }

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vzproj-'))
  const app = express()
  app.use(express.json())
  app.use(
    '/api',
    createProjectsRouter({
      dir,
      maxBytes: 64,
      requireAuth: (req, res, next) =>
        req.headers.authorization === 'Bearer ok'
          ? next()
          : res.status(401).json({ ok: false, error: 'Nicht autorisiert' }),
    }),
  )
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve(undefined))
  })
  const address = server.address()
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)))
  await fs.rm(dir, { recursive: true, force: true })
})

/**
 * @param {Uint8Array | string} body
 * @param {string} [id]
 */
function upload(body, id) {
  const url = `${base}/projects${id ? `/${id}` : ''}`
  /** @type {RequestInit} */
  const init = {
    method: id ? 'PUT' : 'POST',
    headers: {
      ...auth,
      'Content-Type': 'application/x-visualizer-project',
      'X-Project-Name': encodeURIComponent('Mein Projekt ä'),
    },
  }
  init.body = body
  return fetch(url, init)
}

describe('Projekt-Ablage', () => {
  it('ohne Admin-Token → 401', async () => {
    expect((await fetch(`${base}/projects`)).status).toBe(401)
    const res = await fetch(`${base}/projects`, { method: 'POST', body: PROJECT })
    expect(res.status).toBe(401)
  })

  it('speichern, auflisten, laden, überschreiben, löschen', async () => {
    const created = await upload(PROJECT)
    expect(created.status).toBe(200)
    const { project } = /** @type {any} */ (await created.json())
    expect(project).toMatchObject({ name: 'Mein Projekt ä', size: PROJECT.length })
    expect(project.id).toMatch(/^[a-f0-9]{24}$/)

    const list = /** @type {any} */ (
      await (await fetch(`${base}/projects`, { headers: auth })).json()
    )
    expect(list.projects.map((/** @type {any} */ p) => p.id)).toContain(project.id)

    const file = await fetch(`${base}/projects/${project.id}/file`, { headers: auth })
    expect(Buffer.from(await file.arrayBuffer()).equals(PROJECT)).toBe(true)

    const bigger = Buffer.concat([PROJECT, Buffer.from('xyz')])
    const updated = await upload(bigger, project.id)
    expect(updated.status).toBe(200)
    expect(/** @type {any} */ (await updated.json()).project.size).toBe(bigger.length)

    const del = await fetch(`${base}/projects/${project.id}`, { method: 'DELETE', headers: auth })
    expect(del.status).toBe(200)
    const after = await fetch(`${base}/projects/${project.id}/file`, { headers: auth })
    expect(after.status).toBe(404)
  })

  it('lehnt fremde Dateien und zu große Projekte ab, ohne Reste', async () => {
    expect((await upload('kein Projekt')).status).toBe(400)
    expect((await upload(new Uint8Array(100))).status).toBe(413)
    const files = await fs.readdir(dir)
    expect(files.filter((f) => f.endsWith('.part'))).toEqual([])
  })

  it('PUT auf unbekannte oder ungültige ID → 404', async () => {
    expect((await upload(PROJECT, 'a'.repeat(24))).status).toBe(404)
    expect((await upload(PROJECT, '..%2Fetc')).status).toBe(404)
  })
})
