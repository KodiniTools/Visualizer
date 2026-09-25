/**
 * History-Segmente für Pinia-Stores (Visualizer, Ticker, Audio-FX, Beat-Drop,
 * Marker, Raster, Canvas-Format, Hintergrund-Kacheln).
 *
 * Jede Factory liefert einen Adapter { label, capture, apply } für
 * historyRecorder.registerSegment(). Snapshots enthalten nur vom Nutzer
 * editierbare Einstellungen – Laufzeitwerte (Trigger-Status, DOM-Elemente)
 * bleiben draußen.
 */
import { nextTick } from 'vue'
import { mediaRegistry, loadImageElement } from '../mediaRegistry.js'

/** Tiefe Kopie über JSON (Snapshots sind per Definition JSON-fähig). */
export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Überträgt source in target, wobei verschachtelte Objekte in-place
 * aktualisiert werden (Objekt-Identität bleibt erhalten – wichtig für
 * Komponenten/Watcher, die eine Referenz halten). Arrays werden ersetzt.
 * @param {Object} target
 * @param {Object} source
 */
export function assignDeep(target, source) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key]
  }
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      assignDeep(target[key], value)
    } else {
      target[key] = clone(value)
    }
  }
}

/**
 * Generisches Segment über ausgewählte State-Keys eines Setup-/Options-Stores.
 * @param {Object} store - Pinia-Store
 * @param {Object} opts
 * @param {string} opts.label
 * @param {number} [opts.order] - Reihenfolge beim Anwenden (siehe historyRecorder)
 * @param {string[]} [opts.keys] - Standard: alle Keys aus $state
 * @param {string[]} [opts.exclude] - Laufzeit-Keys, die ignoriert werden
 * @param {() => (void|Promise<void>)} [opts.afterApply]
 */
export function createStoreSegment(store, { label, order, keys, exclude = [], afterApply } = {}) {
  const resolveKeys = () => (keys ?? Object.keys(store.$state)).filter((k) => !exclude.includes(k))

  return {
    label,
    order,
    capture() {
      const out = {}
      for (const key of resolveKeys()) out[key] = clone(store.$state[key])
      return out
    },
    async apply(snapshot) {
      if (!snapshot) return
      store.$patch((state) => {
        for (const key of resolveKeys()) {
          if (!(key in snapshot)) continue
          const value = snapshot[key]
          if (isPlainObject(value) && isPlainObject(state[key])) assignDeep(state[key], value)
          else state[key] = clone(value)
        }
      })
      await afterApply?.()
    },
  }
}

// ── Konkrete Segmente ───────────────────────────────────────────────────────

export function createVisualizerSegment(visualizerStore) {
  return createStoreSegment(visualizerStore, {
    label: 'visualizer',
    order: 80,
    // Vom Render-Loop gesetzt, keine Nutzer-Einstellung
    exclude: ['lastWorkingVisualizer'],
    afterApply() {
      // activeLayerId muss auf einen existierenden Layer zeigen
      const layers = visualizerStore.visualizerLayers || []
      if (
        visualizerStore.activeLayerId !== null &&
        !layers.some((l) => l.id === visualizerStore.activeLayerId)
      ) {
        visualizerStore.activeLayerId = layers[0]?.id ?? null
      }
    },
  })
}

export function createTickerSegment(tickerStore) {
  return createStoreSegment(tickerStore, { label: 'ticker', order: 92 })
}

export function createAudioFxSegment(audioFxStore) {
  return createStoreSegment(audioFxStore, { label: 'audioFx', order: 90 })
}

export function createBeatDropSegment(beatDropStore) {
  return createStoreSegment(beatDropStore, { label: 'beatDrop', order: 91 })
}

export function createMarkerTransitionSegment(markerTransitionStore) {
  return createStoreSegment(markerTransitionStore, {
    label: 'markerTransition',
    order: 96,
    keys: ['enabled', 'duration'],
  })
}

export function createGridSegment(gridStore) {
  return createStoreSegment(gridStore, {
    label: 'grid',
    order: 40,
    keys: ['isVisible', 'gridColor', 'gridOpacity', 'gridSize', 'snapToGrid'],
  })
}

/**
 * Canvas-Format. Die Größenänderung passiert in einem Watcher
 * (VisualizerApp) → nach dem Setzen einen Tick warten, damit nachfolgende
 * Segmente (Hintergrund) das neue Format vorfinden.
 */
export function createWorkspaceSegment(workspaceStore) {
  return {
    label: 'workspace',
    order: 10,
    capture: () => ({ selectedPresetKey: workspaceStore.selectedPresetKey ?? null }),
    async apply(snapshot) {
      workspaceStore.selectedPresetKey = snapshot?.selectedPresetKey ?? null
      await nextTick()
    },
  }
}

/**
 * Beat-Marker: Liste + Aktivierung. `triggered` ist Wiedergabe-Status und
 * wird beim Vergleich ignoriert, beim Wiederherstellen aber je Marker-ID
 * beibehalten (sonst lösen bereits passierte Marker erneut aus).
 */
export function createBeatMarkerSegment(beatMarkerStore) {
  return {
    label: 'beatMarkers',
    order: 95,
    capture() {
      return {
        markersEnabled: beatMarkerStore.markersEnabled,
        markers: (beatMarkerStore.markers || []).map(({ triggered, ...rest }) => clone(rest)),
      }
    },
    apply(snapshot) {
      if (!snapshot) return
      const triggeredById = new Map((beatMarkerStore.markers || []).map((m) => [m.id, m.triggered]))
      const markers = (snapshot.markers || []).map((m) => ({
        ...clone(m),
        triggered: triggeredById.get(m.id) ?? false,
      }))
      beatMarkerStore.restoreMarkers(markers)
      beatMarkerStore.markersEnabled = Boolean(snapshot.markersEnabled)
    },
  }
}

// ── Hintergrund-Kacheln ─────────────────────────────────────────────────────

function isUsableVideo(el, src) {
  return Boolean(el && el.tagName === 'VIDEO' && el.getAttribute('src') === src)
}

function createVideoElement(src, settings = {}) {
  const video = document.createElement('video')
  video.src = src
  video.muted = settings.muted ?? true
  video.loop = settings.loop ?? true
  video.playsInline = true
  video.playbackRate = settings.playbackRate ?? 1
  mediaRegistry.remember(src, video)
  return video
}

/**
 * Kacheln inkl. Bild/Video. Medien werden über die mediaRegistry als
 * Schlüssel gespeichert; beim Wiederherstellen wird das vorhandene Element
 * weiterverwendet, wenn sich die Quelle nicht geändert hat.
 */
export function createBackgroundTilesSegment(tilesStore) {
  return {
    label: 'backgroundTiles',
    order: 30,
    capture() {
      return {
        tilesEnabled: tilesStore.tilesEnabled,
        tileCount: tilesStore.tileCount,
        tileGap: tilesStore.tileGap,
        tiles: (tilesStore.tiles || []).map((tile) => ({
          id: tile.id,
          backgroundColor: tile.backgroundColor,
          backgroundOpacity: tile.backgroundOpacity,
          image: tile.imageSrc ? mediaRegistry.remember(tile.imageSrc, tile.image) : null,
          video: tile.videoSrc ? mediaRegistry.remember(tile.videoSrc, tile.video) : null,
          imageSettings: clone(tile.imageSettings ?? null),
          videoSettings: clone(tile.videoSettings ?? null),
          audioReactive: clone(tile.audioReactive ?? null),
        })),
      }
    },
    async apply(snapshot) {
      if (!snapshot) return
      const current = tilesStore.tiles || []

      const nextTiles = await Promise.all(
        (snapshot.tiles || []).map(async (snap, i) => {
          const existing = current[i]
          const tile = existing ?? { id: snap.id }

          tile.id = snap.id
          tile.backgroundColor = snap.backgroundColor
          tile.backgroundOpacity = snap.backgroundOpacity
          tile.imageSettings = clone(snap.imageSettings)
          tile.videoSettings = clone(snap.videoSettings)
          tile.audioReactive = clone(snap.audioReactive)

          // Bild
          const imageSrc = mediaRegistry.resolve(snap.image)
          if (!imageSrc) {
            tile.image = null
            tile.imageSrc = null
          } else if (imageSrc !== tile.imageSrc || !tile.image) {
            try {
              tile.image = await loadImageElement(imageSrc)
            } catch (error) {
              console.warn('⚠️ [History] Kachel-Bild nicht ladbar:', error)
              tile.image = null
            }
            tile.imageSrc = imageSrc
          }

          // Video – entfernte Videos nur pausieren (nicht leeren), damit
          // ein späteres Redo sie weiterverwenden kann.
          const videoSrc = mediaRegistry.resolve(snap.video)
          if (tile.video && tile.videoSrc !== videoSrc) {
            tile.video.pause?.()
          }
          if (!videoSrc) {
            tile.video = null
            tile.videoSrc = null
          } else if (videoSrc !== tile.videoSrc || !isUsableVideo(tile.video, videoSrc)) {
            const cached = mediaRegistry.elementFor(videoSrc)
            tile.video = isUsableVideo(cached, videoSrc)
              ? cached
              : createVideoElement(videoSrc, tile.videoSettings ?? {})
            tile.videoSrc = videoSrc
            tile.video.play?.().catch(() => {})
          }
          if (tile.video && tile.videoSettings) {
            tile.video.muted = tile.videoSettings.muted
            tile.video.loop = tile.videoSettings.loop
            tile.video.playbackRate = tile.videoSettings.playbackRate
          }
          return tile
        }),
      )

      // Überzählige Kachel-Videos anhalten
      for (let i = nextTiles.length; i < current.length; i++) current[i]?.video?.pause?.()

      tilesStore.tilesEnabled = Boolean(snapshot.tilesEnabled)
      tilesStore.tileCount = snapshot.tileCount
      tilesStore.tiles = nextTiles
      if (
        tilesStore.selectedTileIndex !== null &&
        tilesStore.selectedTileIndex >= nextTiles.length
      ) {
        tilesStore.selectedTileIndex = null
      }
      // setTileGap persistiert zusätzlich nach localStorage
      tilesStore.setTileGap(snapshot.tileGap)
    },
  }
}
