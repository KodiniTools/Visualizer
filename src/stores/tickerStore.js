import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  assignAudioReactiveConfig,
  createTickerAudioReactiveConfig,
  migrateLegacyTickerAudio,
} from '../lib/audio/audioReactiveConfig.js'

/**
 * tickerStore — Lauftext (Ticker): ein horizontal scrollendes Textband.
 *
 * Der Nutzer kann Text, Schriftart, Buchstabengröße, Fett, Buchstabenabstand,
 * Textfarbe, Umrandung, Schatten, Hintergrundfarbe und dessen Transparenz,
 * Laufrichtung, Laufgeschwindigkeit sowie Audio-Reaktivität (mehrere
 * Animationsmodi) einstellen. Die Einstellungen werden dauerhaft im
 * localStorage gespeichert.
 */
const STORAGE_KEY = 'visualizer_ticker_settings'

// Standardwerte aller Einstellungen (Basis für Persistenz-Fallback und Reset).
const DEFAULTS = {
  text: 'Willkommen beim KodiniTools Visualizer  •  ',
  fontSize: 48, // px
  fontFamily: 'Arial',
  bold: true,
  letterSpacing: 0, // px
  color: '#ffffff',
  strokeEnabled: false,
  strokeColor: '#000000',
  strokeWidth: 2, // px
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 6, // px
  bgColor: '#000000',
  bgOpacity: 70, // 0–100 %
  speed: 120, // px/Sekunde
  direction: 'left', // 'left' | 'right' | 'up' | 'down'
  positionY: 100, // 0 % = oben/links, 100 % = unten/rechts
  audioReactive: false,
  // Alt (bis zur gemeinsamen Audio-Reaktiv-Konfiguration); werden beim Laden
  // nach `audioFx` migriert und nur noch zur Kompatibilität mitgeführt.
  reactMode: 'tempo', // 'tempo' | 'scale' | 'glow' | 'shake' | 'opacity'
  beatIntensity: 60, // Stärke der Animation pro Beat (0–100)
  audioLevel: 100, // Eingangs-Empfindlichkeit / Pegel-Gain (0–200 %)
}

// Zuordnung der Einstellungen zu den klappbaren Panel-Sektionen (für die
// sektionsweisen Reset-Buttons).
const SECTION_KEYS = {
  text: ['text', 'fontFamily', 'bold', 'letterSpacing', 'fontSize', 'color'],
  outline: [
    'strokeEnabled',
    'strokeColor',
    'strokeWidth',
    'shadowEnabled',
    'shadowColor',
    'shadowBlur',
  ],
  background: ['bgColor', 'bgOpacity'],
  motion: ['positionY', 'direction', 'speed'],
  audio: ['audioReactive', 'reactMode', 'beatIntensity', 'audioLevel'],
}

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

  // Alle persistierten Einstellungen als Ref, initialisiert aus dem Gespeicherten
  // (Fallback = Standardwert).
  const fields = {}
  for (const key of Object.keys(DEFAULTS)) {
    fields[key] = ref(saved[key] ?? DEFAULTS[key])
  }
  // Migration vom alten 'position'-Feld (top/bottom) auf positionY.
  if (saved.positionY == null && saved.position === 'top') {
    fields.positionY.value = 0
  }

  // Audio-Reaktiv: identische Konfiguration wie Bilder/Text/Hintergrund
  // (Master, Presets, alle Effekte mit eigener Quelle) plus Lauftext-Effekte.
  // Alte Speicherstände (reactMode/beatIntensity/audioLevel) werden migriert.
  const audioFx = ref(
    saved.audioFx
      ? mergeAudioFx(saved.audioFx)
      : migrateLegacyTickerAudio({ ...saved, audioReactive: fields.audioReactive.value }),
  )
  function mergeAudioFx(savedFx) {
    const base = createTickerAudioReactiveConfig()
    assignAudioReactiveConfig(base, savedFx)
    return base
  }
  // Der Ein/Aus-Schalter bleibt `audioReactive`; die Konfiguration spiegelt ihn.
  audioFx.value.enabled = fields.audioReactive.value
  watch(fields.audioReactive, (on) => {
    audioFx.value.enabled = Boolean(on)
  })

  // Setzt alle Einstellungen einer Sektion auf ihre Standardwerte zurück.
  function resetSection(name) {
    const keys = SECTION_KEYS[name]
    if (!keys) return
    for (const key of keys) fields[key].value = DEFAULTS[key]
    if (name === 'audio') {
      // In-place zurücksetzen, damit Renderer/Panel dieselbe Objektidentität behalten
      assignAudioReactiveConfig(audioFx.value, createTickerAudioReactiveConfig())
      audioFx.value.enabled = false
    }
  }

  // Persistenz: bei jeder Änderung speichern
  watch(
    [enabled, audioFx, ...Object.values(fields)],
    () => {
      try {
        const data = { enabled: enabled.value, audioFx: audioFx.value }
        for (const [key, r] of Object.entries(fields)) data[key] = r.value
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        /* localStorage nicht verfügbar – Einstellungen bleiben nur zur Laufzeit */
      }
    },
    { deep: true },
  )

  return {
    enabled,
    ...fields,
    audioFx,
    resetSection,
  }
})
