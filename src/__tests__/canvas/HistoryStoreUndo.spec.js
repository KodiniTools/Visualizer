import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from '../../stores/historyStore.js'

/**
 * Regressionstest für den Undo-Toast-Button.
 *
 * Bug: Der Toast-Handler verglich `store.history[currentIndex] === command`.
 * Pinia wickelt gespeicherte Objekte jedoch in einen reaktiven Proxy –
 * die Referenz ist danach NICHT mehr identisch, der Vergleich schlug immer
 * fehl und der Button löste `undo()` nie aus.
 *
 * Fix: Vergleich über ein primitives Token, das der Proxy unverändert
 * durchreicht.
 */
describe('historyStore – Undo über Token (Toast-Button)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('das gespeicherte Command-Objekt ist NICHT referenzidentisch (Proxy)', () => {
    const store = useHistoryStore()
    const command = { name: 'delete:text', token: 1, undo: () => {}, execute: () => {} }
    store.addCommand(command)

    // Identitätsvergleich schlägt durch den reaktiven Proxy fehl ...
    expect(store.history[store.currentIndex] === command).toBe(false)
    // ... der Token wird dagegen unverändert durchgereicht.
    expect(store.history[store.currentIndex].token).toBe(1)
  })

  it('undo() ruft die undo-Funktion des Commands auf und restauriert', async () => {
    const store = useHistoryStore()
    const restore = vi.fn()
    const token = 42
    store.addCommand({
      name: 'delete:image',
      token,
      execute: vi.fn(),
      undo: restore,
    })

    // Der Token-basierte Guard des Toast-Handlers ...
    const isCurrent = store.currentIndex >= 0 && store.history[store.currentIndex]?.token === token
    expect(isCurrent).toBe(true)

    await store.undo()

    expect(restore).toHaveBeenCalledTimes(1)
    expect(store.canUndo).toBe(false)
  })

  it('nach dem Undo erkennt der Token-Guard, dass der Command nicht mehr aktuell ist', async () => {
    const store = useHistoryStore()
    const token = 7
    store.addCommand({ name: 'delete:text', token, execute: vi.fn(), undo: vi.fn() })

    await store.undo()

    // currentIndex ist jetzt -1 -> Guard verhindert Über-Undo
    const isCurrent = store.currentIndex >= 0 && store.history[store.currentIndex]?.token === token
    expect(isCurrent).toBe(false)
  })
})
