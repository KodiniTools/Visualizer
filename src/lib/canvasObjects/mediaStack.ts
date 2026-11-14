/**
 * Gemeinsame Ebenen-Reihenfolge von Canvas-Bildern und Canvas-Videos.
 *
 * Bilder (MultiImageManager) und Videos (VideoManager) liegen in zwei Listen.
 * Früher wurden je Zeichen-Durchgang (hinter / vor dem Visualizer) erst alle
 * Bilder, dann alle Videos gezeichnet – ein Bild kam nie über ein Video,
 * „Nach vorne“ wirkte nur unter Bildern.
 *
 * Jetzt trägt jedes Element `stackOrder` (größer = weiter oben). Die
 * Reihenfolge innerhalb einer Liste bleibt die Reihenfolge des Arrays
 * (Thumbnail-Leiste, Verlauf, „Ebene N“ im Marker); `stackOrder` bestimmt nur,
 * wie Bilder und Videos untereinander verzahnt sind:
 *
 * - Elemente ohne `stackOrder` (vor dieser Änderung angelegt): Bilder nach
 *   Index, Videos darüber – sieht also aus wie bisher.
 * - Neue Elemente bekommen `nextStackOrder()` und liegen damit oben.
 * - Ebenen-Aktionen (`moveInStack`) schreiben fortlaufende Werte und sortieren
 *   beide Arrays passend.
 *
 * @module canvasObjects/mediaStack
 */

/** Element mit Ebenen-Wert (Bild oder Video) */
export interface StackObject {
  id: string | number
  stackOrder?: number | null
  fotoSettings?: { renderBehindVisualizer?: boolean } | null
}

export type StackKind = 'image' | 'video'

export interface StackEntry<
  I extends StackObject = StackObject,
  V extends StackObject = StackObject,
> {
  kind: StackKind
  obj: I | V
}

export type StackAction = 'bringToFront' | 'sendToBack' | 'moveUp' | 'moveDown'

/** Altvideos ohne Wert liegen über allen Altbildern (bisheriges Verhalten). */
const LEGACY_VIDEO_BASE = 1_000_000

let lastIssued = 0

/**
 * Wert für ein neues Element: liegt über allem, was es schon gibt (auch über
 * Elementen ohne Wert und über normalisierten Werten 0…n-1).
 */
export function nextStackOrder(): number {
  lastIssued = Math.max(Date.now(), lastIssued + 1)
  return lastIssued
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function keyOf(obj: StackObject, kind: StackKind, index: number): number {
  if (isFiniteNumber(obj.stackOrder)) return obj.stackOrder
  return kind === 'image' ? index : LEGACY_VIDEO_BASE + index
}

/** true = Element liegt in der Ebene hinter dem Visualizer */
export const isBehindVisualizer = (obj: StackObject): boolean =>
  obj.fotoSettings?.renderBehindVisualizer || false

/**
 * Bilder und Videos von unten nach oben. Die Plätze kommen aus `stackOrder`,
 * belegt werden sie je Art in Array-Reihenfolge – so bleiben die Arrays für
 * die Reihenfolge innerhalb einer Art maßgeblich, auch wenn ein Array (z. B.
 * per Drag & Drop in der Thumbnail-Leiste) umsortiert wurde.
 */
export function stackMedia<I extends StackObject, V extends StackObject>(
  images: readonly I[],
  videos: readonly V[],
): StackEntry<I, V>[] {
  const slots: { kind: StackKind; key: number }[] = [
    ...images.map((obj, i) => ({ kind: 'image' as const, key: keyOf(obj, 'image', i) })),
    ...videos.map((obj, i) => ({ kind: 'video' as const, key: keyOf(obj, 'video', i) })),
  ]
  // Stabil; bei gleichem Wert liegt das Video oben (wie bisher)
  slots.sort((a, b) => a.key - b.key || (a.kind === b.kind ? 0 : a.kind === 'image' ? -1 : 1))
  let ii = 0
  let vi = 0
  return slots.map((slot) =>
    slot.kind === 'image'
      ? { kind: 'image', obj: images[ii++] as I }
      : { kind: 'video', obj: videos[vi++] as V },
  )
}

/** Position (0 = unten) und Anzahl im gemeinsamen Stapel; index -1 = nicht enthalten */
export function stackPosition(
  images: readonly StackObject[],
  videos: readonly StackObject[],
  target: StackObject | null | undefined,
): { index: number; count: number } {
  const stack = stackMedia(images, videos)
  const index = target ? stack.findIndex((e) => e.obj.id === target.id) : -1
  return { index, count: stack.length }
}

/**
 * Nachbar in Richtung `dir` innerhalb derselben Zeichen-Ebene (hinter / vor
 * dem Visualizer) – nur dort hat ein Tausch eine sichtbare Wirkung.
 */
function neighbourIndex(stack: StackEntry[], from: number, dir: 1 | -1): number {
  const behind = isBehindVisualizer(stack[from]!.obj)
  for (let i = from + dir; i >= 0 && i < stack.length; i += dir) {
    if (isBehindVisualizer(stack[i]!.obj) === behind) return i
  }
  return -1
}

/** Kann `target` per `action` noch verschoben werden? */
export function canMoveInStack(
  images: readonly StackObject[],
  videos: readonly StackObject[],
  target: StackObject | null | undefined,
  action: StackAction,
): boolean {
  const stack = stackMedia(images, videos)
  const from = target ? stack.findIndex((e) => e.obj.id === target.id) : -1
  if (from === -1) return false
  switch (action) {
    case 'bringToFront':
    case 'moveUp':
      return neighbourIndex(stack, from, 1) !== -1
    case 'sendToBack':
    case 'moveDown':
      return neighbourIndex(stack, from, -1) !== -1
  }
}

/**
 * Verschiebt `target` im gemeinsamen Stapel, schreibt fortlaufende
 * `stackOrder`-Werte (0 … n-1) und sortiert beide Arrays danach (in place).
 *
 * @returns true, wenn sich die Reihenfolge geändert hat
 */
export function moveInStack<I extends StackObject, V extends StackObject>(
  images: I[],
  videos: V[],
  target: StackObject | null | undefined,
  action: StackAction,
): boolean {
  const stack = stackMedia(images, videos)
  const from = target ? stack.findIndex((e) => e.obj.id === target.id) : -1
  if (from === -1) return false

  const order = stack.slice()
  const [entry] = order.splice(from, 1)
  let to: number
  switch (action) {
    case 'bringToFront': {
      if (neighbourIndex(stack, from, 1) === -1) return false
      to = order.length
      break
    }
    case 'sendToBack': {
      if (neighbourIndex(stack, from, -1) === -1) return false
      to = 0
      break
    }
    case 'moveUp': {
      const n = neighbourIndex(stack, from, 1)
      if (n === -1) return false
      to = n // nach dem Entfernen steht der Nachbar auf n-1 → direkt dahinter
      break
    }
    case 'moveDown': {
      const n = neighbourIndex(stack, from, -1)
      if (n === -1) return false
      to = n
      break
    }
  }
  order.splice(to, 0, entry!)

  order.forEach((e, i) => (e.obj.stackOrder = i))
  const byKey = (a: StackObject, b: StackObject) => (a.stackOrder ?? 0) - (b.stackOrder ?? 0)
  images.sort(byKey)
  videos.sort(byKey)
  return true
}

// ── Zeichnen ───────────────────────────────────────────────────────────────

/** Teil des MultiImageManagers, den das gemeinsame Zeichnen braucht */
export interface StackImageLayer<I extends StackObject> {
  images: I[]
  isImageDrawable(image: I, behindVisualizer: boolean | null): boolean
  drawImage(ctx: CanvasRenderingContext2D, image: I): void
}

/** Teil des VideoManagers, den das gemeinsame Zeichnen braucht */
export interface StackVideoLayer<V extends StackObject> {
  videos: V[]
  beginVideoFrame(behindVisualizer: boolean | null): void
  isVideoDrawable(video: V, behindVisualizer: boolean | null): boolean
  drawVideo(ctx: CanvasRenderingContext2D, video: V): void
}

/**
 * Zeichnet die Bilder und Videos einer Ebene (hinter bzw. vor dem
 * Visualizer) in der gemeinsamen Reihenfolge, von unten nach oben.
 */
export function drawMediaStack<I extends StackObject, V extends StackObject>(
  ctx: CanvasRenderingContext2D,
  imageLayer: StackImageLayer<I>,
  videoLayer: StackVideoLayer<V>,
  behindVisualizer: boolean,
): void {
  videoLayer.beginVideoFrame(behindVisualizer)
  for (const entry of stackMedia(imageLayer.images, videoLayer.videos)) {
    if (entry.kind === 'image') {
      const img = entry.obj as I
      if (imageLayer.isImageDrawable(img, behindVisualizer)) imageLayer.drawImage(ctx, img)
    } else {
      const video = entry.obj as V
      if (videoLayer.isVideoDrawable(video, behindVisualizer)) videoLayer.drawVideo(ctx, video)
    }
  }
}
