/**
 * Custom-Fonts erst bei der ersten Interaktion laden (spätestens nach
 * `fallbackMs`). Die Fonts werden für das erste Rendering nicht gebraucht und
 * sollen den Seitenaufbau nicht mit ~10 Font-Downloads belasten. Abhängige
 * Komponenten reagieren über fontManager.isInitialized.
 */

export const FONT_LOAD_EVENTS = ['pointerdown', 'keydown', 'touchstart']
export const FONT_LOAD_FALLBACK_MS = 5000

/**
 * @param {{ initialize: (fonts: object[]) => Promise<{ loaded: number }> }} fontManager
 * @param {object[]} fonts
 * @param {{ events?: string[], fallbackMs?: number }} [options]
 */
export function startLazyFontLoading(
  fontManager,
  fonts,
  { events = FONT_LOAD_EVENTS, fallbackMs = FONT_LOAD_FALLBACK_MS } = {},
) {
  let fontLoadTimer = null
  const loadFonts = () => {
    events.forEach((type) => window.removeEventListener(type, loadFonts, true))
    clearTimeout(fontLoadTimer)
    fontManager
      .initialize(fonts)
      .then((result) => console.log(`FontManager: ${result.loaded} Fonts geladen`))
      .catch((error) => console.error('FontManager Fehler:', error))
  }
  events.forEach((type) =>
    window.addEventListener(type, loadFonts, { capture: true, passive: true, once: true }),
  )
  fontLoadTimer = setTimeout(loadFonts, fallbackMs)
}
