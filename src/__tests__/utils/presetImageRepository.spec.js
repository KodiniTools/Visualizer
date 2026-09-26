// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  saveImageBlob,
  loadImage,
  pruneImages,
  blobFromImage,
  _clearImageCache,
} from '../../utils/presetImageRepository.js'

class FakeImage {
  set src(v) {
    this._src = v
    setTimeout(() => this.onload?.(), 0)
  }
  get src() {
    return this._src
  }
}
class FakeFileReader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`
      this.onload?.()
    })
  }
}

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('FileReader', FakeFileReader)
  _clearImageCache()
})
afterEach(() => vi.unstubAllGlobals())

const blobA = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
const blobB = () => new Blob([new Uint8Array([9, 9, 9])], { type: 'image/jpeg' })

describe('presetImageRepository (IndexedDB)', () => {
  it('speichert per Inhalts-Hash – gleiches Bild nur einmal', async () => {
    const k1 = await saveImageBlob(blobA(), 'a.png')
    const k2 = await saveImageBlob(blobA(), 'kopie.png')
    const k3 = await saveImageBlob(blobB(), 'b.jpg')
    expect(k1).toMatch(/^[0-9a-f]{64}$/)
    expect(k1).toBe(k2)
    expect(k3).not.toBe(k1)
  })

  it('lädt gespeicherte Bilder – pro Sitzung dasselbe Objekt', async () => {
    const key = await saveImageBlob(blobA(), 'a.png')
    const [x, y] = await Promise.all([loadImage(key), loadImage(key)])
    expect(x.imageObject).toBe(y.imageObject)
    expect(x.imageObject.src).toMatch(/^data:image\/png;base64,/)
    expect(await loadImage('0'.repeat(64))).toBeNull()
  })

  it('pruneImages entfernt nicht mehr verwendete Bilder', async () => {
    const keep = await saveImageBlob(blobA(), 'a.png')
    const drop = await saveImageBlob(blobB(), 'b.jpg')
    const removed = await pruneImages([keep])
    expect(removed).toBeGreaterThanOrEqual(1)
    _clearImageCache()
    expect(await loadImage(drop)).toBeNull()
    expect(await loadImage(keep)).not.toBeNull()
  })

  it('blobFromImage liest data:-URLs', async () => {
    const blob = await blobFromImage({ src: 'data:image/png;base64,AQID' })
    expect(blob.size).toBe(3)
    await expect(blobFromImage({})).rejects.toThrow()
  })
})
