/**
 * Virtuelle Uhr für den Offline-Export.
 *
 * Animationen, Texteffekte, Beat-Erkennung und Marker lesen die Zeit über
 * `performance.now()` bzw. `Date.now()` (rund 140 Stellen). Während des
 * Exports ersetzt die Uhr beide Funktionen: Die Zeit steht, bis der Export
 * sie um genau ein Frame weiterschiebt. So laufen alle Elemente so ab, als
 * würde die Szene in Echtzeit mit der Export-Bildrate abgespielt – egal, wie
 * lange das Rendern eines Frames tatsächlich dauert.
 *
 * `restore()` setzt die echten Funktionen wieder ein.
 */

export interface VirtualClock {
  /** Virtuelle Zeit um `ms` weiterschieben (≥ 0). */
  advance: (ms: number) => void
  /** Seit dem Einsetzen vergangene virtuelle Zeit (ms). */
  elapsed: () => number
  /** Echte Uhr wieder einsetzen; danach wirkungslos. */
  restore: () => void
}

/** Die Teile der globalen Umgebung, die die Uhr ersetzt (Tests geben Fakes). */
export interface ClockTargets {
  performance: { now: () => number }
  Date: { now: () => number }
}

const defaultTargets = (): ClockTargets => ({
  performance: globalThis.performance,
  Date: globalThis.Date,
})

let active: VirtualClock | null = null

/** Läuft gerade eine virtuelle Uhr? */
export const isVirtualClockActive = () => active !== null

/**
 * Setzt die virtuelle Uhr ein. Sie startet bei der aktuellen echten Zeit, damit
 * bestehende Zeitstempel (z. B. Start einer Animation) gültig bleiben.
 * Eine bereits laufende virtuelle Uhr wird vorher zurückgesetzt.
 */
export function installVirtualClock(targets: ClockTargets = defaultTargets()): VirtualClock {
  active?.restore()

  const perf = targets.performance
  const date = targets.Date
  const hadOwnPerfNow = Object.prototype.hasOwnProperty.call(perf, 'now')
  const hadOwnDateNow = Object.prototype.hasOwnProperty.call(date, 'now')
  const realPerfNow = perf.now
  const realDateNow = date.now
  const perfStart = realPerfNow.call(perf)
  const dateStart = realDateNow.call(date)
  let elapsedMs = 0
  let restored = false

  const define = (obj: object, fn: () => number) =>
    Object.defineProperty(obj, 'now', { value: fn, configurable: true, writable: true })

  define(perf, () => perfStart + elapsedMs)
  define(date, () => dateStart + elapsedMs)

  const reinstate = (obj: object, hadOwn: boolean, real: () => number) => {
    if (hadOwn) define(obj, real)
    else delete (obj as { now?: unknown }).now
  }

  const clock: VirtualClock = {
    advance(ms) {
      if (restored) return
      if (Number.isFinite(ms) && ms > 0) elapsedMs += ms
    },
    elapsed: () => elapsedMs,
    restore() {
      if (restored) return
      restored = true
      reinstate(perf, hadOwnPerfNow, realPerfNow)
      reinstate(date, hadOwnDateNow, realDateNow)
      if (active === clock) active = null
    },
  }
  active = clock
  return clock
}
