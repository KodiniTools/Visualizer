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
            :class="{ selected: tilesStore.selectedTileIndex === index }"
            :style="getTileStyle(tile)"
            @click="selectTile(index)"
          >
            <span class="tile-number">{{ index + 1 }}</span>
            <span v-if="tile.image" class="tile-has-image">Bild</span>
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

        <!-- Kachel zurücksetzen -->
        <button class="btn-reset" @click="resetTile">
          Kachel zurücksetzen
        </button>
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
import { ref, computed, inject } from 'vue';
import { useBackgroundTilesStore } from '../stores/backgroundTilesStore';

const tilesStore = useBackgroundTilesStore();
const canvasManager = inject('canvasManager');

const fileInput = ref(null);

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
</style>
