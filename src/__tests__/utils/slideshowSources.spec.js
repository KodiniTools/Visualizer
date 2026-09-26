import { describe, it, expect, vi } from 'vitest'
import {
  fileBaseName,
  buildSlideshowSourceImages,
  resolveSlideshowImageObject,
  ensureSlideshowImagesLoaded,
  restorePresetImages,
  stockEntryFromRef,
} from '../../lib/slideshowSources.js'

const up = (id, name) => ({ id, name, img: { src: `data:${id}` } })
const st = (id, file, name = id) => ({ id, name, file, thumbnail: `${file}.thumb` })

describe('slideshowSources', () => {
  it('fileBaseName', () => {
    expect(fileBaseName('gallery/backgrounds/Wald.WEBP?v=2')).toBe('wald.webp')
    expect(fileBaseName('brücke-1.webp')).toBe('brücke-1.webp')
    expect(fileBaseName(undefined)).toBe('')
  })

  it('führt Uploads + Stock zusammen, gleiches Motiv nur einmal (Upload hat Vorrang)', () => {
    const list = buildSlideshowSourceImages(
      [up('u1', 'wald.webp'), up('u2', 'see.png')],
      [st('s1', 'gallery/bg/wald.webp'), st('s2', 'gallery/bg/berg.svg'), st('s2', 'x/berg.svg')],
      (id) => (id === 's2' ? { loaded: id } : null),
    )
    expect(list.map((i) => i.id)).toEqual(['u1', 'u2', 'stock:s2'])
    const stock = list[2]
    expect(stock.source).toBe('stock')
    expect(stock.thumbnail).toBe('gallery/bg/berg.svg.thumb')
    expect(stock.imageObject).toEqual({ loaded: 's2' })
    expect(list[0]).toMatchObject({ source: 'upload', imageObject: { src: 'data:u1' } })
  })

  it('resolveSlideshowImageObject nutzt Cache für Stock-Bilder', () => {
    const cache = { s1: { cached: true } }
    const get = (id) => cache[id] ?? null
    expect(resolveSlideshowImageObject({ stockImage: { id: 's1' } }, get)).toEqual({ cached: true })
    expect(resolveSlideshowImageObject({ img: 'x' }, get)).toBe('x')
    expect(resolveSlideshowImageObject(null, get)).toBeNull()
  })

  it('ensureSlideshowImagesLoaded lädt fehlende Stock-Bilder, lässt defekte aus', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loadStock = vi.fn(async (s) => {
      if (s.id === 'bad') throw new Error('404')
      return { loaded: s.id }
    })
    const { images, failed } = await ensureSlideshowImagesLoaded(
      [
        { id: 'u1', name: 'A', imageObject: { a: 1 } },
        { id: 'stock:s1', name: 'B', stockImage: { id: 's1' } },
        { id: 'stock:bad', name: 'C', stockImage: { id: 'bad' } },
      ],
      loadStock,
    )
    expect(images.map((i) => i.imageObject)).toEqual([{ a: 1 }, { loaded: 's1' }])
    expect(failed).toEqual(['C'])
    expect(loadStock).toHaveBeenCalledTimes(2)
  })
})

describe('restorePresetImages', () => {
  const ref = { id: 's1', name: 'Wald', file: 'gallery/bg/wald.png' }

  it('ohne Stock-Verweise → null (bisheriges Verhalten)', () => {
    expect(restorePresetImages([{ stock: null }, {}], [])).toBeNull()
  })

  it('Stock-Positionen aus Verweis, Upload-Positionen aus aktueller Auswahl', () => {
    const current = [
      { id: 'u1', source: 'upload' },
      { id: 'stock:x', source: 'stock' },
      { id: 'u2', source: 'upload' },
    ]
    const slots = [{ stock: null }, { stock: ref }, { stock: null }, { stock: null }]
    const pairs = restorePresetImages(slots, current, (id) => (id === 's1' ? { cached: 1 } : null))
    expect(pairs.map((p) => p.img.id)).toEqual(['u1', 'stock:s1', 'u2'])
    expect(pairs[1].slot).toBe(slots[1])
    expect(pairs[1].img.imageObject).toEqual({ cached: 1 })
    // 4. Position entfällt (kein weiteres hochgeladenes Bild)
    expect(pairs).toHaveLength(3)
  })

  it('stockEntryFromRef baut einen ladbaren Eintrag', () => {
    const e = stockEntryFromRef(ref)
    expect(e).toMatchObject({ id: 'stock:s1', source: 'stock', thumbnail: ref.file })
    expect(e.stockImage).toMatchObject({ id: 's1', file: ref.file })
  })
})
