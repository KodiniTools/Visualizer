/**
 * Virtuelle Video-Uhr des Offline-Exports.
 *
 * Live laufen Videos in Echtzeit; der Export rendert aber schneller oder
 * langsamer. Damit jedes Video zur Frame-Zeit genau das passende Bild zeigt,
 * übernimmt diese Uhr während des Exports die Wiedergabe aller
 * HTMLVideoElemente:
 *
 * - `play`, `pause`, `paused`, `ended`, `currentTime` wirken nur noch auf
 *   einen virtuellen Zustand; das echte Element bleibt angehalten. Die App
 *   (Video-Panel, Hintergrund, Kacheln, Beat-Marker) merkt davon nichts und
 *   bekommt die passenden Ereignisse (play, playing, pause, ended, seeked).
 * - `advance()` rückt alle laufenden Videos pro Frame um 1/fps (mal
 *   Wiedergabe-Rate) vor, mit Schleife bzw. Ende.
 * - `settle()` wartet auf Videos, die gerade laden (z. B. Marker-Video), und
 *   holt für jedes Video das Bild zur virtuellen Zeit (FrameSource).
 * - `drawImage(video, …)` zeichnet dieses Bild statt des echten Elements.
 *
 * `restore()` nimmt alle Eingriffe zurück und setzt die echten Elemente auf
 * ihren virtuellen Stand (Position, läuft/pausiert).
 */

/** Zugriff auf das echte (nicht virtuelle) Element, z. B. für das Seek-Verfahren */
export interface RealVideoAccess {
  getTime: () => number
  setTime: (time: number) => void
  /** Wartet auf das echte `seeked` (höchstens `timeoutMs`) */
  waitSeeked: (timeoutMs: number) => Promise<void>
}

export interface FrameSource {
  /**
   * Bild zur Medienzeit (s). null = das echte Element zeichnen (die Quelle hat
   * es dafür bereits an die Stelle gesetzt).
   */
  frameAt: (time: number) => Promise<CanvasImageSource | null>
  close: () => void
}

export type FrameSourceFactory = (
  element: HTMLVideoElement,
  real: RealVideoAccess,
) => Promise<FrameSource>

/** Virtueller Wiedergabe-Zustand eines Videos */
export interface VirtualVideo {
  readonly element: HTMLVideoElement
  playing: boolean
  ended: boolean
  /** Medienzeit (s) */
  time: number
}

export interface OfflineMediaClock {
  /**
   * Bekannte Videos der Szene übernehmen. `restart`: laufende Videos beginnen
   * (wie beim Abspielen von vorn) bei 0 s.
   */
  adopt: (elements: Iterable<HTMLVideoElement>, options?: { restart?: boolean }) => void
  /** Laufende Videos um `seconds` vorrücken */
  advance: (seconds: number) => void
  /** Ladende Videos abwarten und die Bilder zur virtuellen Zeit bereitstellen */
  settle: () => Promise<void>
  /** Alle übernommenen Videos */
  videos: () => readonly VirtualVideo[]
  restore: () => void
}

export interface OfflineMediaClockOptions {
  createFrameSource: FrameSourceFactory
  /** Prototyp der Video-Elemente (Tests geben eine Attrappe) */
  videoProto?: object
  /** Prototypen mit drawImage (2D-Kontexte) */
  drawProtos?: object[]
  /** Höchstwartezeit auf ein ladendes Video (ms) */
  loadTimeoutMs?: number
  /** Nächste Runde der Ereignisschleife (Tests: sofort) */
  macrotask?: () => Promise<void>
}

interface State extends VirtualVideo {
  /** Bild für drawImage (null = echtes Element) */
  frame: CanvasImageSource | null
  source: Promise<FrameSource> | null
  sourceSrc: string
  /** Wurde schon einmal gezeichnet (sonst nach dem ersten Frame kein Dekodieren) */
  drawn: boolean
  /** Frames seit der Übernahme */
  age: number
  adopted: boolean
  blocker: (event: Event) => void
  seekWaiters: (() => void)[]
}

/** Echte Ereignisse, die während des Exports nicht zur App durchdringen */
const BLOCKED_EVENTS = [
  'play',
  'playing',
  'pause',
  'seeking',
  'seeked',
  'timeupdate',
  'ended',
  'waiting',
]

/** HAVE_CURRENT_DATA */
const READY_CURRENT = 2

function findDescriptor(proto: object, key: string): PropertyDescriptor | undefined {
  for (let p: object | null = proto; p; p = Object.getPrototypeOf(p)) {
    const d = Object.getOwnPropertyDescriptor(p, key)
    if (d) return d
  }
  return undefined
}

/** Nächste Runde der Ereignisschleife; MessageChannel statt setTimeout (kein 4-ms-Mindestabstand) */
function defaultMacrotask(): Promise<void> {
  if (typeof MessageChannel === 'undefined') {
    return new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => {
      channel.port1.close()
      resolve()
    }
    channel.port2.postMessage(null)
  })
}

function defaultDrawProtos(): object[] {
  const g = globalThis as typeof globalThis & {
    OffscreenCanvasRenderingContext2D?: { prototype: object }
  }
  const protos: object[] = []
  if (typeof CanvasRenderingContext2D !== 'undefined')
    protos.push(CanvasRenderingContext2D.prototype)
  if (g.OffscreenCanvasRenderingContext2D)
    protos.push(g.OffscreenCanvasRenderingContext2D.prototype)
  return protos
}

export function installOfflineMediaClock({
  createFrameSource,
  videoProto = HTMLVideoElement.prototype,
  drawProtos = defaultDrawProtos(),
  loadTimeoutMs = 10_000,
  macrotask = defaultMacrotask,
}: OfflineMediaClockOptions): OfflineMediaClock {
  const orig = {
    paused: findDescriptor(videoProto, 'paused'),
    ended: findDescriptor(videoProto, 'ended'),
    currentTime: findDescriptor(videoProto, 'currentTime'),
    src: findDescriptor(videoProto, 'src'),
    play: findDescriptor(videoProto, 'play')?.value as (() => Promise<void>) | undefined,
    pause: findDescriptor(videoProto, 'pause')?.value as (() => void) | undefined,
    load: findDescriptor(videoProto, 'load')?.value as (() => void) | undefined,
  }
  const states = new Map<HTMLVideoElement, State>()
  const order: State[] = []
  /** Videos, deren Quelle während des Exports gesetzt wurde und die noch laden */
  const pending = new Set<HTMLVideoElement>()
  const ownBefore = new Map<string, PropertyDescriptor | undefined>()
  const drawOriginals = new Map<object, PropertyDescriptor | undefined>()
  let restored = false

  const realPaused = (el: HTMLVideoElement) => (orig.paused?.get?.call(el) as boolean) ?? true
  const realEnded = (el: HTMLVideoElement) => (orig.ended?.get?.call(el) as boolean) ?? false
  const realTime = (el: HTMLVideoElement) => {
    const t = orig.currentTime?.get?.call(el) as number
    return Number.isFinite(t) ? t : 0
  }
  const setRealTime = (el: HTMLVideoElement, t: number) => {
    try {
      orig.currentTime?.set?.call(el, t)
    } catch {
      // ohne Metadaten nicht setzbar
    }
  }
  const isLoaded = (el: HTMLVideoElement) => (el.readyState ?? 0) >= READY_CURRENT
  const currentSrc = (el: HTMLVideoElement) => el.currentSrc || el.getAttribute?.('src') || ''
  const fire = (el: HTMLVideoElement, type: string) => {
    try {
      el.dispatchEvent(new Event(type))
    } catch (error) {
      console.warn('[OfflineExport] Video-Ereignis fehlgeschlagen:', type, error)
    }
  }

  function register(el: HTMLVideoElement): State {
    const wasPlaying = !realPaused(el) && !realEnded(el)
    const state: State = {
      element: el,
      playing: wasPlaying,
      ended: realEnded(el),
      time: realTime(el),
      frame: null,
      source: null,
      sourceSrc: '',
      drawn: false,
      age: 0,
      adopted: false,
      seekWaiters: [],
      blocker: (event: Event) => {
        if (!event.isTrusted) return
        if (event.type === 'seeked') {
          const waiters = state.seekWaiters
          state.seekWaiters = []
          for (const w of waiters) w()
        }
        event.stopImmediatePropagation()
      },
    }
    for (const type of BLOCKED_EVENTS) el.addEventListener(type, state.blocker, true)
    if (!realPaused(el)) orig.pause?.call(el)
    states.set(el, state)
    order.push(state)
    return state
  }

  const stateOf = (el: HTMLVideoElement) => states.get(el) ?? register(el)

  /** Quelle neu gesetzt bzw. geladen: Element beginnt wie frisch geladen */
  function resetSource(el: HTMLVideoElement) {
    pending.add(el)
    const state = states.get(el)
    if (!state) return
    state.playing = false
    state.ended = false
    state.time = 0
    state.frame = null
    dropSource(state)
  }

  function dropSource(state: State) {
    const source = state.source
    state.source = null
    state.sourceSrc = ''
    source?.then((s) => s.close()).catch(() => {})
  }

  const durationOf = (el: HTMLVideoElement) => {
    const d = el.duration
    return Number.isFinite(d) && d > 0 ? d : null
  }

  // ── Patches ────────────────────────────────────────────────────────────
  function define(key: string, descriptor: PropertyDescriptor) {
    ownBefore.set(key, Object.getOwnPropertyDescriptor(videoProto, key))
    Object.defineProperty(videoProto, key, { configurable: true, ...descriptor })
  }

  define('play', {
    writable: true,
    value: function play(this: HTMLVideoElement) {
      const state = stateOf(this)
      if (!state.playing) {
        const duration = durationOf(this)
        if (state.ended || (!this.loop && duration !== null && state.time >= duration)) {
          state.time = 0
        }
        state.ended = false
        state.playing = true
        fire(this, 'play')
        fire(this, 'playing')
      }
      return Promise.resolve()
    },
  })
  define('pause', {
    writable: true,
    value: function pause(this: HTMLVideoElement) {
      const state = stateOf(this)
      if (!state.playing) return
      state.playing = false
      fire(this, 'pause')
    },
  })
  define('paused', {
    get(this: HTMLVideoElement) {
      return !stateOf(this).playing
    },
  })
  define('ended', {
    get(this: HTMLVideoElement) {
      return stateOf(this).ended
    },
  })
  define('currentTime', {
    get(this: HTMLVideoElement) {
      return stateOf(this).time
    },
    set(this: HTMLVideoElement, value: number) {
      const t = Number(value)
      if (!Number.isFinite(t)) return
      const state = stateOf(this)
      const duration = durationOf(this)
      state.time = Math.max(0, duration !== null ? Math.min(t, duration) : t)
      state.ended = false
      queueMicrotask(() => fire(this, 'seeked'))
    },
  })
  if (orig.src?.set) {
    const srcDescriptor = orig.src
    define('src', {
      get(this: HTMLVideoElement) {
        return srcDescriptor.get?.call(this)
      },
      set(this: HTMLVideoElement, value: string) {
        srcDescriptor.set?.call(this, value)
        if (value) resetSource(this)
        else pending.delete(this)
      },
    })
  }
  if (orig.load) {
    const load = orig.load
    define('load', {
      writable: true,
      value: function (this: HTMLVideoElement) {
        load.call(this)
        if (currentSrc(this)) resetSource(this)
      },
    })
  }

  for (const proto of drawProtos) {
    const original = findDescriptor(proto, 'drawImage')?.value as
      | ((...args: unknown[]) => void)
      | undefined
    if (!original) continue
    drawOriginals.set(proto, Object.getOwnPropertyDescriptor(proto, 'drawImage'))
    Object.defineProperty(proto, 'drawImage', {
      configurable: true,
      writable: true,
      value: function drawImage(this: unknown, image: unknown, ...rest: unknown[]) {
        let source = image
        if (
          image &&
          typeof image === 'object' &&
          Object.prototype.isPrototypeOf.call(videoProto, image)
        ) {
          const state = stateOf(image as HTMLVideoElement)
          state.drawn = true
          if (state.frame) source = state.frame
        }
        return original.call(this, source, ...rest)
      },
    })
  }

  // ── Ablauf ─────────────────────────────────────────────────────────────
  function waitLoaded(el: HTMLVideoElement): Promise<void> {
    if (isLoaded(el)) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer)
        el.removeEventListener('loadeddata', done)
        el.removeEventListener('error', done)
        resolve()
      }
      const timer = setTimeout(done, loadTimeoutMs)
      el.addEventListener('loadeddata', done)
      el.addEventListener('error', done)
    })
  }

  function real(el: HTMLVideoElement): RealVideoAccess {
    return {
      getTime: () => realTime(el),
      setTime: (t) => setRealTime(el, t),
      waitSeeked: (timeoutMs) =>
        new Promise<void>((resolve) => {
          const state = stateOf(el)
          const timer = setTimeout(done, timeoutMs)
          function done() {
            clearTimeout(timer)
            resolve()
          }
          state.seekWaiters.push(done)
        }),
    }
  }

  async function prepareFrame(state: State) {
    const el = state.element
    if (!isLoaded(el)) {
      state.frame = null
      return
    }
    const src = currentSrc(el)
    if (!state.source || state.sourceSrc !== src) {
      dropSource(state)
      state.sourceSrc = src
      state.source = createFrameSource(el, real(el))
    }
    try {
      const source = await state.source
      state.frame = await source.frameAt(state.time)
    } catch (error) {
      console.warn('[OfflineExport] Videobild nicht verfügbar:', error)
      state.frame = null
    }
  }

  return {
    adopt(elements, { restart = false } = {}) {
      for (const el of elements) {
        if (!el) continue
        const state = stateOf(el)
        state.adopted = true
        if (restart && state.playing) {
          state.time = 0
          state.ended = false
        }
      }
    },
    advance(seconds) {
      if (!(seconds > 0)) return
      for (const state of order) {
        if (!state.playing) continue
        const el = state.element
        const rate = Number.isFinite(el.playbackRate) && el.playbackRate > 0 ? el.playbackRate : 1
        state.time += seconds * rate
        const duration = durationOf(el)
        if (duration === null || state.time < duration) continue
        if (el.loop) {
          state.time %= duration
        } else {
          state.time = duration
          state.playing = false
          state.ended = true
          fire(el, 'pause')
          fire(el, 'ended')
        }
      }
    },
    async settle() {
      // Marker-Watcher und Lade-Callbacks laufen lassen; neu ladende Videos abwarten
      for (let round = 0; round < 5; round++) {
        await macrotask()
        const seen = [...pending]
        pending.clear()
        const loading = seen.filter((el) => !isLoaded(el) && currentSrc(el))
        if (loading.length > 0) await Promise.all(loading.map(waitLoaded))
        // Neu geladene Videos übernehmen (auch solche mit autoplay)
        for (const el of seen) stateOf(el)
        if (loading.length === 0) break
      }
      await Promise.all(
        order.filter((s) => s.adopted || s.drawn || s.age < 2).map((s) => prepareFrame(s)),
      )
      for (const state of order) state.age++
    },
    videos: () => order,
    restore() {
      if (restored) return
      restored = true
      for (const [key, descriptor] of ownBefore) {
        if (descriptor) Object.defineProperty(videoProto, key, descriptor)
        else delete (videoProto as Record<string, unknown>)[key]
      }
      for (const [proto, descriptor] of drawOriginals) {
        if (descriptor) Object.defineProperty(proto, 'drawImage', descriptor)
        else delete (proto as Record<string, unknown>).drawImage
      }
      for (const state of order) {
        const el = state.element
        for (const type of BLOCKED_EVENTS) el.removeEventListener(type, state.blocker, true)
        for (const w of state.seekWaiters) w()
        dropSource(state)
        state.frame = null
        if (isLoaded(el)) setRealTime(el, state.time)
        if (state.playing) {
          try {
            void el.play()?.catch?.(() => {})
          } catch {
            // Autoplay gesperrt o. Ä.
          }
        }
      }
      states.clear()
      pending.clear()
    },
  }
}
