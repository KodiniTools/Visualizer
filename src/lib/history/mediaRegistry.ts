/**
 * 🖼️ Media Registry für History-Snapshots
 *
 * Bild-/Video-Quellen sind oft große Data-URLs. Würden sie in jedem Snapshot
 * als String stehen, kostete jeder Vergleich und jeder der 50 Schritte viel
 * Speicher. Stattdessen wird jede Quelle genau einmal abgelegt und im Snapshot
 * durch einen kurzen Schlüssel ("media:<n>") ersetzt.
 *
 * Zusätzlich werden die zugehörigen DOM-Elemente (HTMLImageElement,
 * HTMLVideoElement) je Quelle gemerkt. Beim Undo/Redo kann so das vorhandene
 * Element wiederverwendet werden – kein erneutes Laden, kein Flackern, und
 * Videos behalten ihre (evtl. per Blob-URL erzeugte) Quelle.
 */

const PREFIX = 'media:'

/** Zu einer Quelle gemerktes DOM-Element */
export type MediaElement = HTMLImageElement | HTMLVideoElement

export function createMediaRegistry() {
  /** src → key */
  const keyBySrc = new Map<string, string>()
  /** key → src */
  const srcByKey = new Map<string, string>()
  /** src → Element (Bild/Video) */
  const elementBySrc = new Map<string, MediaElement>()
  let counter = 0

  /**
   * @param {string|null|undefined} src
   * @returns {string|null} Schlüssel oder null
   */
  function intern(src: unknown): string | null {
    if (typeof src !== 'string' || src === '') return null
    let key = keyBySrc.get(src)
    if (!key) {
      key = `${PREFIX}${++counter}`
      keyBySrc.set(src, key)
      srcByKey.set(key, src)
    }
    return key
  }

  /**
   * @param {string|null|undefined} key
   * @returns {string|null} ursprüngliche Quelle
   */
  function resolve(key: unknown): string | null {
    if (typeof key !== 'string') return null
    return srcByKey.get(key) ?? null
  }

  /**
   * Merkt sich das Element zu einer Quelle und gibt den Schlüssel zurück.
   */
  function remember(src: string, element: MediaElement | null | undefined): string | null {
    const key = intern(src)
    if (key && element) elementBySrc.set(src, element)
    return key
  }

  function elementFor(src: unknown): MediaElement | null {
    return typeof src === 'string' ? (elementBySrc.get(src) ?? null) : null
  }

  function clear() {
    keyBySrc.clear()
    srcByKey.clear()
    elementBySrc.clear()
    counter = 0
  }

  return { intern, resolve, remember, elementFor, clear }
}

/** App-weite Instanz */
export const mediaRegistry = createMediaRegistry()

/**
 * Lädt ein Bild (oder nutzt ein vorhandenes, fertig geladenes Element).
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  const cached = mediaRegistry.elementFor(src)
  // Duck-Typing wie bisher: fertig geladenes <img> (Tests nutzen Fake-Elemente)
  const img = cached as Partial<HTMLImageElement> | null
  if (img && img.tagName === 'IMG' && img.complete && (img.naturalWidth ?? 0) > 0) {
    return Promise.resolve(img as HTMLImageElement)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => {
      mediaRegistry.remember(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src.slice(0, 80)}`))
    img.src = src
  })
}
