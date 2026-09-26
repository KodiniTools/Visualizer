import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore.js'
import { slideshowStableKey } from '../../components/foto-panel/slideshow/slideshowImageKey.js'

const KEY = 'visualizer-slideshow-image-transitions'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  setActivePinia(createPinia())
})

describe('slideshowStableKey', () => {
  it('Stock über ID, Upload über Name + Maße', () => {
    expect(slideshowStableKey({ source: 'stock', stockImage: { id: 's1' } })).toBe('stock:s1')
    expect(slideshowStableKey({ id: 'stock:s2' })).toBe('stock:s2')
    expect(
      slideshowStableKey({ id: 123, name: 'a.png', imageObject: { width: 40, height: 20 } }),
    ).toBe('upload:a.png|40x20')
    expect(
      slideshowStableKey({ name: 'b.png', img: { naturalWidth: 8, naturalHeight: 4, width: 1 } }),
    ).toBe('upload:b.png|8x4')
    expect(slideshowStableKey({ id: 1, name: 'ohne-bild.png' })).toBeNull()
    expect(slideshowStableKey(null)).toBeNull()
  })
})

describe('slideshowImageSettingsStore – Übergänge pro Bild dauerhaft', () => {
  it('merkt und liest Übergänge, übersteht „Neuladen“', () => {
    const store = useSlideshowImageSettingsStore()
    store.setTransition('upload:a.png|40x20', 'zoomIn')
    store.setTransition('stock:s1', 'wipe')
    setActivePinia(createPinia())
    const again = useSlideshowImageSettingsStore()
    expect(again.getTransition('upload:a.png|40x20')).toBe('zoomIn')
    expect(again.getTransition('stock:s1')).toBe('wipe')
    expect(again.getTransition('unbekannt')).toBeNull()
  })

  it('„Standard“ (null) entfernt den Eintrag; ungültige Werte werden verworfen', () => {
    const store = useSlideshowImageSettingsStore()
    store.setTransition('k', 'flip')
    store.setTransition('k', null)
    expect(store.getTransition('k')).toBeNull()
    store.setTransition('k2', 'boom')
    expect(store.getTransition('k2')).toBeNull()
    localStorage.setItem(KEY, JSON.stringify({ gut: 'blur', schlecht: 'x', '': 'fade' }))
    setActivePinia(createPinia())
    const again = useSlideshowImageSettingsStore()
    expect(again.getTransition('gut')).toBe('blur')
    expect(again.getTransition('schlecht')).toBeNull()
  })

  it('kaputter Speicher → leer, kein Fehler', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(KEY, '{kaputt')
    expect(useSlideshowImageSettingsStore().getTransition('x')).toBeNull()
  })

  it('begrenzt die Anzahl (älteste Einträge fallen heraus)', () => {
    const store = useSlideshowImageSettingsStore()
    for (let i = 0; i < 505; i++) store.setTransition(`k${i}`, 'fade')
    expect(Object.keys(store.entries)).toHaveLength(500)
    expect(store.getTransition('k0')).toBeNull()
    expect(store.getTransition('k504')).toBe('fade')
  })
})

describe('slideshowImageSettingsStore – Ein-/Ausblenddauer pro Bild', () => {
  it('speichert Übergang + Dauern, begrenzt Werte, übernimmt alte Einträge', () => {
    localStorage.setItem(KEY, JSON.stringify({ alt: 'zoomIn' })) // älteres Format
    const store = useSlideshowImageSettingsStore()
    expect(store.getImageSettings('alt')).toEqual({ transition: 'zoomIn' })
    store.setImageSettings('k', { transition: 'wipe', fadeIn: 50, fadeOut: 9000 })
    expect(store.getImageSettings('k')).toEqual({ transition: 'wipe', fadeIn: 100, fadeOut: 5000 })
    store.setImageSettings('k', { transition: null, fadeIn: 1500, fadeOut: null })
    setActivePinia(createPinia())
    const again = useSlideshowImageSettingsStore()
    expect(again.getImageSettings('k')).toEqual({ fadeIn: 1500 })
    again.setImageSettings('k', {})
    expect(again.getImageSettings('k')).toBeNull()
  })
})

describe('slideshowImageSettingsStore – Anzeigedauer und Audio pro Bild', () => {
  it('speichert Anzeigedauer (begrenzt) und Audio-Modus; „Standard“/ungültig wird nicht gespeichert', () => {
    const store = useSlideshowImageSettingsStore()
    store.setImageSettings('k', { displayDuration: 120000, audioMode: 'glitch' })
    expect(store.getImageSettings('k')).toEqual({ displayDuration: 60000, audioMode: 'glitch' })
    store.setImageSettings('k2', { displayDuration: 100, audioMode: 'default' })
    expect(store.getImageSettings('k2')).toEqual({ displayDuration: 500 })
    store.setImageSettings('k3', { audioMode: 'toString' })
    expect(store.getImageSettings('k3')).toBeNull()
    setActivePinia(createPinia())
    expect(useSlideshowImageSettingsStore().getImageSettings('k')).toEqual({
      displayDuration: 60000,
      audioMode: 'glitch',
    })
  })
})

describe('slideshowImageSettingsStore – Größe/Position pro Bild', () => {
  const b = { relX: 0.1, relY: 0.2, relWidth: 0.3, relHeight: 0.25 }

  it('updateImageSettings ändert nur einzelne Felder; Bounds bleiben bei anderen Änderungen', () => {
    const store = useSlideshowImageSettingsStore()
    store.updateImageSettings('k', { bounds: b })
    store.updateImageSettings('k', { transition: 'wipe' })
    expect(store.getImageSettings('k')).toEqual({ bounds: b, transition: 'wipe' })
    store.updateImageSettings('k', { transition: null })
    expect(store.getImageSettings('k')).toEqual({ bounds: b })
    store.updateImageSettings('k', { bounds: { relX: 'x' } }) // ungültig → entfernt
    expect(store.getImageSettings('k')).toBeNull()
  })

  it('clearField entfernt Bounds bei allen Bildern, übrige Werte bleiben', () => {
    const store = useSlideshowImageSettingsStore()
    store.updateImageSettings('a', { bounds: b, audioMode: 'pulse' })
    store.updateImageSettings('c', { bounds: b })
    store.clearField('bounds')
    expect(store.getImageSettings('a')).toEqual({ audioMode: 'pulse' })
    expect(store.getImageSettings('c')).toBeNull()
    setActivePinia(createPinia())
    expect(useSlideshowImageSettingsStore().getImageSettings('a')).toEqual({ audioMode: 'pulse' })
  })
})
