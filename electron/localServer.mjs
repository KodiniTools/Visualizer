// @ts-check
/**
 * Lokaler Server der Desktop-App.
 *
 * Liefert den unveränderten Web-Build (dist/, Basis-Pfad /visualizer/) aus und
 * bindet dieselben FFmpeg-Routen ein wie der Server auf kodinitools.com. Die
 * Desktop-App braucht dadurch keinen eigenen Frontend-Build: Jede Korrektur an
 * der Web-App gilt automatisch für beide.
 *
 * Der Server lauscht nur auf 127.0.0.1 und nimmt nur Anfragen der eigenen
 * Oberfläche an.
 */

import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'

/** Basis-Pfad des Web-Builds (vite.config.ts, base im Production-Build) */
export const BASE_PATH = '/visualizer'

/**
 * @typedef {object} LocalServerOptions
 * @property {string} distDir - Verzeichnis des Web-Builds (enthält index.html)
 * @property {string} dataDir - Beschreibbares Verzeichnis für Uploads und Ergebnisse
 * @property {string} [ffmpegPath] - Pfad zum mitgelieferten FFmpeg
 * @property {string} [ffprobePath] - Pfad zum mitgelieferten FFprobe
 * @property {number} [port] - Fester Port (Standard 0 = freier Port)
 */

/**
 * @typedef {object} LocalServer
 * @property {number} port
 * @property {string} origin - z. B. http://127.0.0.1:51234
 * @property {string} appUrl - Start-URL der Oberfläche
 * @property {() => Promise<void>} close
 */

/**
 * Startet den lokalen Server.
 * @param {LocalServerOptions} options
 * @returns {Promise<LocalServer>}
 */
export async function startLocalServer(options) {
  const { distDir, dataDir } = options
  const uploadsDir = path.join(dataDir, 'uploads')
  const filesDir = path.join(dataDir, 'files')
  await fs.mkdir(uploadsDir, { recursive: true })
  await fs.mkdir(filesDir, { recursive: true })
  await fs.access(path.join(distDir, 'index.html'))

  // Die Routen lesen ihre Pfade beim Laden – deshalb erst setzen, dann importieren.
  process.env.VISUALIZER_UPLOADS_DIR = uploadsDir
  process.env.VISUALIZER_FILES_DIR = filesDir
  if (options.ffmpegPath) process.env.FFMPEG_PATH = options.ffmpegPath
  if (options.ffprobePath) process.env.FFPROBE_PATH = options.ffprobePath
  const { default: apiRoutes } = await import('../server/routes/api.js')

  const app = express()
  /** @type {string} */
  let origin = ''

  // Nur die eigene Oberfläche darf den Server benutzen: Anfragen mit fremdem
  // Origin (eine Webseite im Browser, die auf localhost zielt) werden abgelehnt.
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin
    if (requestOrigin && requestOrigin !== origin) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  })

  app.use(`${BASE_PATH}/api`, apiRoutes)
  app.use(`${BASE_PATH}/api`, (req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path })
  })

  // Schriften liegen im Web auf /fonts/ der Domain (siehe src/lib/fontUrl.ts)
  app.use('/fonts', express.static(path.join(distDir, 'fonts')))
  app.use(BASE_PATH, express.static(distDir, { index: false }))

  // Vue Router (History-Modus): jede andere Seite unter /visualizer/ ist die App
  // (fehlende Dateien wie /assets/x.js bleiben 404 statt HTML zu liefern).
  app.get([BASE_PATH, `${BASE_PATH}/*`], (req, res, next) => {
    if (path.extname(req.path)) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
  app.get('/', (req, res) => res.redirect(`${BASE_PATH}/app`))
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path })
  })

  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(options.port ?? 0, '127.0.0.1', () => resolve(listening))
    listening.once('error', reject)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  origin = `http://127.0.0.1:${port}`

  return {
    port,
    origin,
    appUrl: `${origin}${BASE_PATH}/app`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((/** @type {Error | undefined} */ error) =>
          error ? reject(error) : resolve(),
        )
      }),
  }
}
