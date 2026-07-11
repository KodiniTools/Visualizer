// Time formatting/parsing helpers shared across the sticky player bar modules.

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const parseTimeInput = (timeStr) => {
  if (!timeStr) return 0
  const cleaned = timeStr.trim()
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10)
  }
  const parts = cleaned.split(':')
  if (parts.length >= 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secs = parseInt(parts[1], 10) || 0
    return mins * 60 + secs
  }
  return 0
}
