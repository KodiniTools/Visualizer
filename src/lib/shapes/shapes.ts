/**
 * Formen & Symbole
 *
 * Übernommen aus KodiniTools/Bildkonverter (src/utils/shapes.js).
 *
 * Reine Logik der Formen-Ebenen im Editor: Galerie-Katalog, Erzeugen neuer
 * Formen, Pfad-Geometrie, Zeichnen, Hit-Testing, Griffe und das Anpassen an
 * Zuschnitt/neue Canvas-Größe.
 *
 * Jede Form wird in einem lokalen Koordinatensystem beschrieben, dessen
 * Ursprung der Mittelpunkt der Form ist (Breite × Höhe = Begrenzungsrahmen).
 * Die Pfade sind SVG-Pfaddaten: dieselbe Geometrie zeichnet der Canvas
 * (Path2D) und die Vorschaubilder der Galerie (<path d>).
 *
 * Form-Objekt (reaktiver Eintrag in shapeStore.shapes):
 * {
 *   id, type,            // Pfad-Typ aus SHAPE_PATHS
 *   x, y,                // Mittelpunkt in Canvas-Pixeln
 *   width, height,       // Begrenzungsrahmen in Canvas-Pixeln
 *   rotation,            // Grad, im Uhrzeigersinn
 *   opacity,             // 0–100
 *   flipX, flipY,        // Spiegelung
 *   filled, fillColor,   // Füllung (nur Flächenformen)
 *   strokeColor, strokeWidth, dash,  // Kontur bzw. Linie ('solid'|'dashed'|'dotted')
 *   shadowBlur, shadowColor,
 *   number, textColor, markerStyle,   // nur Marker ('circle'|'square')
 *   effect, region, intensity,        // nur Verpixeln/Weichzeichnen
 *   text, textColor, fontFamily,      // nur Formen mit Textfeld (SHAPE_PATHS[type].textBox)
 *   textScale, textAlign,             // Schriftgröße relativ zu min(Breite, Höhe)
 *   points, tool,                     // nur Freihand: normierte Punkte, 'pen'|'highlighter'
 *   fillType, fillColor2, gradientAngle, // Füllung: 'solid'|'linear'|'radial'
 *   emoji,                            // nur Emoji-Sticker
 * }
 */
import type { Rect } from '../canvasObjects/geometry'

/** Punkt als [x, y] */
export type ShapePoint = readonly [number, number]

/** Form-Objekt (Felder je nach Formart, siehe Kopfkommentar) */
export interface Shape {
  id: string
  type: string
  galleryId?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  flipX: boolean
  flipY: boolean
  filled: boolean
  fillColor: string
  strokeColor: string
  strokeWidth: number
  dash: string
  shadowBlur: number
  shadowColor: string
  number?: number
  textColor?: string
  markerStyle?: string
  effect?: string
  region?: string
  intensity?: number
  text?: string
  fontFamily?: string
  textScale?: number
  textAlign?: string
  points?: ShapePoint[]
  tool?: string
  fillType?: string
  fillColor2?: string
  gradientAngle?: number
  emoji?: string
}

/** Lage und Größe einer Form (Mittelpunkt, Rahmen, Drehung) */
export interface ShapeGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

/** Formabhängige Pfad-Varianten (Marker-Stil, Zensur-Umriss, Freihand-Punkte) */
export interface ShapePathOptions {
  markerStyle?: string
  region?: string
  points?: readonly ShapePoint[] | null
}

/** Pfad-Generator je Form-Typ */
export interface ShapePathDef {
  kind: ShapeKind
  fillRule?: CanvasFillRule
  path(w: number, h: number, shape?: ShapePathOptions | null): string
  /** Textbereich im lokalen System (x/y = Mitte) */
  textBox?(w: number, h: number): Rect
}

/** Startwerte eines Galerie-Eintrags */
export type ShapePreset = Partial<Shape> & {
  strokeRatio?: number
  color?: string
  textKey?: string
}

/** Eintrag der Formen-Galerie */
export interface ShapeGalleryItem {
  id: string
  type: string
  category?: string
  aspect?: number
  preset?: ShapePreset
  tool?: string
}

export type ShapeKind = 'fill' | 'stroke' | 'marker' | 'emoji' | 'effect'
export type ShapeCorner = 'nw' | 'ne' | 'se' | 'sw'

interface DrawToolDefaults {
  color: string
  widthRatio: number
  opacity: number
}

type Vec = { x: number; y: number }

/**
 * Zeichenart: Flächenformen werden gefüllt (+ optionale Kontur), Linienformen
 * nur gestrichen, Marker zeigen zusätzlich eine Nummer, Effekte (Verpixeln,
 * Weichzeichnen) verändern den Bildinhalt unter sich.
 */
export const SHAPE_KIND: Readonly<{
  FILL: 'fill'
  STROKE: 'stroke'
  MARKER: 'marker'
  EMOJI: 'emoji'
  EFFECT: 'effect'
}> = Object.freeze({
  FILL: 'fill',
  STROKE: 'stroke',
  MARKER: 'marker',
  EMOJI: 'emoji',
  EFFECT: 'effect',
})

export const SHAPE_CATEGORIES = Object.freeze([
  'basic',
  'arrows',
  'lines',
  'symbols',
  'annotate',
  'stickers',
  'draw',
])

/** Füllarten: einfarbig oder Farbverlauf */
export const FILL_TYPES: readonly string[] = Object.freeze(['solid', 'linear', 'radial'])

/** Emoji-Sticker der Galerie (id → Zeichen) */
export const EMOJI_SET: Readonly<Record<string, string>> = Object.freeze({
  emojiThumbsUp: '👍',
  emojiSmile: '😀',
  emojiLove: '😍',
  emojiParty: '🎉',
  emojiFire: '🔥',
  emojiHeart: '❤️',
  emojiStar: '⭐',
  emojiCheck: '✅',
  emojiWarning: '⚠️',
  emojiIdea: '💡',
  emojiEyes: '👀',
  emojiHundred: '💯',
  emojiJoy: '😂',
  emojiRofl: '🤣',
  emojiBlush: '😊',
  emojiHearts: '🥰',
  emojiKiss: '😘',
  emojiCool: '😎',
  emojiWink: '😉',
  emojiThinking: '🤔',
  emojiCry: '😢',
  emojiSob: '😭',
  emojiAngry: '😡',
  emojiScream: '😱',
  emojiPray: '🙏',
  emojiClap: '👏',
  emojiRaisedHands: '🙌',
  emojiMuscle: '💪',
  emojiOk: '👌',
  emojiWave: '👋',
  emojiSparkles: '✨',
  emojiRocket: '🚀',
})
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

/** Effekte der Zensur-Form und ihre Umrissformen */
export const CENSOR_EFFECTS: readonly string[] = Object.freeze(['pixelate', 'blur'])
export const CENSOR_REGIONS: readonly string[] = Object.freeze(['rect', 'ellipse'])
export const MARKER_STYLES: readonly string[] = Object.freeze(['circle', 'square'])
export const MARKER_MAX = 999

export const DASH_STYLES: readonly string[] = Object.freeze(['solid', 'dashed', 'dotted'])

/** Text in Formen */
export const TEXT_ALIGNS: readonly string[] = Object.freeze(['left', 'center', 'right'])
export const SHAPE_TEXT_DEFAULTS = Object.freeze({
  fontFamily: 'Satoshi Bold',
  textColor: '#1f2937',
  textScale: 0.22,
  textAlign: 'center',
})
/** Grenzen für textScale (Anteil an min(Breite, Höhe)) */
export const TEXT_SCALE_LIMITS = Object.freeze({ min: 0.04, max: 0.9 })
const TEXT_LINE_HEIGHT = 1.2

/** Freihand-Werkzeuge: Stift und halbtransparenter Textmarker */
export const DRAW_TOOLS: readonly string[] = Object.freeze(['pen', 'highlighter'])
export const DRAW_TOOL_DEFAULTS: Readonly<{
  pen: DrawToolDefaults
  highlighter: DrawToolDefaults
}> = Object.freeze({
  pen: { color: '#e53935', widthRatio: 0.006, opacity: 100 },
  highlighter: { color: '#ffeb3b', widthRatio: 0.03, opacity: 60 },
})

export const SHAPE_LIMITS = Object.freeze({
  minSize: 4,
  maxStroke: 100,
  maxShadow: 50,
})

const DEFAULT_COLOR = '#e53935'

// ===== GEOMETRIE-HELFER =====

const r2 = (n: number) => Math.round(n * 100) / 100

/** Standardwerte eines Zeichenwerkzeugs (undefined bei unbekanntem Werkzeug) */
function drawToolDefaults(tool: string | undefined): DrawToolDefaults | undefined {
  return (DRAW_TOOL_DEFAULTS as Record<string, DrawToolDefaults | undefined>)[tool as string]
}

/** Punktliste → geschlossener SVG-Pfad */
function polygonPath(points: readonly ShapePoint[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r2(x)} ${r2(y)}`).join(' ') + ' Z'
}

/** Skaliert normierte Punkte so, dass ihr Begrenzungsrahmen exakt w × h füllt. */
function fitPoints(points: readonly ShapePoint[], w: number, h: number): [number, number][] {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const sx = w / (maxX - minX || 1)
  const sy = h / (maxY - minY || 1)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return points.map(([x, y]): [number, number] => [(x - cx) * sx, (y - cy) * sy])
}

/** Regelmäßiges n-Eck (Spitze oben), auf den Rahmen gestreckt */
function regularPolygon(n: number, w: number, h: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    pts.push([Math.cos(a), Math.sin(a)])
  }
  return polygonPath(fitPoints(pts, w, h))
}

/** Stern mit `spikes` Zacken und Innenradius-Verhältnis `inner` */
function starPath(spikes: number, inner: number, w: number, h: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < spikes * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / spikes
    const r = i % 2 === 0 ? 1 : inner
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return polygonPath(fitPoints(pts, w, h))
}

/** Ellipse als zwei Bögen (Mittelpunkt cx/cy) */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M ${r2(cx - rx)} ${r2(cy)} ` +
    `A ${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx + rx)} ${r2(cy)} ` +
    `A ${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx - rx)} ${r2(cy)} Z`
  )
}

/** Abgerundetes Rechteck (Mittelpunkt im Ursprung) */
function roundedRectPath(w: number, h: number, radius: number): string {
  const a = w / 2
  const b = h / 2
  const r = Math.max(0, Math.min(radius, a, b))
  if (r === 0)
    return polygonPath([
      [-a, -b],
      [a, -b],
      [a, b],
      [-a, b],
    ])
  return [
    `M ${r2(-a + r)} ${r2(-b)}`,
    `H ${r2(a - r)}`,
    `A ${r2(r)} ${r2(r)} 0 0 1 ${r2(a)} ${r2(-b + r)}`,
    `V ${r2(b - r)}`,
    `A ${r2(r)} ${r2(r)} 0 0 1 ${r2(a - r)} ${r2(b)}`,
    `H ${r2(-a + r)}`,
    `A ${r2(r)} ${r2(r)} 0 0 1 ${r2(-a)} ${r2(b - r)}`,
    `V ${r2(-b + r)}`,
    `A ${r2(r)} ${r2(r)} 0 0 1 ${r2(-a + r)} ${r2(-b)}`,
    'Z',
  ].join(' ')
}

/** Offene Pfeilspitze an `tip`, die entgegen `dir` (Einheitsvektor) zeigt */
function arrowHead(tip: Vec, dir: Vec, length: number, spread: number): string {
  const back = { x: tip.x - dir.x * length, y: tip.y - dir.y * length }
  const nx = -dir.y * spread
  const ny = dir.x * spread
  return (
    `M ${r2(back.x + nx)} ${r2(back.y + ny)} ` +
    `L ${r2(tip.x)} ${r2(tip.y)} ` +
    `L ${r2(back.x - nx)} ${r2(back.y - ny)}`
  )
}

/** Breite der Etiketten-Spitze */
function labelPointWidth(w: number, h: number): number {
  return Math.min(h * 0.5, w * 0.3)
}

// Wellenlinie als Vorschau, solange eine Freihand-Form keine Punkte hat
const FREEHAND_PREVIEW: readonly ShapePoint[] = Object.freeze([
  [-0.5, 0.2],
  [-0.32, -0.3],
  [-0.14, 0.1],
  [0.04, 0.5],
  [0.22, -0.1],
  [0.38, -0.5],
  [0.5, -0.2],
])

/**
 * Glatter Pfad durch Punkte (quadratische Kurven über die Mittelpunkte).
 * Punkte sind auf den Rahmen normiert (-0,5 … 0,5).
 */
function freehandPath(
  w: number,
  h: number,
  points: readonly ShapePoint[] | null | undefined,
): string {
  const src = Array.isArray(points) && points.length ? points : FREEHAND_PREVIEW
  const p = src.map(([x, y]): ShapePoint => [x * w, y * h])
  // Indizes liegen innerhalb von p (Länge vorher geprüft)
  const at = (i: number) => p[i] as ShapePoint
  const pt = ([x, y]: ShapePoint) => `${r2(x)} ${r2(y)}`
  if (p.length === 1) return `M ${pt(at(0))} L ${pt(at(0))}`
  if (p.length === 2) return `M ${pt(at(0))} L ${pt(at(1))}`
  let d = `M ${pt(at(0))}`
  for (let i = 1; i < p.length - 1; i++) {
    const mid: ShapePoint = [(at(i)[0] + at(i + 1)[0]) / 2, (at(i)[1] + at(i + 1)[1]) / 2]
    d += ` Q ${pt(at(i))} ${pt(mid)}`
  }
  return `${d} L ${pt(at(p.length - 1))}`
}

// ===== PFADE =====

/**
 * Pfad-Generatoren je Form-Typ: (w, h) → SVG-Pfaddaten im lokalen System.
 * `kind` legt fest, ob gefüllt oder nur gestrichen wird; `fillRule` für Formen
 * mit Loch.
 */
export const SHAPE_PATHS: Readonly<Record<string, ShapePathDef>> = Object.freeze({
  rect: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => roundedRectPath(w, h, 0),
    textBox: (w, h) => ({ x: 0, y: 0, width: w * 0.88, height: h * 0.84 }),
  },
  roundedRect: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => roundedRectPath(w, h, Math.min(w, h) * 0.2),
    textBox: (w, h) => ({ x: 0, y: 0, width: w * 0.86, height: h * 0.8 }),
  },
  ellipse: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => ellipsePath(0, 0, w / 2, h / 2),
    // Größtes einbeschriebenes Rechteck ≈ 0,707 × Achsen, mit etwas Rand
    textBox: (w, h) => ({ x: 0, y: 0, width: w * 0.66, height: h * 0.64 }),
  },
  triangle: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) =>
      polygonPath([
        [0, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ]),
  },
  rightTriangle: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) =>
      polygonPath([
        [-w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ]),
  },
  diamond: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) =>
      polygonPath([
        [0, -h / 2],
        [w / 2, 0],
        [0, h / 2],
        [-w / 2, 0],
      ]),
    textBox: (w, h) => ({ x: 0, y: 0, width: w * 0.48, height: h * 0.46 }),
  },
  pentagon: { kind: SHAPE_KIND.FILL, path: (w, h) => regularPolygon(5, w, h) },
  hexagon: { kind: SHAPE_KIND.FILL, path: (w, h) => regularPolygon(6, w, h) },
  ring: {
    kind: SHAPE_KIND.FILL,
    fillRule: 'evenodd',
    path: (w, h) => `${ellipsePath(0, 0, w / 2, h / 2)} ${ellipsePath(0, 0, w * 0.3, h * 0.3)}`,
  },

  line: {
    kind: SHAPE_KIND.STROKE,
    path: (w) => `M ${r2(-w / 2)} 0 L ${r2(w / 2)} 0`,
  },
  arrow: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h) => {
      const head = Math.min(h * 0.9, w * 0.45)
      return `M ${r2(-w / 2)} 0 L ${r2(w / 2)} 0 ${arrowHead({ x: w / 2, y: 0 }, { x: 1, y: 0 }, head, h / 2)}`
    },
  },
  doubleArrow: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h) => {
      const head = Math.min(h * 0.9, w * 0.3)
      return (
        `M ${r2(-w / 2)} 0 L ${r2(w / 2)} 0 ` +
        `${arrowHead({ x: w / 2, y: 0 }, { x: 1, y: 0 }, head, h / 2)} ` +
        arrowHead({ x: -w / 2, y: 0 }, { x: -1, y: 0 }, head, h / 2)
      )
    },
  },
  curvedArrow: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const start = { x: -a, y: b }
      const ctrl = { x: -a * 0.1, y: -b * 1.1 }
      const end = { x: a, y: -b * 0.15 }
      const tx = end.x - ctrl.x
      const ty = end.y - ctrl.y
      const len = Math.hypot(tx, ty) || 1
      const head = Math.min(w, h) * 0.35
      return (
        `M ${r2(start.x)} ${r2(start.y)} Q ${r2(ctrl.x)} ${r2(ctrl.y)} ${r2(end.x)} ${r2(end.y)} ` +
        arrowHead(end, { x: tx / len, y: ty / len }, head, head * 0.7)
      )
    },
  },
  blockArrow: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const s = b * 0.45
      const head = Math.min(w * 0.45, h * 0.9)
      return polygonPath([
        [-a, -s],
        [a - head, -s],
        [a - head, -b],
        [a, 0],
        [a - head, b],
        [a - head, s],
        [-a, s],
      ])
    },
  },
  doubleBlockArrow: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const s = b * 0.45
      const head = Math.min(w * 0.3, h * 0.9)
      return polygonPath([
        [-a, 0],
        [-a + head, -b],
        [-a + head, -s],
        [a - head, -s],
        [a - head, -b],
        [a, 0],
        [a - head, b],
        [a - head, s],
        [-a + head, s],
        [-a + head, b],
      ])
    },
  },
  chevron: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const t = Math.min(w * 0.5, h * 0.5)
      return polygonPath([
        [-a, -b],
        [a - t, -b],
        [a, 0],
        [a - t, b],
        [-a, b],
        [-a + t, 0],
      ])
    },
  },

  star: { kind: SHAPE_KIND.FILL, path: (w, h) => starPath(5, 0.45, w, h) },
  heart: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const p = (x: number, y: number) => `${r2(x * a)} ${r2(y * b)}`
      return (
        `M ${p(0, -0.45)} ` +
        `C ${p(0, -0.95)} ${p(-1, -1.05)} ${p(-1, -0.35)} ` +
        `C ${p(-1, 0.15)} ${p(-0.45, 0.55)} ${p(0, 1)} ` +
        `C ${p(0.45, 0.55)} ${p(1, 0.15)} ${p(1, -0.35)} ` +
        `C ${p(1, -1.05)} ${p(0, -0.95)} ${p(0, -0.45)} Z`
      )
    },
  },
  check: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h) =>
      `M ${r2(-w * 0.45)} ${r2(h * 0.02)} L ${r2(-w * 0.12)} ${r2(h * 0.4)} L ${r2(w * 0.45)} ${r2(-h * 0.4)}`,
  },
  cross: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h) => {
      const a = w * 0.42
      const b = h * 0.42
      return `M ${r2(-a)} ${r2(-b)} L ${r2(a)} ${r2(b)} M ${r2(a)} ${r2(-b)} L ${r2(-a)} ${r2(b)}`
    },
  },
  plus: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const tx = w * 0.17
      const ty = h * 0.17
      return polygonPath([
        [-tx, -b],
        [tx, -b],
        [tx, -ty],
        [a, -ty],
        [a, ty],
        [tx, ty],
        [tx, b],
        [-tx, b],
        [-tx, ty],
        [-a, ty],
        [-a, -ty],
        [-tx, -ty],
      ])
    },
  },
  lightning: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) =>
      polygonPath(
        fitPoints(
          [
            [0.2, -1],
            [-0.65, 0.15],
            [-0.05, 0.15],
            [-0.25, 1],
            [0.65, -0.2],
            [0.05, -0.2],
          ],
          w,
          h,
        ),
      ),
  },
  speechBubble: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const bodyBottom = b * 0.5
      const r = Math.min(w, h) * 0.15
      return [
        `M ${r2(-a + r)} ${r2(-b)}`,
        `H ${r2(a - r)}`,
        `Q ${r2(a)} ${r2(-b)} ${r2(a)} ${r2(-b + r)}`,
        `V ${r2(bodyBottom - r)}`,
        `Q ${r2(a)} ${r2(bodyBottom)} ${r2(a - r)} ${r2(bodyBottom)}`,
        `H ${r2(-a * 0.15)}`,
        `L ${r2(-a * 0.55)} ${r2(b)}`,
        `L ${r2(-a * 0.5)} ${r2(bodyBottom)}`,
        `H ${r2(-a + r)}`,
        `Q ${r2(-a)} ${r2(bodyBottom)} ${r2(-a)} ${r2(bodyBottom - r)}`,
        `V ${r2(-b + r)}`,
        `Q ${r2(-a)} ${r2(-b)} ${r2(-a + r)} ${r2(-b)}`,
        'Z',
      ].join(' ')
    },
    // Nur der Blasenkörper (oberhalb des Zipfels)
    textBox: (w, h) => ({ x: 0, y: -h * 0.125, width: w * 0.86, height: h * 0.62 }),
  },
  // Etikett / Anhänger: Spitze links mit Loch, Text im Rechteckteil
  label: {
    kind: SHAPE_KIND.FILL,
    fillRule: 'evenodd',
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      const p = labelPointWidth(w, h)
      const r = Math.min(w, h) * 0.12
      const hole = Math.min(h * 0.1, p * 0.28)
      return (
        [
          `M ${r2(-a)} 0`,
          `L ${r2(-a + p)} ${r2(-b)}`,
          `H ${r2(a - r)}`,
          `Q ${r2(a)} ${r2(-b)} ${r2(a)} ${r2(-b + r)}`,
          `V ${r2(b - r)}`,
          `Q ${r2(a)} ${r2(b)} ${r2(a - r)} ${r2(b)}`,
          `H ${r2(-a + p)}`,
          'Z',
        ].join(' ') +
        ' ' +
        ellipsePath(-a + p * 0.62, 0, hole, hole)
      )
    },
    textBox: (w, h) => {
      const p = labelPointWidth(w, h)
      return { x: p / 2, y: 0, width: (w - p) * 0.86, height: h * 0.78 }
    },
  },
  pin: {
    kind: SHAPE_KIND.FILL,
    fillRule: 'evenodd',
    path: (w, h) => {
      const a = w / 2
      const b = h / 2
      // Kopf: Ellipse oben, Spitze unten in der Mitte
      const rx = a
      const ry = Math.min(b * 0.62, b)
      const cy = -b + ry
      const sx = rx * 0.87
      const sy = cy + ry * 0.5
      return (
        `M 0 ${r2(b)} L ${r2(-sx)} ${r2(sy)} ` +
        `A ${r2(rx)} ${r2(ry)} 0 1 1 ${r2(sx)} ${r2(sy)} Z ` +
        ellipsePath(0, cy, rx * 0.38, ry * 0.38)
      )
    },
  },

  // Nummerierter Marker: Kreis oder abgerundetes Quadrat (Nummer zeichnet drawShape)
  marker: {
    kind: SHAPE_KIND.MARKER,
    path: (w, h, shape) =>
      shape?.markerStyle === 'square'
        ? roundedRectPath(w, h, Math.min(w, h) * 0.22)
        : ellipsePath(0, 0, w / 2, h / 2),
  },
  // Daumen hoch: Hand mit Manschette
  thumbsUp: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => {
      // Entwurf auf einem 100 × 100-Raster, auf den Rahmen gestreckt
      const p = (x: number, y: number) => `${r2(((x - 50) / 100) * w)} ${r2(((y - 50) / 100) * h)}`
      return (
        `M ${p(31, 96)} L ${p(31, 46)} L ${p(46, 26)} ` +
        `C ${p(50, 20)} ${p(51, 13)} ${p(51, 8)} ` +
        `C ${p(51, 1)} ${p(63, 0)} ${p(66, 7)} ` +
        `C ${p(69, 14)} ${p(68, 25)} ${p(64, 36)} ` +
        `L ${p(88, 36)} ` +
        `C ${p(97, 36)} ${p(99, 46)} ${p(93, 51)} ` +
        `C ${p(99, 55)} ${p(98, 64)} ${p(92, 67)} ` +
        `C ${p(97, 71)} ${p(96, 80)} ${p(89, 82)} ` +
        `C ${p(93, 88)} ${p(90, 96)} ${p(82, 96)} Z ` +
        `M ${p(4, 46)} L ${p(25, 46)} L ${p(25, 96)} L ${p(4, 96)} Z`
      )
    },
  },
  // Siegel/Stern-Badge für „Neu“, „Sale“ usw.
  burst: {
    kind: SHAPE_KIND.FILL,
    path: (w, h) => starPath(16, 0.82, w, h),
    textBox: (w, h) => ({ x: 0, y: 0, width: w * 0.6, height: h * 0.52 }),
  },
  // Emoji: Rahmen nur für Auswahl/Hit-Test, gezeichnet wird das Zeichen
  emoji: {
    kind: SHAPE_KIND.EMOJI,
    path: (w, h) => roundedRectPath(w, h, 0),
  },
  // Freihand (Stift/Textmarker): geglättete Linie durch normierte Punkte
  freehand: {
    kind: SHAPE_KIND.STROKE,
    path: (w, h, shape) => freehandPath(w, h, shape?.points),
  },
  // Verpixeln / Weichzeichnen: Pfad ist nur der Umriss des Bereichs
  censor: {
    kind: SHAPE_KIND.EFFECT,
    path: (w, h, shape) =>
      shape?.region === 'ellipse' ? ellipsePath(0, 0, w / 2, h / 2) : roundedRectPath(w, h, 0),
  },
})

// ===== GALERIE =====

/**
 * Einträge der Galerie. `type` wählt den Pfad, `preset` überschreibt
 * Standardwerte (z. B. gestrichelte Linie, Rahmen ohne Füllung), `aspect` ist
 * das Start-Seitenverhältnis (Breite / Höhe).
 */
export const SHAPE_GALLERY: readonly ShapeGalleryItem[] = Object.freeze([
  { id: 'rect', type: 'rect', category: 'basic', aspect: 1.4 },
  { id: 'roundedRect', type: 'roundedRect', category: 'basic', aspect: 1.4 },
  { id: 'ellipse', type: 'ellipse', category: 'basic', aspect: 1 },
  { id: 'triangle', type: 'triangle', category: 'basic', aspect: 1.1 },
  { id: 'rightTriangle', type: 'rightTriangle', category: 'basic', aspect: 1 },
  { id: 'diamond', type: 'diamond', category: 'basic', aspect: 1 },
  { id: 'pentagon', type: 'pentagon', category: 'basic', aspect: 1 },
  { id: 'hexagon', type: 'hexagon', category: 'basic', aspect: 1.1 },
  { id: 'ring', type: 'ring', category: 'basic', aspect: 1 },
  {
    id: 'frame',
    type: 'rect',
    category: 'basic',
    aspect: 1.4,
    preset: { filled: false, strokeRatio: 0.04 },
  },
  {
    id: 'circleOutline',
    type: 'ellipse',
    category: 'basic',
    aspect: 1,
    preset: { filled: false, strokeRatio: 0.04 },
  },

  { id: 'arrow', type: 'arrow', category: 'arrows', aspect: 4 },
  { id: 'doubleArrow', type: 'doubleArrow', category: 'arrows', aspect: 4 },
  { id: 'curvedArrow', type: 'curvedArrow', category: 'arrows', aspect: 1.6 },
  { id: 'blockArrow', type: 'blockArrow', category: 'arrows', aspect: 1.8 },
  { id: 'doubleBlockArrow', type: 'doubleBlockArrow', category: 'arrows', aspect: 2.2 },
  { id: 'chevron', type: 'chevron', category: 'arrows', aspect: 1.2 },

  { id: 'line', type: 'line', category: 'lines', aspect: 6 },
  { id: 'dashedLine', type: 'line', category: 'lines', aspect: 6, preset: { dash: 'dashed' } },
  { id: 'dottedLine', type: 'line', category: 'lines', aspect: 6, preset: { dash: 'dotted' } },
  {
    id: 'dashedArrow',
    type: 'arrow',
    category: 'lines',
    aspect: 4,
    preset: { dash: 'dashed' },
  },
  {
    id: 'dashedFrame',
    type: 'rect',
    category: 'lines',
    aspect: 1.4,
    preset: { filled: false, dash: 'dashed', strokeRatio: 0.03 },
  },

  { id: 'star', type: 'star', category: 'symbols', aspect: 1, preset: { fillColor: '#f5b301' } },
  { id: 'heart', type: 'heart', category: 'symbols', aspect: 1.1 },
  { id: 'check', type: 'check', category: 'symbols', aspect: 1.2, preset: { color: '#16a34a' } },
  { id: 'cross', type: 'cross', category: 'symbols', aspect: 1 },
  { id: 'plus', type: 'plus', category: 'symbols', aspect: 1 },
  {
    id: 'lightning',
    type: 'lightning',
    category: 'symbols',
    aspect: 0.7,
    preset: { fillColor: '#f5b301' },
  },
  {
    id: 'speechBubble',
    type: 'speechBubble',
    category: 'symbols',
    aspect: 1.3,
    preset: { fillColor: '#ffffff', strokeColor: '#1f2937', strokeRatio: 0.025 },
  },
  { id: 'pin', type: 'pin', category: 'symbols', aspect: 0.75 },

  { id: 'marker', type: 'marker', category: 'annotate', aspect: 1 },
  {
    id: 'markerSquare',
    type: 'marker',
    category: 'annotate',
    aspect: 1,
    preset: { markerStyle: 'square' },
  },
  { id: 'pixelate', type: 'censor', category: 'annotate', aspect: 1.3 },
  {
    id: 'pixelateEllipse',
    type: 'censor',
    category: 'annotate',
    aspect: 0.8,
    preset: { region: 'ellipse' },
  },
  { id: 'blur', type: 'censor', category: 'annotate', aspect: 1.3, preset: { effect: 'blur' } },
  {
    id: 'blurEllipse',
    type: 'censor',
    category: 'annotate',
    aspect: 0.8,
    preset: { effect: 'blur', region: 'ellipse' },
  },
  // Formen mit Text (Text wandert beim Skalieren mit)
  {
    id: 'textBox',
    type: 'roundedRect',
    category: 'annotate',
    aspect: 1.8,
    preset: {
      text: 'Text',
      fillColor: '#ffffff',
      strokeColor: '#1f2937',
      strokeRatio: 0.02,
    },
  },
  {
    id: 'speechBubbleText',
    type: 'speechBubble',
    category: 'annotate',
    aspect: 1.4,
    preset: {
      text: 'Text',
      fillColor: '#ffffff',
      strokeColor: '#1f2937',
      strokeRatio: 0.025,
    },
  },
  {
    id: 'label',
    type: 'label',
    category: 'annotate',
    aspect: 2.2,
    preset: { text: 'Text', fillColor: '#facc15' },
  },

  // Sticker: Daumen hoch, Ausrufe-/Fragezeichen, Badges mit Text, Emojis
  {
    id: 'thumbsUp',
    type: 'thumbsUp',
    category: 'stickers',
    aspect: 1,
    preset: { fillColor: '#f5b301' },
  },
  {
    id: 'exclamation',
    type: 'ellipse',
    category: 'stickers',
    aspect: 1,
    preset: { text: '!', textColor: '#ffffff', textScale: 0.7, fillColor: '#e53935' },
  },
  {
    id: 'question',
    type: 'ellipse',
    category: 'stickers',
    aspect: 1,
    preset: { text: '?', textColor: '#ffffff', textScale: 0.7, fillColor: '#2563eb' },
  },
  {
    id: 'badgeNew',
    type: 'burst',
    category: 'stickers',
    aspect: 1,
    preset: {
      text: 'NEW',
      textKey: 'new',
      textColor: '#ffffff',
      textScale: 0.28,
      fillColor: '#e53935',
    },
  },
  {
    id: 'badgeSale',
    type: 'burst',
    category: 'stickers',
    aspect: 1,
    preset: {
      text: 'SALE',
      textKey: 'sale',
      textColor: '#1f2937',
      textScale: 0.26,
      fillColor: '#f5b301',
    },
  },
  {
    id: 'badgeSaleGradient',
    type: 'burst',
    category: 'stickers',
    aspect: 1,
    preset: {
      text: '-50%',
      textColor: '#ffffff',
      textScale: 0.26,
      fillColor: '#e53935',
      fillType: 'radial',
      fillColor2: '#f5b301',
    },
  },
  ...Object.entries(EMOJI_SET).map(
    ([id, emoji]): ShapeGalleryItem => ({
      id,
      type: 'emoji',
      category: 'stickers',
      aspect: 1,
      preset: { emoji },
    }),
  ),

  // Zeichenwerkzeuge: Kachel schaltet den Zeichenmodus um (keine Form einfügen)
  { id: 'pen', type: 'freehand', category: 'draw', aspect: 1.6, tool: 'pen' },
  { id: 'highlighter', type: 'freehand', category: 'draw', aspect: 1.6, tool: 'highlighter' },
])

export function getShapeKind(type: string | undefined): ShapeKind {
  return SHAPE_PATHS[type as string]?.kind ?? SHAPE_KIND.FILL
}

/** true, wenn die Form ein eingebettetes Textfeld hat */
export function supportsShapeText(type: string | undefined): boolean {
  return typeof SHAPE_PATHS[type as string]?.textBox === 'function'
}

/** Textbereich der Form im lokalen System ({ x, y, width, height }, x/y = Mitte) */
export function getShapeTextBox(
  shape: Pick<Shape, 'type' | 'width' | 'height'> | null | undefined,
): Rect | null {
  const def = SHAPE_PATHS[shape?.type as string]
  if (!def?.textBox) return null
  // def existiert nur mit gesetzter Form
  const s = shape as Pick<Shape, 'width' | 'height'>
  return def.textBox(Math.max(s.width, 0.01), Math.max(s.height, 0.01))
}

/** Gewünschte Schriftgröße in Canvas-px (skaliert mit der Form) */
export function getShapeFontSize(shape: Pick<Shape, 'width' | 'height' | 'textScale'>): number {
  const scale = Number(shape?.textScale) || SHAPE_TEXT_DEFAULTS.textScale
  return Math.max(1, Math.min(shape.width, shape.height) * scale)
}

/** true, wenn die Galerie-Kachel ein Zeichenwerkzeug ist */
export function isDrawToolItem(item: { tool?: string } | null | undefined): boolean {
  return !!item?.tool
}

/** true, wenn die Höhe der Form keine sichtbare Wirkung hat (gerade Linie) */
export function isHeightless(type: string | undefined): boolean {
  return type === 'line'
}

/**
 * SVG-Pfaddaten der Form im lokalen System (leer bei unbekanntem Typ).
 * `options` liefert formabhängige Varianten (markerStyle, region).
 */
export function getShapePathData(
  type: string | undefined,
  width: number,
  height: number,
  options: ShapePathOptions | null = null,
): string {
  const def = SHAPE_PATHS[type as string]
  if (!def) return ''
  return def.path(Math.max(width, 0.01), Math.max(height, 0.01), options)
}

/** Nächste freie Marker-Nummer (höchste vorhandene + 1) */
export function nextMarkerNumber(
  shapes: (Pick<Shape, 'type' | 'number'> | null | undefined)[] | null | undefined,
): number {
  if (!Array.isArray(shapes)) return 1
  const max = shapes.reduce(
    (m, s) => (s?.type === 'marker' ? Math.max(m, Number(s.number) || 0) : m),
    0,
  )
  return Math.min(MARKER_MAX, max + 1)
}

/** Pixelgröße der Verpixelung bzw. Radius der Unschärfe in Canvas-px */
export function getCensorStrength(
  shape: Pick<Shape, 'width' | 'height' | 'intensity' | 'effect'>,
): number {
  const minSide = Math.max(1, Math.min(shape.width, shape.height))
  const intensity = Math.max(1, Math.min(100, Number(shape.intensity) || 50))
  return shape.effect === 'blur'
    ? Math.max(1, (minSide * intensity) / 400)
    : Math.max(2, Math.round((minSide * intensity) / 250))
}

/**
 * Vorschau einer Galerie-Form für eine Kachel: Pfad zentriert in einer
 * `size` × `size`-viewBox.
 */
export function getGalleryPreview(
  item: ShapeGalleryItem,
  size = 40,
  padding = 6,
): ShapeGalleryPreview {
  const box = size - padding * 2
  const aspect = item.aspect || 1
  const width = aspect >= 1 ? box : box * aspect
  const height = isHeightless(item.type) ? box / 4 : aspect >= 1 ? box / aspect : box
  const kind = getShapeKind(item.type)
  const preview: ShapeGalleryPreview = {
    d: getShapePathData(item.type, width, height, item.preset),
    viewBox: `${-size / 2} ${-size / 2} ${size} ${size}`,
    width,
    height,
    kind,
    fillRule: SHAPE_PATHS[item.type]?.fillRule ?? 'nonzero',
    filled: item.preset?.filled ?? true,
    dash: item.preset?.dash ?? 'solid',
    label: kind === SHAPE_KIND.MARKER ? '1' : null,
    emoji: kind === SHAPE_KIND.EMOJI ? (item.preset?.emoji ?? '🙂') : null,
    effect: kind === SHAPE_KIND.EFFECT ? (item.preset?.effect ?? 'pixelate') : null,
    pattern: '',
  }
  if (preview.effect === 'pixelate') {
    // Schachbrett im inneren Bereich als Symbol für Verpixeln
    const cells = 4
    const inner = Math.min(width, height) * (item.preset?.region === 'ellipse' ? 0.62 : 0.8)
    const cell = inner / cells
    const squares: string[] = []
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if ((r + c) % 2) continue
        const x = -inner / 2 + c * cell
        const y = -inner / 2 + r * cell
        squares.push(
          polygonPath([
            [x, y],
            [x + cell, y],
            [x + cell, y + cell],
            [x, y + cell],
          ]),
        )
      }
    }
    preview.pattern = squares.join(' ')
  }
  return preview
}

/** Vorschau-Daten einer Galerie-Kachel */
export interface ShapeGalleryPreview {
  d: string
  viewBox: string
  width: number
  height: number
  kind: ShapeKind
  fillRule: CanvasFillRule
  filled: boolean
  dash: string
  label: string | null
  emoji: string | null
  effect: string | null
  pattern: string
}

let idCounter = 0
function nextShapeId(): string {
  idCounter = (idCounter + 1) % 1e6
  return `shape-${Date.now().toString(36)}-${idCounter}`
}

/**
 * Erzeugt eine neue Form aus einem Galerie-Eintrag, mittig im Canvas und in
 * einer zur Canvas-Größe passenden Startgröße.
 *
 * @param {string} galleryId  id aus SHAPE_GALLERY (oder direkt ein Pfad-Typ)
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {object|null} null bei unbekanntem Eintrag
 */
export function createShape(
  galleryId: string,
  canvasWidth: unknown,
  canvasHeight: unknown,
): Shape | null {
  const item: ShapeGalleryItem | null =
    SHAPE_GALLERY.find((g) => g.id === galleryId) ??
    (SHAPE_PATHS[galleryId] ? { id: galleryId, type: galleryId, aspect: 1 } : null)
  if (!item) return null

  const W = Math.max(1, Number(canvasWidth) || 800)
  const H = Math.max(1, Number(canvasHeight) || 600)
  const base = Math.max(24, Math.round(Math.min(W, H) * 0.22))
  const aspect = item.aspect || 1
  const kind = getShapeKind(item.type)
  const preset: ShapePreset = item.preset || {}

  let width = aspect >= 1 ? base * Math.min(aspect, 1.8) : base * aspect
  let height = aspect >= 1 ? width / aspect : base
  if (isHeightless(item.type)) height = Math.max(8, Math.round(base * 0.12))
  width = Math.round(width)
  height = Math.round(height)

  if (kind === SHAPE_KIND.MARKER) {
    const size = Math.max(24, Math.round(Math.min(W, H) * 0.09))
    width = size
    height = size
  }

  const lineStroke = Math.max(2, Math.round(base * 0.05))
  const strokeRatio = preset.strokeRatio
  const strokeWidth =
    kind === SHAPE_KIND.STROKE
      ? lineStroke
      : strokeRatio
        ? Math.max(1, Math.round(base * strokeRatio))
        : 0
  const color = preset.color ?? DEFAULT_COLOR

  return {
    id: nextShapeId(),
    type: item.type,
    galleryId: item.id,
    x: Math.round(W / 2),
    y: Math.round(H / 2),
    width,
    height,
    rotation: 0,
    opacity: 100,
    flipX: false,
    flipY: false,
    filled: preset.filled ?? true,
    fillColor: preset.fillColor ?? color,
    strokeColor: preset.strokeColor ?? color,
    strokeWidth,
    dash: preset.dash ?? 'solid',
    shadowBlur: 0,
    shadowColor: '#000000',
    ...(kind === SHAPE_KIND.MARKER
      ? {
          number: 1,
          textColor: preset.textColor ?? '#ffffff',
          markerStyle: preset.markerStyle ?? 'circle',
          strokeColor: '#ffffff',
          strokeWidth: Math.max(2, Math.round(width * 0.07)),
        }
      : {}),
    ...(kind === SHAPE_KIND.EFFECT
      ? {
          effect: preset.effect ?? 'pixelate',
          region: preset.region ?? 'rect',
          intensity: 50,
          strokeWidth: 0,
        }
      : {}),
    ...(supportsShapeText(item.type)
      ? {
          text: preset.text ?? '',
          textColor: preset.textColor ?? SHAPE_TEXT_DEFAULTS.textColor,
          fontFamily: preset.fontFamily ?? SHAPE_TEXT_DEFAULTS.fontFamily,
          textScale: preset.textScale ?? SHAPE_TEXT_DEFAULTS.textScale,
          textAlign: preset.textAlign ?? SHAPE_TEXT_DEFAULTS.textAlign,
        }
      : {}),
    ...(item.type === 'freehand' ? { points: [], tool: item.tool ?? 'pen' } : {}),
    ...(kind === SHAPE_KIND.FILL || kind === SHAPE_KIND.MARKER
      ? {
          fillType:
            preset.fillType && FILL_TYPES.includes(preset.fillType) ? preset.fillType : 'solid',
          fillColor2: preset.fillColor2 ?? '#ffffff',
          gradientAngle: preset.gradientAngle ?? 90,
        }
      : {}),
    ...(kind === SHAPE_KIND.EMOJI ? { emoji: preset.emoji ?? '🙂', strokeWidth: 0 } : {}),
  }
}

// ===== FREIHAND =====

/**
 * Begrenzungsrahmen und normierte Punkte aus Canvas-Punkten. Der Rahmen
 * umschließt die Mittellinie; normierte Punkte liegen in -0,5 … 0,5, so dass
 * Verschieben, Skalieren und Drehen wie bei jeder anderen Form funktionieren.
 *
 * @param {{x:number,y:number}[]} canvasPoints
 * @returns {{x:number,y:number,width:number,height:number,points:number[][]}|null}
 */
export function fitFreehandPoints(
  canvasPoints: readonly Vec[] | null | undefined,
): (ShapeGeometry & { points: ShapePoint[] }) | null {
  if (!Array.isArray(canvasPoints) || canvasPoints.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of canvasPoints) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  // Mindestgröße 1 px, damit gerade Striche normierbar bleiben
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const n4 = (v: number) => Math.round(v * 10000) / 10000
  return {
    x: cx,
    y: cy,
    width,
    height,
    points: canvasPoints.map((p): ShapePoint => [n4((p.x - cx) / width), n4((p.y - cy) / height)]),
  }
}

/**
 * Neue Freihand-Form aus Canvas-Punkten.
 * @param {{x:number,y:number}[]} canvasPoints
 * @param {{tool?:string,color?:string,width?:number,opacity?:number}} style
 */
export function createFreehandShape(
  canvasPoints: readonly Vec[] | null | undefined,
  style: { tool?: string; color?: string; width?: number; opacity?: number } = {},
): Shape | null {
  const fit = fitFreehandPoints(canvasPoints)
  if (!fit) return null
  const tool = style.tool && DRAW_TOOLS.includes(style.tool) ? style.tool : 'pen'
  // tool ist ein gültiges Werkzeug: Standardwerte und Galerie-Eintrag existieren
  const defaults = drawToolDefaults(tool) as DrawToolDefaults
  const shape = createShape(tool, 1, 1) as Shape
  return Object.assign(shape, fit, {
    tool,
    strokeColor: style.color || defaults.color,
    fillColor: style.color || defaults.color,
    strokeWidth: Math.max(1, Math.min(SHAPE_LIMITS.maxStroke, Number(style.width) || 4)),
    opacity: Math.max(0, Math.min(100, style.opacity ?? defaults.opacity)),
  })
}

/** Standard-Strichstärke eines Werkzeugs passend zur Canvas-Größe */
export function getDefaultDrawWidth(
  tool: string | undefined,
  canvasWidth: unknown,
  canvasHeight: unknown,
): number {
  const ratio = (drawToolDefaults(tool) ?? DRAW_TOOL_DEFAULTS.pen).widthRatio
  const base = Math.min(Number(canvasWidth) || 800, Number(canvasHeight) || 600)
  return Math.max(2, Math.min(SHAPE_LIMITS.maxStroke, Math.round(base * ratio)))
}

/** Linienmuster in Canvas-Pixeln (abhängig von der Linienstärke) */
export function getDashPattern(dash: string | undefined, strokeWidth: unknown): number[] {
  const sw = Math.max(1, Number(strokeWidth) || 1)
  if (dash === 'dashed') return [sw * 3, sw * 2]
  if (dash === 'dotted') return [0.001, sw * 2]
  return []
}

/**
 * Zeichnet eine Form auf den Kontext (Deckkraft, Rotation, Spiegelung,
 * Schatten, Füllung, Kontur). Der Kontextzustand wird wiederhergestellt.
 */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape | null | undefined): void {
  if (!shape) return
  const def = SHAPE_PATHS[shape.type]
  if (!def) return
  const width = Math.max(shape.width, 0.01)
  const height = Math.max(shape.height, 0.01)
  const path = new Path2D(def.path(width, height, shape))
  const kind = def.kind
  if (kind === SHAPE_KIND.EFFECT) {
    drawCensor(ctx, shape, path)
    return
  }
  if (kind === SHAPE_KIND.EMOJI) {
    drawEmoji(ctx, shape, width, height)
    return
  }
  const isMarker = kind === SHAPE_KIND.MARKER
  const strokeWidth = Math.max(0, Number(shape.strokeWidth) || 0)
  const hasFill = (kind === SHAPE_KIND.FILL || isMarker) && shape.filled !== false
  const hasStroke = strokeWidth > 0

  const hasText = supportsShapeText(shape.type) && String(shape.text ?? '').trim() !== ''
  if (!hasFill && !hasStroke && !isMarker && !hasText) return

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(100, shape.opacity ?? 100)) / 100
  // Textmarker: multiplizieren – dunkle Bildteile (Schrift) bleiben lesbar
  if (shape.type === 'freehand' && shape.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply'
  }
  ctx.translate(shape.x, shape.y)
  if (shape.rotation) ctx.rotate((shape.rotation * Math.PI) / 180)
  // Nur der Umriss wird gespiegelt; Marker-Nummer und Text bleiben lesbar
  ctx.save()
  if (!isMarker && (shape.flipX || shape.flipY)) {
    ctx.scale(shape.flipX ? -1 : 1, shape.flipY ? -1 : 1)
  }

  if (shape.shadowBlur > 0) {
    ctx.shadowColor = shape.shadowColor || '#000000'
    ctx.shadowBlur = shape.shadowBlur
    const offset = Math.max(2, shape.shadowBlur / 3)
    ctx.shadowOffsetX = offset
    ctx.shadowOffsetY = offset
  }

  if (hasFill) {
    ctx.fillStyle = getFillStyle(ctx, shape, width, height)
    ctx.fill(path, def.fillRule || 'nonzero')
    // Schatten nur einmal (sonst doppelt unter der Kontur)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  if (hasStroke) {
    ctx.strokeStyle = shape.strokeColor || DEFAULT_COLOR
    ctx.lineWidth = strokeWidth
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.setLineDash(getDashPattern(isMarker ? 'solid' : shape.dash, strokeWidth))
    ctx.stroke(path)
  }
  ctx.restore()

  if (isMarker) drawMarkerNumber(ctx, shape, width, height)
  if (hasText) drawShapeText(ctx, shape)

  ctx.restore()
}

/**
 * Zerlegt Text in Zeilen, die in `maxWidth` passen (Umbruch an Leerzeichen,
 * Zeilenumbrüche bleiben erhalten). Zu lange Einzelwörter bleiben ganz.
 */
export function wrapShapeText(
  ctx: CanvasRenderingContext2D,
  text: unknown,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of String(text ?? '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    // words ist nicht leer, i < words.length
    let line = words[0] as string
    for (let i = 1; i < words.length; i++) {
      const word = words[i] as string
      const candidate = `${line} ${word}`
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

function shapeFont(size: number, family: string | undefined): string {
  return `${size}px "${family || SHAPE_TEXT_DEFAULTS.fontFamily}", "Helvetica Neue", Arial, sans-serif`
}

/**
 * Text-Layout im Textbereich: Schriftgröße folgt der Form (textScale) und wird
 * verkleinert, bis Breite und Höhe passen.
 * @returns {{ lines: string[], fontSize: number, box: object }|null}
 */
export function layoutShapeText(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
): { lines: string[]; fontSize: number; box: Rect } | null {
  const box = getShapeTextBox(shape)
  if (!box) return null
  let fontSize = getShapeFontSize(shape)
  let lines: string[] = []
  for (let i = 0; i < 30; i++) {
    ctx.font = shapeFont(fontSize, shape.fontFamily)
    lines = wrapShapeText(ctx, shape.text, box.width)
    const tooWide = lines.some((l) => ctx.measureText(l).width > box.width)
    const tooHigh = lines.length * fontSize * TEXT_LINE_HEIGHT > box.height
    if ((!tooWide && !tooHigh) || fontSize <= 4) break
    fontSize = Math.max(4, fontSize * 0.9)
  }
  return { lines, fontSize, box }
}

/** Text in die (bereits verschobene/gedrehte, ungespiegelte) Form schreiben */
function drawShapeText(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const layout = layoutShapeText(ctx, shape)
  if (!layout) return
  const { lines, fontSize, box } = layout
  const align = (
    shape.textAlign && TEXT_ALIGNS.includes(shape.textAlign) ? shape.textAlign : 'center'
  ) as CanvasTextAlign
  const x =
    align === 'left' ? box.x - box.width / 2 : align === 'right' ? box.x + box.width / 2 : box.x
  const lineHeight = fontSize * TEXT_LINE_HEIGHT
  const top = box.y - (lines.length * lineHeight) / 2 + lineHeight / 2

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.setLineDash([])
  ctx.fillStyle = shape.textColor || SHAPE_TEXT_DEFAULTS.textColor
  ctx.font = shapeFont(fontSize, shape.fontFamily)
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineHeight))
}

/**
 * Füllung im lokalen System der Form: Farbe oder Farbverlauf.
 * Linear: `gradientAngle` in Grad (0 = links → rechts, 90 = oben → unten),
 * so lang, dass der Verlauf den ganzen Rahmen abdeckt. Radial: von der Mitte
 * (fillColor) nach außen (fillColor2).
 */
export function getFillStyle(
  ctx: CanvasRenderingContext2D,
  shape: Pick<Shape, 'fillColor' | 'fillType' | 'fillColor2' | 'gradientAngle'>,
  width: number,
  height: number,
): string | CanvasGradient {
  const from = shape.fillColor || DEFAULT_COLOR
  const type = shape.fillType
  if (type !== 'linear' && type !== 'radial') return from
  const to = shape.fillColor2 || '#ffffff'
  let gradient: CanvasGradient
  if (type === 'linear') {
    const rad = ((Number(shape.gradientAngle) || 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const half = Math.abs((width / 2) * cos) + Math.abs((height / 2) * sin)
    gradient = ctx.createLinearGradient(-cos * half, -sin * half, cos * half, sin * half)
  } else {
    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height) / 2)
  }
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  return gradient
}

/** Emoji-Sticker: Zeichen füllt den Rahmen (Drehen, Spiegeln, Deckkraft, Schatten) */
function drawEmoji(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  width: number,
  height: number,
): void {
  const glyph = String(shape.emoji || '').trim()
  if (!glyph) return
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(100, shape.opacity ?? 100)) / 100
  ctx.translate(shape.x, shape.y)
  if (shape.rotation) ctx.rotate((shape.rotation * Math.PI) / 180)
  if (shape.flipX || shape.flipY) ctx.scale(shape.flipX ? -1 : 1, shape.flipY ? -1 : 1)
  if (shape.shadowBlur > 0) {
    ctx.shadowColor = shape.shadowColor || '#000000'
    ctx.shadowBlur = shape.shadowBlur
    const offset = Math.max(2, shape.shadowBlur / 3)
    ctx.shadowOffsetX = offset
    ctx.shadowOffsetY = offset
  }
  // In Referenzgröße messen und die tatsächliche Glyphe auf 92 % des Rahmens strecken
  const ref = 100
  ctx.font = `${ref}px ${EMOJI_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000000'
  const m = ctx.measureText(glyph)
  const left = m.actualBoundingBoxLeft ?? ref / 2
  const right = m.actualBoundingBoxRight ?? ref / 2
  const ascent = m.actualBoundingBoxAscent ?? ref / 2
  const descent = m.actualBoundingBoxDescent ?? ref / 2
  const glyphW = Math.max(1, left + right)
  const glyphH = Math.max(1, ascent + descent)
  ctx.scale((width * 0.92) / glyphW, (height * 0.92) / glyphH)
  // Mittelpunkt der Glyphe auf den Ursprung legen
  ctx.fillText(glyph, (left - right) / 2, (ascent - descent) / 2)
  ctx.restore()
}

/** Nummer mittig in den (bereits transformierten) Marker schreiben */
function drawMarkerNumber(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  width: number,
  height: number,
): void {
  const label = String(Math.max(0, Math.round(Number(shape.number) || 0)))
  const factor = label.length >= 3 ? 0.4 : label.length === 2 ? 0.5 : 0.6
  const fontSize = Math.max(6, Math.min(width, height) * factor)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.setLineDash([])
  ctx.fillStyle = shape.textColor || '#ffffff'
  ctx.font = `${fontSize}px "Satoshi Bold", "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Ziffern sitzen optisch etwas hoch → leicht nach unten versetzen
  ctx.fillText(label, 0, fontSize * 0.05)
}

/** true, wenn der Kontext CSS-Filter unterstützt (Safari: nein) */
function supportsCanvasFilter(ctx: CanvasRenderingContext2D): boolean {
  return typeof ctx.filter === 'string'
}

/**
 * Verpixeln/Weichzeichnen: kopiert den bereits gezeichneten Canvas-Inhalt unter
 * dem Bereich, verarbeitet ihn und zeichnet ihn – auf den (gedrehten) Umriss
 * beschnitten – zurück. Wirkt daher auf Bild und darunterliegende Ebenen.
 * Erwartet, dass der Kontext im Canvas-Pixelsystem steht (Overlay-Pass).
 */
function drawCensor(ctx: CanvasRenderingContext2D, shape: Shape, path: Path2D): void {
  const source = ctx.canvas
  if (!source || !source.width || !source.height || typeof document === 'undefined') return

  const strength = getCensorStrength(shape)
  const isBlur = shape.effect === 'blur'
  const pad = isBlur ? Math.ceil(strength * 2) : 0

  // Achsenparalleler Rahmen des gedrehten Bereichs, auf den Canvas begrenzt
  const corners = [
    toCanvas(shape, -shape.width / 2, -shape.height / 2),
    toCanvas(shape, shape.width / 2, -shape.height / 2),
    toCanvas(shape, shape.width / 2, shape.height / 2),
    toCanvas(shape, -shape.width / 2, shape.height / 2),
  ]
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.x)) - pad))
  const y0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.y)) - pad))
  const x1 = Math.min(source.width, Math.ceil(Math.max(...corners.map((p) => p.x)) + pad))
  const y1 = Math.min(source.height, Math.ceil(Math.max(...corners.map((p) => p.y)) + pad))
  const sw = x1 - x0
  const sh = y1 - y0
  if (sw <= 0 || sh <= 0) return

  const out = document.createElement('canvas')
  out.width = sw
  out.height = sh
  // 2D-Kontext eines neuen HTML-Canvas ist immer verfügbar
  const octx = out.getContext('2d') as CanvasRenderingContext2D

  if (isBlur && supportsCanvasFilter(octx)) {
    octx.filter = `blur(${strength}px)`
    octx.drawImage(source, x0, y0, sw, sh, 0, 0, sw, sh)
  } else {
    // Verpixeln – und Ersatz-Unschärfe ohne ctx.filter: verkleinern, wieder vergrößern
    const step = isBlur ? Math.max(2, strength / 2) : strength
    const smallW = Math.max(1, Math.ceil(sw / step))
    const smallH = Math.max(1, Math.ceil(sh / step))
    const small = document.createElement('canvas')
    small.width = smallW
    small.height = smallH
    const sctx = small.getContext('2d') as CanvasRenderingContext2D
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(source, x0, y0, sw, sh, 0, 0, smallW, smallH)
    octx.imageSmoothingEnabled = isBlur
    octx.drawImage(small, 0, 0, smallW, smallH, 0, 0, smallW * step, smallH * step)
  }

  ctx.save()
  const base = ctx.getTransform()
  ctx.globalAlpha = Math.max(0, Math.min(100, shape.opacity ?? 100)) / 100
  ctx.translate(shape.x, shape.y)
  if (shape.rotation) ctx.rotate((shape.rotation * Math.PI) / 180)
  ctx.clip(path)
  ctx.setTransform(base)
  ctx.drawImage(out, x0, y0)
  ctx.restore()
}

// ===== HIT-TESTING & GRIFFE =====

/** Rechnet einen Canvas-Punkt in das (unrotierte) lokale System der Form um. */
export function toLocal(shape: ShapeGeometry, x: number, y: number): Vec {
  const dx = x - shape.x
  const dy = y - shape.y
  const rad = (-(shape.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

/** Rechnet einen lokalen Punkt der Form zurück in Canvas-Koordinaten. */
export function toCanvas(shape: ShapeGeometry, lx: number, ly: number): Vec {
  const rad = ((shape.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: shape.x + lx * cos - ly * sin, y: shape.y + lx * sin + ly * cos }
}

/**
 * true, wenn (x, y) im (gedrehten) Begrenzungsrahmen der Form liegt.
 * `padding` erweitert den Rahmen (dünne Linien bleiben greifbar).
 */
export function hitTestShape(
  shape: ShapeGeometry & { strokeWidth?: number },
  x: number,
  y: number,
  padding = 0,
): boolean {
  const p = toLocal(shape, x, y)
  const pad = padding + (Number(shape.strokeWidth) || 0) / 2
  return Math.abs(p.x) <= shape.width / 2 + pad && Math.abs(p.y) <= shape.height / 2 + pad
}

/** Oberste Form an der Position (spätere Formen liegen oben) */
export function findShapeAt<S extends ShapeGeometry & { strokeWidth?: number }>(
  shapes: S[] | null | undefined,
  x: number,
  y: number,
  padding = 0,
): S | null {
  if (!Array.isArray(shapes)) return null
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i] as S
    if (hitTestShape(shape, x, y, padding)) return shape
  }
  return null
}

export const SHAPE_CORNERS: readonly ShapeCorner[] = Object.freeze(['nw', 'ne', 'se', 'sw'])
const CORNER_SIGNS: Readonly<Record<ShapeCorner, ShapePoint>> = {
  nw: [-1, -1],
  ne: [1, -1],
  se: [1, 1],
  sw: [-1, 1],
}

/** Lage der Griffe in Canvas-Koordinaten */
export interface ShapeHandles {
  corners: Record<ShapeCorner, Vec>
  topCenter: Vec
  rotate: Vec
  halfWidth: number
  halfHeight: number
}

/**
 * Lage der Griffe in Canvas-Koordinaten.
 * @param {object} shape
 * @param {number} pad        Abstand des Auswahlrahmens zur Form (Canvas-px)
 * @param {number} rotateGap  Abstand des Drehgriffs über dem Rahmen (Canvas-px)
 */
export function getShapeHandles(shape: ShapeGeometry, pad = 0, rotateGap = 24): ShapeHandles {
  const a = shape.width / 2 + pad
  const b = shape.height / 2 + pad
  const corners = {} as Record<ShapeCorner, Vec>
  for (const c of SHAPE_CORNERS) {
    const [sx, sy] = CORNER_SIGNS[c]
    corners[c] = toCanvas(shape, sx * a, sy * b)
  }
  return {
    corners,
    topCenter: toCanvas(shape, 0, -b),
    rotate: toCanvas(shape, 0, -b - rotateGap),
    halfWidth: a,
    halfHeight: b,
  }
}

/**
 * Griff unter der Position: { mode: 'rotate' } | { mode: 'resize', corner } | null
 * @param {number} radius  Trefferradius in Canvas-px
 */
export function findShapeHandleAt(
  shape: ShapeGeometry,
  x: number,
  y: number,
  {
    pad = 0,
    rotateGap = 24,
    radius = 8,
  }: { pad?: number; rotateGap?: number; radius?: number } = {},
): { mode: 'rotate' } | { mode: 'resize'; corner: ShapeCorner } | null {
  const h = getShapeHandles(shape, pad, rotateGap)
  if (Math.hypot(x - h.rotate.x, y - h.rotate.y) <= radius) return { mode: 'rotate' }
  for (const c of SHAPE_CORNERS) {
    const p = h.corners[c]
    if (Math.hypot(x - p.x, y - p.y) <= radius) return { mode: 'resize', corner: c }
  }
  return null
}

/**
 * Neue Größe/Lage beim Ziehen einer Ecke; die gegenüberliegende Ecke bleibt fest.
 * @param {object} start   Form beim Start des Ziehens (x, y, width, height, rotation)
 * @param {string} corner  'nw' | 'ne' | 'se' | 'sw'
 * @param {{x:number,y:number}} pointer Canvas-Position
 * @param {boolean} keepRatio Seitenverhältnis beibehalten
 * @returns {{x:number,y:number,width:number,height:number}}
 */
export function resizeFromCorner(
  start: ShapeGeometry,
  corner: string,
  pointer: Vec,
  keepRatio = false,
): { x: number; y: number; width: number; height: number } {
  const [sx, sy] =
    (CORNER_SIGNS as Record<string, ShapePoint | undefined>)[corner] ?? CORNER_SIGNS.se
  const min = SHAPE_LIMITS.minSize
  const anchor = { x: -sx * (start.width / 2), y: -sy * (start.height / 2) }
  const local = toLocal(start, pointer.x, pointer.y)

  let width = Math.max(min, (local.x - anchor.x) * sx)
  let height = Math.max(min, (local.y - anchor.y) * sy)
  if (keepRatio && start.width > 0 && start.height > 0) {
    const ratio = start.width / start.height
    if (width / height > ratio) height = width / ratio
    else width = height * ratio
  }

  const center = toCanvas(start, anchor.x + (sx * width) / 2, anchor.y + (sy * height) / 2)
  return { x: center.x, y: center.y, width, height }
}

/** Drehwinkel (Grad, -180…180), wenn der Drehgriff zur Position gezogen wird */
export function rotationFromPointer(shape: Vec, pointer: Vec, snap = 0): number {
  const deg = (Math.atan2(pointer.y - shape.y, pointer.x - shape.x) * 180) / Math.PI + 90
  let angle = ((((deg + 180) % 360) + 360) % 360) - 180
  if (snap > 0) angle = Math.round(angle / snap) * snap
  if (angle <= -180) angle += 360
  return Math.round(angle * 10) / 10
}

// ===== LAYOUT-ANPASSUNGEN =====

/**
 * Skaliert Formen proportional auf eine neue Canvas-Größe (Bild ersetzen).
 * Mutiert die Form-Objekte. @returns {boolean} true, wenn skaliert wurde
 */
export function scaleShapesToCanvas(
  shapes: Shape[] | null | undefined,
  from: { width?: number; height?: number } | null | undefined,
  to: { width?: number; height?: number } | null | undefined,
): boolean {
  if (!Array.isArray(shapes) || shapes.length === 0) return false
  if (!from?.width || !from?.height || !to?.width || !to?.height) return false
  // oben auf Werte ungleich 0 geprüft
  const sx = (to as Rect).width / (from as Rect).width
  const sy = (to as Rect).height / (from as Rect).height
  if (sx === 1 && sy === 1) return false
  const s = Math.min(sx, sy)
  for (const shape of shapes) {
    shape.x = Math.round(shape.x * sx)
    shape.y = Math.round(shape.y * sy)
    shape.width = Math.max(SHAPE_LIMITS.minSize, Math.round(shape.width * s))
    shape.height = Math.max(SHAPE_LIMITS.minSize, Math.round(shape.height * s))
    if (shape.strokeWidth) shape.strokeWidth = Math.round(shape.strokeWidth * s * 10) / 10
    if (shape.shadowBlur) shape.shadowBlur = Math.round(shape.shadowBlur * s * 10) / 10
  }
  return true
}

/**
 * Passt Formen an einen Zuschnitt an: verschiebt sie um den Ausschnitt-Ursprung
 * und entfernt Formen, deren Mittelpunkt außerhalb liegt (wie bei Texten).
 * Mutiert das Array. @returns {number} Anzahl entfernter Formen
 */
export function cropShapes(
  shapes: ShapeGeometry[] | null | undefined,
  { x, y, width, height }: Rect,
): number {
  if (!Array.isArray(shapes)) return 0
  let removed = 0
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i] as ShapeGeometry
    if (s.x < x || s.x > x + width || s.y < y || s.y > y + height) {
      shapes.splice(i, 1)
      removed++
    } else {
      s.x -= x
      s.y -= y
    }
  }
  return removed
}
