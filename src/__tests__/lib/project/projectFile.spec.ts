// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  buildProjectFile,
  loadProjectFile,
  ProjectFormatError,
  type ProjectDeps,
} from '../../../lib/project/projectFile'
import { createProjectPartRegistry } from '../../../lib/project/projectParts'
import { createMediaRegistry } from '../../../lib/history/mediaRegistry'
import { packProject } from '../../../lib/project/projectArchive'
import { mediaScheme, mapStrings, dataUrlToBlob } from '../../../lib/project/projectAssets'

/** Lesezugriff auf die Test-Segmente */
type Segs = {
  images: { list: { media: string; x: number }[] }
  videos: { list: { media: string }[] }
  beatMarkers: { markers: { action: { audioTrack: { url: string } } }[] }
  texts: { list: { content: string }[] }
}

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

/** Kleine "App": Segmente, Teile und eine Medien-Registry wie in der echten App */
function makeApp() {
  const media = createMediaRegistry()
  let segments: Record<string, unknown> = {}
  const recorder = {
    captureAll: () => JSON.parse(JSON.stringify(segments)),
    applyAll: vi.fn(async (snaps: Record<string, unknown>) => {
      segments = { ...segments, ...snaps }
      return Object.keys(snaps)
    }),
    rebase: vi.fn(),
  }
  const parts = createProjectPartRegistry()
  let gallery: { id: number; src: string }[] = []
  parts.register('gallery', {
    capture: () => ({ items: gallery }),
    apply: (snap: { items: { id: number; src: string }[] }) => {
      gallery = snap.items
    },
  })
  const clearHistory = vi.fn()
  const deps: ProjectDeps = { recorder, parts, media, clearHistory }
  return {
    deps,
    media,
    setSegments: (s: Record<string, unknown>) => (segments = s),
    getSegments: () => segments,
    setGallery: (g: typeof gallery) => (gallery = g),
    getGallery: () => gallery,
  }
}

/** Blob-URLs gibt es in jsdom nicht als fetch-bare Ressource → Loader mit Tabelle */
function blobTable() {
  const table = new Map<string, Blob>()
  let n = 0
  return {
    add(blob: Blob) {
      const url = `blob:test/${++n}`
      table.set(url, blob)
      return url
    },
    load: async (url: string) => {
      if (mediaScheme(url) === 'data') return dataUrlToBlob(url)
      const blob = table.get(url)
      if (!blob) throw new Error('revoked')
      return blob
    },
    create: (blob: Blob) => {
      const url = `blob:restored/${++n}`
      table.set(url, blob)
      return url
    },
    get: (url: string) => table.get(url),
  }
}

describe('projectFile', () => {
  it('Rundreise: Segmente, Medien-Schlüssel, Teile und Dateien', async () => {
    const blobs = blobTable()
    const source = makeApp()
    const videoUrl = blobs.add(new Blob(['VIDEO'], { type: 'video/webm' }))
    // Ein paar Schlüssel verbrauchen, damit sich die Nummern unterscheiden
    source.media.intern('data:image/png;base64,AAAA')
    const imageKey = source.media.intern(PNG_DATA_URL)!
    const videoKey = source.media.intern(videoUrl)!
    source.setSegments({
      images: { list: [{ media: imageKey, x: 10 }] },
      videos: { list: [{ media: videoKey }] },
      beatMarkers: { markers: [{ action: { audioTrack: { url: videoUrl, name: 'a' } } }] },
      texts: { list: [{ content: 'Hallo media:1 data: kein Bild' }] },
    })
    source.setGallery([{ id: 42, src: PNG_DATA_URL }])

    const { file, missing } = await buildProjectFile(source.deps, {
      name: 'Test',
      loadBlob: blobs.load,
    })
    expect(missing).toEqual([])

    const target = makeApp()
    target.media.intern('blob:something/else') // belegt media:1 in der neuen Sitzung
    const result = await loadProjectFile(target.deps, file, {
      createObjectURL: blobs.create,
      toDataUrl: async () => PNG_DATA_URL,
    })

    expect(result.name).toBe('Test')
    expect(target.deps.clearHistory).toHaveBeenCalled()
    const segs = target.getSegments() as Segs
    // Bild-Schlüssel zeigt in der neuen Sitzung auf dieselbe Data-URL
    expect(target.media.resolve(segs.images.list[0]!.media)).toBe(PNG_DATA_URL)
    expect(segs.images.list[0]!.x).toBe(10)
    // Video: frische Blob-URL mit demselben Inhalt
    const newVideoUrl = target.media.resolve(segs.videos.list[0]!.media)!
    expect(newVideoUrl).toMatch(/^blob:restored\//)
    expect(await new Response(blobs.get(newVideoUrl)!).text()).toBe('VIDEO')
    // Gleiche URL an anderer Stelle → dieselbe neue URL
    expect(segs.beatMarkers.markers[0]!.action.audioTrack.url).toBe(newVideoUrl)
    // Texte bleiben unverändert
    expect(segs.texts.list[0]!.content).toBe('Hallo media:1 data: kein Bild')
    // Galerie-Teil mit ID
    expect(target.getGallery()).toEqual([{ id: 42, src: PNG_DATA_URL }])
  })

  it('nicht mehr lesbare Medien werden gemeldet, unbekannte Schlüssel lösen zu nichts auf', async () => {
    const blobs = blobTable()
    const source = makeApp()
    const key = source.media.intern('blob:revoked/1')!
    source.setSegments({ videos: { list: [{ media: key }] } })
    const { file, missing } = await buildProjectFile(source.deps, {
      name: 'x',
      loadBlob: blobs.load,
    })
    expect(missing).toEqual(['blob:revoked/1'])

    const target = makeApp()
    target.media.intern('blob:fremd/1')
    await loadProjectFile(target.deps, file, { createObjectURL: blobs.create })
    const segs = target.getSegments() as Segs
    expect(target.media.resolve(segs.videos.list[0]!.media)).toBeNull()
  })

  it('lehnt fremde Formate und neuere Versionen ab', async () => {
    const app = makeApp()
    const foreign = packProject({ format: 'other' }, [])
    await expect(loadProjectFile(app.deps, foreign)).rejects.toMatchObject({
      code: 'not-a-project',
    })
    const newer = packProject(
      {
        format: 'kodini-visualizer-project',
        version: 999,
        state: { segments: {}, parts: {}, media: {} },
      },
      [],
    )
    await expect(loadProjectFile(app.deps, newer)).rejects.toMatchObject({
      code: 'newer-version',
    })
    await expect(loadProjectFile(app.deps, new Blob(['nix']))).rejects.toBeInstanceOf(
      ProjectFormatError,
    )
  })

  it('mapStrings verwirft Nicht-JSON-Werte wie JSON.stringify', () => {
    const out = mapStrings({ a: 'x', fn: () => 1, n: NaN, list: [undefined, 'y'] }, (s) =>
      s.toUpperCase(),
    )
    expect(out).toEqual({ a: 'X', n: null, list: [null, 'Y'] })
  })
})
