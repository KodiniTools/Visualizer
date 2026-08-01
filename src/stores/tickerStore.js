import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * tickerStore — Lauftext (Ticker): ein horizontal scrollendes Textband.
 *
 * Der Nutzer kann Text, Schriftart, Buchstabengröße, Fett, Buchstabenabstand,
 * Textfarbe, Hintergrundfarbe und dessen Transparenz, Laufrichtung,
 * Laufgeschwindigkeit sowie Audio-Reaktivität (Tempo pulsiert zum Beat)
 * einstellen. Die Einstellungen werden dauerhaft im localStorage gespeichert.
 */
const STORAGE_KEY = 'visualizer_ticker_settings'

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useTickerStore = defineStore('ticker', () => {
  const saved = loadSaved() || {}

  // Der Ein/Aus-Zustand wird bewusst NICHT aus dem localStorage
  // wiederhergestellt: Der Ticker soll beim Öffnen der App immer deaktiviert
  // sein und nicht stillschweigend wieder erscheinen, nur weil er in einer
  // früheren Sitzung einmal aktiviert wurde. Alle übrigen Einstellungen
  // (Text, Schrift, Farben, Geschwindigkeit …) bleiben erhalten.
  const enabled = ref(false)
  const text = ref(saved.text ?? 'Willkommen beim KodiniTools Visualizer  •  ')
  const fontSize = ref(saved.fontSize ?? 48) // px
  const fontFamily = ref(saved.fontFamily ?? 'Arial') // Schriftart
  const bold = ref(saved.bold ?? true) // Textfett
  const letterSpacing = ref(saved.letterSpacing ?? 0) // Buchstabenabstand (px)
  const color = ref(saved.color ?? '#ffffff') // Textfarbe
  const strokeEnabled = ref(saved.strokeEnabled ?? false) // Umrandung ein/aus
  const strokeColor = ref(saved.strokeColor ?? '#000000') // Umrandungsfarbe
  const strokeWidth = ref(saved.strokeWidth ?? 2) // Umrandungsdicke (px)
  const shadowEnabled = ref(saved.shadowEnabled ?? false) // Schatten ein/aus
  const shadowColor = ref(saved.shadowColor ?? '#000000') // Schattenfarbe
  const shadowBlur = ref(saved.shadowBlur ?? 6) // Schattendicke / Weichzeichnung (px)
  const bgColor = ref(saved.bgColor ?? '#000000') // Hintergrundfarbe des Bandes
  const bgOpacity = ref(saved.bgOpacity ?? 70) // Transparenz des Hintergrunds (0–100 %)
  const speed = ref(saved.speed ?? 120) // Laufgeschwindigkeit (px/Sekunde)
  const direction = ref(saved.direction ?? 'left') // 'left' | 'right'
  // Vertikale Position des Bandes (0 % = oben, 100 % = unten).
  // Migration vom alten 'position'-Feld (top/bottom).
  const positionY = ref(saved.positionY ?? (saved.position === 'top' ? 0 : 100))
  const audioReactive = ref(saved.audioReactive ?? false) // Tempo pulsiert zum Beat
  const beatIntensity = ref(saved.beatIntensity ?? 60) // Stärke des Beat-Pulses (0–100)

  // Persistenz: bei jeder Änderung speichern
  watch(
    [
      enabled,
      text,
      fontSize,
      fontFamily,
      bold,
      letterSpacing,
      color,
      strokeEnabled,
      strokeColor,
      strokeWidth,
      shadowEnabled,
      shadowColor,
      shadowBlur,
      bgColor,
      bgOpacity,
      speed,
      direction,
      positionY,
      audioReactive,
      beatIntensity,
    ],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            enabled: enabled.value,
            text: text.value,
            fontSize: fontSize.value,
            fontFamily: fontFamily.value,
            bold: bold.value,
            letterSpacing: letterSpacing.value,
            color: color.value,
            strokeEnabled: strokeEnabled.value,
            strokeColor: strokeColor.value,
            strokeWidth: strokeWidth.value,
            shadowEnabled: shadowEnabled.value,
            shadowColor: shadowColor.value,
            shadowBlur: shadowBlur.value,
            bgColor: bgColor.value,
            bgOpacity: bgOpacity.value,
            speed: speed.value,
            direction: direction.value,
            positionY: positionY.value,
            audioReactive: audioReactive.value,
            beatIntensity: beatIntensity.value,
          }),
        )
      } catch {
        /* localStorage nicht verfügbar – Einstellungen bleiben nur zur Laufzeit */
      }
    },
  )

  return {
    enabled,
    text,
    fontSize,
    fontFamily,
    bold,
    letterSpacing,
    color,
    strokeEnabled,
    strokeColor,
    strokeWidth,
    shadowEnabled,
    shadowColor,
    shadowBlur,
    bgColor,
    bgOpacity,
    speed,
    direction,
    positionY,
    audioReactive,
    beatIntensity,
  }
})
