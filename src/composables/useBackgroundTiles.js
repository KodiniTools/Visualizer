import { computed, inject, reactive, ref } from 'vue'
import { useBackgroundTilesStore } from '../stores/backgroundTilesStore'

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
  const canvasManager = inject('canvasManager')

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
  function getTileStyle(tile) {
    const style = {
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
  function toggleTiles(event) {
    tilesStore.setTilesEnabled(event.target.checked)
    redraw()
  }

  // Kachelanzahl ändern
  function setTileCount(count) {
    tilesStore.setTileCount(count)
    redraw()
  }

  // Lücke zwischen Kacheln setzen
  function setTileGap(value) {
    tilesStore.setTileGap(parseInt(value))
    redraw()
  }

  // Kachel auswählen
  function selectTile(index) {
    tilesStore.selectTile(index)
    redraw()
  }

  // Kachel-Auswahl aufheben
  function deselectTile() {
    tilesStore.selectTile(-1)
    redraw()
  }

  // Kachel-Farbe setzen
  function setTileColor(color) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileBackgroundColor(tilesStore.selectedTileIndex, color)
      redraw()
    }
  }

  // Kachel-Deckkraft setzen
  function setTileOpacity(value) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileBackgroundOpacity(tilesStore.selectedTileIndex, parseFloat(value))
      redraw()
    }
  }

  // Bild hochladen
  function handleImageUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (tilesStore.selectedTileIndex !== null) {
          tilesStore.setTileImage(tilesStore.selectedTileIndex, img, e.target.result)
          redraw()
        }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)

    // Input zurücksetzen für erneutes Hochladen
    event.target.value = ''
  }

  // Bild-Einstellung aktualisieren
  function updateImageSetting(setting, value) {
    if (tilesStore.selectedTileIndex !== null) {
      const numValue = setting === 'scale' ? parseFloat(value) : parseInt(value)
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
  function handleVideoUpload(event) {
    const file = event.target.files[0]
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
    event.target.value = ''
  }

  // Video-Einstellung aktualisieren
  function updateVideoSetting(setting, value) {
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
  function toggleAudioReactive(enabled) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioReactiveEnabled(tilesStore.selectedTileIndex, enabled)
      redraw()
    }
  }

  function setAudioSource(source) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioSource(tilesStore.selectedTileIndex, source)
      redraw()
    }
  }

  function setAudioSmoothing(value) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioSmoothing(tilesStore.selectedTileIndex, parseInt(value))
      redraw()
    }
  }

  function toggleEffect(effectName, enabled) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioEffect(tilesStore.selectedTileIndex, effectName, enabled)
      redraw()
    }
  }

  function setEffectIntensity(effectName, value) {
    if (tilesStore.selectedTileIndex !== null) {
      tilesStore.setTileAudioEffectIntensity(
        tilesStore.selectedTileIndex,
        effectName,
        parseInt(value),
      )
      redraw()
    }
  }

  // ── Erweiterte Audio-Reaktiv-Steuerung (Parität mit Bild-Panel) ──────────
  /** @param {'easing'|'beatBoost'|'phase'|'gain'|'source'|'smoothing'} property */
  function setAudioProperty(property, value) {
    if (tilesStore.selectedTileIndex === null) return
    tilesStore.setTileAudioProperty(tilesStore.selectedTileIndex, property, value)
    redraw()
  }

  function setEffectSource(effectName, source) {
    if (tilesStore.selectedTileIndex === null) return
    tilesStore.setTileAudioEffectSource(tilesStore.selectedTileIndex, effectName, source)
    redraw()
  }

  // Aktives Preset und Backup der Nutzer-Effekte pro Kachel-Index
  const activeTileAudioPresets = reactive({})
  const tileUserEffectsBackups = new Map()
  // Zähler für externe Änderungen (Preset/Anwenden), damit das Panel neu einliest
  const tileAudioRevision = ref(0)
  const TILE_AUDIO_STORAGE_KEY = 'visualizer_tileAudioReactivePreset'
  const savedTileAudioSettings = ref(loadSavedTileAudioSettings())
  const hasSavedTileAudioSettings = computed(() => savedTileAudioSettings.value !== null)

  function loadSavedTileAudioSettings() {
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

  function toggleTileAudioPreset(presetName) {
    const i = tilesStore.selectedTileIndex
    if (i === null) return
    if (activeTileAudioPresets[i] === presetName) {
      clearTileAudioPreset()
      return
    }
    if (!activeTileAudioPresets[i]) {
      tileUserEffectsBackups.set(i, JSON.parse(JSON.stringify(tilesStore.tiles[i].audioReactive)))
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
    toggleTiles,
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
