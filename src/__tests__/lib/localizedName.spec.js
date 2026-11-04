// Gemeinsamer Helfer für Namen je Sprache (Galerien, Kataloge, Presets).
import { describe, it, expect } from 'vitest'
import { localizedName } from '../../lib/localizedName.js'

describe('localizedName', () => {
  it('Galerie-Schreibweise: name = DE, name_en = EN', () => {
    const entry = { name: 'Wolken', name_en: 'Clouds' }
    expect(localizedName(entry, 'de')).toBe('Wolken')
    expect(localizedName(entry, 'en')).toBe('Clouds')
  })

  it('Katalog-Schreibweise: name_de / name_en', () => {
    const entry = { name_de: 'Balken', name_en: 'Bars' }
    expect(localizedName(entry, 'de')).toBe('Balken')
    expect(localizedName(entry, 'en')).toBe('Bars')
  })

  it('name_de hat Vorrang vor name', () => {
    expect(localizedName({ name: 'intern', name_de: 'Warm', name_en: 'Warm' }, 'de')).toBe('Warm')
  })

  it('fehlende Sprache fällt auf die andere zurück', () => {
    expect(localizedName({ name: 'Nur Deutsch' }, 'en')).toBe('Nur Deutsch')
    expect(localizedName({ name_en: 'English only' }, 'de')).toBe('English only')
  })

  it('ohne Namen oder Eintrag gilt der Fallback', () => {
    expect(localizedName({}, 'de', 'bars')).toBe('bars')
    expect(localizedName(undefined, 'en', 'x')).toBe('x')
    expect(localizedName(null, 'de')).toBe('')
  })
})
