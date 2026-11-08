/**
 * Beat-Punch mit Variation: statt die ganze Ebene einheitlich zu zoomen,
 * bekommt jede von mehreren weichen Spalten bei jedem Beat eine eigene Stärke
 * und einen leichten Zeitversatz – Bereiche der Ebene reagieren dadurch
 * unterschiedlich auf denselben Beat.
 *
 * Die Spalten überlappen mit linearen Verläufen, die sich zu 1 addieren
 * (Partition der Eins). Additiv zusammengesetzt ergibt das exakt die
 * gewichtete Mischung der Spalten-Kopien – keine Risse, kein Aufhellen.
 * Bei Variation 0 sind alle Spalten gleich und der Aufrufer nutzt den
 * bisherigen einfachen Zoom.
 *
 * @module visualizers/core/beatPunchVariation
 */
import { advancePunch, punchScale } from './onsetReactive'

/** Anzahl der Spalten, in die die Ebene beim Variieren geteilt wird. */
export const PUNCH_BANDS = 4
/** Größter Zeitversatz einer Spalte in Frames (bei Variation 100 %). */
export const MAX_DELAY_FRAMES = 4
/** Onset-Anstieg, ab dem ein neuer Beat erkannt und neu gewürfelt wird. */
const ONSET_RISE = 0.1

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type CanvasFactory = (w: number, h: number) => HTMLCanvasElement

/** Zustand der Variation (siehe createPunchVariationState) */
export interface PunchVariationState {
  bands: number
  random: () => number
  env: Float64Array
  factor: Float64Array
  delay: Uint8Array
  /** jüngster Onset zuletzt */
  history: Float64Array
  prevOnset: number
}

/**
 * Zustand für die Variation: je Spalte Hüllkurve, Faktor und Versatz.
 *
 * @param {number} [bands]
 * @param {() => number} [random] - Zufallsquelle (für Tests ersetzbar)
 */
export function createPunchVariationState(
  bands = PUNCH_BANDS,
  random: () => number = Math.random,
): PunchVariationState {
  return {
    bands,
    random,
    env: new Float64Array(bands),
    factor: new Float64Array(bands).fill(1),
    delay: new Uint8Array(bands),
    history: new Float64Array(MAX_DELAY_FRAMES + 1), // juengster Onset zuletzt
    prevOnset: 0,
  }
}

/**
 * Führt die Variation einen Frame weiter und liefert den Zoom je Spalte.
 *
 * Ein neuer Beat (Onset steigt sprunghaft) würfelt je Spalte einen Faktor in
 * [1 − v, 1 + v] und einen Versatz von 0 … MAX_DELAY_FRAMES · v Frames.
 *
 * @param {object} state - aus createPunchVariationState()
 * @param {number} onset - Onset 0–1 der gewählten Quelle
 * @param {number} strength - Stärke 0–100
 * @param {number} variation - Variation 0–100
 * @returns {number[]} Zoomfaktor je Spalte (≥ 0.9)
 */
export function updatePunchVariation(
  state: PunchVariationState,
  onset: number,
  strength: number,
  variation: number | null | undefined,
): number[] {
  const v = clamp01((variation ?? 0) / 100)
  const o = clamp01(onset)

  // Onset-Verlauf fortschreiben (für den Versatz)
  const h = state.history
  h.copyWithin(0, 1)
  h[h.length - 1] = o

  // Neuer Beat: Stärke und Versatz je Spalte neu würfeln
  if (v > 0 && o > state.prevOnset + ONSET_RISE) {
    for (let k = 0; k < state.bands; k++) {
      state.factor[k] = 1 + (state.random() * 2 - 1) * v
      state.delay[k] = Math.round(state.random() * MAX_DELAY_FRAMES * v)
    }
  }
  state.prevOnset = o

  const scales: number[] = []
  for (let k = 0; k < state.bands; k++) {
    // k < bands: alle Spalten-Arrays haben die Länge bands, delay ≤ MAX_DELAY_FRAMES
    const delayed = v > 0 ? (h[h.length - 1 - (state.delay[k] as number)] as number) : o
    const env = advancePunch(state.env[k] as number, delayed)
    state.env[k] = env
    const extra = punchScale(env, strength) - 1
    scales.push(Math.max(0.9, 1 + extra * (v > 0 ? (state.factor[k] as number) : 1)))
  }
  return scales
}

/**
 * True, wenn alle Spalten (praktisch) gleich zoomen – dann genügt der
 * einfache Zoom der ganzen Ebene.
 * @param {number[]} scales
 */
export function punchScalesUniform(scales: number[] | null | undefined): boolean {
  if (!scales || scales.length < 2) return true
  let min = scales[0] as number // length ≥ 2
  let max = min
  for (const s of scales) {
    if (s < min) min = s
    if (s > max) max = s
  }
  return max - min < 1e-4
}

/**
 * Gewicht der Spalte k an der Position x (0–1). Benachbarte Spalten
 * überblenden linear über eine Breite von `feather` Spaltenbreiten; die
 * Gewichte aller Spalten addieren sich überall zu 1.
 *
 * @param {number} x - 0–1 über die Breite
 * @param {number} k - Spaltenindex
 * @param {number} bands
 * @param {number} [feather] - Überblendbreite in Spaltenbreiten (0–1)
 */
export function bandWeight(x: number, k: number, bands: number, feather = 0.5): number {
  const w = 1 / bands
  const f = Math.max(1e-6, feather * w)
  const left = k * w
  const right = (k + 1) * w
  const rise = k === 0 ? 1 : clamp01((x - (left - f / 2)) / f)
  const fall = k === bands - 1 ? 1 : clamp01((right + f / 2 - x) / f)
  return Math.min(rise, fall)
}

// ── Zeichnen ────────────────────────────────────────────────────────────────

let createCanvas: CanvasFactory = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Nur für Tests: Canvas-Fabrik ersetzen. */
export function setPunchCanvasFactory(fn: CanvasFactory | null | undefined): void {
  createCanvas = fn || createCanvas
  layer = null
  band = null
}

let layer: HTMLCanvasElement | null = null
let band: HTMLCanvasElement | null = null

function ensureCanvases(w: number, h: number) {
  if (!layer || !band || layer.width !== w || layer.height !== h) {
    layer = createCanvas(w, h)
    band = createCanvas(w, h)
  }
  return { layer, layerCtx: layer.getContext('2d'), band, bandCtx: band.getContext('2d') }
}

/**
 * Zeichnet die Ebene als weich überblendete Spalten mit je eigenem Zoom.
 *
 * @param {CanvasRenderingContext2D} ctx - Ziel
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw - zeichnet die Ebene
 * @param {number} width
 * @param {number} height
 * @param {number[]} scales - Zoom je Spalte (aus updatePunchVariation)
 * @param {number} [feather] - Überblendbreite in Spaltenbreiten
 */
export function drawPunchedBands(
  ctx: Ctx,
  draw: (ctx: Ctx, w: number, h: number) => void,
  width: number,
  height: number,
  scales: number[],
  feather = 0.5,
): void {
  const bands = scales.length
  const { layer: acc, layerCtx, band: tmp, bandCtx } = ensureCanvases(width, height)
  if (!layerCtx || !bandCtx) {
    // Kein 2D-Context (z. B. jsdom): einheitlicher Zoom als Rueckfall
    const s = scales.reduce((a, b) => a + b, 0) / bands
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(s, s)
    ctx.translate(-width / 2, -height / 2)
    draw(ctx, width, height)
    ctx.restore()
    return
  }

  layerCtx.clearRect(0, 0, width, height)
  const w = width / bands
  const f = Math.max(1, feather * w)

  for (let k = 0; k < bands; k++) {
    const s = scales[k] as number // k < bands
    const cx = (k + 0.5) * w
    const cy = height / 2

    // Spalten-Kopie: die ganze Ebene, um die Spaltenmitte gezoomt
    bandCtx.clearRect(0, 0, width, height)
    bandCtx.save()
    bandCtx.translate(cx, cy)
    bandCtx.scale(s, s)
    bandCtx.translate(-cx, -cy)
    draw(bandCtx, width, height)
    bandCtx.restore()

    // Weiche Spaltenmaske (linear, komplementaer zu den Nachbarn)
    const g = bandCtx.createLinearGradient(0, 0, width, 0)
    const left = k * w
    const right = (k + 1) * w
    const stop = (x: number, a: number) => g.addColorStop(clamp01(x / width), `rgba(0,0,0,${a})`)
    if (k === 0) stop(0, 1)
    else {
      stop(0, 0)
      stop(left - f / 2, 0)
      stop(left + f / 2, 1)
    }
    if (k === bands - 1) stop(width, 1)
    else {
      stop(right - f / 2, 1)
      stop(right + f / 2, 0)
      stop(width, 0)
    }
    bandCtx.save()
    bandCtx.globalCompositeOperation = 'destination-in'
    bandCtx.fillStyle = g
    bandCtx.fillRect(0, 0, width, height)
    bandCtx.restore()

    // Additiv sammeln: Gewichte summieren sich zu 1 -> exakte Mischung
    layerCtx.save()
    layerCtx.globalCompositeOperation = 'lighter'
    layerCtx.drawImage(tmp, 0, 0)
    layerCtx.restore()
  }

  ctx.drawImage(acc, 0, 0)
}
