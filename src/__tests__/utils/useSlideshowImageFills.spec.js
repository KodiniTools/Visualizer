// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useSlideshowImageFills } from '../../components/foto-panel/slideshow/useSlideshowImageFills.js'

const stock = {
  id: 'bg-1',
  name: 'Wolken',
  file: 'gallery/bg/wolken.jpg',
  thumbnail: 'gallery/bg/t.jpg',
}
const key = 'a'.repeat(64)

function setup(over = {}) {
  const changes = []
  const deps = {
    onChange: vi.fn((target, fill, image) => changes.push([target, fill, image])),
    loadUpload: vi.fn(async () => ({ imageObject: { src: 'data:,u' }, name: 'u' })),
    persistUpload: vi.fn(async () => ({ key, name: 'foto.png' })),
    loadStock: vi.fn(async () => ({ src: 'gallery/bg/wolken.jpg' })),
    onMissing: vi.fn(),
    onError: vi.fn(),
    ...over,
  }
  return { fills: useSlideshowImageFills(deps), deps, changes }
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('useSlideshowImageFills', () => {
  it('Stock-Bild wählen: lädt, meldet und merkt dauerhaft', async () => {
    const { fills, deps, changes } = setup()
    await fills.select('canvas', { source: 'stock', stockImage: stock })
    await flushPromises()
    expect(deps.loadStock).toHaveBeenCalledWith(stock)
    const [target, fill, image] = changes.at(-1)
    expect(target).toBe('canvas')
    expect(fill).toMatchObject({ enabled: true, stock })
    expect(image.src).toBe('gallery/bg/wolken.jpg')
    expect(fills.thumbOf('canvas')).toBe('gallery/bg/t.jpg')
    expect(JSON.parse(localStorage.getItem('visualizer-slideshow-base-image')).stock).toEqual(stock)
    expect(fills.payload().backgroundImageObject).toBe(image)
  })

  it('Upload wählen: speichert dauerhaft, übernimmt das Bild ohne Neuladen', async () => {
    const { fills, deps, changes } = setup()
    const img = { src: 'data:,x' }
    await fills.select('workspace', { source: 'upload', name: 'foto.png', img })
    await flushPromises()
    expect(deps.persistUpload).toHaveBeenCalledWith({ name: 'foto.png', imageObject: img })
    expect(deps.loadUpload).not.toHaveBeenCalled()
    expect(changes.at(-1)[0]).toBe('workspace')
    expect(changes.at(-1)[2]).toBe(img)
    expect(fills.fills.workspace.value.upload).toEqual({ key, name: 'foto.png' })
  })

  it('beim Öffnen: gemerktes Bild wird geladen; fehlendes meldet onMissing', async () => {
    localStorage.setItem(
      'visualizer-slideshow-workspace-image',
      JSON.stringify({ enabled: true, upload: { key, name: 'weg.png' } }),
    )
    const { deps, changes } = setup({ loadUpload: vi.fn(async () => null) })
    await flushPromises()
    expect(deps.loadUpload).toHaveBeenCalledWith(key)
    expect(deps.onMissing).toHaveBeenCalledWith('weg.png')
    expect(changes.at(-1)).toEqual(['workspace', expect.objectContaining({ enabled: true }), null])
  })

  it('Auswahl-Fehler meldet onError; Entfernen löscht Bild und Verweis', async () => {
    const { fills, deps, changes } = setup({
      persistUpload: vi.fn(async () => {
        throw new Error('voll')
      }),
    })
    await fills.select('canvas', { source: 'upload', name: 'x', img: {} })
    expect(deps.onError).toHaveBeenCalled()

    await fills.select('canvas', { source: 'stock', stockImage: stock })
    await flushPromises()
    fills.clear('canvas')
    await flushPromises()
    expect(fills.fills.canvas.value.stock).toBeNull()
    expect(changes.at(-1)[2]).toBeNull()
  })

  it('schneller Wechsel: nur das zuletzt gewählte Bild gilt', async () => {
    let resolveFirst
    const loadStock = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(async () => ({ src: 'zwei' }))
    const { fills, changes } = setup({ loadStock })
    await fills.select('canvas', { source: 'stock', stockImage: stock })
    await flushPromises()
    await fills.select('canvas', {
      source: 'stock',
      stockImage: { ...stock, id: 'bg-2', file: 'gallery/bg/zwei.jpg' },
    })
    await flushPromises()
    resolveFirst({ src: 'eins' })
    await flushPromises()
    expect(fills.images.canvas.value.src).toBe('zwei')
    expect(changes.at(-1)[2].src).toBe('zwei')
  })

  it('Preset übernehmen lädt das Bild nach', async () => {
    const { fills, deps } = setup()
    fills.apply('canvas', { enabled: true, stock, fit: 'contain' })
    await flushPromises()
    expect(deps.loadStock).toHaveBeenCalled()
    expect(fills.fills.canvas.value.fit).toBe('contain')
  })
})
