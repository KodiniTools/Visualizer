import { computed, inject, reactive, ref, watch } from 'vue'
import {
  useBackgroundTilesStore,
  type BackgroundTile,
  type TileImageSettings,
  type TileVideoSettings,
} from '../stores/backgroundTilesStore'
import { historyApplyRevision } from '../lib/history/historyRecorder'
import type { CanvasManagerRef } from './types'

/** Wert aus einem Eingabefeld (Text oder bereits als Zahl) */
type InputNumber = string | number

/**
 * Kapselt den Zugriff auf den Background-Tiles-Store sowie alle
 * Bearbeitungs-Handler für die Kachel-UI. Jede Mutation stößt anschließend
 * ein Redraw des Canvas an (sofern ein CanvasManager injiziert wurde).
 *
 * Wird über provide/inject an die Unterkomponenten des BackgroundTilesPanel
 * weitergereicht.
 */
export function useBackgroundTiles() {
  const tilesStore = useBackgroundTilesStore()
  const canvasManager = inject('canvasManager') as CanvasManagerRef | undefined

  // Canvas neu zeichnen (falls verfügbar)
  function redraw() {
    if (canvasManager?.value) {
      canvasManager.value.redrawCallback()
    }
  }

  // Grid-Style für Vorschau basierend auf Kachel-Layout
  const gridStyle = computed(() => {
    const { rows, cols } = tilesStore.gridLayout
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: `${Math.min(tilesStore.tileGap, 4)}px`,
    }
  })

  // Style für einzelne Kachel in der Vorschau
  function getTileStyle(tile: BackgroundTile) {
    const style: Record<string, string | number> = {
      backgroundColor: tile.backgroundColor,
      opacity: tile.backgroundOpacity,
    }

    if (tile.imageSrc) {
      style.backgroundImage = `url(${tile.imageSrc})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
    }

    return style
  }

  // Kachel-Modus aktivieren/deaktivieren
  function setTilesEnabled(enabled: boolean) {
    tilesStore.setTilesEnabled(enabled)
    redraw()
  }

  // Kachelanzahl ändern
  function setTileCount(count: number) {
    tilesStore.setTileCount(count)
    redraw()
  }

  // Lücke zwischen Kacheln setzen
  function setTileGap(value: InputNumber) {
    tilesStore.setTileGap(parseInt(String(value)))
    redraw()
  }

  // Kachel auswählen
  function selectTile(index: number) {
    tilesStore.selectTile(index)
    redraw()
  }

  // Kachel-Auswahl aufheben
  function deselectTile() {
    tilesStore.selectTile(-1)
    redraw()
  }

  // Kachel-Farbe setzen
  function setTileColor(color: string) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileBackgroundColor(tilesStore.selectedTileIndex, color)
      redraw()
    }
  }

  // Kachel-Deckkraft setzen
  function setTileOpacity(value: InputNumber) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileBackgroundOpacity(tilesStore.selectedTileIndex, parseFloat(String(value)))
      redraw()
    }
  }

  // Bild hochladen
  function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = (e.target as FileReader).result as string
      const img = new Image()
      img.onload = () => {
        if (tilesStore.selectedTileIndex !== null) {
          tilesStore.setTileImage(tilesStore.selectedTileIndex, img, result)
          redraw()
        }
      }
      img.src = result
    }
    reader.readAsDataURL(file)

    // Input zurücksetzen für erneutes Hochladen
    input.value = ''
  }

  // Bild-Einstellung aktualisieren
  function updateImageSetting(setting: keyof TileImageSettings, value: InputNumber) {
    if (tilesStore.selectedTileIndex !== null) {
      const numValue = setting === 'scale' ? parseFloat(String(value)) : parseInt(String(value))
      tilesStore.updateTileImageSetting(tilesStore.selectedTileIndex, setting, numValue)
      redraw()
    }
  }

  // Bild entfernen
  function removeImage() {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.removeTileImage(tilesStore.selectedTileIndex)
      redraw()
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ✨ VIDEO-UPLOAD FUNKTIONEN
  // ═══════════════════════════════════════════════════════════════

  // Video hochladen
  function handleVideoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    // Video-Element erstellen
    const video = document.createElement('video')
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    // URL erstellen
    const videoUrl = URL.createObjectURL(file)

    video.onloadeddata = () => {
      if (tilesStore.selectedTileIndex !== null) {
        tilesStore.setTileVideo(tilesStore.selectedTileIndex, video, videoUrl)
        redraw()
      }
    }

    video.onerror = (e) => {
      console.error('❌ Fehler beim Laden des Videos:', e)
      URL.revokeObjectURL(videoUrl)
    }

    video.src = videoUrl
    video.load()

    // Input zurücksetzen für erneutes Hochladen
    input.value = ''
  }

  // Video-Einstellung aktualisieren
  function updateVideoSetting<K extends keyof TileVideoSettings>(
    setting: K,
    value: TileVideoSettings[K],
  ) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.updateTileVideoSetting(tilesStore.selectedTileIndex, setting, value)
      redraw()
    }
  }

  // Video entfernen
  function removeVideo() {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.removeTileVideo(tilesStore.selectedTileIndex)
      redraw()
    }
  }

  // Einzelne Kachel zurücksetzen
  function resetTile() {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.resetTile(tilesStore.selectedTileIndex)
      redraw()
    }
  }

  // Alle Kacheln zurücksetzen
  function resetAllTiles() {
    tilesStore.resetAllTiles()
    redraw()
  }

  // ✨ Audio-Reaktiv Funktionen
  function toggleAudioReactive(enabled: boolean) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioReactiveEnabled(tilesStore.selectedTileIndex, enabled)
      redraw()
    }
  }

  function setAudioSource(source: string) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioSource(tilesStore.selectedTileIndex, source)
      redraw()
    }
  }

  function setAudioSmoothing(value: InputNumber) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioSmoothing(tilesStore.selectedTileIndex, parseInt(String(value)))
      redraw()
    }
  }

  function toggleEffect(effectName: string, enabled: boolean) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioEffect(tilesStore.selectedTileIndex, effectName, enabled)
      redraw()
    }
  }

  function setEffectIntensity(effectName: string, value: InputNumber) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioEffectIntensity(
        tilesStore.selectedTileIndex,
        effectName,
        parseInt(String(value)),
      )
      redraw()
    }
  }

  // ── Erweiterte Audio-Reaktiv-Steuerung (Parität mit Bild-Panel) ──────────
  /** @param property - 'easing'|'beatBoost'|'phase'|'gain'|'source'|'smoothing' */
  function setAudioProperty(property: string, value: unknown) {
    if (tilesStore.selectedTileIndex === null) return
    tilesStore.setTileAudioProperty(tilesStore.selectedTileIndex, property, value)
    redraw()
  }

  function setEffectSource(effectName: string, source: string | null | undefined) {
    if (tilesStore.selectedTileIndex === null) return
    tilesStore.setTileAudioEffectSource(tilesStore.selectedTileIndex, effectName, source)
    redraw()
  }

  // Aktives Preset und Backup der Nutzer-Effekte pro Kachel-Index
  const activeTileAudioPresets = reactive<Record<number, string | null>>({})
  const tileUserEffectsBackups = new Map<number, object>()
  // Zähler für externe Änderungen (Preset/Anwenden), damit das Panel neu einliest
  const tileAudioRevision = ref(0)
  // Undo/Redo gilt als externe Änderung → Panel neu einlesen
  watch(historyApplyRevision, () => tileAudioRevision.value++)
  const TILE_AUDIO_STORAGE_KEY = 'visualizer_tileAudioReactivePreset'
  const savedTileAudioSettings = ref(loadSavedTileAudioSettings())
  const hasSavedTileAudioSettings = computed(() => savedTileAudioSettings.value !== null)

  function loadSavedTileAudioSettings(): object | null {
    try {
      const raw =
        typeof localStorage !== 'undefined' && localStorage.getItem(TILE_AUDIO_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const activeTileAudioPreset = computed(() => {
    const i = tilesStore.selectedTileIndex
    return i === null ? null : (activeTileAudioPresets[i] ?? null)
  })

  function toggleTileAudioPreset(presetName: string) {
    const i = tilesStore.selectedTileIndex
    if (i === null) return
    if (activeTileAudioPresets[i] === presetName) {
      clearTileAudioPreset()
      return
    }
    if (!activeTileAudioPresets[i]) {
      tileUserEffectsBackups.set(
        i,
        JSON.parse(JSON.stringify((tilesStore.tiles[i] as BackgroundTile).audioReactive)),
      )
    }
    if (!tilesStore.applyTileAudioPreset(i, presetName)) return
    activeTileAudioPresets[i] = presetName
    tileAudioRevision.value++
    redraw()
  }

  function clearTileAudioPreset() {
    const i = tilesStore.selectedTileIndex
    if (i === null) return
    const backup = tileUserEffectsBackups.get(i)
    if (backup) tilesStore.assignTileAudioReactive(i, backup)
    activeTileAudioPresets[i] = null
    tileAudioRevision.value++
    redraw()
  }

  function saveTileAudioSettings() {
    const tile = tilesStore.selectedTile
    if (!tile?.audioReactive) return
    const copy = JSON.parse(JSON.stringify(tile.audioReactive))
    savedTileAudioSettings.value = copy
    try {
      localStorage.setItem(TILE_AUDIO_STORAGE_KEY, JSON.stringify(copy))
    } catch (e) {
      console.warn('⚠️ Kachel-Audio-Einstellungen konnten nicht gespeichert werden:', e)
    }
  }

  function applyTileAudioSettings() {
    const i = tilesStore.selectedTileIndex
    if (i === null || !savedTileAudioSettings.value) return
    tilesStore.assignTileAudioReactive(i, savedTileAudioSettings.value)
    activeTileAudioPresets[i] = null
    tileAudioRevision.value++
    redraw()
  }

  return {
    tilesStore,
    redraw,
    gridStyle,
    getTileStyle,
    setTilesEnabled,
    setTileCount,
    setTileGap,
    selectTile,
    deselectTile,
    setTileColor,
    setTileOpacity,
    handleImageUpload,
    updateImageSetting,
    removeImage,
    handleVideoUpload,
    updateVideoSetting,
    removeVideo,
    resetTile,
    resetAllTiles,
    toggleAudioReactive,
    setAudioSource,
    setAudioSmoothing,
    toggleEffect,
    setEffectIntensity,
    setAudioProperty,
    setEffectSource,
    activeTileAudioPreset,
    tileAudioRevision,
    hasSavedTileAudioSettings,
    toggleTileAudioPreset,
    clearTileAudioPreset,
    saveTileAudioSettings,
    applyTileAudioSettings,
  }
}

/** Per provide('tileControls') an die Kachel-Unterkomponenten gereicht */
export type BackgroundTilesApi = ReturnType<typeof useBackgroundTiles>
