import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'visualizer-background-tiles';

// Standard-Kachel-Konfiguration
function createDefaultTile(index) {
  return {
    id: `tile-${index}`,
    backgroundColor: '#1a1a2e',
    backgroundOpacity: 1.0,
    image: null,           // Bild-Objekt (HTMLImageElement)
    imageSrc: null,        // Bild-URL für Persistenz
    imageSettings: {
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
      offsetY: 0
    },
    // ✨ NEU: Audio-Reaktiv Einstellungen pro Kachel
    audioReactive: {
      enabled: false,
      source: 'bass',      // 'bass', 'mid', 'treble', 'volume', 'dynamic'
      smoothing: 50,       // 0-100
      effects: {
        hue: { enabled: false, intensity: 80 },
        brightness: { enabled: false, intensity: 80 },
        saturation: { enabled: false, intensity: 80 },
        glow: { enabled: false, intensity: 80 },
        scale: { enabled: false, intensity: 50 },
        blur: { enabled: false, intensity: 50 }
      }
    }
  };
}

// Einstellungen aus localStorage laden
// Hinweis: tileGap wird bei jeder Aktivierung auf 5px zurückgesetzt (Grundeinstellung)
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Kachel-Einstellungen:', e);
  }
  return null;
}

// Einstellungen in localStorage speichern
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Fehler beim Speichern der Kachel-Einstellungen:', e);
  }
}

export const useBackgroundTilesStore = defineStore('backgroundTiles', () => {
  // Gespeicherte Einstellungen laden
  const savedSettings = loadSettings();

  // ===== Zustand (State) =====

  // Kachel-Modus aktiviert
  const tilesEnabled = ref(savedSettings?.tilesEnabled || false);

  // Anzahl der Kacheln (3, 6, 9 oder 12)
  const tileCount = ref(savedSettings?.tileCount || 6);

  // Kachel-Daten Array
  const tiles = ref([]);

  // Aktuell ausgewählte Kachel für Bearbeitung
  const selectedTileIndex = ref(null);

  // Lücke zwischen Kacheln (in Pixel) - Standard: 5px
  const tileGap = ref(savedSettings?.tileGap ?? 5);

  // ===== Berechnete Werte (Computed) =====

  // Grid-Layout basierend auf Kachelanzahl
  const gridLayout = computed(() => {
    switch (tileCount.value) {
      case 3:
        return { rows: 1, cols: 3 };
      case 6:
        return { rows: 2, cols: 3 };
      case 9:
        return { rows: 3, cols: 3 };
      case 12:
        return { rows: 3, cols: 4 };
      default:
        return { rows: 2, cols: 3 };
    }
  });

  // Ausgewählte Kachel
  const selectedTile = computed(() => {
    if (selectedTileIndex.value !== null && tiles.value[selectedTileIndex.value]) {
      return tiles.value[selectedTileIndex.value];
    }
    return null;
  });

  // ===== Aktionen =====

  // Kacheln initialisieren/aktualisieren basierend auf Anzahl
  function initializeTiles(count = tileCount.value) {
    const currentTiles = [...tiles.value];
    const newTiles = [];

    for (let i = 0; i < count; i++) {
      if (currentTiles[i]) {
        // Bestehende Kachel behalten
        newTiles.push(currentTiles[i]);
      } else {
        // Neue Kachel erstellen
        newTiles.push(createDefaultTile(i));
      }
    }

    tiles.value = newTiles;

    // Auswahl anpassen wenn nötig
    if (selectedTileIndex.value !== null && selectedTileIndex.value >= count) {
      selectedTileIndex.value = null;
    }
  }

  // Kachel-Modus aktivieren/deaktivieren
  function setTilesEnabled(enabled) {
    tilesEnabled.value = enabled;
    if (enabled) {
      // ✅ Kacheln aktiviert: Immer mit 5px Abstand starten (Grundeinstellung)
      tileGap.value = 5;
      if (tiles.value.length === 0) {
        initializeTiles();
      }
    }
    persistSettings();
  }

  // Kachelanzahl ändern
  function setTileCount(count) {
    const validCounts = [3, 6, 9, 12];
    if (!validCounts.includes(count)) {
      console.warn('Ungültige Kachelanzahl:', count);
      return;
    }
    tileCount.value = count;
    initializeTiles(count);
    persistSettings();
  }

  // Kachel auswählen
  function selectTile(index) {
    if (index >= 0 && index < tiles.value.length) {
      selectedTileIndex.value = index;
    } else {
      selectedTileIndex.value = null;
    }
  }

  // Kachel-Hintergrundfarbe setzen
  function setTileBackgroundColor(index, color) {
    if (tiles.value[index]) {
      tiles.value[index].backgroundColor = color;
      persistSettings();
    }
  }

  // Kachel-Hintergrund-Deckkraft setzen
  function setTileBackgroundOpacity(index, opacity) {
    if (tiles.value[index]) {
      tiles.value[index].backgroundOpacity = Math.max(0, Math.min(1, opacity));
      persistSettings();
    }
  }

  // Bild zu Kachel hinzufügen
  function setTileImage(index, imageObject, imageSrc = null) {
    if (tiles.value[index]) {
      tiles.value[index].image = imageObject;
      tiles.value[index].imageSrc = imageSrc;
      // Bild-Einstellungen zurücksetzen
      tiles.value[index].imageSettings = {
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
        offsetY: 0
      };
      persistSettings();
    }
  }

  // Bild von Kachel entfernen
  function removeTileImage(index) {
    if (tiles.value[index]) {
      tiles.value[index].image = null;
      tiles.value[index].imageSrc = null;
      persistSettings();
    }
  }

  // Bild-Einstellung für Kachel ändern
  function updateTileImageSetting(index, setting, value) {
    if (tiles.value[index] && tiles.value[index].imageSettings) {
      tiles.value[index].imageSettings[setting] = value;
      persistSettings();
    }
  }

  // ✨ NEU: Audio-Reaktiv für Kachel aktivieren/deaktivieren
  function setTileAudioReactiveEnabled(index, enabled) {
    if (tiles.value[index]) {
      if (!tiles.value[index].audioReactive) {
        tiles.value[index].audioReactive = createDefaultTile(index).audioReactive;
      }
      tiles.value[index].audioReactive.enabled = enabled;
      persistSettings();
    }
  }

  // ✨ NEU: Audio-Quelle für Kachel setzen
  function setTileAudioSource(index, source) {
    if (tiles.value[index]?.audioReactive) {
      tiles.value[index].audioReactive.source = source;
      persistSettings();
    }
  }

  // ✨ NEU: Audio-Glättung für Kachel setzen
  function setTileAudioSmoothing(index, smoothing) {
    if (tiles.value[index]?.audioReactive) {
      tiles.value[index].audioReactive.smoothing = Math.max(0, Math.min(100, smoothing));
      persistSettings();
    }
  }

  // ✨ NEU: Audio-Effekt für Kachel aktivieren/deaktivieren
  function setTileAudioEffect(index, effectName, enabled) {
    if (tiles.value[index]?.audioReactive?.effects?.[effectName]) {
      tiles.value[index].audioReactive.effects[effectName].enabled = enabled;
      persistSettings();
    }
  }

  // ✨ NEU: Audio-Effekt-Intensität für Kachel setzen
  function setTileAudioEffectIntensity(index, effectName, intensity) {
    if (tiles.value[index]?.audioReactive?.effects?.[effectName]) {
      tiles.value[index].audioReactive.effects[effectName].intensity = Math.max(0, Math.min(100, intensity));
      persistSettings();
    }
  }

  // ✨ NEU: Alle Audio-Reaktiv-Einstellungen für Kachel auf einmal setzen
  function setTileAudioReactive(index, settings) {
    if (tiles.value[index]) {
      tiles.value[index].audioReactive = {
        ...createDefaultTile(index).audioReactive,
        ...settings,
        effects: {
          ...createDefaultTile(index).audioReactive.effects,
          ...(settings.effects || {})
        }
      };
      persistSettings();
    }
  }

  // Lücke zwischen Kacheln setzen
  function setTileGap(gap) {
    tileGap.value = Math.max(0, Math.min(50, gap));
    persistSettings();
  }

  // Alle Kacheln zurücksetzen
  function resetAllTiles() {
    tiles.value = [];
    initializeTiles();
    selectedTileIndex.value = null;
    persistSettings();
  }

  // Einzelne Kachel zurücksetzen
  function resetTile(index) {
    if (tiles.value[index]) {
      tiles.value[index] = createDefaultTile(index);
      persistSettings();
    }
  }

  // Einstellungen persistieren (ohne Bilder - nur Metadaten)
  function persistSettings() {
    const settingsToSave = {
      tilesEnabled: tilesEnabled.value,
      tileCount: tileCount.value,
      tileGap: tileGap.value,
      tiles: tiles.value.map(tile => ({
        id: tile.id,
        backgroundColor: tile.backgroundColor,
        backgroundOpacity: tile.backgroundOpacity,
        imageSrc: tile.imageSrc,
        imageSettings: { ...tile.imageSettings },
        // ✨ NEU: Audio-Reaktiv-Einstellungen speichern
        audioReactive: tile.audioReactive ? {
          enabled: tile.audioReactive.enabled,
          source: tile.audioReactive.source,
          smoothing: tile.audioReactive.smoothing,
          effects: { ...tile.audioReactive.effects }
        } : null
      }))
    };
    saveSettings(settingsToSave);
  }

  // Bilder aus gespeicherten URLs wiederherstellen
  async function restoreImages() {
    const savedSettings = loadSettings();
    if (!savedSettings?.tiles) return;

    for (let i = 0; i < savedSettings.tiles.length; i++) {
      const savedTile = savedSettings.tiles[i];
      if (savedTile.imageSrc && tiles.value[i]) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = savedTile.imageSrc;
          });
          tiles.value[i].image = img;
          tiles.value[i].imageSrc = savedTile.imageSrc;
          tiles.value[i].imageSettings = { ...savedTile.imageSettings };
        } catch (e) {
          console.warn(`Konnte Bild für Kachel ${i} nicht laden:`, e);
        }
      }
    }
  }

  // CSS-Filter-String für Kachel-Bild generieren
  function getTileImageFilter(index) {
    const tile = tiles.value[index];
    if (!tile || !tile.imageSettings) return '';

    const s = tile.imageSettings;
    const filters = [];

    if (s.brightness !== 100) filters.push(`brightness(${s.brightness}%)`);
    if (s.contrast !== 100) filters.push(`contrast(${s.contrast}%)`);
    if (s.saturation !== 100) filters.push(`saturate(${s.saturation}%)`);
    if (s.blur > 0) filters.push(`blur(${s.blur}px)`);
    if (s.hueRotate !== 0) filters.push(`hue-rotate(${s.hueRotate}deg)`);
    if (s.grayscale > 0) filters.push(`grayscale(${s.grayscale}%)`);
    if (s.sepia > 0) filters.push(`sepia(${s.sepia}%)`);

    return filters.join(' ');
  }

  // Initialisierung
  if (savedSettings?.tiles) {
    // Gespeicherte Kacheln wiederherstellen
    tiles.value = savedSettings.tiles.map((savedTile, i) => ({
      ...createDefaultTile(i),
      ...savedTile,
      image: null // Bilder müssen separat geladen werden
    }));
    // Bilder asynchron laden
    restoreImages();
  } else if (tilesEnabled.value) {
    initializeTiles();
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
    setTileAudioReactive
  };
});
