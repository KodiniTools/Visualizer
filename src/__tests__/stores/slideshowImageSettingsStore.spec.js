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
    expect(Object.keys(store.transitions)).toHaveLength(500)
    expect(store.getTransition('k0')).toBeNull()
    expect(store.getTransition('k504')).toBe('fade')
  })
})
