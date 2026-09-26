import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toRaw } from 'vue'
import { useImageGallery } from '../../composables/useImageGallery.js'

vi.mock('../../utils/presetImageRepository.js', () => ({
  blobFromImage: vi.fn(),
  saveImageBlob: vi.fn(),
  loadImage: vi.fn(),
}))

const { loadImage } = await import('../../utils/presetImageRepository.js')
const { restoreUploadImage } = await import('../../lib/slideshowImagePersistence.js')

const img = (w = 100, h = 50, src = 'data:image/png;base64,AAAA') => ({ width: w, height: h, src })

describe('Wiederhergestellte Bilder in der Upload-Galerie', () => {
  const g = useImageGallery()
  beforeEach(() => {
    g.imageGallery.value = []
    g.deselectAllImages()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('ensureGalleryImage fügt hinzu, ohne die Auswahl zu ändern', () => {
    const entry = g.ensureGalleryImage(img(), 'urlaub.png')
    expect(g.imageGallery.value).toHaveLength(1)
    expect(entry).toMatchObject({ name: 'urlaub.png', dimensions: '100×50' })
    expect(g.selectedImageCount.value).toBe(0)
  })

  it('erkennt vorhandene Bilder (gleiches Objekt oder Name + Maße)', () => {
    const a = img()
    const first = g.ensureGalleryImage(a, 'urlaub.png')
    expect(g.ensureGalleryImage(a, 'anders.png')).toBe(first)
    expect(g.ensureGalleryImage(img(), 'urlaub.png')).toBe(first)
    // gleicher Name, andere Maße → neues Bild
    g.ensureGalleryImage(img(200, 50), 'urlaub.png')
    expect(g.imageGallery.value).toHaveLength(2)
  })

  it('restoreUploadImage legt das Bild in die Galerie und liefert dessen ID', async () => {
    const restored = img()
    loadImage.mockResolvedValue({ imageObject: restored, name: 'strand.jpg' })
    const r1 = await restoreUploadImage('k')
    expect(g.imageGallery.value).toHaveLength(1)
    expect(toRaw(r1.imageObject)).toBe(restored)
    expect(r1.name).toBe('strand.jpg')
    expect(r1.galleryId).toBe(g.imageGallery.value[0].id)
    // erneutes Laden → kein Duplikat
    const r2 = await restoreUploadImage('k')
    expect(r2.galleryId).toBe(r1.galleryId)
    expect(g.imageGallery.value).toHaveLength(1)
  })

  it('bereits hochgeladenes gleiches Bild wird wiederverwendet', async () => {
    const own = img()
    const entry = g.ensureGalleryImage(own, 'strand.jpg')
    loadImage.mockResolvedValue({ imageObject: img(), name: 'strand.jpg' })
    const r = await restoreUploadImage('k')
    expect(toRaw(r.imageObject)).toBe(own)
    expect(r.galleryId).toBe(entry.id)
  })

  it('nicht vorhandenes Bild → null, Galerie unverändert', async () => {
    loadImage.mockResolvedValue(null)
    expect(await restoreUploadImage('weg')).toBeNull()
    expect(g.imageGallery.value).toHaveLength(0)
  })
})
