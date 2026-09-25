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

export function createMediaRegistry() {
  /** @type {Map<string, string>} src → key */
  const keyBySrc = new Map()
  /** @type {Map<string, string>} key → src */
  const srcByKey = new Map()
  /** @type {Map<string, any>} src → Element */
  const elementBySrc = new Map()
  let counter = 0

  /**
   * @param {string|null|undefined} src
   * @returns {string|null} Schlüssel oder null
   */
  function intern(src) {
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
  function resolve(key) {
    if (typeof key !== 'string') return null
    return srcByKey.get(key) ?? null
  }

  /**
   * Merkt sich das Element zu einer Quelle und gibt den Schlüssel zurück.
   * @param {string} src
   * @param {any} element
   */
  function remember(src, element) {
    const key = intern(src)
    if (key && element) elementBySrc.set(src, element)
    return key
  }

  /** @param {string} src */
  function elementFor(src) {
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
export function loadImageElement(src) {
  const cached = mediaRegistry.elementFor(src)
  if (cached && cached.tagName === 'IMG' && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached)
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
