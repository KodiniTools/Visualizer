import { describe, it, expect, afterEach } from 'vitest'
import { installVirtualClock, isVirtualClockActive } from '../../../lib/offlineExport/virtualClock'

afterEach(() => {
  // Sicherheitsnetz: nie eine virtuelle Uhr in andere Tests durchreichen
  installVirtualClock().restore()
})

describe('virtualClock', () => {
  it('hält die Zeit an und schiebt sie nur per advance() weiter', async () => {
    const realPerf = performance.now
    const realDate = Date.now
    const clock = installVirtualClock()
    const p0 = performance.now()
    const d0 = Date.now()
    await new Promise((r) => setTimeout(r, 15))
    expect(performance.now()).toBe(p0)
    expect(Date.now()).toBe(d0)

    clock.advance(1000 / 30)
    clock.advance(1000 / 30)
    expect(performance.now()).toBeCloseTo(p0 + 2000 / 30, 6)
    expect(Date.now()).toBeCloseTo(d0 + 2000 / 30, 6)
    expect(clock.elapsed()).toBeCloseTo(2000 / 30, 6)

    clock.restore()
    expect(performance.now).toBe(realPerf)
    expect(Date.now).toBe(realDate)
    expect(isVirtualClockActive()).toBe(false)
  })

  it('ignoriert negative/ungültige Schritte und wirkt nach restore() nicht mehr', () => {
    const clock = installVirtualClock()
    const p0 = performance.now()
    clock.advance(-5)
    clock.advance(Number.NaN)
    expect(performance.now()).toBe(p0)
    clock.restore()
    clock.advance(1000)
    expect(clock.elapsed()).toBe(0)
  })

  it('eine neue Uhr ersetzt eine noch laufende sauber', () => {
    const realDate = Date.now
    installVirtualClock()
    const second = installVirtualClock()
    expect(isVirtualClockActive()).toBe(true)
    second.restore()
    expect(Date.now).toBe(realDate)
  })

  it('stellt eigene now-Eigenschaften wieder her bzw. entfernt sie', () => {
    const perf = Object.create({ now: () => 1 }) as { now: () => number }
    const own = () => 2
    const date = { now: own }
    const clock = installVirtualClock({ performance: perf, Date: date })
    clock.advance(10)
    expect(perf.now()).toBe(11)
    expect(date.now()).toBe(12)
    clock.restore()
    expect(Object.prototype.hasOwnProperty.call(perf, 'now')).toBe(false)
    expect(perf.now()).toBe(1)
    expect(date.now).toBe(own)
  })
})
