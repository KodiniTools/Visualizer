// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStockGallery } from '../../composables/useStockGallery.js'

describe('useStockGallery – geteilter State', () => {
  beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}))
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('zwei Aufrufer sehen dieselbe Auswahl – auch über Kategorien hinweg', async () => {
    const a = useStockGallery()
    const b = useStockGallery()
    const catA = [{ id: 'a1', name: 'A1', file: 'a1.png' }]
    const catB = [{ id: 'b1', name: 'B1', file: 'b1.png' }]
    // Kategorie A laden und auswählen, dann Kategorie B
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ images: catA }) })),
    )
    a.deselectAllStockImages()
    // Index wird über setStockImages befüllt → Kategorie-Wechsel simulieren
    const cats = [
      { id: 'A', jsonFile: 'a.json' },
      { id: 'B', jsonFile: 'b.json' },
    ]
    a.stockCategories.value = cats
    await a.loadCategoryImages('A')
    a.selectStockImage(catA[0], { ctrlKey: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ images: catB }) })),
    )
    await a.loadCategoryImages('B')
    a.selectStockImage(catB[0], { ctrlKey: true })

    expect(b.selectedStockCount.value).toBe(2)
    expect(b.selectedStockImagesAll.value.map((i) => i.id).sort()).toEqual(['a1', 'b1'])
    a.deselectAllStockImages()
    expect(b.selectedStockCount.value).toBe(0)
  })

  it('parallele Ladeaufrufe liefern dasselbe Image-Objekt', async () => {
    const created = []
    class FakeImage {
      constructor() {
        created.push(this)
      }
      set src(v) {
        this._src = v
        setTimeout(() => this.onload(), 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const g = useStockGallery()
    const item = { id: 'p1', file: 'p1.png' }
    const [x, y] = await Promise.all([g.loadStockImageObject(item), g.loadStockImageObject(item)])
    expect(x).toBe(y)
    expect(created).toHaveLength(1)
    expect(g.getLoadedStockImage('p1')).toBe(x)
    vi.unstubAllGlobals()
  })
})
