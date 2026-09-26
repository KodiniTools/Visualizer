// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { pruneImages } from '../../utils/presetImageRepository.js'

function openV1() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('visualizer-slideshow-images', 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('images', { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

describe('presetImageRepository – Migration v1 → v2', () => {
  it('bestehende Bilder (ohne Index) werden nach dem Upgrade korrekt aufgeräumt', async () => {
    const db = await openV1()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite')
      tx.objectStore('images').put({ key: 'alt-benutzt', savedAt: 1 })
      tx.objectStore('images').put({ key: 'alt-verwaist', savedAt: 1 })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()

    // öffnet mit Version 2 → Index wird angelegt und mit Altbestand befüllt
    const removed = await pruneImages(['alt-benutzt'], { minAgeMs: 60_000 })
    expect(removed).toBe(1)
    expect(await pruneImages(['alt-benutzt'])).toBe(0)
  })
})
