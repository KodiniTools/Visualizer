import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'

let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = useBeatMarkerStore()
})

describe('beatMarkerStore.checkCrossing (frame-genau)', () => {
  it('liefert genau die Marker im Intervall (prev, current], nach Zeit sortiert', () => {
    store.addMarker(5.02, {}, 'B')
    store.addMarker(5.0, {}, 'A')
    store.addMarker(5.1, {}, 'C')

    expect(store.checkCrossing(4.99, 4.999)).toEqual([])
    const crossed = store.checkCrossing(4.99, 5.02)
    expect(crossed.map((m) => m.label)).toEqual(['A', 'B'])
    expect(crossed.every((m) => m.triggered)).toBe(true)
  })

  it('feuert jeden Marker nur einmal pro Durchlauf', () => {
    store.addMarker(10, {}, 'A')
    expect(store.checkCrossing(9.99, 10.01)).toHaveLength(1)
    expect(store.checkCrossing(9.99, 10.01)).toHaveLength(0)
    expect(store.checkCrossing(10.01, 10.05)).toHaveLength(0)
  })

  it('ist unabhängig von der Toleranz und trifft Hundertstel exakt', () => {
    store.addMarker(18.37, {}, 'A')
    expect(store.checkCrossing(18.35, 18.369)).toHaveLength(0)
    expect(store.checkCrossing(18.369, 18.37)).toHaveLength(1)
  })

  it('feuert nichts bei deaktivierten Markern oder ohne Vorwärtsbewegung', () => {
    store.addMarker(5, {}, 'A')
    store.markersEnabled = false
    expect(store.checkCrossing(4, 6)).toEqual([])
    store.markersEnabled = true
    expect(store.checkCrossing(6, 4)).toEqual([])
    expect(store.checkCrossing(5, 5)).toEqual([])
  })

  it('wird durch resetTriggers wieder scharf', () => {
    store.addMarker(5, {}, 'A')
    expect(store.checkCrossing(4, 6)).toHaveLength(1)
    store.resetTriggers()
    expect(store.markers[0].triggered).toBe(false)
    expect(store.checkCrossing(4, 6)).toHaveLength(1)
  })
})

describe('beatMarkerStore.checkTrigger (Toleranz-Fallback)', () => {
  it('feuert innerhalb der Toleranz einmal', () => {
    store.addMarker(10, {}, 'A')
    expect(store.checkTrigger(10.1)?.label).toBe('A')
    expect(store.checkTrigger(10.12)).toBeNull()
  })

  it('feuert keinen Marker erneut, den das Crossing bereits ausgelöst hat', () => {
    store.addMarker(10, {}, 'A')
    store.addMarker(10.05, {}, 'B')
    // Crossing löst A und B aus, lastTriggeredMarkerId zeigt danach auf B
    expect(store.checkCrossing(9.99, 10.06)).toHaveLength(2)
    // Ohne den triggered-Guard würde A hier (innerhalb der Toleranz) erneut feuern
    expect(store.checkTrigger(10.1)).toBeNull()
  })
})
