// Time formatting/parsing helpers shared across the sticky player bar modules.

/** Rundet auf 2 Dezimalstellen (Hundertstelsekunden) und vermeidet Float-Rauschen. */
export const roundToHundredths = (seconds) => Math.round(seconds * 100) / 100

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formatiert Sekunden als "M:SS.hh" (Hundertstelsekunden), z.B. 18.5 → "0:18.50".
 * Wird für Beat-Drop-Marker verwendet, deren Zeit auf 1/100 s genau ist.
 */
export const formatTimePrecise = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00.00'
  const total = roundToHundredths(seconds)
  const mins = Math.floor(total / 60)
  const secs = total - mins * 60
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`
}

/**
 * Parst eine Zeiteingabe in Sekunden (mit Hundertstel).
 * Akzeptiert: "90", "18.5", "18,5", "1:30", "1:30.25", "1:30,25", "1:02:03.5".
 * Ungültige Eingaben ergeben 0.
 */
export const parseTimeInput = (timeStr) => {
  if (!timeStr) return 0
  const cleaned = String(timeStr).trim().replace(',', '.')
  if (!cleaned) return 0

  const parts = cleaned.split(':')
  if (parts.some((p) => p === '' || !/^\d*\.?\d*$/.test(p))) return 0

  let total = 0
  for (const part of parts) {
    const value = parseFloat(part)
    if (isNaN(value)) return 0
    total = total * 60 + value
  }
  return roundToHundredths(total)
}
