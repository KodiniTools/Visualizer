/**
 * Factory für Text-Objekte auf dem Canvas.
 *
 * 1:1 aus textManager.js `add()` herausgelöst – die Defaults sind unverändert.
 * Das Einfügen in die Objekt-Liste bleibt Aufgabe des TextManagers.
 *
 * @module textManager/createTextObject
 */
import { createTextAudioReactiveConfig } from '../audio/audioReactiveConfig.js'

/**
 * Erzeugt ein vollständig initialisiertes Text-Objekt.
 *
 * @param {string} [text] - Inhalt; leer/fehlend ⇒ 'Neuer Text'
 * @param {object} [options] - Überschreibungen für Style, Schatten, Kontur, Audio
 * @returns {object} neues Text-Objekt (noch nicht in der Objekt-Liste registriert)
 */
export function createTextObject(text, options = {}) {
  const newText = {
    id: Date.now() + Math.random(),
    type: 'text',
    content: text || 'Neuer Text',

    // Position (relativ zum Canvas)
    relX: options.relX || 0.5,
    relY: options.relY || 0.5,

    // Schrift-Eigenschaften
    fontSize: options.fontSize || 48,
    fontFamily: options.fontFamily || 'Arial',
    fontWeight: options.fontWeight || 'normal',
    fontStyle: options.fontStyle || 'normal',
    color: options.color || '#ff0000',
    textAlign: options.textAlign || 'center',
    textBaseline: options.textBaseline || 'middle',

    // ✨ TRANSPARENZ/DECKKRAFT (0-100%)
    opacity: options.opacity !== undefined ? options.opacity : 100,

    // ✨ BUCHSTABENABSTAND (-20 bis +50px)
    letterSpacing: options.letterSpacing || 0,

    // ✨ ZEILENABSTAND (100% - 300%)
    lineHeightMultiplier: options.lineHeightMultiplier || 120,

    // ✨ SCHATTEN-EIGENSCHAFTEN
    shadow: {
      color: options.shadowColor || '#000000',
      blur: options.shadowBlur || 0,
      offsetX: options.shadowOffsetX || 0,
      offsetY: options.shadowOffsetY || 0,
    },

    // ✨ KONTUR/OUTLINE
    stroke: {
      enabled: options.strokeEnabled || false,
      color: options.strokeColor || '#000000',
      width: options.strokeWidth || 2,
    },

    // Rotation
    rotation: options.rotation || 0,

    // ✨ AUDIO-REAKTIVE EFFEKTE (standardmäßig aktiviert für bessere UX) –
    // gemeinsame Struktur mit Bildern/Hintergrund/Kacheln plus Text-Extras
    audioReactive: createTextAudioReactiveConfig({
      enabled: options.audioReactiveEnabled !== undefined ? options.audioReactiveEnabled : true,
      source: options.audioReactiveSource || 'bass',
      smoothing: options.audioReactiveSmoothing || 50,
    }),

    // ✨ TEXT-ANIMATION (Typewriter, Fade, Scale, etc.)
    animation: {
      type: 'none', // 'none', 'typewriter', 'fade', 'scale'
      typewriter: {
        enabled: false,
        speed: 50, // ms pro Buchstabe
        startDelay: 0, // Verzögerung vor Start (ms)
        loop: false, // Animation wiederholen
        loopDelay: 1000, // Pause zwischen Wiederholungen (ms)
        permanent: true, // Text nach Animation dauerhaft anzeigen
        displayDuration: 5000, // Anzeigedauer vor dem Ausblenden (ms, wenn nicht permanent)
        showCursor: true, // Blinkender Cursor
        cursorChar: '|', // Cursor-Zeichen
      },
      // ✨ Fade-Einblendung
      fade: {
        enabled: false,
        duration: 1000, // Dauer der Einblendung (ms)
        startDelay: 0, // Verzögerung vor Start (ms)
        direction: 'in', // 'in' = einblenden, 'out' = ausblenden, 'inOut' = ein- und ausblenden
        loop: false, // Animation wiederholen
        loopDelay: 1000, // Pause zwischen Wiederholungen (ms)
        permanent: true, // Text nach Animation dauerhaft anzeigen
        displayDuration: 5000, // Anzeigedauer vor dem Ausblenden (ms, wenn nicht permanent)
        easing: 'ease', // 'linear', 'ease', 'easeIn', 'easeOut'
      },
      // ✨ NEU: Scale-Animation (Eingangs-Skalierung)
      scale: {
        enabled: false,
        duration: 1000, // Dauer der Animation (ms)
        startDelay: 0, // Verzögerung vor Start (ms)
        startScale: 0, // Start-Skalierung (0 = unsichtbar, 1 = normal, 2 = doppelt)
        endScale: 1, // End-Skalierung
        direction: 'in', // 'in' = reinzoomen, 'out' = rauszoomen, 'inOut' = rein und raus
        loop: false, // Animation wiederholen
        loopDelay: 1000, // Pause zwischen Wiederholungen (ms)
        permanent: true, // Text nach Animation dauerhaft anzeigen
        displayDuration: 5000, // Anzeigedauer vor dem Ausblenden (ms, wenn nicht permanent)
        easing: 'ease', // 'linear', 'ease', 'easeIn', 'easeOut'
      },
      // ✨ NEU: Slide-Animation (Hereingleiten)
      slide: {
        enabled: false,
        duration: 1000, // Dauer der Animation (ms)
        startDelay: 0, // Verzögerung vor Start (ms)
        from: 'left', // 'left', 'right', 'top', 'bottom'
        distance: 100, // Distanz in Prozent des Canvas (100 = vom Rand)
        direction: 'in', // 'in' = hereinfahren, 'out' = herausfahren, 'inOut' = rein und raus
        loop: false, // Animation wiederholen
        loopDelay: 1000, // Pause zwischen Wiederholungen (ms)
        permanent: true, // Text nach Animation dauerhaft anzeigen
        displayDuration: 5000, // Anzeigedauer vor dem Ausblenden (ms, wenn nicht permanent)
        easing: 'ease', // 'linear', 'ease', 'easeIn', 'easeOut'
      },
      // Interner State (wird zur Laufzeit gesetzt)
      _state: {
        startTime: null, // Wann die Animation gestartet wurde
        isPlaying: false, // Läuft die Animation gerade?
        currentIndex: 0, // Aktueller Buchstaben-Index (für Typewriter)
      },
    },
  }

  return newText
}
