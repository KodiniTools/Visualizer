/**
 * LED-Text / LED-Zahlen: Konstanten, Validierung und Textaufbereitung.
 *
 * Bewusst ohne Import der Effekt-Bibliothek, damit Stores und Tests sie
 * leichtgewichtig nutzen können. Die Darstellung liegt in ledText.js.
 *
 * - "LED-Text" (glLedText): ganze Wörter/Zeilen aus den LED-Buchstaben A–Z
 *   und LED-Ziffern 0–9 in EINEM Visualizer/Layer.
 * - "LED-Zahlen" (glLedNumber): mehrstellige Zahlen aus den LED-Ziffern –
 *   wahlweise fester Text, aktuelle Uhrzeit oder Countdown bis zu einem
 *   Zeitpunkt (mit LED-Doppelpunkt).
 *
 * @module visualizers/gl/ledTextSettings
 */

export const LED_TEXT_ID = 'glLedText'
export const LED_NUMBER_ID = 'glLedNumber'

/** true für beide gemeinsamen LED-Visualizer (Text und Zahlen). */
export const isLedTextVisualizer = (id) => id === LED_TEXT_ID || id === LED_NUMBER_ID

export const LED_TEXT_MAX_LINES = 4
export const LED_TEXT_MAX_LINE = 24

export const LED_NUMBER_MODES = Object.freeze(['text', 'clock', 'countdown'])

/** Zeitzonen zur Auswahl ('' = Ortszeit des Browsers). */
export const LED_TIME_ZONES = Object.freeze([
  '',
  'Europe/Zurich',
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/London',
  'UTC',
  'America/New_York',
])

/** Standardwerte – gelten für den Single-Modus und jeden Layer. */
export const DEFAULT_LED_CONFIG = Object.freeze({
  ledText: 'HELLO',
  ledNumberText: '2026',
  ledNumberMode: 'text',
  ledNumberSeconds: true,
  ledNumberTimeZone: '',
  ledCountdownTarget: '',
})

export const LED_CONFIG_KEYS = Object.freeze(Object.keys(DEFAULT_LED_CONFIG))

/**
 * Eingabe für die Speicherung begrenzen: max. 4 Zeilen à 24 Zeichen,
 * keine Steuerzeichen (außer Zeilenumbruch).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLedTextInput(raw) {
  if (typeof raw !== 'string') return ''
  // Steuerzeichen (außer \n) entfernen – ohne Regex mit Steuerzeichen
  const isAllowed = (ch) => {
    const code = ch.charCodeAt(0)
    return code === 10 || (code >= 32 && code !== 127)
  }
  return [...raw.replace(/\r\n?/g, '\n')]
    .filter(isAllowed)
    .join('')
    .split('\n')
    .slice(0, LED_TEXT_MAX_LINES)
    .map((line) => line.slice(0, LED_TEXT_MAX_LINE))
    .join('\n')
}

/**
 * Ein Feld der LED-Konfiguration validieren.
 * @param {string} key - einer der LED_CONFIG_KEYS
 * @param {unknown} value
 * @returns {unknown} gültiger Wert (bei ungültiger Eingabe der Standardwert)
 */
export function normalizeLedField(key, value) {
  switch (key) {
    case 'ledText':
    case 'ledNumberText':
      return normalizeLedTextInput(value)
    case 'ledNumberMode':
      return LED_NUMBER_MODES.includes(value) ? value : DEFAULT_LED_CONFIG.ledNumberMode
    case 'ledNumberSeconds':
      return value !== false
    case 'ledNumberTimeZone':
      return LED_TIME_ZONES.includes(value) ? value : ''
    case 'ledCountdownTarget':
      return typeof value === 'string' && value && !Number.isNaN(Date.parse(value))
        ? new Date(value).toISOString()
        : ''
    default:
      return value
  }
}

/**
 * Vollständige, gültige LED-Konfiguration aus einem Objekt (Store, Layer,
 * Preset). Fehlende Felder (ältere Presets) → Standardwerte.
 * @param {object} [src]
 */
export function normalizeLedConfig(src) {
  const s = src && typeof src === 'object' ? src : {}
  const out = {}
  for (const key of LED_CONFIG_KEYS) {
    out[key] = key in s ? normalizeLedField(key, s[key]) : DEFAULT_LED_CONFIG[key]
  }
  return out
}

/**
 * Text in darstellbare Zeilen zerlegen: Großbuchstaben A–Z, Ziffern 0–9 und
 * Leerzeichen; Umlaute werden umschrieben (Ä → AE …), alles andere entfällt.
 * Mit digitsOnly (LED-Zahlen) bleiben nur Ziffern, Leerzeichen und ':'.
 * @param {string} text
 * @param {{digitsOnly?: boolean}} [options]
 * @returns {string[]} nicht-leere Zeilen
 */
export function parseLedText(text, { digitsOnly = false } = {}) {
  const invalid = digitsOnly ? /[^0-9 :]/g : /[^A-Z0-9 ]/g
  return normalizeLedTextInput(text)
    .split('\n')
    .map((line) =>
      line
        .toUpperCase()
        .replace(/Ä/g, 'AE')
        .replace(/Ö/g, 'OE')
        .replace(/Ü/g, 'UE')
        .replace(/ẞ|ß/g, 'SS')
        .replace(invalid, '')
        // Zeilen werden zentriert – Leerzeichen am Rand würden nur verschieben
        .trim(),
    )
    .filter((line) => line.length > 0)
}

const pad2 = (n) => String(n).padStart(2, '0')

/** Uhrzeit als "HH:MM" bzw. "HH:MM:SS" in der gewählten Zeitzone. */
export function formatClock(now, { seconds = true, timeZone = '' } = {}) {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: false }
  if (seconds) opts.second = '2-digit'
  if (timeZone) opts.timeZone = timeZone
  let parts
  try {
    parts = new Intl.DateTimeFormat('de-CH', opts).formatToParts(now)
  } catch {
    parts = new Intl.DateTimeFormat('de-CH', { ...opts, timeZone: undefined }).formatToParts(now)
  }
  const get = (type) => parts.find((p) => p.type === type)?.value || '00'
  // Manche Umgebungen liefern "24" für Mitternacht
  const hh = get('hour') === '24' ? '00' : get('hour')
  return seconds ? `${hh}:${get('minute')}:${get('second')}` : `${hh}:${get('minute')}`
}

/** Restzeit bis target als "[T ]HH:MM[:SS]"; nach Ablauf 00:00(:00). */
export function formatCountdown(now, target, { seconds = true } = {}) {
  const t = Date.parse(target)
  const diff = Number.isNaN(t) ? 0 : Math.max(0, t - now.getTime())
  // Aufrunden, damit "00:00:01" nicht zu früh auf 0 springt
  let total = seconds ? Math.ceil(diff / 1000) : Math.ceil(diff / 60000) * 60
  const days = Math.floor(total / 86400)
  total -= days * 86400
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const time = seconds ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(h)}:${pad2(m)}`
  return days > 0 ? `${days} ${time}` : time
}

/**
 * Anzuzeigender Text für einen LED-Visualizer.
 * @param {string} visualizerId - LED_TEXT_ID oder LED_NUMBER_ID
 * @param {object} config - LED-Konfiguration (wird normalisiert)
 * @param {Date} [now]
 * @returns {string}
 */
export function ledDisplayText(visualizerId, config, now = new Date()) {
  const c = normalizeLedConfig(config)
  if (visualizerId !== LED_NUMBER_ID) return c.ledText
  if (c.ledNumberMode === 'clock') {
    return formatClock(now, { seconds: c.ledNumberSeconds, timeZone: c.ledNumberTimeZone })
  }
  if (c.ledNumberMode === 'countdown') {
    return formatCountdown(now, c.ledCountdownTarget, { seconds: c.ledNumberSeconds })
  }
  return c.ledNumberText
}
