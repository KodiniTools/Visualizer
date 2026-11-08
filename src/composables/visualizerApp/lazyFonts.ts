/**
 * Custom-Fonts erst bei der ersten Interaktion laden (spätestens nach
 * `fallbackMs`). Die Fonts werden für das erste Rendering nicht gebraucht und
 * sollen den Seitenaufbau nicht mit ~10 Font-Downloads belasten. Abhängige
 * Komponenten reagieren über fontManager.isInitialized.
 */

export const FONT_LOAD_EVENTS = ['pointerdown', 'keydown', 'touchstart']
export const FONT_LOAD_FALLBACK_MS = 5000

export function startLazyFontLoading(
  fontManager: { initialize: (fonts: object[]) => Promise<{ loaded: number }> },
  fonts: object[],
  { events = FONT_LOAD_EVENTS, fallbackMs = FONT_LOAD_FALLBACK_MS } = {},
): void {
  let fontLoadTimer: ReturnType<typeof setTimeout> | null = null
  const loadFonts = () => {
    events.forEach((type) => window.removeEventListener(type, loadFonts, true))
    clearTimeout(fontLoadTimer ?? undefined)
    fontManager
      .initialize(fonts)
      .then((result) => console.log(`FontManager: ${result.loaded} Fonts geladen`))
      .catch((error: unknown) => console.error('FontManager Fehler:', error))
  }
  events.forEach((type) =>
    window.addEventListener(type, loadFonts, { capture: true, passive: true, once: true }),
  )
  fontLoadTimer = setTimeout(loadFonts, fallbackMs)
}
