<template>
  <div class="tiles-section">
    <h5>Kachel-Hintergrund</h5>

    <!-- Aktivierung -->
    <div class="control-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="tilesStore.tilesEnabled"
          @change="toggleTiles"
        />
        <span>Kachel-Modus aktivieren</span>
      </label>
    </div>

    <div v-if="tilesStore.tilesEnabled" class="tiles-controls">
      <!-- Kachelanzahl -->
      <div class="control-group">
        <label>Anzahl Kacheln:</label>
        <div class="tile-count-buttons">
          <button
            v-for="count in [3, 6, 9, 12]"
            :key="count"
            :class="{ active: tilesStore.tileCount === count }"
            @click="setTileCount(count)"
          >
            {{ count }}
          </button>
        </div>
      </div>

      <!-- Lücke zwischen Kacheln -->
      <div class="control-group">
        <label>Abstand: {{ tilesStore.tileGap }}px</label>
        <input
          type="range"
          :value="tilesStore.tileGap"
          @input="setTileGap($event.target.value)"
          min="0"
          max="30"
          step="1"
          class="gap-slider"
        />
      </div>

      <!-- Kachel-Vorschau/Auswahl -->
      <div class="control-group">
        <label>Kachel auswählen:</label>
        <div
          class="tiles-preview"
          :style="gridStyle"
        >
          <div
            v-for="(tile, index) in tilesStore.tiles"
            :key="tile.id"
            class="tile-preview"
            :class="{ selected: tilesStore.selectedTileIndex === index, 'has-audio': tile.audioReactive?.enabled }"
            :style="getTileStyle(tile)"
            @click="selectTile(index)"
          >
            <span class="tile-number">{{ index + 1 }}</span>
            <span v-if="tile.image" class="tile-has-image">Bild</span>
            <span v-if="tile.audioReactive?.enabled" class="tile-has-audio" title="Audio-Reaktiv">♪</span>
          </div>
        </div>
      </div>

      <!-- Bearbeitung der ausgewählten Kachel -->
      <div v-if="tilesStore.selectedTile" class="selected-tile-editor">
        <div class="editor-header">
          <h6>Kachel {{ tilesStore.selectedTileIndex + 1 }} bearbeiten</h6>
          <button class="btn-close" @click="deselectTile">×</button>
        </div>

        <!-- Hintergrundfarbe -->
        <div class="control-group">
          <label>Hintergrundfarbe:</label>
          <div class="color-picker-group">
            <input
              type="color"
              :value="tilesStore.selectedTile.backgroundColor"
              @input="setTileColor($event.target.value)"
              class="color-input"
            />
            <span class="color-hex">{{ tilesStore.selectedTile.backgroundColor }}</span>
          </div>
        </div>

        <!-- Hintergrund Deckkraft -->
        <div class="control-group">
          <label>Deckkraft: {{ Math.round(tilesStore.selectedTile.backgroundOpacity * 100) }}%</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.backgroundOpacity"
            @input="setTileOpacity($event.target.value)"
            min="0"
            max="1"
            step="0.05"
            class="opacity-slider"
          />
        </div>

        <!-- Bild-Bereich -->
        <div class="image-section">
          <label>Kachel-Bild:</label>

          <div v-if="!tilesStore.selectedTile.image" class="image-upload-area">
            <input
              type="file"
              accept="image/*"
              @change="handleImageUpload"
              ref="fileInput"
              style="display: none"
            />
            <button class="btn-upload" @click="$refs.fileInput.click()">
              Bild hochladen
            </button>
            <p class="hint">oder per Drag & Drop</p>
          </div>

          <div v-else class="image-controls">
            <div class="image-preview">
              <img :src="tilesStore.selectedTile.imageSrc" alt="Kachel-Bild" />
            </div>

            <!-- Bild-Filter -->
            <div class="filter-controls">
              <div class="filter-row">
                <label>Helligkeit</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.brightness"
                  @input="updateImageSetting('brightness', $event.target.value)"
                  min="0"
                  max="200"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.brightness }}%</span>
              </div>

              <div class="filter-row">
                <label>Kontrast</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.contrast"
                  @input="updateImageSetting('contrast', $event.target.value)"
                  min="0"
                  max="200"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.contrast }}%</span>
              </div>

              <div class="filter-row">
                <label>Sättigung</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.saturation"
                  @input="updateImageSetting('saturation', $event.target.value)"
                  min="0"
                  max="200"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.saturation }}%</span>
              </div>

              <div class="filter-row">
                <label>Deckkraft</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.opacity"
                  @input="updateImageSetting('opacity', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.opacity }}%</span>
              </div>

              <div class="filter-row">
                <label>Weichzeichnen</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.blur"
                  @input="updateImageSetting('blur', $event.target.value)"
                  min="0"
                  max="20"
                  step="1"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.blur }}px</span>
              </div>

              <div class="filter-row">
                <label>Farbton</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.hueRotate"
                  @input="updateImageSetting('hueRotate', $event.target.value)"
                  min="0"
                  max="360"
                  step="10"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.hueRotate }}°</span>
              </div>

              <div class="filter-row">
                <label>Graustufen</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.grayscale"
                  @input="updateImageSetting('grayscale', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.grayscale }}%</span>
              </div>

              <div class="filter-row">
                <label>Sepia</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.sepia"
                  @input="updateImageSetting('sepia', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.sepia }}%</span>
              </div>

              <div class="filter-row">
                <label>Skalierung</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.scale"
                  @input="updateImageSetting('scale', $event.target.value)"
                  min="0.5"
                  max="2"
                  step="0.1"
                />
                <span>{{ Math.round(tilesStore.selectedTile.imageSettings.scale * 100) }}%</span>
              </div>

              <div class="filter-row">
                <label>Verschieben X</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.offsetX"
                  @input="updateImageSetting('offsetX', $event.target.value)"
                  min="-200"
                  max="200"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.offsetX }}px</span>
              </div>

              <div class="filter-row">
                <label>Verschieben Y</label>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.imageSettings.offsetY"
                  @input="updateImageSetting('offsetY', $event.target.value)"
                  min="-200"
                  max="200"
                  step="5"
                />
                <span>{{ tilesStore.selectedTile.imageSettings.offsetY }}px</span>
              </div>
            </div>

            <button class="btn-remove" @click="removeImage">
              Bild entfernen
            </button>
          </div>
        </div>

        <!-- Audio-Reaktiv Sektion -->
        <div class="audio-section">
          <div class="audio-header">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="tilesStore.selectedTile.audioReactive?.enabled"
                @change="toggleAudioReactive($event.target.checked)"
              />
              <span>Audio-Reaktiv</span>
            </label>
          </div>

          <div v-if="tilesStore.selectedTile.audioReactive?.enabled" class="audio-controls">
            <!-- Audio-Quelle -->
            <div class="control-group">
              <label>Reagiert auf:</label>
              <select
                :value="tilesStore.selectedTile.audioReactive.source"
                @change="setAudioSource($event.target.value)"
                class="audio-select"
              >
                <option value="bass">Bass (Kick/Sub)</option>
                <option value="mid">Mitten (Vocals)</option>
                <option value="treble">Höhen (Hi-Hats)</option>
                <option value="volume">Lautstärke (Gesamt)</option>
                <option value="dynamic">Dynamisch (Auto-Blend)</option>
              </select>
            </div>

            <!-- Glättung -->
            <div class="control-group">
              <label>Glättung: {{ tilesStore.selectedTile.audioReactive.smoothing }}%</label>
              <input
                type="range"
                :value="tilesStore.selectedTile.audioReactive.smoothing"
                @input="setAudioSmoothing($event.target.value)"
                min="0"
                max="100"
                step="5"
                class="audio-slider"
              />
            </div>

            <!-- Effekte -->
            <div class="effects-list">
              <!-- Hue (Farbton) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.hue.enabled"
                  @change="toggleEffect('hue', $event.target.checked)"
                />
                <span>Farbton</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.hue.intensity"
                  @input="setEffectIntensity('hue', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.hue.intensity }}%</span>
              </label>

              <!-- Brightness (Helligkeit) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.brightness.enabled"
                  @change="toggleEffect('brightness', $event.target.checked)"
                />
                <span>Helligkeit</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.brightness.intensity"
                  @input="setEffectIntensity('brightness', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.brightness.intensity }}%</span>
              </label>

              <!-- Saturation (Sättigung) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.saturation.enabled"
                  @change="toggleEffect('saturation', $event.target.checked)"
                />
                <span>Sättigung</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.saturation.intensity"
                  @input="setEffectIntensity('saturation', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.saturation.intensity }}%</span>
              </label>

              <!-- Glow (Leuchten) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.glow.enabled"
                  @change="toggleEffect('glow', $event.target.checked)"
                />
                <span>Leuchten</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.glow.intensity"
                  @input="setEffectIntensity('glow', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.glow.intensity }}%</span>
              </label>

              <!-- Scale (Skalierung) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.scale.enabled"
                  @change="toggleEffect('scale', $event.target.checked)"
                />
                <span>Pulsieren</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.scale.intensity"
                  @input="setEffectIntensity('scale', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.scale.intensity }}%</span>
              </label>

              <!-- Blur (Weichzeichnen) -->
              <label class="effect-item">
                <input
                  type="checkbox"
                  :checked="tilesStore.selectedTile.audioReactive.effects.blur.enabled"
                  @change="toggleEffect('blur', $event.target.checked)"
                />
                <span>Weichzeichnen</span>
                <input
                  type="range"
                  :value="tilesStore.selectedTile.audioReactive.effects.blur.intensity"
                  @input="setEffectIntensity('blur', $event.target.value)"
                  min="0"
                  max="100"
                  step="5"
                  class="effect-slider"
                />
                <span class="effect-value">{{ tilesStore.selectedTile.audioReactive.effects.blur.intensity }}%</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Kachel zurücksetzen -->
        <button class="btn-reset" @click="resetTile">
          Kachel zurücksetzen
        </button>
      </div>

      <!-- ✨ NEU: Kachel-Presets -->
      <div class="control-group presets-section">
        <label>💾 Kachel-Presets:</label>
        <button @click="saveTilePreset" class="btn-save-preset">
          Aktuelle Einstellungen speichern
        </button>

        <div v-if="tilePresets.length > 0" class="presets-list">
          <div
            v-for="preset in tilePresets"
            :key="preset.id"
            class="preset-item"
          >
            <span class="preset-name">{{ preset.name }}</span>
            <div class="preset-actions">
              <button @click="loadTilePreset(preset)" class="btn-small btn-load" title="Laden">
                📥
              </button>
              <button @click="deleteTilePreset(preset.id)" class="btn-small btn-delete" title="Löschen">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div v-else class="hint-text">Keine Kachel-Presets gespeichert</div>
      </div>

      <!-- Alle Kacheln zurücksetzen -->
      <div class="control-group reset-all">
        <button class="btn-reset-all" @click="resetAllTiles">
          Alle Kacheln zurücksetzen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { useBackgroundTilesStore } from '../stores/backgroundTilesStore';

const tilesStore = useBackgroundTilesStore();
const canvasManager = inject('canvasManager');

const fileInput = ref(null);

// ✨ NEU: Kachel-Presets
const TILE_PRESETS_KEY = 'visualizer-tile-presets';
const tilePresets = ref([]);

// Presets aus localStorage laden
function loadTilePresets() {
  try {
    const stored = localStorage.getItem(TILE_PRESETS_KEY);
    if (stored) {
      tilePresets.value = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Kachel-Presets:', e);
  }
}

// Presets in localStorage speichern
function persistTilePresets() {
  try {
    localStorage.setItem(TILE_PRESETS_KEY, JSON.stringify(tilePresets.value));
  } catch (e) {
    console.warn('Fehler beim Speichern der Kachel-Presets:', e);
  }
}

// Aktuellen Zustand als Preset speichern
function saveTilePreset() {
  const presetNumber = tilePresets.value.length + 1;
  const newPreset = {
    id: Date.now(),
    name: `Kachel-Preset ${presetNumber}`,
    tileCount: tilesStore.tileCount,
    tileGap: tilesStore.tileGap,
    // ✅ Deep Clone der Tile-Einstellungen (ohne Bilder)
    tiles: tilesStore.tiles.map(tile => ({
      backgroundColor: tile.backgroundColor,
      backgroundOpacity: tile.backgroundOpacity,
      // Deep Clone für audioReactive (enthält verschachtelte effects)
      audioReactive: tile.audioReactive
        ? JSON.parse(JSON.stringify(tile.audioReactive))
        : null
    }))
  };

  tilePresets.value.push(newPreset);
  persistTilePresets();
  console.log('✅ Kachel-Preset gespeichert:', newPreset);
}

// Preset laden
function loadTilePreset(preset) {
  console.log('📥 Lade Kachel-Preset:', preset);

  try {
    // ✅ Sicherstellen dass Kacheln aktiviert sind
    if (!tilesStore.tilesEnabled) {
      tilesStore.setTilesEnabled(true);
    }

    // Kachelanzahl setzen (initialisiert auch die Kacheln neu)
    tilesStore.setTileCount(preset.tileCount);
    console.log('  → Kachelanzahl gesetzt:', preset.tileCount);

    // Abstand setzen
    tilesStore.setTileGap(preset.tileGap);
    console.log('  → Abstand gesetzt:', preset.tileGap);

    // Kachel-Einstellungen übernehmen
    if (preset.tiles && Array.isArray(preset.tiles)) {
      console.log('  → Anzahl Preset-Tiles:', preset.tiles.length);
      console.log('  → Anzahl Store-Tiles:', tilesStore.tiles.length);

      preset.tiles.forEach((presetTile, index) => {
        if (index < tilesStore.tiles.length && presetTile) {
          // Hintergrundfarbe setzen
          if (presetTile.backgroundColor) {
            tilesStore.setTileBackgroundColor(index, presetTile.backgroundColor);
          }

          // Deckkraft setzen
          if (presetTile.backgroundOpacity !== undefined) {
            tilesStore.setTileBackgroundOpacity(index, presetTile.backgroundOpacity);
          }

          // Audio-reaktive Einstellungen (mit Deep Clone)
          if (presetTile.audioReactive) {
            const audioSettings = JSON.parse(JSON.stringify(presetTile.audioReactive));
            tilesStore.setTileAudioReactive(index, audioSettings);
          }

          console.log(`  → Kachel ${index + 1}: ${presetTile.backgroundColor}`);
        }
      });
    }

    console.log('✅ Kachel-Preset erfolgreich geladen:', preset.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden des Presets:', error);
  }
}

// Preset löschen
function deleteTilePreset(presetId) {
  tilePresets.value = tilePresets.value.filter(p => p.id !== presetId);
  persistTilePresets();
  console.log('🗑️ Kachel-Preset gelöscht');
}

// Beim Mounting Presets laden
onMounted(() => {
  loadTilePresets();
});

// Grid-Style für Vorschau basierend auf Kachel-Layout
const gridStyle = computed(() => {
  const { rows, cols } = tilesStore.gridLayout;
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: `${Math.min(tilesStore.tileGap, 4)}px`
  };
});

// Style für einzelne Kachel in der Vorschau
function getTileStyle(tile) {
  const style = {
    backgroundColor: tile.backgroundColor,
    opacity: tile.backgroundOpacity
  };

  if (tile.imageSrc) {
    style.backgroundImage = `url(${tile.imageSrc})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return style;
}

// Kachel-Modus aktivieren/deaktivieren
function toggleTiles(event) {
  tilesStore.setTilesEnabled(event.target.checked);
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// Kachelanzahl ändern
function setTileCount(count) {
  tilesStore.setTileCount(count);
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// Lücke zwischen Kacheln setzen
function setTileGap(value) {
  tilesStore.setTileGap(parseInt(value));
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// Kachel auswählen
function selectTile(index) {
  tilesStore.selectTile(index);
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// Kachel-Auswahl aufheben
function deselectTile() {
  tilesStore.selectTile(-1);
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// Kachel-Farbe setzen
function setTileColor(color) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileBackgroundColor(tilesStore.selectedTileIndex, color);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

// Kachel-Deckkraft setzen
function setTileOpacity(value) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileBackgroundOpacity(tilesStore.selectedTileIndex, parseFloat(value));
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

// Bild hochladen
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (tilesStore.selectedTileIndex !== null) {
        tilesStore.setTileImage(tilesStore.selectedTileIndex, img, e.target.result);
        if (canvasManager.value) {
          canvasManager.value.redrawCallback();
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Input zurücksetzen für erneutes Hochladen
  event.target.value = '';
}

// Bild-Einstellung aktualisieren
function updateImageSetting(setting, value) {
  if (tilesStore.selectedTileIndex !== null) {
    const numValue = setting === 'scale' ? parseFloat(value) : parseInt(value);
    tilesStore.updateTileImageSetting(tilesStore.selectedTileIndex, setting, numValue);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

// Bild entfernen
function removeImage() {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.removeTileImage(tilesStore.selectedTileIndex);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

// Einzelne Kachel zurücksetzen
function resetTile() {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.resetTile(tilesStore.selectedTileIndex);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

// Alle Kacheln zurücksetzen
function resetAllTiles() {
  tilesStore.resetAllTiles();
  if (canvasManager.value) {
    canvasManager.value.redrawCallback();
  }
}

// ✨ NEU: Audio-Reaktiv Funktionen
function toggleAudioReactive(enabled) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileAudioReactiveEnabled(tilesStore.selectedTileIndex, enabled);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

function setAudioSource(source) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileAudioSource(tilesStore.selectedTileIndex, source);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

function setAudioSmoothing(value) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileAudioSmoothing(tilesStore.selectedTileIndex, parseInt(value));
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

function toggleEffect(effectName, enabled) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileAudioEffect(tilesStore.selectedTileIndex, effectName, enabled);
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}

function setEffectIntensity(effectName, value) {
  if (tilesStore.selectedTileIndex !== null) {
    tilesStore.setTileAudioEffectIntensity(tilesStore.selectedTileIndex, effectName, parseInt(value));
    if (canvasManager.value) {
      canvasManager.value.redrawCallback();
    }
  }
}
</script>

<style scoped>
.tiles-section {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
}

.tiles-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #4ade80;
}

.tiles-section h6 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #4ade80;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  color: #bbb;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
}

.tiles-controls {
  margin-top: 12px;
}

/* Kachelanzahl-Buttons */
.tile-count-buttons {
  display: flex;
  gap: 6px;
}

.tile-count-buttons button {
  flex: 1;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tile-count-buttons button:hover {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.5);
}

.tile-count-buttons button.active {
  background: rgba(74, 222, 128, 0.3);
  border-color: #4ade80;
  color: #4ade80;
}

/* Gap Slider */
.gap-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #4ade80 0%, #10b981 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.gap-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

/* Kachel-Vorschau Grid */
.tiles-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px;
  min-height: 80px;
}

.tile-preview {
  aspect-ratio: 16/9;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.tile-preview:hover {
  border-color: rgba(74, 222, 128, 0.5);
  transform: scale(1.02);
}

.tile-preview.selected {
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
}

.tile-number {
  font-size: 12px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.tile-has-image {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: 2px;
  margin-top: 2px;
}

.tile-has-audio {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.4);
  padding: 1px 3px;
  border-radius: 2px;
  animation: pulse-audio 1.5s ease-in-out infinite;
}

.tile-preview.has-audio {
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
}

@keyframes pulse-audio {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Ausgewählte Kachel Editor */
.selected-tile-editor {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.2);
}

.btn-close {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-close:hover {
  color: #fff;
}

/* Farbauswahl */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 40px;
  height: 30px;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  background-color: #2a2a2a;
}

.color-hex {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

/* Opacity Slider */
.opacity-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, rgba(74, 222, 128, 0.2) 0%, rgba(74, 222, 128, 1) 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

/* Bild-Bereich */
.image-section {
  margin: 12px 0;
  padding-top: 12px;
  border-top: 1px solid rgba(74, 222, 128, 0.2);
}

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px dashed rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  margin-top: 8px;
}

.btn-upload {
  padding: 8px 16px;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.5);
  border-radius: 6px;
  color: #4ade80;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload:hover {
  background: rgba(74, 222, 128, 0.3);
}

.hint {
  font-size: 10px;
  color: #888;
  margin-top: 8px;
}

.image-controls {
  margin-top: 8px;
}

.image-preview {
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Filter-Steuerungen */
.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.filter-row {
  display: grid;
  grid-template-columns: 80px 1fr 45px;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}

.filter-row label {
  color: #aaa;
  margin: 0;
}

.filter-row input[type="range"] {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(74, 222, 128, 0.3);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.filter-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  cursor: pointer;
}

.filter-row span {
  color: #888;
  text-align: right;
  font-family: monospace;
}

/* Buttons */
.btn-remove {
  width: 100%;
  padding: 6px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  color: #ef4444;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-reset {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: rgba(251, 146, 60, 0.2);
  border: 1px solid rgba(251, 146, 60, 0.4);
  border-radius: 4px;
  color: #fb923c;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: rgba(251, 146, 60, 0.3);
}

.reset-all {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(74, 222, 128, 0.2);
}

.btn-reset-all {
  width: 100%;
  padding: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  color: #f87171;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset-all:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Audio-Reaktiv Sektion */
.audio-section {
  margin: 12px 0;
  padding: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
}

.audio-header {
  margin-bottom: 10px;
}

.audio-header .checkbox-label span {
  font-size: 12px;
  font-weight: 600;
  color: #a78bfa;
}

.audio-controls {
  margin-top: 10px;
}

.audio-select {
  width: 100%;
  padding: 6px 10px;
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 11px;
  cursor: pointer;
}

.audio-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.audio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effects-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  display: grid;
  grid-template-columns: auto 70px 1fr 35px;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(30, 30, 50, 0.6);
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
}

.effect-item input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: #8b5cf6;
}

.effect-item span {
  color: #ccc;
}

.effect-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effect-value {
  font-size: 9px;
  color: #94a3b8;
  text-align: right;
  font-family: monospace;
}

/* ✨ Preset Styles */
.presets-section {
  margin-top: 16px;
  padding: 12px;
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid #444;
  border-radius: 8px;
}

.presets-section > label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.btn-save-preset {
  width: 100%;
  padding: 8px 12px;
  background: linear-gradient(135deg, #6ea8fe 0%, #8b5cf6 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save-preset:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.3);
}

.presets-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid #555;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.preset-item:hover {
  border-color: #6ea8fe;
}

.preset-name {
  font-size: 11px;
  color: #e0e0e0;
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 3px 6px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-load {
  background: rgba(110, 168, 254, 0.2);
}

.btn-load:hover {
  background: rgba(110, 168, 254, 0.4);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.2);
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.4);
}

.hint-text {
  font-size: 10px;
  color: #666;
  text-align: center;
  margin-top: 8px;
}
</style>
