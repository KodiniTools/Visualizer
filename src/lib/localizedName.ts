export interface LocalizedEntry {
  name?: string
  name_de?: string
  name_en?: string
}

/**
 * Anzeigename eines Eintrags in der gewünschten Sprache.
 *
 * Zwei Schreibweisen kommen vor:
 * - Galerien (gallery.json, Stock-Kategorien): `name` = Deutsch, `name_en` = Englisch
 * - Kataloge (Visualizer, Mischmodi, Foto-Presets): `name_de` / `name_en`, optional `name`
 *
 * Fehlt der Name in der gewünschten Sprache, gilt der jeweils andere,
 * danach `fallback` (z. B. die ID).
 *
 * @param locale 'de' | 'en'
 */
export function localizedName(
  entry: LocalizedEntry | null | undefined,
  locale: string,
  fallback = '',
): string {
  if (!entry) return fallback
  const de = entry.name_de || entry.name
  const en = entry.name_en
  return (locale === 'en' ? en || de : de || en) || fallback
}
