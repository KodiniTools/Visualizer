import { ref, onMounted } from 'vue'

const TILE_PRESETS_KEY = 'visualizer-tile-presets'

/**
 * Verwaltet die Kachel-Presets (Speichern/Laden/Löschen) inklusive
 * Persistenz im localStorage. Presets speichern die Kachelanzahl, den Abstand
 * sowie pro Kachel Hintergrundfarbe, Deckkraft und Audio-Reaktiv-Einstellungen
 * (ohne Bilder/Videos).
 */
export function useTilePresets(tilesStore) {
  const tilePresets = ref([])

  // Presets aus localStorage laden
  function loadTilePresets() {
    try {
      const stored = localStorage.getItem(TILE_PRESETS_KEY)
      if (stored) {
        tilePresets.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Fehler beim Laden der Kachel-Presets:', e)
    }
  }

  // Presets in localStorage speichern
  function persistTilePresets() {
    try {
      localStorage.setItem(TILE_PRESETS_KEY, JSON.stringify(tilePresets.value))
    } catch (e) {
      console.warn('Fehler beim Speichern der Kachel-Presets:', e)
    }
  }

  // Aktuellen Zustand als Preset speichern
  function saveTilePreset() {
    const presetNumber = tilePresets.value.length + 1
    const newPreset = {
      id: Date.now(),
      name: `Kachel-Preset ${presetNumber}`,
      tileCount: tilesStore.tileCount,
      tileGap: tilesStore.tileGap,
      // ✅ Deep Clone der Tile-Einstellungen (ohne Bilder)
      tiles: tilesStore.tiles.map((tile) => ({
        backgroundColor: tile.backgroundColor,
        backgroundOpacity: tile.backgroundOpacity,
        // Deep Clone für audioReactive (enthält verschachtelte effects)
        audioReactive: tile.audioReactive ? JSON.parse(JSON.stringify(tile.audioReactive)) : null,
      })),
    }

    tilePresets.value.push(newPreset)
    persistTilePresets()
    console.log('✅ Kachel-Preset gespeichert:', newPreset)
  }

  // Preset laden
  function loadTilePreset(preset) {
    console.log('📥 Lade Kachel-Preset:', preset)

    try {
      // ✅ Sicherstellen dass Kacheln aktiviert sind
      if (!tilesStore.tilesEnabled) {
        tilesStore.setTilesEnabled(true)
      }

      // Kachelanzahl setzen (initialisiert auch die Kacheln neu)
      tilesStore.setTileCount(preset.tileCount)
      console.log('  → Kachelanzahl gesetzt:', preset.tileCount)

      // Abstand setzen
      tilesStore.setTileGap(preset.tileGap)
      console.log('  → Abstand gesetzt:', preset.tileGap)

      // Kachel-Einstellungen übernehmen
      if (preset.tiles && Array.isArray(preset.tiles)) {
        console.log('  → Anzahl Preset-Tiles:', preset.tiles.length)
        console.log('  → Anzahl Store-Tiles:', tilesStore.tiles.length)

        preset.tiles.forEach((presetTile, index) => {
          if (index < tilesStore.tiles.length && presetTile) {
            // Hintergrundfarbe setzen
            if (presetTile.backgroundColor) {
              tilesStore.setTileBackgroundColor(index, presetTile.backgroundColor)
            }

            // Deckkraft setzen
            if (presetTile.backgroundOpacity !== undefined) {
              tilesStore.setTileBackgroundOpacity(index, presetTile.backgroundOpacity)
            }

            // Audio-reaktive Einstellungen (mit Deep Clone)
            if (presetTile.audioReactive) {
              const audioSettings = JSON.parse(JSON.stringify(presetTile.audioReactive))
              tilesStore.setTileAudioReactive(index, audioSettings)
            }

            console.log(`  → Kachel ${index + 1}: ${presetTile.backgroundColor}`)
          }
        })
      }

      console.log('✅ Kachel-Preset erfolgreich geladen:', preset.name)
    } catch (error) {
      console.error('❌ Fehler beim Laden des Presets:', error)
    }
  }

  // Preset löschen
  function deleteTilePreset(presetId) {
    tilePresets.value = tilePresets.value.filter((p) => p.id !== presetId)
    persistTilePresets()
    console.log('🗑️ Kachel-Preset gelöscht')
  }

  // Beim Mounting Presets laden
  onMounted(() => {
    loadTilePresets()
  })

  return {
    tilePresets,
    loadTilePresets,
    saveTilePreset,
    loadTilePreset,
    deleteTilePreset,
  }
}
