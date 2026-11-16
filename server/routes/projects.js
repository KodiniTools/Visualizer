// @ts-check
/**
 * Projekt-Ablage auf dem Server (nur Admin)
 *
 * Speichert Projektdateien (.vzproj, siehe src/lib/project/projectArchive.ts)
 * unverändert auf der Platte. Der Body wird direkt in eine temporäre Datei
 * gestreamt und erst nach vollständigem Empfang umbenannt – auch mehrere GB
 * große Projekte belegen so keinen Arbeitsspeicher, und ein abgebrochener
 * Upload überschreibt nie einen vorhandenen Stand.
 *
 * Endpoints (alle mit Authorization: Bearer <Admin-Token>):
 * - GET    /api/projects            - Liste { id, name, savedAt, size }
 * - POST   /api/projects            - neues Projekt (Body = Projektdatei)
 * - PUT    /api/projects/:id        - Projekt überschreiben
 * - GET    /api/projects/:id/file   - Projektdatei herunterladen
 * - DELETE /api/projects/:id        - Projekt löschen
 *
 * Header beim Hochladen: X-Project-Name (URI-kodiert)
 */

import express from 'express'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'
import { requireAuth as adminAuth } from './admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MAGIC = 'VZPROJ01'
const ID_PATTERN = /^[a-f0-9]{24}$/
const MAX_NAME_LENGTH = 120

class TooLargeError extends Error {}
class InvalidProjectError extends Error {}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function cleanName(raw) {
  let name = ''
  try {
    name = decodeURIComponent(String(raw ?? ''))
  } catch {
    name = String(raw ?? '')
  }
  name = Array.from(name)
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127)
    .join('')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
  return name || 'Projekt'
}

/**
 * @param {object} [options]
 * @param {string} [options.dir] Ablageordner
 * @param {import('express').RequestHandler} [options.requireAuth]
 * @param {number} [options.maxBytes] Höchstgröße je Projekt
 */
export function createProjectsRouter({
  dir = process.env.PROJECTS_DIR ||
    path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'projects'),
  requireAuth = /** @type {import('express').RequestHandler} */ (adminAuth),
  maxBytes = Number(process.env.PROJECTS_MAX_BYTES) || 20 * 1024 ** 3,
} = {}) {
  const router = express.Router()
  const ready = fsp.mkdir(dir, { recursive: true })

  /** @param {string} id */
  const filePath = (id) => path.join(dir, `${id}.vzproj`)
  /** @param {string} id */
  const metaPath = (id) => path.join(dir, `${id}.json`)

  /** @param {string} id */
  async function readMeta(id) {
    try {
      const meta = JSON.parse(await fsp.readFile(metaPath(id), 'utf8'))
      const stat = await fsp.stat(filePath(id))
      return {
        id,
        name: String(meta.name || ''),
        savedAt: String(meta.savedAt || ''),
        size: stat.size,
      }
    } catch {
      return null
    }
  }

  /**
   * Streamt den Body in eine temporäre Datei, prüft das Format und
   * ersetzt dann atomar die Projektdatei.
   * @param {import('express').Request} req
   * @param {string} id
   */
  async function receive(req, id) {
    await ready
    const declared = Number(req.headers['content-length'])
    if (Number.isFinite(declared) && declared > maxBytes) {
      req.resume() // Body verwerfen, damit die 413-Antwort ankommt
      throw new TooLargeError()
    }

    const tmp = path.join(dir, `.${id}.${crypto.randomBytes(4).toString('hex')}.part`)
    let received = 0
    try {
      await pipeline(
        req,
        async function* limit(source) {
          for await (const chunk of source) {
            received += chunk.length
            if (received > maxBytes) throw new TooLargeError()
            yield chunk
          }
        },
        fs.createWriteStream(tmp),
      )
      const handle = await fsp.open(tmp, 'r')
      const head = Buffer.alloc(MAGIC.length)
      try {
        await handle.read(head, 0, MAGIC.length, 0)
      } finally {
        await handle.close()
      }
      if (head.toString('latin1') !== MAGIC) {
        throw new InvalidProjectError('Keine Projektdatei')
      }
      await fsp.rename(tmp, filePath(id))
      const meta = {
        name: cleanName(req.headers['x-project-name']),
        savedAt: new Date().toISOString(),
      }
      await fsp.writeFile(metaPath(id), JSON.stringify(meta))
      return { id, ...meta, size: received }
    } finally {
      await fsp.rm(tmp, { force: true })
    }
  }

  /**
   * @param {import('express').Response} res
   * @param {any} error
   */
  function fail(res, error) {
    if (error instanceof TooLargeError) {
      return res
        .status(413)
        .set('Connection', 'close')
        .json({ ok: false, error: 'Projekt zu groß' })
    }
    if (error instanceof InvalidProjectError)
      return res.status(400).json({ ok: false, error: error.message })
    console.error('❌ [Projekte] Fehler:', error)
    return res.status(500).json({ ok: false, error: 'Projekt konnte nicht gespeichert werden' })
  }

  router.get('/projects', requireAuth, async (req, res) => {
    await ready
    const files = await fsp.readdir(dir)
    const ids = files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
    const metas = (await Promise.all(ids.filter((id) => ID_PATTERN.test(id)).map(readMeta)))
      .filter((m) => m !== null)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    res.json({ ok: true, projects: metas })
  })

  router.post('/projects', requireAuth, async (req, res) => {
    try {
      const project = await receive(req, crypto.randomBytes(12).toString('hex'))
      res.json({ ok: true, project })
    } catch (error) {
      fail(res, error)
    }
  })

  router.put('/projects/:id', requireAuth, async (req, res) => {
    const id = String(req.params.id)
    if (!ID_PATTERN.test(id) || !(await readMeta(id))) {
      return res.status(404).json({ ok: false, error: 'Projekt nicht gefunden' })
    }
    try {
      res.json({ ok: true, project: await receive(req, id) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.get('/projects/:id/file', requireAuth, async (req, res) => {
    const id = String(req.params.id)
    const meta = ID_PATTERN.test(id) ? await readMeta(id) : null
    if (!meta) return res.status(404).json({ ok: false, error: 'Projekt nicht gefunden' })
    res.setHeader('Content-Type', 'application/x-visualizer-project')
    res.setHeader('Content-Length', String(meta.size))
    res.setHeader('Cache-Control', 'no-store')
    fs.createReadStream(filePath(id)).pipe(res)
  })

  router.delete('/projects/:id', requireAuth, async (req, res) => {
    const id = String(req.params.id)
    if (!ID_PATTERN.test(id))
      return res.status(404).json({ ok: false, error: 'Projekt nicht gefunden' })
    await fsp.rm(filePath(id), { force: true })
    await fsp.rm(metaPath(id), { force: true })
    res.json({ ok: true })
  })

  return router
}

export default createProjectsRouter()
