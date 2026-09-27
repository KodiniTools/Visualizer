/**
 * LED-Text und LED-Zahlen: ganze Wörter/Zeilen aus den LED-Buchstaben und
 * LED-Ziffern (glLedLetterA–Z, glLedDigit0–9, dazu ein LED-Doppelpunkt) in
 * EINEM Visualizer bzw. Layer.
 *
 * Statt je Buchstabe einen eigenen Layer in voller Canvas-Größe zu rechnen,
 * wird jedes Zeichen nur in der Größe seiner Zelle gerendert und gleiche
 * Zeichen pro Frame nur einmal (danach kopiert). Aussehen und
 * Audio-Reaktion entsprechen den einzelnen LED-Buchstaben/-Ziffern.
 *
 * Text und Modus kommen – wie das Bild der Portrait-Presets – über
 * visualizerState._ledText, das der Render-Loop (bzw. der Worker) direkt vor
 * draw() setzt: { key, ...LED-Konfiguration }. `key` trennt die Glättung der
 * Zeichen je Layer.
 *
 * @module visualizers/gl/ledText
 */

import { createGlVisualizer } from './createGlVisualizer.js'
import {
  makeLedDigitPreset,
  makeLedLetterPreset,
  makeLedColonPreset,
} from './presets/glLedDigits.js'
import { visualizerState } from '../core/state.js'
import { LED_TEXT_ID, LED_NUMBER_ID, parseLedText, ledDisplayText } from './ledTextSettings.js'

/** Glyphen-Preset für ein Zeichen (A–Z, 0–9, ':'), sonst null. */
export function glyphPresetFor(ch) {
  if (ch >= 'A' && ch <= 'Z') return makeLedLetterPreset(ch)
  if (ch >= '0' && ch <= '9') return makeLedDigitPreset(Number(ch))
  if (ch === ':') return makeLedColonPreset()
  return null
}

const isGlyph = (ch) => (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === ':'

/**
 * Raster für den Text: Spalten = längste Zeile, Zeilen = Zeilenanzahl.
 * Alle Zellen sind gleich groß; die Glyphe passt sich (wie der einzelne
 * LED-Buchstabe) in die kürzere Kante ihrer Zelle ein. Zeilen sind zentriert.
 * @param {string[]} lines
 * @param {number} width
 * @param {number} height
 */
export function ledTextLayout(lines, width, height) {
  const cols = Math.max(1, ...lines.map((l) => l.length))
  const rows = Math.max(1, lines.length)
  const cellW = Math.floor(width / cols)
  const cellH = Math.floor(height / rows)
  const offsetX = Math.floor((width - cellW * cols) / 2)
  const offsetY = Math.floor((height - cellH * rows) / 2)
  const cells = []
  lines.forEach((line, r) => {
    const startCol = (cols - line.length) / 2
    ;[...line].forEach((ch, c) => {
      if (!isGlyph(ch)) return // Leerzeichen → leere Zelle
      cells.push({ ch, x: Math.round(offsetX + (startCol + c) * cellW), y: offsetY + r * cellH })
    })
  })
  return { cellW, cellH, cells }
}

// Glyphen-Visualizer je Instanz-Schlüssel (Layer) und Zeichen – eigene
// Audio-Glättung pro Layer. Obergrenze gegen Wachstum bei vielen Layer-Wechseln.
const MAX_GLYPH_INSTANCES = 400
const glyphInstances = new Map()

function glyphVisualizer(key, ch) {
  const id = `${key}\u0000${ch}`
  let viz = glyphInstances.get(id)
  if (viz) return viz
  const spec = glyphPresetFor(ch)
  if (!spec) return null
  if (glyphInstances.size >= MAX_GLYPH_INSTANCES) glyphInstances.clear()
  viz = createGlVisualizer(spec)
  glyphInstances.set(id, viz)
  return viz
}

/** Glättung aller Glyphen zurücksetzen (Visualizer-Wechsel). */
function resetGlyphs() {
  for (const viz of glyphInstances.values()) {
    try {
      viz.cleanup?.()
    } catch {
      /* best effort */
    }
  }
  glyphInstances.clear()
}

// Zell-Canvas (Main-Thread und Worker)
let glyphCanvas = null
let glyphCtx = null
function ensureGlyphCanvas(w, h) {
  if (glyphCanvas && glyphCanvas.width === w && glyphCanvas.height === h) return glyphCtx
  if (glyphCanvas) {
    glyphCanvas.width = w
    glyphCanvas.height = h
    return glyphCtx
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    glyphCanvas = new OffscreenCanvas(w, h)
  } else if (typeof document !== 'undefined') {
    glyphCanvas = document.createElement('canvas')
    glyphCanvas.width = w
    glyphCanvas.height = h
  } else {
    return null
  }
  glyphCtx = glyphCanvas.getContext('2d')
  return glyphCtx
}

/**
 * Text aus LED-Glyphen auf ctx zeichnen (ganze Fläche width × height).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text - Rohtext (wird normalisiert)
 * @param {{digitsOnly?: boolean, key?: string}} [options]
 */
export function drawLedText(
  ctx,
  text,
  dataArray,
  bufferLength,
  width,
  height,
  color,
  intensity,
  { digitsOnly = false, key = 'default' } = {},
) {
  const lines = parseLedText(text, { digitsOnly })
  if (!lines.length) return
  const { cellW, cellH, cells } = ledTextLayout(lines, width, height)
  if (cellW < 2 || cellH < 2 || !cells.length) return
  const gctx = ensureGlyphCanvas(cellW, cellH)
  if (!gctx) return

  // Gleiche Zeichen nur einmal rendern, dann an alle Stellen kopieren
  const byChar = new Map()
  for (const cell of cells) {
    if (!byChar.has(cell.ch)) byChar.set(cell.ch, [])
    byChar.get(cell.ch).push(cell)
  }
  for (const [ch, positions] of byChar) {
    const viz = glyphVisualizer(key, ch)
    if (!viz) continue
    gctx.setTransform(1, 0, 0, 1, 0, 0)
    gctx.clearRect(0, 0, cellW, cellH)
    try {
      viz.draw(gctx, dataArray, bufferLength, cellW, cellH, color, intensity)
    } catch (e) {
      console.error(`[LED-Text] Zeichen "${ch}" Fehler:`, e)
      continue
    }
    for (const pos of positions) ctx.drawImage(glyphCanvas, pos.x, pos.y)
  }
}

/**
 * Registry-Eintrag für LED-Text bzw. LED-Zahlen (gleicher Vertrag wie jeder
 * andere Visualizer: draw(ctx, data, len, w, h, color, intensity)).
 */
function createLedTextVisualizer(id, name_de, name_en) {
  const digitsOnly = id === LED_NUMBER_ID
  return {
    name_de,
    name_en,
    kind: 'gl',
    ledText: true,
    needsTimeData: false,
    needsImage: false,
    edgeFade: 'none',
    init() {
      resetGlyphs()
    },
    cleanup() {
      // Glyphen können von anderen Layern mitbenutzt werden → nichts freigeben
    },
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const cfg = visualizerState._ledText || {}
      const text = ledDisplayText(id, cfg)
      drawLedText(ctx, text, dataArray, bufferLength, w, h, color, intensity, {
        digitsOnly,
        key: cfg.key || 'default',
      })
    },
  }
}

export const ledTextVisualizers = {
  [LED_TEXT_ID]: createLedTextVisualizer(LED_TEXT_ID, 'LED-Text (Wörter)', 'LED Text (words)'),
  [LED_NUMBER_ID]: createLedTextVisualizer(
    LED_NUMBER_ID,
    'LED-Zahlen (Uhr, Countdown)',
    'LED Numbers (clock, countdown)',
  ),
}
