import { ref } from 'vue'
import type { PlaylistTrack } from '../../stores/playerStore'
import { getAudioEngine } from '../../lib/audioEngineBridge'

/** Verweis eines Markers auf einen Playlist-Track (kein Audioinhalt) */
export interface MarkerAudioTrackRef {
  /** Object-URL des Tracks (gilt nur in dieser Sitzung) */
  url?: string | null
  /** Dateiname – Ersatz, wenn die URL nicht mehr in der Playlist ist */
  name: string
  /** Lautstärke 0–1 (Standard 1) */
  volume?: number
  /** Startposition im Track in Sekunden (Standard 0) */
  offset?: number
  /**
   * Ducking: Lautstärke des Haupt-Songs (0–1), solange dieser Track läuft.
   * Fehlt das Feld (oder null), bleibt der Song unverändert.
   */
  duck?: number | null
}

/** Felder der Marker-Aktion für einen eingefügten Playlist-Track */
export interface MarkerAudioTrackAction {
  audioTrack?: MarkerAudioTrackRef | null
}

/** Marker, wie dieses Composable ihn liest */
interface MarkerLike {
  id: number
  time: number
  action?: MarkerAudioTrackAction | null
}

interface Options {
  playlist: () => PlaylistTrack[]
  markers: () => MarkerLike[]
  /** Erzeugt das Audio-Element (Tests) */
  createAudio?: () => HTMLAudioElement
  /**
   * Setzt die Song-Lautstärke (Ducking). Standard: direkt über die Engine;
   * useBeatMarkers mischt hier die Wünsche von Tracks und Videos.
   */
  setDuck?: (level: number) => void
}

const clamp01 = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback

const nonNegative = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/** Lautstärke eines Verweises (0–1) */
export const markerTrackVolume = (ref: MarkerAudioTrackRef | null | undefined) =>
  clamp01(ref?.volume, 1)

/** Song-Lautstärke beim Ducking (0–1) oder null = kein Ducking */
export const markerTrackDuck = (ref: MarkerAudioTrackRef | null | undefined): number | null =>
  typeof ref?.duck === 'number' && Number.isFinite(ref.duck) ? clamp01(ref.duck, 1) : null

/** Startposition im Track (s, ≥ 0) */
export const markerTrackOffset = (ref: MarkerAudioTrackRef | null | undefined) =>
  nonNegative(ref?.offset)

/**
 * Track der Playlist zu einem Verweis: zuerst über die URL (eindeutig in der
 * Sitzung), sonst über den Dateinamen.
 */
export function findPlaylistTrack(
  playlist: readonly PlaylistTrack[],
  ref: MarkerAudioTrackRef | null | undefined,
): PlaylistTrack | null {
  if (!ref) return null
  if (ref.url) {
    const byUrl = playlist.find((t) => t.url === ref.url)
    if (byUrl) return byUrl
  }
  return ref.name ? (playlist.find((t) => t.name === ref.name) ?? null) : null
}

/**
 * Beat-Marker „Track einfügen“: Ein Track aus der Playlist setzt zum
 * Marker-Zeitpunkt ein und läuft zusätzlich zum laufenden Song (gemischt).
 * Er geht wie der Player über Bass/Höhen, Lautsprecher, Aufnahme und
 * Visualizer-Analyse (useAudioEngine.connectTrackOverlay).
 *
 * Regeln wie bei den übrigen Marker-Elementen:
 * - Marker überschritten → Track startet an seiner Startposition.
 * - Pause/Stopp → alle eingefügten Tracks halten an.
 * - Fortsetzen/Spulen → Tracks an der Stelle fortsetzen, an der sie beim
 *   Abspielen von vorn wären; vor dem Marker oder nach dem Ende: still.
 * - Mehrere Marker-Tracks dürfen sich überlagern.
 * - Ducking: Solange ein Track mit `duck` hörbar läuft, wird der Haupt-Song
 *   auf diesen Wert abgesenkt (bei mehreren der niedrigste), danach wieder
 *   auf 100 % angehoben.
 */
export function useMarkerAudioTracks({
  playlist,
  markers,
  createAudio = () => new Audio(),
  setDuck = (level) => getAudioEngine()?.setPlayerDuck(level),
}: Options) {
  /** Ein Audio-Element je Marker; wird wiederverwendet (nur einmal mit der Engine verbindbar) */
  const players = new Map<number, HTMLAudioElement>()
  /** Ducking-Wert je Marker-Element (null = kein Ducking) */
  const duckLevels = new Map<number, number | null>()
  let appliedDuck = 1

  /** Song-Lautstärke aus allen laufenden Marker-Tracks ableiten und anwenden */
  const updateDuck = () => {
    let level = 1
    for (const [id, el] of players) {
      const duck = duckLevels.get(id)
      if (duck === null || duck === undefined || el.paused || el.ended) continue
      level = Math.min(level, duck)
    }
    if (level === appliedDuck) return
    appliedDuck = level
    setDuck(level)
  }

  /** Bekannte Track-Längen (s) je URL; reaktiv für die Dauer-Anzeige */
  const durations = ref<Record<string, number>>({})
  const probing = new Set<string>()

  /** Länge eines Tracks (null = noch unbekannt; wird im Hintergrund ermittelt) */
  const trackDuration = (url: string | null | undefined): number | null => {
    if (!url) return null
    const known = durations.value[url]
    if (known !== undefined) return known
    if (!probing.has(url)) {
      probing.add(url)
      const probe = createAudio()
      probe.preload = 'metadata'
      probe.addEventListener(
        'loadedmetadata',
        () => {
          if (Number.isFinite(probe.duration) && probe.duration > 0) {
            durations.value = { ...durations.value, [url]: probe.duration }
          }
          probe.src = ''
        },
        { once: true },
      )
      probe.src = url
    }
    return null
  }

  const playerFor = (markerId: number) => {
    let el = players.get(markerId)
    if (!el) {
      el = createAudio()
      el.preload = 'auto'
      for (const type of ['playing', 'pause', 'ended']) el.addEventListener(type, updateDuck)
      players.set(markerId, el)
    }
    return el
  }

  const seekWhenReady = (el: HTMLAudioElement, position: number) => {
    if (el.readyState >= 1) {
      el.currentTime = position
      return
    }
    el.addEventListener(
      'loadedmetadata',
      () => {
        el.currentTime = position
      },
      { once: true },
    )
  }

  /**
   * Spielt den Track eines Markers ab.
   * @param into - Sekunden seit dem Marker-Zeitpunkt (0 = gerade ausgelöst)
   * @returns true, wenn ein Track startet
   */
  const play = (markerId: number, ref: MarkerAudioTrackRef | null | undefined, into = 0) => {
    const track = findPlaylistTrack(playlist(), ref)
    if (!track) return false
    const position = markerTrackOffset(ref) + Math.max(0, into)
    const known = durations.value[track.url]
    if (known !== undefined && position >= known) return false

    const el = playerFor(markerId)
    duckLevels.set(markerId, markerTrackDuck(ref))
    const volume = markerTrackVolume(ref)
    // Über die Engine: hörbar, aufgenommen und analysiert. Ohne Engine
    // (noch nicht eingerichtet) spielt das Element direkt.
    const connected = getAudioEngine()?.connectTrackOverlay(el, volume) ?? false
    el.volume = connected ? 1 : volume
    if (el.getAttribute('src') !== track.url) el.src = track.url
    seekWhenReady(el, position)
    const started = el.play()
    if (started && typeof started.catch === 'function') {
      started.catch((err: unknown) => {
        if ((err as { name?: string } | null)?.name !== 'AbortError') {
          console.error('⚠️ [BeatMarker] Track konnte nicht abgespielt werden:', err)
        }
      })
    }
    return true
  }

  /** Track eines Markers anhalten */
  const stop = (markerId: number) => {
    const el = players.get(markerId)
    if (el && !el.paused) el.pause()
    updateDuck()
  }

  /** Alle eingefügten Tracks anhalten (Pause, Stopp, Marker aus) */
  const stopAll = () => {
    for (const id of players.keys()) stop(id)
  }

  /** Ausgelöster Marker: seinen Track von der Startposition an abspielen */
  const apply = (marker: MarkerLike) => {
    if (marker.action?.audioTrack) play(marker.id, marker.action.audioTrack, 0)
  }

  /**
   * Stand für eine Wiedergabe-Position herstellen (Fortsetzen, Spulen):
   * Jeder Marker-Track bis `time` läuft an der Stelle, an der er beim
   * Abspielen von vorn wäre.
   */
  const seek = (time: number) => {
    stopAll()
    for (const m of markers()) {
      if (!m.action?.audioTrack || m.time > time) continue
      play(m.id, m.action.audioTrack, time - m.time)
    }
  }

  /** Tracks von gelöschten oder geänderten Markern bzw. Markern ohne Track anhalten */
  const reconcile = () => {
    const withTrack = new Map(
      markers()
        .filter((m) => m.action?.audioTrack)
        .map((m) => [m.id, findPlaylistTrack(playlist(), m.action?.audioTrack)?.url ?? null]),
    )
    for (const [id, el] of players) {
      // Marker gelöscht, ohne Track oder mit anderem Track → anhalten
      if (withTrack.get(id) !== el.getAttribute('src')) stop(id)
    }
  }

  /** Playlist-Tracks für das Marker-Formular */
  const getMarkerPlaylistTracks = () =>
    playlist().map((t, i) => ({ value: t.url, number: i + 1, name: t.name }))

  /** Auswahl beim Bearbeiten: Track nicht mehr in der Playlist → leer */
  const editSelection = (ref: MarkerAudioTrackRef | null | undefined): string =>
    findPlaylistTrack(playlist(), ref)?.url ?? ''

  /** Verweis für die Formular-Auswahl (null = kein Track) */
  const resolveSelection = (
    url: unknown,
    volume: number,
    offset: number,
    duck: number | null = null,
  ): MarkerAudioTrackRef | null => {
    if (typeof url !== 'string' || !url) return null
    const track = playlist().find((t) => t.url === url)
    if (!track) return null
    return {
      url: track.url,
      name: track.name,
      volume: clamp01(volume, 1),
      offset: nonNegative(offset),
      ...(duck !== null && Number.isFinite(duck) ? { duck: clamp01(duck, 1) } : {}),
    }
  }

  /** Spieldauer des Marker-Tracks ab der Startposition (null = unbekannt) */
  const displaySeconds = (ref: MarkerAudioTrackRef | null | undefined): number | null => {
    const track = findPlaylistTrack(playlist(), ref)
    const total = trackDuration(track?.url)
    if (total === null) return null
    return Math.max(0, total - markerTrackOffset(ref))
  }

  /** Beim Verlassen: anhalten und Quellen freigeben */
  const dispose = () => {
    for (const el of players.values()) {
      el.pause()
      el.removeAttribute('src')
    }
    players.clear()
    duckLevels.clear()
    updateDuck()
  }

  return {
    getMarkerPlaylistTracks,
    editSelection,
    resolveSelection,
    trackDuration,
    displaySeconds,
    apply,
    seek,
    stop,
    stopAll,
    reconcile,
    dispose,
  }
}
