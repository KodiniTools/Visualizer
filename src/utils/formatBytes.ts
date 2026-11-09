/**
 * Formatiert eine Bytezahl lesbar (B, KB, MB, GB), passend zur Sprache.
 * Nicht-numerische oder nicht-positive Werte ergeben "0 B".
 */
export function formatBytes(bytes: number, locale = 'de'): string {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const scaled = value / 1024 ** i
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: i === 0 ? 0 : 1,
  }).format(scaled)
  return `${formatted} ${units[i]}`
}
