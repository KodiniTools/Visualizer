import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { useHistoryStore } from '../../stores/historyStore.js'
import { createHistoryRecorder } from '../../lib/history/historyRecorder.js'

function makeSegment(initial) {
  const state = reactive({ ...initial })
  const adapter = {
    label: 'test',
    capture: () => ({ ...state }),
    apply: vi.fn((snap) => {
      Object.keys(state).forEach((k) => delete state[k])
      Object.assign(state, snap)
    }),
  }
  return { state, adapter }
}

describe('historyRecorder', () => {
  let store
  let recorder

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useHistoryStore()
    recorder = createHistoryRecorder({ historyStore: store })
  })

  afterEach(() => {
    recorder.destroy()
    vi.useRealTimers()
  })

  it('legt nur bei Änderungen einen Schritt an', () => {
    const { state, adapter } = makeSegment({ color: '#000' })
    recorder.registerSegment('bg', adapter)

    expect(recorder.checkpoint()).toBeNull()
    expect(store.history.length).toBe(0)

    state.color = '#fff'
    expect(recorder.checkpoint()).not.toBeNull()
    expect(store.history.length).toBe(1)
    expect(store.history[0].segments).toEqual(['bg'])
  })

  it('undo/redo stellt den Snapshot wieder her', async () => {
    const { state, adapter } = makeSegment({ size: 1 })
    recorder.registerSegment('seg', adapter)

    state.size = 2
    recorder.checkpoint()
    state.size = 3
    recorder.checkpoint()

    await store.undo()
    expect(state.size).toBe(2)
    await store.undo()
    expect(state.size).toBe(1)
    expect(store.canUndo).toBe(false)

    await store.redo()
    expect(state.size).toBe(2)
    await store.redo()
    expect(state.size).toBe(3)
  })

  it('Anwenden eines Snapshots erzeugt keinen neuen Schritt', async () => {
    const { state, adapter } = makeSegment({ v: 'a' })
    recorder.registerSegment('seg', adapter)
    state.v = 'b'
    recorder.checkpoint()

    await store.undo()
    expect(recorder.checkpoint()).toBeNull()
    expect(store.history.length).toBe(1)
    expect(store.canRedo).toBe(true)
  })

  it('mehrere geänderte Segmente → ein gemeinsamer Schritt, Undo in umgekehrter Reihenfolge', async () => {
    const order = []
    const a = makeSegment({ x: 1 })
    const b = makeSegment({ y: 1 })
    const origA = a.adapter.apply
    const origB = b.adapter.apply
    a.adapter.apply = (s) => {
      order.push('a')
      origA(s)
    }
    b.adapter.apply = (s) => {
      order.push('b')
      origB(s)
    }
    recorder.registerSegment('a', a.adapter)
    recorder.registerSegment('b', b.adapter)

    a.state.x = 2
    b.state.y = 2
    recorder.checkpoint('preset')
    expect(store.history.length).toBe(1)
    expect(store.history[0].name).toBe('preset')

    await store.undo()
    expect(a.state.x).toBe(1)
    expect(b.state.y).toBe(1)
    expect(order).toEqual(['b', 'a'])
  })

  it('schnelles Doppel-Undo macht jeden Schritt genau einmal rückgängig', async () => {
    const values = []
    let current = 0
    const adapter = {
      capture: () => ({ current }),
      apply: async (snap) => {
        await new Promise((r) => setTimeout(r, 5))
        current = snap.current
        values.push(snap.current)
      },
    }
    recorder.registerSegment('seg', adapter)
    current = 1
    recorder.checkpoint()
    current = 2
    recorder.checkpoint()

    // Ohne await: zweites Undo startet, während das erste noch läuft
    const p1 = store.undo()
    const p2 = store.undo()
    await Promise.all([p1, p2])

    expect(values).toEqual([1, 0])
    expect(current).toBe(0)
    expect(store.currentIndex).toBe(-1)
  })

  it('entprellt Interaktionen und wartet, solange ein Zeiger gedrückt ist', () => {
    vi.useFakeTimers()
    const { state, adapter } = makeSegment({ v: 0 })
    recorder.registerSegment('seg', adapter)
    const target = new EventTarget()
    recorder.attach(target, null)

    target.dispatchEvent(new Event('pointerdown'))
    state.v = 1
    target.dispatchEvent(new Event('input'))
    vi.advanceTimersByTime(2000)
    expect(store.history.length).toBe(0) // Zeiger noch unten

    state.v = 2
    target.dispatchEvent(new Event('pointerup'))
    vi.advanceTimersByTime(300)
    expect(store.history.length).toBe(1) // ganzer Zug = ein Schritt
  })

  it('Strg+Z direkt nach einer Änderung schreibt diese zuerst fest', async () => {
    vi.useFakeTimers()
    const { state, adapter } = makeSegment({ v: 0 })
    recorder.registerSegment('seg', adapter)
    state.v = 1
    recorder.checkpoint()
    state.v = 2
    recorder.scheduleCheckpoint() // noch nicht festgeschrieben

    await store.undo()
    expect(state.v).toBe(1)
    expect(store.history.length).toBe(2)
    expect(store.canRedo).toBe(true)
  })

  it('transaction fasst Änderungen zu einem Schritt zusammen', async () => {
    const { state, adapter } = makeSegment({ a: 0, b: 0 })
    recorder.registerSegment('seg', adapter)
    await recorder.transaction('reset', async () => {
      state.a = 1
      recorder.scheduleCheckpoint()
      await Promise.resolve()
      state.b = 1
    })
    expect(store.history.length).toBe(1)
    expect(store.history[0].name).toBe('reset')
  })

  it('fremde Commands (closure-basiert) erzeugen keinen Doppel-Eintrag', async () => {
    const { state, adapter } = makeSegment({ items: 2 })
    recorder.registerSegment('seg', adapter)

    state.items = 1
    store.addCommand({
      name: 'delete:text',
      token: 99,
      undo: () => {
        state.items = 2
      },
      execute: () => {
        state.items = 1
      },
    })
    expect(recorder.checkpoint()).toBeNull()

    await store.undo()
    expect(state.items).toBe(2)
    expect(recorder.checkpoint()).toBeNull()
    expect(store.history.length).toBe(1)
  })

  it('History bleibt auf 50 Schritte begrenzt', () => {
    const { state, adapter } = makeSegment({ v: 0 })
    recorder.registerSegment('seg', adapter)
    for (let i = 1; i <= 60; i++) {
      state.v = i
      recorder.checkpoint()
    }
    expect(store.history.length).toBe(50)
    expect(store.currentIndex).toBe(49)
  })

  it('fehlerhaftes capture/apply bricht den Recorder nicht', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const good = makeSegment({ v: 0 })
    let broken = false
    recorder.registerSegment('good', good.adapter)
    recorder.registerSegment('bad', {
      capture: () => {
        if (broken) throw new Error('boom')
        return {}
      },
      apply: () => {},
    })
    broken = true
    good.state.v = 1
    expect(recorder.checkpoint()).not.toBeNull()
    await store.undo()
    expect(good.state.v).toBe(0)
  })
})
