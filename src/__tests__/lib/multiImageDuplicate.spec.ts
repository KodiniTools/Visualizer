// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiImageManager } from '../../lib/multiImageManager'
import { stub } from '../helpers/canvasStubs'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function setup() {
  const canvas = { width: 1000, height: 500 }
  const redrawCallback = vi.fn()
  const onImageChanged = vi.fn()
  const onImageSelected = vi.fn()
  const mim = new MultiImageManager(stub(canvas), {
    redrawCallback,
    onImageChanged,
    onImageSelected,
  })
  const el = Object.assign(document.createElement('img'), { width: 300, height: 150 })
  const original = mim.addImage(el)
  return { mim, el, original, redrawCallback, onImageChanged, onImageSelected }
}

describe('MultiImageManager.duplicateImage', () => {
  it('erzeugt eine vollständige, unabhängige Kopie mit demselben Bild-Element', () => {
    const { mim, el, original, onImageChanged } = setup()
    original!.fotoSettings = stub({ ...(original!.fotoSettings || {}), brightness: 120 })
    onImageChanged.mockClear()

    const copy = mim.duplicateImage(original)

    expect(copy).not.toBeNull()
    expect(mim.images).toHaveLength(2)
    expect(copy!.id).not.toBe(original!.id)
    expect(copy!.imageObject).toBe(el)
    expect(copy!.relX).toBeCloseTo(original!.relX + 0.05)
    expect(copy!.relY).toBeCloseTo(original!.relY + 0.05)
    expect(copy!.relWidth).toBe(original!.relWidth)
    expect(copy!.relHeight).toBe(original!.relHeight)
    expect(Number.isFinite(copy!.relHeight)).toBe(true)
    expect(copy!.fotoSettings!.brightness).toBe(120)
    // tiefe Kopie: Änderungen an der Kopie wirken nicht aufs Original
    copy!.fotoSettings!.brightness = 50
    expect(original!.fotoSettings!.brightness).toBe(120)
    expect(mim.getSelectedImage()).toBe(copy)
    expect(onImageChanged).toHaveBeenCalledTimes(1)
  })

  it('übernimmt das Bild-Element auch aus einer JSON-Kopie (Kopieren/Einfügen)', () => {
    const { mim, el, original } = setup()
    const clipboard = { ...JSON.parse(JSON.stringify(original)), imageObject: el }
    const copy = mim.duplicateImage(clipboard, 0.1)
    expect(copy!.imageObject).toBe(el)
    expect(copy!.relX).toBeCloseTo(original!.relX + 0.1)
  })

  it('ohne Bild-Element oder mit ungültigen Maßen: keine kaputte Kopie', () => {
    const { mim, original } = setup()
    expect(mim.duplicateImage(null)).toBeNull()
    expect(mim.duplicateImage(stub({ ...original, imageObject: {} }))).toBeNull()
    expect(mim.duplicateImage({ ...original, relHeight: NaN })).toBeNull()
    expect(mim.images).toHaveLength(1)
  })
})
