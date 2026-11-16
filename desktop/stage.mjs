// @ts-check
/**
 * Stellt die Dateien der Desktop-App unter desktop/app/ zusammen:
 * den Web-Build (dist/), die FFmpeg-Routen des Servers und die Electron-Hülle.
 *
 * Die Desktop-App hat ein eigenes package.json, damit Electron, electron-builder
 * und FFmpeg (zusammen rund 800 MB) nicht in den Abhängigkeiten der Web-App
 * landen und der Web-Deploy unberührt bleibt.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const target = path.join(here, 'app')

/** Quelle (relativ zum Repo) → Ziel (relativ zu desktop/app) */
const parts = [
  ['dist', 'dist'],
  ['server/routes/api.js', 'server/routes/api.js'],
  ['server/services', 'server/services'],
  ['electron/main.mjs', 'electron/main.mjs'],
  ['electron/localServer.mjs', 'electron/localServer.mjs'],
]

try {
  await fs.access(path.join(root, 'dist', 'index.html'))
} catch {
  console.error('dist/index.html fehlt. Zuerst den Web-Build erzeugen: npm run build')
  process.exit(1)
}

await fs.rm(target, { recursive: true, force: true })
for (const [from, to] of parts) {
  const destination = path.join(target, to)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.cp(path.join(root, from), destination, { recursive: true })
}
console.log(`Desktop-App zusammengestellt: ${path.relative(root, target)}`)
