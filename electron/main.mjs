/**
 * Visualizer Desktop (Beta) – Electron-Hauptprozess.
 *
 * Startet den lokalen Server (electron/localServer.mjs) und zeigt die Web-App
 * in einem Fenster. Gerendert wird auf der Grafikkarte des Rechners, FFmpeg
 * läuft lokal: kein Upload, keine Abhängigkeit vom Server auf kodinitools.com.
 */

import { app, BrowserWindow, dialog, session, shell } from 'electron'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startLocalServer } from './localServer.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
// Die FFmpeg-Pakete sind CommonJS und liefern nur einen Dateipfad
const nodeRequire = createRequire(import.meta.url)

// Gleicher Datenordner in Entwicklung und Installation (%APPDATA%\\Visualizer Beta)
app.setName('Visualizer Beta')

// Audio/Video dürfen ohne Klick starten (Beat-Marker-Videos, Vorschau)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// Auf Geräten mit zwei Grafikkarten die leistungsstarke verwenden
app.commandLine.appendSwitch('force_high_performance_gpu')

/** Pfade zu FFmpeg/FFprobe: installiert unter resources/bin, sonst aus node_modules. */
function ffmpegPaths() {
  const exe = process.platform === 'win32' ? '.exe' : ''
  if (app.isPackaged) {
    return {
      ffmpegPath: path.join(process.resourcesPath, 'bin', `ffmpeg${exe}`),
      ffprobePath: path.join(process.resourcesPath, 'bin', `ffprobe${exe}`),
    }
  }
  return {
    ffmpegPath: /** @type {string} */ (nodeRequire('ffmpeg-static')),
    ffprobePath: /** @type {string} */ (nodeRequire('ffprobe-static').path),
  }
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null

/**
 * @param {string} appUrl
 * @param {string} origin
 */
function createWindow(appUrl, origin) {
  const window = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1024,
    minHeight: 700,
    title: 'Visualizer Beta',
    autoHideMenuBar: true,
    backgroundColor: '#0a1324',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Aufnahme und Wiedergabe laufen weiter, wenn das Fenster im Hintergrund ist
      backgroundThrottling: false,
    },
  })

  // Fremde Links im Standardbrowser öffnen, nie im App-Fenster
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(origin)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(origin)) return
    event.preventDefault()
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
  })

  window.on('closed', () => {
    mainWindow = null
  })
  void window.loadURL(appUrl)
  mainWindow = window
}

async function start() {
  const server = await startLocalServer({
    distDir: path.join(ROOT, 'dist'),
    dataDir: path.join(app.getPath('userData'), 'server'),
    ...ffmpegPaths(),
  })

  // Mikrofon nur für die eigene Oberfläche, alles andere ablehnen
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media' && webContents.getURL().startsWith(server.origin))
  })

  // Die Desktop-App sendet keine Nutzungsdaten: Tag Manager/Analytics blockieren
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*.googletagmanager.com/*', '*://*.google-analytics.com/*'] },
    (details, callback) => callback({ cancel: true }),
  )

  app.on('before-quit', () => {
    void server.close().catch(() => {})
  })
  app.on('activate', () => {
    if (!mainWindow) createWindow(server.appUrl, server.origin)
  })
  createWindow(server.appUrl, server.origin)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.on('window-all-closed', () => app.quit())
  app
    .whenReady()
    .then(start)
    .catch((error) => {
      dialog.showErrorBox('Visualizer Beta', `Start fehlgeschlagen:\n${error?.stack || error}`)
      app.quit()
    })
}
