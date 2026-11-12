import { describe, it, expect, vi, afterEach } from 'vitest'
import { yieldToMain } from '../../utils/yieldToMain'

const g = globalThis as { scheduler?: unknown }

describe('yieldToMain', () => {
  afterEach(() => {
    delete g.scheduler
    vi.useRealTimers()
  })

  it('nutzt scheduler.yield, wenn vorhanden', async () => {
    const y = vi.fn(() => Promise.resolve())
    g.scheduler = { yield: y }
    await yieldToMain()
    expect(y).toHaveBeenCalledOnce()
  })

  it('fällt ohne scheduler auf setTimeout(0) zurück und löst erst danach auf', async () => {
    vi.useFakeTimers()
    let done = false
    const p = yieldToMain().then(() => (done = true))
    await Promise.resolve()
    expect(done).toBe(false)
    await vi.runAllTimersAsync()
    await p
    expect(done).toBe(true)
  })
})
