// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  packProject,
  unpackProject,
  ProjectArchiveError,
  PROJECT_MAGIC,
} from '../../../lib/project/projectArchive'

const text = (blob: Blob) => new Response(blob).text()

describe('projectArchive', () => {
  it('packt Manifest und Dateien und liest sie wieder', async () => {
    const files = [
      new Blob(['hallo'], { type: 'text/plain' }),
      new Blob([new Uint8Array([1, 2, 3])], { type: 'video/webm' }),
      new Blob([]),
    ]
    const archive = packProject({ name: 'Ä Projekt', nested: { a: 1 } }, files)
    expect(await text(archive.slice(0, PROJECT_MAGIC.length))).toBe(PROJECT_MAGIC)

    const { manifest, blobs } = await unpackProject(archive)
    expect(manifest.name).toBe('Ä Projekt')
    expect(manifest.nested).toEqual({ a: 1 })
    expect(manifest.assets).toHaveLength(3)
    expect(await text(blobs[0]!)).toBe('hallo')
    expect(blobs[0]!.type).toBe('text/plain')
    expect([...new Uint8Array(await new Response(blobs[1]!).arrayBuffer())]).toEqual([1, 2, 3])
    expect(blobs[1]!.type).toBe('video/webm')
    expect(blobs[2]!.size).toBe(0)
  })

  it('erkennt fremde Dateien', async () => {
    await expect(unpackProject(new Blob(['PK\u0003\u0004 kein Projekt']))).rejects.toMatchObject({
      code: 'not-a-project',
    })
    await expect(unpackProject(new Blob(['kurz']))).rejects.toBeInstanceOf(ProjectArchiveError)
  })

  it('erkennt abgeschnittene Dateien', async () => {
    const archive = packProject({}, [new Blob(['0123456789'])])
    const truncated = archive.slice(0, archive.size - 3)
    await expect(unpackProject(truncated)).rejects.toMatchObject({ code: 'corrupt' })
  })

  it('erkennt ein beschädigtes Manifest', async () => {
    const archive = packProject({ a: 1 }, [])
    const bytes = new Uint8Array(await new Response(archive).arrayBuffer())
    bytes[12] = 0x7b + 1 // erstes JSON-Zeichen zerstören
    await expect(unpackProject(new Blob([bytes]))).rejects.toMatchObject({ code: 'corrupt' })
  })
})
