// textDefaults.js - Speichern & Laden der Standard-Einstellungen für neue Texte
//
// Die Einstellungen eines (markierten) Textes können als Vorlage gespeichert
// und auf neu hinzugefügte Texte angewendet werden. Es gibt genau eine Vorlage,
// die im localStorage abgelegt wird und sowohl vom Neu-Text-Formular
// (useNewTextSettings) als auch beim Schnell-Erstellen (Tastatureingabe) genutzt
// wird.

import type { TextObjectOptions } from './textManager/createTextObject'
import type {
  ScaleAnimation,
  SlideAnimation,
  TextObject,
  TextShadow,
  TextStroke,
  TimedTextAnimation,
  TypewriterAnimation,
} from './textManager/types'

export const SETTINGS_KEY = 'visualizer_text_settings'

/** Gespeicherte Vorlage für neue Texte */
export interface TextDefaults {
  style: {
    fontSize: number
    fontFamily: string
    color: string
    fontWeight: string
    fontStyle: string
    textAlign: CanvasTextAlign
    opacity: number
    letterSpacing: number
    lineHeightMultiplier: number
    rotation: number
    autoFit: boolean
    autoFitPadding: number
  }
  shadow: TextShadow
  stroke: TextStroke
  /** null = Standardposition (Mitte) */
  position: { x: number; y: number } | null
  typewriter: TypewriterAnimation
  fade: TimedTextAnimation
  scale: ScaleAnimation
  slide: SlideAnimation
}

/**
 * Standard-Einstellungen (falls noch nichts gespeichert wurde).
 */
export function defaultTextSettings(): TextDefaults {
  return {
    style: {
      fontSize: 48,
      fontFamily: 'Arial',
      color: '#ff0000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      opacity: 100,
      letterSpacing: 0,
      lineHeightMultiplier: 120,
      rotation: 0,
      autoFit: false,
      autoFitPadding: 10,
    },
    shadow: { color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 2 },
    position: null, // { x, y } – optional; null = Standardposition (Mitte)
    typewriter: {
      enabled: false,
      speed: 50,
      startDelay: 0,
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      showCursor: true,
      cursorChar: '|',
    },
    fade: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
    scale: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      startScale: 0,
      endScale: 1,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
    slide: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      from: 'left',
      distance: 100,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
  }
}

function cloneEffect<T>(effect: T | null | undefined, fallback: T): T {
  if (!effect) return fallback
  try {
    return JSON.parse(JSON.stringify(effect)) as T
  } catch {
    return fallback
  }
}

/**
 * Baut ein Einstellungs-Objekt aus einem vorhandenen Text-Objekt.
 * Erfasst Schriftart, Farbe, Deckkraft, Abstände, Rotation, Schatten,
 * Kontur, Position und Animationen.
 */
export function serializeTextToDefaults(
  textObj: Partial<TextObject> | null | undefined,
): TextDefaults | null {
  if (!textObj) return null
  const anim = textObj.animation || {}
  const base = defaultTextSettings()

  return {
    style: {
      fontSize: textObj.fontSize ?? base.style.fontSize,
      fontFamily: textObj.fontFamily ?? base.style.fontFamily,
      color: textObj.color ?? base.style.color,
      fontWeight: textObj.fontWeight ?? base.style.fontWeight,
      fontStyle: textObj.fontStyle ?? base.style.fontStyle,
      textAlign: textObj.textAlign ?? base.style.textAlign,
      opacity: textObj.opacity ?? base.style.opacity,
      letterSpacing: textObj.letterSpacing ?? base.style.letterSpacing,
      lineHeightMultiplier: textObj.lineHeightMultiplier ?? base.style.lineHeightMultiplier,
      rotation: textObj.rotation ?? base.style.rotation,
      autoFit: false,
      autoFitPadding: base.style.autoFitPadding,
    },
    shadow: {
      color: textObj.shadow?.color ?? base.shadow.color,
      blur: textObj.shadow?.blur ?? base.shadow.blur,
      offsetX: textObj.shadow?.offsetX ?? base.shadow.offsetX,
      offsetY: textObj.shadow?.offsetY ?? base.shadow.offsetY,
    },
    stroke: {
      enabled: textObj.stroke?.enabled ?? base.stroke.enabled,
      color: textObj.stroke?.color ?? base.stroke.color,
      width: textObj.stroke?.width ?? base.stroke.width,
    },
    position: {
      x: textObj.relX ?? 0.5,
      y: textObj.relY ?? 0.5,
    },
    typewriter: cloneEffect(anim.typewriter, base.typewriter),
    fade: cloneEffect(anim.fade, base.fade),
    scale: cloneEffect(anim.scale, base.scale),
    slide: cloneEffect(anim.slide, base.slide),
  }
}

export function loadTextDefaults(): TextDefaults | null {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/** Ereignis nach jeder Änderung der Vorlage (Formular lädt dann neu). */
export const TEXT_DEFAULTS_EVENT = 'visualizer:text-defaults-changed'

function notifyChanged(source: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TEXT_DEFAULTS_EVENT, { detail: { source } }))
}

/**
 * @param {object} settings
 * @param {{ source?: string }} [opts] - Absender (das Formular ignoriert eigene Meldungen)
 */
export function saveTextDefaults(
  settings: unknown,
  { source = 'external' }: { source?: string } = {},
): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    notifyChanged(source)
    return true
  } catch {
    return false
  }
}

export function clearTextDefaults({ source = 'external' }: { source?: string } = {}): boolean {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    notifyChanged(source)
    return true
  } catch {
    return false
  }
}

export function hasTextDefaults(): boolean {
  return localStorage.getItem(SETTINGS_KEY) !== null
}

/**
 * Wandelt gespeicherte Einstellungen in Optionen für canvasManager.addText um
 * (ohne Animation – die wird separat über buildAnimationConfig gesetzt).
 */
export function settingsToAddTextOptions(
  settings: Partial<TextDefaults> | null | undefined,
): TextObjectOptions {
  if (!settings) return {}
  const style: Partial<TextDefaults['style']> = settings.style || {}
  const shadow: Partial<TextShadow> = settings.shadow || {}
  const stroke: Partial<TextStroke> = settings.stroke || {}
  return {
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    color: style.color,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    opacity: style.opacity,
    letterSpacing: style.letterSpacing ?? 0,
    lineHeightMultiplier: style.lineHeightMultiplier ?? 120,
    rotation: style.rotation ?? 0,
    strokeEnabled: stroke.enabled ?? false,
    strokeColor: stroke.color ?? '#000000',
    strokeWidth: stroke.width ?? 2,
    shadowColor: shadow.color ?? '#000000',
    shadowBlur: shadow.blur ?? 0,
    shadowOffsetX: shadow.offsetX ?? 0,
    shadowOffsetY: shadow.offsetY ?? 0,
  }
}
