// textDefaults.js - Speichern & Laden der Standard-Einstellungen für neue Texte
//
// Die Einstellungen eines (markierten) Textes können als Vorlage gespeichert
// und auf neu hinzugefügte Texte angewendet werden. Es gibt genau eine Vorlage,
// die im localStorage abgelegt wird und sowohl vom Neu-Text-Formular
// (useNewTextSettings) als auch beim Schnell-Erstellen (Tastatureingabe) genutzt
// wird.

export const SETTINGS_KEY = 'visualizer_text_settings'

/**
 * Standard-Einstellungen (falls noch nichts gespeichert wurde).
 */
export function defaultTextSettings() {
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

function cloneEffect(effect, fallback) {
  if (!effect) return fallback
  try {
    return JSON.parse(JSON.stringify(effect))
  } catch {
    return fallback
  }
}

/**
 * Baut ein Einstellungs-Objekt aus einem vorhandenen Text-Objekt.
 * Erfasst Schriftart, Farbe, Deckkraft, Abstände, Rotation, Schatten,
 * Kontur, Position und Animationen.
 */
export function serializeTextToDefaults(textObj) {
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

export function loadTextDefaults() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function saveTextDefaults(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

export function clearTextDefaults() {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    return true
  } catch {
    return false
  }
}

export function hasTextDefaults() {
  return localStorage.getItem(SETTINGS_KEY) !== null
}

/**
 * Wandelt gespeicherte Einstellungen in Optionen für canvasManager.addText um
 * (ohne Animation – die wird separat über buildAnimationConfig gesetzt).
 */
export function settingsToAddTextOptions(settings) {
  if (!settings) return {}
  const style = settings.style || {}
  const shadow = settings.shadow || {}
  const stroke = settings.stroke || {}
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
