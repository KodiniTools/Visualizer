import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../../utils/presetImageRepository.js', () => ({
  pruneImages: vi.fn(async () => 0),
  getImageStorageStats: vi.fn(async () => ({ count: 0, bytes: 0 })),
  getStorageEstimate: vi.fn(async () => null),
}))

const { pruneImages, getImageStorageStats, getStorageEstimate } = await import(
  '../../utils/presetImageRepository.js'
)
const { useSlideshowPresetStore, IMAGE_CLEANUP_GRACE_MS, _resetAutoCleanup } = await import(
  '../../stores/slideshowPresetStore.js'
)

const KEY = 'visualizer-slideshow-presets'
const k1 = 'a'.repeat(64)
const k2 = 'b'.repeat(64)
const preset = (id, key) => ({
  id,
  name: id,
  settings: {},
  slots: [{ upload: { key, name: 'x' } }],
})

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
  pruneImages.mockClear()
  _resetAutoCleanup()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('slideshowPresetStore – automatisches Aufräumen', () => {
  it('behält Flächenbilder aus Presets und die dauerhaft gemerkten', async () => {
    const k3 = 'c'.repeat(64)
    localStorage.setItem(
      KEY,
      JSON.stringify([
        {
          id: 'p2',
          name: 'p2',
          settings: { workspaceImageFill: { enabled: true, upload: { key: k2, name: 'w' } } },
          slots: [],
        },
      ]),
    )
    localStorage.setItem(
      'visualizer-slideshow-base-image',
      JSON.stringify({ enabled: true, upload: { key: k3, name: 'c' } }),
    )
    const store = useSlideshowPresetStore()
    await store.cleanupImages()
    const [keep] = pruneImages.mock.calls.at(-1)
    expect([...keep].sort()).toEqual([k2, k3].sort())
  })

  it('räumt nach dem Laden einmal verzögert auf (mit Schutzfrist)', async () => {
    vi.useFakeTimers()
    localStorage.setItem(KEY, JSON.stringify([preset('p1', k1)]))
    const store = useSlideshowPresetStore()
    store.loadPresets()
    expect(pruneImages).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3500)
    expect(pruneImages).toHaveBeenCalledTimes(1)
    const [keep, opts] = pruneImages.mock.calls[0]
    expect([...keep]).toEqual([k1])
    expect(opts).toEqual({ minAgeMs: IMAGE_CLEANUP_GRACE_MS })

    // weiterer Store (z. B. neue Pinia) im selben Seitenaufruf → kein zweiter Lauf
    setActivePinia(createPinia())
    useSlideshowPresetStore().loadPresets()
    await vi.advanceTimersByTimeAsync(3500)
    expect(pruneImages).toHaveBeenCalledTimes(1)
  })

  it('berücksichtigt Presets, die ein anderer Tab gespeichert hat', async () => {
    localStorage.setItem(KEY, JSON.stringify([preset('p1', k1)]))
    const store = useSlideshowPresetStore()
    store.loadPresets()
    // anderer Tab schreibt ein weiteres Preset
    localStorage.setItem(KEY, JSON.stringify([preset('p1', k1), preset('p2', k2)]))
    await store.cleanupImages()
    expect([...pruneImages.mock.calls.at(-1)[0]].sort()).toEqual([k1, k2])
  })

  it('unlesbarer Preset-Speicher → nichts löschen', async () => {
    localStorage.setItem(KEY, '{kaputt')
    const store = useSlideshowPresetStore()
    vi.useFakeTimers()
    store.loadPresets()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await store.cleanupImages()).toBe(0)
    expect(pruneImages).not.toHaveBeenCalled()
  })

  it('Löschen eines Presets räumt dessen Bilder auf', async () => {
    const store = useSlideshowPresetStore()
    const p = store.savePreset('A', { settings: {}, slots: [{ upload: { key: k1, name: 'a' } }] })
    store.deletePreset(p.id)
    await Promise.resolve()
    expect(pruneImages).toHaveBeenCalled()
    expect([...pruneImages.mock.calls.at(-1)[0]]).toEqual([])
  })
})

describe('slideshowPresetStore – Speicherbelegung', () => {
  it('refreshImageStats übernimmt Bildstatistik und Browser-Kontingent', async () => {
    getImageStorageStats.mockResolvedValueOnce({ count: 3, bytes: 4096 })
    getStorageEstimate.mockResolvedValueOnce({ usage: 10_000, quota: 100_000 })
    const store = useSlideshowPresetStore()
    await store.refreshImageStats()
    expect(store.imageStats).toEqual({
      available: true,
      count: 3,
      bytes: 4096,
      usage: 10_000,
      quota: 100_000,
    })
  })

  it('ohne IndexedDB → nicht verfügbar', async () => {
    getImageStorageStats.mockRejectedValueOnce(new Error('IndexedDB nicht verfügbar'))
    const store = useSlideshowPresetStore()
    await store.refreshImageStats()
    expect(store.imageStats.available).toBe(false)
  })

  it('wird nach Speichern und Aufräumen aktualisiert', async () => {
    const store = useSlideshowPresetStore()
    getImageStorageStats.mockClear()
    store.savePreset('A', { settings: {}, slots: [] })
    expect(getImageStorageStats).toHaveBeenCalled()
    getImageStorageStats.mockClear()
    await store.cleanupImages()
    expect(getImageStorageStats).toHaveBeenCalled()
  })
})
