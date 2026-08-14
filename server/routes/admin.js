/**
 * Admin API Routes für die Visualizer Landing-Page
 *
 * Stellt einen kleinen, passwortgeschützten Adminbereich bereit, mit dem der
 * Inhalt der Landing-Page (Hero, Funktionen, Video, FAQ, Call-to-Action)
 * gepflegt werden kann. Der Zustand wird serverseitig in einer JSON-Datei
 * gehalten und an ALLE Besucher ausgeliefert (Broadcast), analog zum
 * "Modernen Musikplayer".
 *
 * Endpoints:
 * - POST /api/login                     - Login (Passwort -> Token)
 * - GET  /api/landing-content           - Aktuellen Inhalt lesen (öffentlich)
 * - GET  /api/landing-content/version   - Nur updatedAt (günstiges Polling)
 * - POST /api/landing-content           - Inhalt speichern (nur mit Token)
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// ═══════════════════════════════════════════════════════════════════
// KONFIGURATION & PERSISTENZ
// ═══════════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Onomatopeja_1357'
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
const LANDING_CONTENT_FILE = path.join(DATA_DIR, 'landingContent.json')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

// Sicherstellen, dass das Datenverzeichnis existiert
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
} catch (e) {
  console.error('❌ [Admin] Datenverzeichnis konnte nicht erstellt werden:', e.message)
}

// Zufälliges Token erzeugen (URL-sicher)
function makeToken(len = 32) {
  return crypto.randomBytes(len).toString('hex')
}

// Admin-Sessions (Token -> User). Werden persistiert, damit ein Neustart
// (Deploy) den Admin nicht ausloggt.
const sessions = new Map()

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'))
      if (Array.isArray(arr)) arr.forEach(([k, v]) => sessions.set(k, v))
    }
  } catch (e) {
    console.error('❌ [Admin] Sessions konnten nicht geladen werden:', e.message)
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(sessions.entries())))
  } catch (e) {
    console.error('❌ [Admin] Sessions konnten nicht gespeichert werden:', e.message)
  }
}

// Landing-Inhalt (Overrides). null = keine Overrides gesetzt (i18n-Standard).
let landingContent = { content: null, updatedAt: null }

function loadLandingContent() {
  try {
    if (fs.existsSync(LANDING_CONTENT_FILE)) {
      const d = JSON.parse(fs.readFileSync(LANDING_CONTENT_FILE, 'utf8'))
      landingContent = {
        content: d && typeof d.content === 'object' ? d.content : null,
        updatedAt: d && d.updatedAt ? d.updatedAt : null,
      }
    }
  } catch (e) {
    console.error('❌ [Admin] Landing-Inhalt konnte nicht geladen werden:', e.message)
    landingContent = { content: null, updatedAt: null }
  }
}

function saveLandingContent() {
  try {
    fs.writeFileSync(LANDING_CONTENT_FILE, JSON.stringify(landingContent, null, 2))
  } catch (e) {
    console.error('❌ [Admin] Landing-Inhalt konnte nicht gespeichert werden:', e.message)
  }
}

loadSessions()
loadLandingContent()

// ═══════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Nicht autorisiert' })
  }
  const token = authHeader.substring(7)
  if (!sessions.has(token)) {
    return res.status(401).json({ ok: false, error: 'Ungültiges Token' })
  }
  req.user = sessions.get(token)
  next()
}

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/login
 * Body: { password }
 * Erfolg: { ok:true, token, user }
 */
router.post('/login', (req, res) => {
  const password = req.body?.password
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Ungültiges Passwort' })
  }
  const token = makeToken(32)
  const user = { username: 'Kodini', role: 'admin' }
  sessions.set(token, user)
  saveSessions()
  res.json({ ok: true, token, user })
})

/**
 * POST /api/logout
 * Header: Authorization: Bearer <token>
 * Entfernt die Session serverseitig (best effort).
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (sessions.delete(token)) saveSessions()
  }
  res.json({ ok: true })
})

/**
 * GET /api/landing-content/version
 * Nur der Zeitstempel – für günstiges Polling.
 */
router.get('/landing-content/version', (req, res) => {
  res.json({ ok: true, updatedAt: landingContent.updatedAt })
})

/**
 * GET /api/landing-content
 * Aktuellen Inhalt (Overrides) lesen. Öffentlich zugänglich.
 */
router.get('/landing-content', (req, res) => {
  res.json({ ok: true, content: landingContent.content, updatedAt: landingContent.updatedAt })
})

/**
 * POST /api/landing-content
 * Body: { content }
 * Speichert die Overrides und aktualisiert den Zeitstempel. Nur mit Token.
 */
router.post('/landing-content', requireAuth, (req, res) => {
  const content = req.body?.content
  if (content !== null && typeof content !== 'object') {
    return res.status(400).json({ ok: false, error: 'Ungültiger Inhalt' })
  }
  landingContent = {
    content: content ?? null,
    updatedAt: new Date().toISOString(),
  }
  saveLandingContent()
  res.json({ ok: true, updatedAt: landingContent.updatedAt })
})

export default router
