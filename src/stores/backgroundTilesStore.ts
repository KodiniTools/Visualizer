import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { EFFECT_NAMES } from '../lib/audio/AudioReactiveEffects'
import {
  applyAudioReactivePreset,
  assignAudioReactiveConfig,
  createAudioReactiveConfig,
} from '../lib/audio/audioReactiveConfig'

const STORAGE_KEY = 'visualizer-background-tiles'

/** Audio-Reaktiv-Konfiguration einer Kachel (wie bei Canvas-Bildern) */
export type TileAudioReactive = ReturnType<typeof createAudioReactiveConfig>

export interface TileVideoSettings {
  muted: boolean
  loop: boolean
  playbackRate: number
}

export interface TileImageSettings {
  brightness: number
  contrast: number
  saturation: number
  opacity: number
  blur: number
  hueRotate: number
  grayscale: number
  sepia: number
  scale: number
  offsetX: number
  offsetY: number
}

export interface BackgroundTile {
  id: string
  backgroundColor: string
  backgroundOpacity: number
  /** Bild-Objekt (nicht persistiert) */
  image: HTMLImageElement | null
  /** Bild-URL für Persistenz */
  imageSrc: string | null
  /** Video-Objekt (nicht persistiert) */
  video: HTMLVideoElement | null
  /** Video-URL für Persistenz */
  videoSrc: string | null
  videoSettings: TileVideoSettings
  imageSettings: TileImageSettings
  audioReactive: TileAudioReactive
}

/** Persistierter Stand einer Kachel (ohne Bild-/Video-Objekte) */
type SavedTile = Partial<Omit<BackgroundTile, 'audioReactive'>> & {
  audioReactive?: Partial<TileAudioReactive> | null
}

interface SavedTileSettings {
  tilesEnabled?: boolean
  tileCount?: number
  tileGap?: number
  tiles?: SavedTile[]
}

const defaultImageSettings = (): TileImageSettings => ({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
})

// Standard-Kachel-Konfiguration
function createDefaultTile(index: number): BackgroundTile {
  return {
    id: `tile-${index}`,
    backgroundColor: '#1a1a2e',
    backgroundOpacity: 1.0,
    image: null, // Bild-Objekt (HTMLImageElement)
    imageSrc: null, // Bild-URL für Persistenz
    // ✨ NEU: Video-Unterstützung
    video: null, // Video-Objekt (HTMLVideoElement)
    videoSrc: null, // Video-URL für Persistenz
    videoSettings: {
      muted: true, // Standard: stumm
      loop: true, // Standard: Endlosschleife
      playbackRate: 1.0, // Abspielgeschwindigkeit
    },
    imageSettings: defaultImageSettings(),
    // Audio-Reaktiv pro Kachel – identische Struktur wie bei Canvas-Bildern
    // (Master inkl. Easing/Beat-Boost/Phase/Gain, alle Effekte mit eigener Quelle)
    audioReactive: createAudioReactiveConfig(EFFECT_NAMES),
  }
}

// Einstellungen aus localStorage laden
// Hinweis: tileGap wird bei jeder Aktivierung auf 5px zurückgesetzt (Grundeinstellung)
function loadSettings(): SavedTileSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Kachel-Einstellungen:', e)
  }
  return null
}

// Einstellungen in localStorage speichern
function saveSettings(settings: SavedTileSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Fehler beim Speichern der Kachel-Einstellungen:', e)
  }
}

export const useBackgroundTilesStore = defineStore('backgroundTiles', () => {
  // Gespeicherte Einstellungen laden
  const savedSettings = loadSettings()

  // ===== Zustand (State) =====

  // Kachel-Modus aktiviert
  const tilesEnabled = ref(savedSettings?.tilesEnabled || false)

  // Anzahl der Kacheln (3, 6, 9 oder 12)
  const tileCount = ref(savedSettings?.tileCount || 6)

  // Kachel-Daten Array
  const tiles = ref<BackgroundTile[]>([])

  // Aktuell ausgewählte Kachel für Bearbeitung
  const selectedTileIndex = ref<number | null>(null)

  // Lücke zwischen Kacheln (in Pixel) - IMMER 5px als Standard beim App-Start
  const tileGap = ref(5)

  // ===== Berechnete Werte (Computed) =====

  // Grid-Layout basierend auf Kachelanzahl
  const gridLayout = computed(() => {
    switch (tileCount.value) {
      case 3:
        return { rows: 1, cols: 3 }
      case 6:
        return { rows: 2, cols: 3 }
      case 9:
        return { rows: 3, cols: 3 }
      case 12:
        return { rows: 3, cols: 4 }
      default:
        return { rows: 2, cols: 3 }
    }
  })

  // Ausgewählte Kachel
  const selectedTile = computed(() => {
    if (selectedTileIndex.value !== null) {
      return tiles.value[selectedTileIndex.value] ?? null
    }
    return null
  })

  /** Kachel an Position index oder undefined */
  const tileAt = (index: number): BackgroundTile | undefined => tiles.value[index]

  // ===== Aktionen =====

  // Kacheln initialisieren/aktualisieren basierend auf Anzahl
  function initializeTiles(count: number = tileCount.value) {
    const currentTiles = [...tiles.value]
    const newTiles: BackgroundTile[] = []

    for (let i = 0; i < count; i++) {
      const existing = currentTiles[i]
      if (existing) {
        // Bestehende Kachel behalten
        newTiles.push(existing)
      } else {
        // Neue Kachel erstellen
        newTiles.push(createDefaultTile(i))
      }
    }

    tiles.value = newTiles

    // Auswahl anpassen wenn nötig
    if (selectedTileIndex.value !== null && selectedTileIndex.value >= count) {
      selectedTileIndex.value = null
    }
  }

  // Kachel-Modus aktivieren/deaktivieren
  function setTilesEnabled(enabled: boolean) {
    tilesEnabled.value = enabled
    if (enabled) {
      // ✅ Kacheln aktiviert: Immer mit 5px Abstand starten (Grundeinstellung)
      tileGap.value = 5
      if (tiles.value.length === 0) {
        initializeTiles()
      }
    }
    persistSettings()
  }

  // Kachelanzahl ändern
  function setTileCount(count: number) {
    const validCounts = [3, 6, 9, 12]
    if (!validCounts.includes(count)) {
      console.warn('Ungültige Kachelanzahl:', count)
      return
    }
    tileCount.value = count
    initializeTiles(count)
    persistSettings()
  }

  // Kachel auswählen
  function selectTile(index: number) {
    if (index >= 0 && index < tiles.value.length) {
      selectedTileIndex.value = index
    } else {
      selectedTileIndex.value = null
    }
  }

  // Kachel-Hintergrundfarbe setzen
  function setTileBackgroundColor(index: number, color: string) {
    const tile = tileAt(index)
    if (tile) {
      tile.backgroundColor = color
      persistSettings()
    }
  }

  // Kachel-Hintergrund-Deckkraft setzen
  function setTileBackgroundOpacity(index: number, opacity: number) {
    const tile = tileAt(index)
    if (tile) {
      tile.backgroundOpacity = Math.max(0, Math.min(1, opacity))
      persistSettings()
    }
  }

  // Bild zu Kachel hinzufügen
  function setTileImage(
    index: number,
    imageObject: HTMLImageElement | null,
    imageSrc: string | null = null,
  ) {
    const tile = tileAt(index)
    if (tile) {
      tile.image = imageObject
      tile.imageSrc = imageSrc
      // Bild-Einstellungen zurücksetzen
      tile.imageSettings = defaultImageSettings()
      persistSettings()
    }
  }

  // Bild von Kachel entfernen
  function removeTileImage(index: number) {
    const tile = tileAt(index)
    if (tile) {
      tile.image = null
      tile.imageSrc = null
      persistSettings()
    }
  }

  // ✨ NEU: Video zu Kachel hinzufügen
  function setTileVideo(
    index: number,
    videoElement: HTMLVideoElement | null,
    videoSrc: string | null = null,
  ) {
    const tile = tileAt(index)
    if (tile) {
      // Vorheriges Video stoppen falls vorhanden
      if (tile.video) {
        tile.video.pause()
        tile.video.src = ''
      }
      // Vorheriges Bild entfernen (Video ersetzt Bild)
      tile.image = null
      tile.imageSrc = null

      tile.video = videoElement
      tile.videoSrc = videoSrc
      // Video-Einstellungen zurücksetzen
      tile.videoSettings = {
        muted: true,
        loop: true,
        playbackRate: 1.0,
      }
      // Video starten
      if (videoElement) {
        videoElement.muted = true
        videoElement.loop = true
        videoElement.play().catch((e) => console.warn('Video autoplay blocked:', e))
      }
      persistSettings()
    }
  }

  // ✨ NEU: Video von Kachel entfernen
  function removeTileVideo(index: number) {
    const tile = tileAt(index)
    if (tile) {
      if (tile.video) {
        tile.video.pause()
        tile.video.src = ''
      }
      tile.video = null
      tile.videoSrc = null
      persistSettings()
    }
  }

  // ✨ NEU: Video-Einstellung für Kachel ändern
  function updateTileVideoSetting<K extends keyof TileVideoSettings>(
    index: number,
    setting: K,
    value: TileVideoSettings[K],
  ) {
    const tile = tileAt(index)
    if (tile) {
      if (!tile.videoSettings) {
        tile.videoSettings = { muted: true, loop: true, playbackRate: 1.0 }
      }
      tile.videoSettings[setting] = value

      // Einstellung auf Video anwenden
      const video = tile.video
      if (video) {
        if (setting === 'muted') video.muted = value as boolean
        if (setting === 'loop') video.loop = value as boolean
        if (setting === 'playbackRate') video.playbackRate = value as number
      }
      persistSettings()
    }
  }

  // Bild-Einstellung für Kachel ändern
  function updateTileImageSetting<K extends keyof TileImageSettings>(
    index: number,
    setting: K,
    value: TileImageSettings[K],
  ) {
    const tile = tileAt(index)
    if (tile && tile.imageSettings) {
      tile.imageSettings[setting] = value
      persistSettings()
    }
  }

  // ✨ NEU: Audio-Reaktiv für Kachel aktivieren/deaktivieren
  function setTileAudioReactiveEnabled(index: number, enabled: boolean) {
    const tile = tileAt(index)
    if (tile) {
      if (!tile.audioReactive) {
        tile.audioReactive = createDefaultTile(index).audioReactive
      }
      tile.audioReactive.enabled = enabled
      persistSettings()
    }
  }

  // ✨ NEU: Audio-Quelle für Kachel setzen
  function setTileAudioSource(index: number, source: string) {
    const ar = tileAt(index)?.audioReactive
    if (ar) {
      ar.source = source
      persistSettings()
    }
  }

  // ✨ NEU: Audio-Glättung für Kachel setzen
  function setTileAudioSmoothing(index: number, smoothing: number) {
    const ar = tileAt(index)?.audioReactive
    if (ar) {
      ar.smoothing = Math.max(0, Math.min(100, smoothing))
      persistSettings()
    }
  }

  // ✨ NEU: Audio-Effekt für Kachel aktivieren/deaktivieren
  function setTileAudioEffect(index: number, effectName: string, enabled: boolean) {
    const fx = tileAt(index)?.audioReactive?.effects?.[effectName]
    if (fx) {
      fx.enabled = enabled
      persistSettings()
    }
  }

  /** Master-Eigenschaft (easing, beatBoost, phase, gain, source, smoothing) setzen */
  function setTileAudioProperty(index: number, property: string, value: unknown) {
    const ar = tileAt(index)?.audioReactive
    if (!ar || property === 'effects' || !(property in ar)) return
    ;(ar as unknown as Record<string, unknown>)[property] = value
    persistSettings()
  }

  /** Individuelle Audio-Quelle eines Effekts setzen (null/'' = globale Quelle) */
  function setTileAudioEffectSource(
    index: number,
    effectName: string,
    source: string | null | undefined,
  ) {
    const fx = tileAt(index)?.audioReactive?.effects?.[effectName]
    if (!fx) return
    fx.source = source ? source : null
    persistSettings()
  }

  /** Preset auf eine Kachel anwenden (alle anderen Effekte aus) */
  function applyTileAudioPreset(index: number, presetName: string): boolean {
    const ar = tileAt(index)?.audioReactive
    if (!ar) return false
    const ok = applyAudioReactivePreset(ar, presetName)
    if (ok) persistSettings()
    return ok
  }

  /** (Teil-)Konfiguration in-place übernehmen; fehlende Effekte werden deaktiviert */
  function assignTileAudioReactive(index: number, config: object | null | undefined) {
    const ar = tileAt(index)?.audioReactive
    if (!ar) return
    assignAudioReactiveConfig(ar, config)
    persistSettings()
  }

  // ✨ NEU: Audio-Effekt-Intensität für Kachel setzen
  function setTileAudioEffectIntensity(index: number, effectName: string, intensity: number) {
    const fx = tileAt(index)?.audioReactive?.effects?.[effectName]
    if (fx) {
      fx.intensity = Math.max(0, Math.min(100, intensity))
      persistSettings()
    }
  }

  // ✨ NEU: Alle Audio-Reaktiv-Einstellungen für Kachel auf einmal setzen
  function setTileAudioReactive(
    index: number,
    settings: Partial<TileAudioReactive> | null | undefined,
  ) {
    const tile = tileAt(index)
    if (tile) {
      tile.audioReactive = mergeAudioReactive(settings)
      persistSettings()
    }
  }

  /**
   * Gespeicherte (evtl. alte, unvollständige) Audio-Einstellungen mit der
   * vollständigen Default-Struktur zusammenführen.
   */
  function mergeAudioReactive(
    settings: Partial<TileAudioReactive> | null | undefined,
  ): TileAudioReactive {
    const base = createAudioReactiveConfig(EFFECT_NAMES)
    if (!settings) return base
    const effects = { ...base.effects }
    for (const [name, fx] of Object.entries(settings.effects || {})) {
      const current = effects[name]
      if (current && fx) {
        effects[name] = { ...current, ...fx, source: fx.source ?? null }
      }
    }
    return { ...base, ...settings, effects }
  }

  // Lücke zwischen Kacheln setzen
  function setTileGap(gap: number) {
    tileGap.value = Math.max(0, Math.min(50, gap))
    persistSettings()
  }

  // Alle Kacheln zurücksetzen
  function resetAllTiles() {
    tiles.value = []
    initializeTiles()
    selectedTileIndex.value = null
    persistSettings()
  }

  // Einzelne Kachel zurücksetzen
  function resetTile(index: number) {
    if (tileAt(index)) {
      tiles.value[index] = createDefaultTile(index)
      persistSettings()
    }
  }

  // Einstellungen persistieren (ohne Bilder - nur Metadaten)
  function persistSettings() {
    const settingsToSave: SavedTileSettings = {
      tilesEnabled: tilesEnabled.value,
      tileCount: tileCount.value,
      tileGap: tileGap.value,
      tiles: tiles.value.map((tile) => ({
        id: tile.id,
        backgroundColor: tile.backgroundColor,
        backgroundOpacity: tile.backgroundOpacity,
        imageSrc: tile.imageSrc,
        imageSettings: { ...tile.imageSettings },
        // ✨ NEU: Audio-Reaktiv-Einstellungen speichern
        audioReactive: tile.audioReactive ? JSON.parse(JSON.stringify(tile.audioReactive)) : null,
      })),
    }
    saveSettings(settingsToSave)
  }

  // Bilder aus gespeicherten URLs wiederherstellen
  async function restoreImages() {
    const savedSettings = loadSettings()
    if (!savedSettings?.tiles) return

    for (let i = 0; i < savedSettings.tiles.length; i++) {
      const savedTile = savedSettings.tiles[i] as SavedTile
      const imageSrc = savedTile.imageSrc
      if (imageSrc && tiles.value[i]) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = imageSrc
          })
          // Kachel nach dem await neu lesen (Liste kann sich geändert haben)
          const tile = tiles.value[i]
          if (!tile) continue
          tile.image = img
          tile.imageSrc = imageSrc
          tile.imageSettings = { ...savedTile.imageSettings } as TileImageSettings
        } catch (e) {
          console.warn(`Konnte Bild für Kachel ${i} nicht laden:`, e)
        }
      }
    }
  }

  // CSS-Filter-String für Kachel-Bild generieren
  function getTileImageFilter(index: number): string {
    const tile = tiles.value[index]
    if (!tile || !tile.imageSettings) return ''

    const s = tile.imageSettings
    const filters: string[] = []

    if (s.brightness !== 100) filters.push(`brightness(${s.brightness}%)`)
    if (s.contrast !== 100) filters.push(`contrast(${s.contrast}%)`)
    if (s.saturation !== 100) filters.push(`saturate(${s.saturation}%)`)
    if (s.blur > 0) filters.push(`blur(${s.blur}px)`)
    if (s.hueRotate !== 0) filters.push(`hue-rotate(${s.hueRotate}deg)`)
    if (s.grayscale > 0) filters.push(`grayscale(${s.grayscale}%)`)
    if (s.sepia > 0) filters.push(`sepia(${s.sepia}%)`)

    return filters.join(' ')
  }

  // Initialisierung
  if (savedSettings?.tiles) {
    // Gespeicherte Kacheln wiederherstellen
    tiles.value = savedSettings.tiles.map((savedTile, i) => ({
      ...createDefaultTile(i),
      ...savedTile,
      // Alte Speicherstände kennen nur wenige Effekte → mit voller Struktur mergen
      audioReactive: mergeAudioReactive(savedTile.audioReactive),
      image: null, // Bilder müssen separat geladen werden
    })) as BackgroundTile[]
    // Bilder asynchron laden
    restoreImages()
  } else if (tilesEnabled.value) {
    initializeTiles()
  }

  return {
    // State
    tilesEnabled,
    tileCount,
    tiles,
    selectedTileIndex,
    tileGap,

    // Computed
    gridLayout,
    selectedTile,

    // Actions
    setTilesEnabled,
    setTileCount,
    selectTile,
    setTileBackgroundColor,
    setTileBackgroundOpacity,
    setTileImage,
    removeTileImage,
    updateTileImageSetting,
    // ✨ NEU: Video Actions
    setTileVideo,
    removeTileVideo,
    updateTileVideoSetting,
    setTileGap,
    resetAllTiles,
    resetTile,
    initializeTiles,
    getTileImageFilter,
    restoreImages,
    // ✨ NEU: Audio-Reaktiv Actions
    setTileAudioReactiveEnabled,
    setTileAudioSource,
    setTileAudioSmoothing,
    setTileAudioEffect,
    setTileAudioEffectIntensity,
    setTileAudioProperty,
    setTileAudioEffectSource,
    applyTileAudioPreset,
    assignTileAudioReactive,
    setTileAudioReactive,
  }
})
