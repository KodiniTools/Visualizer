// fonts.js - Zentrale Font-Konfiguration mit robustem Loading

import { FONT_BASE_URL, fontUrl } from './fontUrl'

export interface CustomFontDefinition {
  name: string
  file: string
}

/**
 * Kodini 22.11.2026: Arial ist die einzige Schrift, auch für Texte auf dem
 * Canvas (Textmanager, Laufschrift, Formen). Eigene Schriftdateien gibt es nicht mehr.
 */
export const APP_FONT = 'Arial'

export const CUSTOM_FONTS: CustomFontDefinition[] = []

/** Jede gespeicherte Schrift (auch aus alten Projekten) wird als Arial gezeichnet. */
export function normalizeFontFamily(_stored?: unknown): string {
  return APP_FONT
}

/**
 * Ersetzt rekursiv jede `fontFamily`-Angabe durch Arial (alte Projekte,
 * gespeicherte Vorlagen). Gibt eine Kopie zurück; Nicht-Objekte bleiben gleich.
 */
export function normalizeFontFamilies<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => normalizeFontFamilies(item)) as T
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] =
      key === 'fontFamily' && typeof item === 'string' ? APP_FONT : normalizeFontFamilies(item)
  }
  return out as T
}

/**
 * System Fonts (immer verfügbar)
 */
export const SYSTEM_FONTS = [{ name: APP_FONT }]

// Cache für geladene Fonts
const loadedFontsCache = new Set<string>()

/**
 * ✨ NEU: Erstelle Font-URL mit korrektem Base-Path
 */
function getFontUrl(filename: string): string {
  const path = fontUrl(filename)
  console.log(`🔤 Font URL: ${path}`)
  return path
}

/**
 * Lädt Custom Fonts mit Font Loading API
 * Verhindert das text/html Problem
 */
export async function loadCustomFonts() {
  if (CUSTOM_FONTS.length === 0) {
    console.log('ℹ️ Keine Custom Fonts definiert')
    return { loadedFonts: [], failedFonts: [] }
  }

  console.log(`📤 Starte Laden von ${CUSTOM_FONTS.length} Custom Fonts...`)
  console.log(`📍 Font-Pfad: ${FONT_BASE_URL}`)

  const loadedFonts = []
  const failedFonts = []

  for (const font of CUSTOM_FONTS) {
    // Skip if already loaded
    if (loadedFontsCache.has(font.name)) {
      loadedFonts.push(font.name)
      continue
    }

    try {
      // ✨ NEU: Verwende getFontUrl für korrekten Pfad
      const fontUrl = getFontUrl(font.file)

      // Font-Face erstellen
      const fontFace = new FontFace(font.name, `url(${fontUrl})`, {
        weight: 'normal',
        style: 'normal',
      })

      // Font laden
      const loadedFont = await fontFace.load()

      // Zum Document hinzufügen
      document.fonts.add(loadedFont)

      // Cache updaten
      loadedFontsCache.add(font.name)
      loadedFonts.push(font.name)
    } catch (error) {
      failedFonts.push(font.name)
      console.warn(`⚠️ Font konnte nicht geladen werden: ${font.name}`, error)
    }
  }

  console.log(`✅ ${loadedFonts.length}/${CUSTOM_FONTS.length} Fonts erfolgreich geladen`)
  if (failedFonts.length > 0) {
    console.warn(
      `⚠️ ${failedFonts.length} Fonts fehlgeschlagen:`,
      failedFonts.slice(0, 5).join(', ') + (failedFonts.length > 5 ? '...' : ''),
    )
  }

  return { loadedFonts, failedFonts }
}

/**
 * Prüft ob ein Font verfügbar ist
 */
export function isFontAvailable(fontName: string): boolean {
  // System Fonts sind immer verfügbar
  if (SYSTEM_FONTS.some((f) => f.name === fontName)) {
    return true
  }

  // Im Cache?
  if (loadedFontsCache.has(fontName)) {
    return true
  }

  // Custom Font prüfen mit Font Loading API
  return document.fonts.check(`16px "${fontName}"`)
}

/**
 * Wartet bis ein Font geladen ist (oder lädt ihn nach)
 */
export async function waitForFont(fontName: string, timeout = 3000): Promise<boolean> {
  // System Font?
  if (SYSTEM_FONTS.some((f) => f.name === fontName)) {
    return true
  }

  // Bereits im Cache?
  if (loadedFontsCache.has(fontName)) {
    return true
  }

  // Font finden
  const fontDef = CUSTOM_FONTS.find((f) => f.name === fontName)
  if (!fontDef) {
    console.warn(`⚠️ Font nicht in CUSTOM_FONTS definiert: ${fontName}`)
    return false
  }

  try {
    console.log(`⏳ Lade Font: ${fontName}...`)

    // ✨ NEU: Verwende getFontUrl für korrekten Pfad
    const fontUrl = getFontUrl(fontDef.file)

    // Font-Face erstellen und laden
    const fontFace = new FontFace(fontName, `url(${fontUrl})`, {
      weight: 'normal',
      style: 'normal',
    })

    const loadedFont = await Promise.race([
      fontFace.load(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ])

    document.fonts.add(loadedFont)
    loadedFontsCache.add(fontName)

    console.log(`✅ Font geladen: ${fontName}`)
    return true
  } catch (error) {
    console.error(`❌ Font konnte nicht geladen werden: ${fontName}`, error)
    return false
  }
}

/**
 * Gibt alle verfügbaren Fonts zurück (System + erfolgreich geladene Custom)
 */
export function getAllAvailableFonts() {
  const available = [...SYSTEM_FONTS]

  for (const font of CUSTOM_FONTS) {
    if (loadedFontsCache.has(font.name) || isFontAvailable(font.name)) {
      available.push(font)
    }
  }

  return available
}

/**
 * Gibt Statistiken über geladene Fonts zurück
 */
export function getFontStats() {
  return {
    total: CUSTOM_FONTS.length,
    loaded: loadedFontsCache.size,
    systemFonts: SYSTEM_FONTS.length,
    available: getAllAvailableFonts().length,
  }
}
