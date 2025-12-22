<template>
  <div class="panel">
    <div class="panel-header" @click="isExpanded = !isExpanded">
      <h3>{{ t('canvasControl.title') }}</h3>
      <span class="chevron" :class="{ open: isExpanded }">▼</span>
    </div>

    <div class="panel-content" v-show="isExpanded">
      <!-- Hintergrundfarbe -->
      <div class="panel-section">
        <h4>{{ t('canvasControl.backgroundColor') }}</h4>

        <div class="control-group">
          <label>{{ t('canvasControl.selectColor') }}:</label>
          <div class="color-picker-group">
            <input 
              type="color" 
              v-model="backgroundColor"
              @input="updateFromColorPicker"
              class="color-input"
            />
            <input 
              type="text" 
              v-model="colorDisplay"
              @input="updateFromTextInput"
              @blur="formatColorDisplay"
              class="color-text-input"
              placeholder="rgba(0, 0, 0, 1)"
            />
          </div>
        </div>

        <!-- NEU: Hintergrund Deckkraft Slider -->
        <div class="control-group">
          <label>
            {{ t('canvasControl.backgroundOpacity') }}: {{ Math.round(backgroundOpacity * 100) }}%
          </label>
          <input
            type="range"
            v-model.number="backgroundOpacity"
            @input="updateFromOpacitySlider"
            min="0"
            max="1"
            step="0.01"
            class="opacity-slider"
          />
        </div>

        <!-- ✨ NEU: Gradient-Einstellungen -->
        <div class="gradient-section">
          <h5>🌈 {{ t('canvasControl.gradient') }}</h5>

          <div class="control-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="gradientEnabled"
                @change="updateGradientSettings"
              />
              <span>{{ t('canvasControl.enableGradient') }}</span>
            </label>
          </div>

          <div v-if="gradientEnabled" class="gradient-controls">
            <div class="control-group">
              <label>{{ t('canvasControl.secondColor') }}:</label>
              <div class="color-picker-group">
                <input
                  type="color"
                  v-model="gradientColor2"
                  @input="updateGradientSettings"
                  class="color-input"
                />
                <span class="color-hex">{{ gradientColor2 }}</span>
              </div>
            </div>

            <div class="control-group">
              <label>{{ t('canvasControl.type') }}:</label>
              <select v-model="gradientType" @change="updateGradientSettings" class="gradient-select">
                <option value="radial">🔵 {{ t('canvasControl.radial') }}</option>
                <option value="linear">📐 {{ t('canvasControl.linear') }}</option>
              </select>
            </div>

            <div v-if="gradientType === 'linear'" class="control-group">
              <label>{{ t('canvasControl.angle') }}: {{ gradientAngle }}°</label>
              <input
                type="range"
                v-model.number="gradientAngle"
                @input="updateGradientSettings"
                min="0"
                max="360"
                step="5"
                class="angle-slider"
              />
            </div>
          </div>
        </div>

        <!-- ✨ NEU: Audio-Reaktiv für Hintergrundfarbe -->
        <div class="audio-reactive-section">
          <h5>🎵 {{ t('canvasControl.audioReactive') }}</h5>

          <div class="control-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="bgAudioEnabled"
                @change="updateBgAudioReactive"
              />
              <span>{{ t('common.enabled') }}</span>
            </label>
          </div>

          <div v-if="bgAudioEnabled" class="audio-controls">
            <div class="control-group">
              <label>{{ t('canvasControl.reactsTo') }}:</label>
              <select v-model="bgAudioSource" @change="updateBgAudioReactive" class="audio-select">
                <option value="bass">{{ t('canvasControl.bass') }}</option>
                <option value="mid">{{ t('canvasControl.mid') }}</option>
                <option value="treble">{{ t('canvasControl.trebleHiHats') }}</option>
                <option value="volume">{{ t('canvasControl.volumeTotal') }}</option>
                <option value="dynamic">✨ {{ t('canvasControl.dynamic') }}</option>
              </select>
            </div>

            <div class="control-group">
              <label>{{ t('canvasControl.smoothing') }}: {{ bgAudioSmoothing }}%</label>
              <input
                type="range"
                v-model.number="bgAudioSmoothing"
                @input="updateBgAudioReactive"
                min="0"
                max="100"
                step="5"
                class="audio-slider"
              />
            </div>

            <div class="effects-list">
              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectHue" @change="updateBgAudioReactive" />
                <span>🎨 {{ t('canvasControl.hue') }}</span>
                <input type="range" v-model.number="bgEffectHueIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectHueIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectBrightness" @change="updateBgAudioReactive" />
                <span>☀️ {{ t('canvasControl.brightness') }}</span>
                <input type="range" v-model.number="bgEffectBrightnessIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectBrightnessIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectSaturation" @change="updateBgAudioReactive" />
                <span>🌈 {{ t('canvasControl.saturation') }}</span>
                <input type="range" v-model.number="bgEffectSaturationIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectSaturationIntensity }}%</span>
              </label>

              <label class="effect-item">
                <input type="checkbox" v-model="bgEffectGlow" @change="updateBgAudioReactive" />
                <span>✨ {{ t('canvasControl.glow') }}</span>
                <input type="range" v-model.number="bgEffectGlowIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                <span class="effect-value">{{ bgEffectGlowIntensity }}%</span>
              </label>

              <!-- Gradient-Effekte (nur wenn Gradient aktiviert) -->
              <template v-if="gradientEnabled">
                <label class="effect-item">
                  <input type="checkbox" v-model="bgEffectGradientPulse" @change="updateBgAudioReactive" />
                  <span>💫 {{ t('canvasControl.gradientPulse') }}</span>
                  <input type="range" v-model.number="bgEffectGradientPulseIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                  <span class="effect-value">{{ bgEffectGradientPulseIntensity }}%</span>
                </label>

                <label class="effect-item">
                  <input type="checkbox" v-model="bgEffectGradientRotation" @change="updateBgAudioReactive" />
                  <span>🔄 {{ t('canvasControl.gradientRotation') }}</span>
                  <input type="range" v-model.number="bgEffectGradientRotationIntensity" @input="updateBgAudioReactive" min="0" max="100" step="5" class="effect-slider" />
                  <span class="effect-value">{{ bgEffectGradientRotationIntensity }}%</span>
                </label>
              </template>
            </div>
          </div>
        </div>

        <!-- Kachel-Hintergrund Panel -->
        <BackgroundTilesPanel />
      </div>

      <!-- Undo/Redo Sektion -->
      <div v-if="canUndo" class="panel-section undo-section">
        <button @click="undoLastChange" class="btn-undo full-width">
          {{ t('canvasControl.undo') }}
        </button>
        <div class="hint-text" style="text-align: center; margin-top: 6px;">
          {{ undoHistory.length }} {{ t('canvasControl.inHistory') }}
        </div>
      </div>

      <div class="divider"></div>

      <!-- ✨ NEU: Presets speichern/laden -->
      <div class="panel-section">
        <h4>🎨 {{ t('canvasControl.presets') }}</h4>

        <div class="control-group">
          <button @click="saveCurrentAsPreset" class="btn-primary full-width">
            {{ t('canvasControl.saveAsPreset') }}
          </button>
        </div>

        <div v-if="savedPresets.length > 0" class="presets-list">
          <label>{{ t('canvasControl.savedPresets') }}:</label>
          <div
            v-for="preset in savedPresets"
            :key="preset.id"
            class="preset-item"
          >
            <div class="preset-info">
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-preview" :style="{ backgroundColor: preset.backgroundColor }"></span>
            </div>
            <div class="preset-actions">
              <button @click="loadPreset(preset)" class="btn-small btn-load" :title="t('canvasControl.load')">
                📥
              </button>
              <button @click="deletePreset(preset.id)" class="btn-small btn-delete" :title="t('common.delete')">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div v-else class="hint-text" style="text-align: center; margin-top: 8px;">
          {{ t('canvasControl.noPresets') }}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Hintergrund zurücksetzen -->
      <div class="panel-section">
        <h4>{{ t('canvasControl.resetBackground') }}</h4>
        <p class="info-text">
          {{ t('canvasControl.resetsToWhite') }}
        </p>
        <button @click="resetBackground" class="btn-secondary full-width">
          {{ t('common.reset') }}
        </button>
      </div>

      <div class="divider"></div>

      <!-- Canvas komplett zurücksetzen -->
      <div class="panel-section">
        <h4>{{ t('canvasControl.clearCanvas') }}</h4>
        <p class="info-text warning">
          ⚠️ {{ t('canvasControl.removesAll') }}
        </p>
        <button
          @click="showResetConfirm = true"
          class="btn-danger full-width"
          :disabled="isCanvasEmpty"
        >
          {{ t('canvasControl.deleteAll') }}
        </button>
        <div v-if="isCanvasEmpty" class="hint-text" style="margin-top: 8px; text-align: center;">
          {{ t('canvasControl.canvasEmpty') }}
        </div>
      </div>
    </div>

    <!-- Bestätigungs-Dialog für Canvas-Reset -->
    <div v-if="showResetConfirm" class="confirm-overlay" @click="showResetConfirm = false">
      <div class="confirm-dialog" @click.stop>
        <h4>{{ t('canvasControl.confirmClear') }}</h4>
        <p>
          {{ t('canvasControl.confirmClearText') }}
        </p>
        <div class="confirm-actions">
          <button @click="confirmReset" class="btn-danger">
            {{ t('common.delete') }}
          </button>
          <button @click="showResetConfirm = false" class="btn-secondary">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, watch, nextTick } from 'vue';
import { useI18n } from '../lib/i18n.js';
import BackgroundTilesPanel from './BackgroundTilesPanel.vue';

const { t } = useI18n();
const canvasManager = inject('canvasManager');
const backgroundColor = ref('#ffffff'); // Hex-Farbe ohne Alpha (Standard: Weiß)
const backgroundOpacity = ref(1.0); // Deckkraft State (0.0 bis 1.0)
const colorDisplay = ref('rgba(255, 255, 255, 1)'); // Angezeigter Farbwert im Textfeld
const showResetConfirm = ref(false);

// ✨ Panel Ein-/Ausklappen
const isExpanded = ref(true);

// ✨ Undo-System
const undoHistory = ref([]);
const MAX_HISTORY = 10;

// ✨ NEU: Audio-Reaktiv für Hintergrundfarbe
const bgAudioEnabled = ref(false);
const bgAudioSource = ref('bass');
const bgAudioSmoothing = ref(50);
const bgEffectHue = ref(false);
const bgEffectHueIntensity = ref(80);
const bgEffectBrightness = ref(false);
const bgEffectBrightnessIntensity = ref(80);
const bgEffectSaturation = ref(false);
const bgEffectSaturationIntensity = ref(80);
const bgEffectGlow = ref(false);
const bgEffectGlowIntensity = ref(80);
const bgEffectGradientPulse = ref(false);
const bgEffectGradientPulseIntensity = ref(80);
const bgEffectGradientRotation = ref(false);
const bgEffectGradientRotationIntensity = ref(80);

// ✨ NEU: Gradient-Einstellungen
const gradientEnabled = ref(false);
const gradientColor2 = ref('#0066ff');
const gradientType = ref('radial');
const gradientAngle = ref(45);

// ✨ NEU: Presets für Hintergrund-Einstellungen
const PRESETS_STORAGE_KEY = 'visualizer-canvas-presets';
const savedPresets = ref([]);

// Presets aus localStorage laden
function loadPresets() {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      savedPresets.value = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Presets:', e);
  }
}

// Presets in localStorage speichern
function persistPresets() {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets.value));
  } catch (e) {
    console.warn('Fehler beim Speichern der Presets:', e);
  }
}

// Aktuellen Zustand als Preset speichern
function saveCurrentAsPreset() {
  // Debug: Aktuelle Werte anzeigen
  console.log('🔍 Aktuelle Werte vor dem Speichern:');
  console.log('  - gradientEnabled:', gradientEnabled.value);
  console.log('  - backgroundColor:', backgroundColor.value);
  console.log('  - bgAudioEnabled:', bgAudioEnabled.value);

  const presetNumber = savedPresets.value.length + 1;
  const newPreset = {
    id: Date.now(),
    name: `Preset ${presetNumber}`,
    backgroundColor: backgroundColor.value,
    backgroundOpacity: backgroundOpacity.value,
    // ✅ Explizit Boolean verwenden
    gradientEnabled: Boolean(gradientEnabled.value),
    gradientColor2: gradientColor2.value,
    gradientType: gradientType.value,
    gradientAngle: gradientAngle.value,
    // Audio-reaktive Einstellungen
    bgAudioEnabled: Boolean(bgAudioEnabled.value),
    bgAudioSource: bgAudioSource.value,
    bgAudioSmoothing: bgAudioSmoothing.value,
    bgEffects: {
      hue: { enabled: Boolean(bgEffectHue.value), intensity: bgEffectHueIntensity.value },
      brightness: { enabled: Boolean(bgEffectBrightness.value), intensity: bgEffectBrightnessIntensity.value },
      saturation: { enabled: Boolean(bgEffectSaturation.value), intensity: bgEffectSaturationIntensity.value },
      glow: { enabled: Boolean(bgEffectGlow.value), intensity: bgEffectGlowIntensity.value },
      gradientPulse: { enabled: Boolean(bgEffectGradientPulse.value), intensity: bgEffectGradientPulseIntensity.value },
      gradientRotation: { enabled: Boolean(bgEffectGradientRotation.value), intensity: bgEffectGradientRotationIntensity.value }
    }
  };

  savedPresets.value.push(newPreset);
  persistPresets();
  console.log('✅ Canvas-Preset gespeichert:', newPreset);
}

// Preset laden
function loadPreset(preset) {
  console.log('📥 Lade Canvas-Preset:', preset);

  try {
    // Grundfarbe
    backgroundColor.value = preset.backgroundColor;
    backgroundOpacity.value = preset.backgroundOpacity;
    console.log('  → Farbe:', preset.backgroundColor, 'Deckkraft:', preset.backgroundOpacity);

    // Gradient
    gradientEnabled.value = preset.gradientEnabled || false;
    gradientColor2.value = preset.gradientColor2 || '#0066ff';
    gradientType.value = preset.gradientType || 'radial';
    gradientAngle.value = preset.gradientAngle || 45;

    // Audio-reaktiv
    bgAudioEnabled.value = preset.bgAudioEnabled || false;
    bgAudioSource.value = preset.bgAudioSource || 'bass';
    bgAudioSmoothing.value = preset.bgAudioSmoothing || 50;

    if (preset.bgEffects) {
      bgEffectHue.value = preset.bgEffects.hue?.enabled || false;
      bgEffectHueIntensity.value = preset.bgEffects.hue?.intensity || 80;
      bgEffectBrightness.value = preset.bgEffects.brightness?.enabled || false;
      bgEffectBrightnessIntensity.value = preset.bgEffects.brightness?.intensity || 80;
      bgEffectSaturation.value = preset.bgEffects.saturation?.enabled || false;
      bgEffectSaturationIntensity.value = preset.bgEffects.saturation?.intensity || 80;
      bgEffectGlow.value = preset.bgEffects.glow?.enabled || false;
      bgEffectGlowIntensity.value = preset.bgEffects.glow?.intensity || 80;
      bgEffectGradientPulse.value = preset.bgEffects.gradientPulse?.enabled || false;
      bgEffectGradientPulseIntensity.value = preset.bgEffects.gradientPulse?.intensity || 80;
      bgEffectGradientRotation.value = preset.bgEffects.gradientRotation?.enabled || false;
      bgEffectGradientRotationIntensity.value = preset.bgEffects.gradientRotation?.intensity || 80;
    }

    // Canvas aktualisieren
    updateFromColorPicker();
    // ✅ FIX: Gradient-Einstellungen IMMER aktualisieren (auch zum Deaktivieren!)
    updateGradientSettings();
    // ✅ FIX: Audio-Einstellungen IMMER aktualisieren (auch zum Deaktivieren!)
    updateBgAudioReactive();

    console.log('✅ Canvas-Preset erfolgreich geladen:', preset.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden des Canvas-Presets:', error);
  }
}

// Preset löschen
function deletePreset(presetId) {
  savedPresets.value = savedPresets.value.filter(p => p.id !== presetId);
  persistPresets();
  console.log('🗑️ Preset gelöscht');
}

// Computed: Kann Undo ausgeführt werden?
const canUndo = computed(() => undoHistory.value.length > 0);

// ===== HILFSFUNKTIONEN FÜR FARBKONVERTIERUNG =====

// Konvertiere Hex zu RGBA
function hexToRGBA(hex, alpha) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Konvertiere RGB-Werte zu Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Parse RGBA String zu Komponenten
function parseRGBA(rgbaString) {
  // Unterstützt: rgba(255, 0, 0, 0.5) oder rgb(255, 0, 0)
  const match = rgbaString.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
    };
  }
  return null;
}

// ===== UPDATE-FUNKTIONEN =====

// Aktualisiere colorDisplay basierend auf aktuellen Werten
function updateColorDisplay() {
  colorDisplay.value = hexToRGBA(backgroundColor.value, backgroundOpacity.value);
}

// Update vom Color Picker (nur Farbe, keine Transparenz)
function updateFromColorPicker() {
  updateColorDisplay();
  applyBackgroundColor();
}

// Update vom Opacity Slider
function updateFromOpacitySlider() {
  updateColorDisplay();
  applyBackgroundColor();
}

// Update vom Text Input
function updateFromTextInput() {
  const input = colorDisplay.value.trim();
  
  // Versuche RGBA zu parsen
  const rgba = parseRGBA(input);
  if (rgba) {
    backgroundColor.value = rgbToHex(rgba.r, rgba.g, rgba.b);
    backgroundOpacity.value = rgba.a;
    applyBackgroundColor();
    return;
  }
  
  // Versuche Hex zu parsen
  if (input.match(/^#[0-9A-Fa-f]{6}$/)) {
    backgroundColor.value = input;
    // Behalte die aktuelle Opacity bei
    applyBackgroundColor();
    return;
  }
  
  // Ungültiges Format - keine Aktion
}

// Formatiere die Anzeige beim Verlassen des Feldes
function formatColorDisplay() {
  updateColorDisplay();
}

// Wende die Hintergrundfarbe an
function applyBackgroundColor() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  // Speichere Zustand VOR der Änderung
  saveCanvasState();

  // Konvertiere zu RGBA mit aktueller Deckkraft
  const rgbaColor = hexToRGBA(backgroundColor.value, backgroundOpacity.value);

  console.log('🎨 Setze Hintergrundfarbe:', rgbaColor);
  canvasManager.value.setBackground(rgbaColor);
}

// ✨ NEU: Aktualisiere Audio-Reaktiv Einstellungen für Hintergrundfarbe
function updateBgAudioReactive() {
  if (!canvasManager.value) return;

  const settings = {
    enabled: bgAudioEnabled.value,
    source: bgAudioSource.value,
    smoothing: bgAudioSmoothing.value,
    effects: {
      hue: { enabled: bgEffectHue.value, intensity: bgEffectHueIntensity.value },
      brightness: { enabled: bgEffectBrightness.value, intensity: bgEffectBrightnessIntensity.value },
      saturation: { enabled: bgEffectSaturation.value, intensity: bgEffectSaturationIntensity.value },
      glow: { enabled: bgEffectGlow.value, intensity: bgEffectGlowIntensity.value },
      gradientPulse: { enabled: bgEffectGradientPulse.value, intensity: bgEffectGradientPulseIntensity.value },
      gradientRotation: { enabled: bgEffectGradientRotation.value, intensity: bgEffectGradientRotationIntensity.value }
    }
  };

  canvasManager.value.setBackgroundColorAudioReactive(settings);
  console.log('🎵 Hintergrund Audio-Reaktiv:', settings);
}

// ✨ NEU: Aktualisiere Gradient-Einstellungen
function updateGradientSettings() {
  if (!canvasManager.value) return;

  canvasManager.value.setGradientSettings({
    enabled: gradientEnabled.value,
    color2: gradientColor2.value,
    type: gradientType.value,
    angle: gradientAngle.value
  });

  console.log('🌈 Gradient:', {
    enabled: gradientEnabled.value,
    color2: gradientColor2.value,
    type: gradientType.value,
    angle: gradientAngle.value
  });
}

// ===== UNDO-SYSTEM =====

// Speichere den aktuellen Canvas-Zustand
function saveCanvasState() {
  if (!canvasManager.value) return;
  
  const state = {
    background: canvasManager.value.background,
    workspaceBackground: canvasManager.value.workspaceBackground,
    backgroundColor: backgroundColor.value,
    backgroundOpacity: backgroundOpacity.value,
    images: canvasManager.value.multiImageManager ? 
      canvasManager.value.multiImageManager.getAllImages().map(img => ({
        id: img.id,
        type: img.type,
        relX: img.relX,
        relY: img.relY,
        relWidth: img.relWidth,
        relHeight: img.relHeight,
        rotation: img.rotation,
        imageObject: img.imageObject
      })) : [],
    texts: canvasManager.value.textManager && canvasManager.value.textManager.textObjects ? 
      JSON.parse(JSON.stringify(canvasManager.value.textManager.textObjects)) : [],
    timestamp: Date.now()
  };
  
  undoHistory.value.push(state);
  
  if (undoHistory.value.length > MAX_HISTORY) {
    undoHistory.value.shift();
  }
  
  console.log('💾 Canvas-Zustand gespeichert');
}

// Stelle den letzten Zustand wieder her
function undoLastChange() {
  if (undoHistory.value.length === 0 || !canvasManager.value) {
    console.warn('⚠️ Kein Verlauf vorhanden');
    return;
  }
  
  const lastState = undoHistory.value.pop();
  
  // Stelle Hintergrund wieder her
  if (lastState.background !== undefined) {
    canvasManager.value.background = lastState.background;
  }
  
  // Stelle Farbe und Opacity wieder her
  if (lastState.backgroundColor !== undefined) {
    backgroundColor.value = lastState.backgroundColor;
  }
  if (lastState.backgroundOpacity !== undefined) {
    backgroundOpacity.value = lastState.backgroundOpacity;
  }
  updateColorDisplay();
  
  // Stelle Workspace-Hintergrund wieder her
  if (lastState.workspaceBackground !== undefined) {
    canvasManager.value.workspaceBackground = lastState.workspaceBackground;
  }
  
  // Stelle Bilder wieder her
  if (canvasManager.value.multiImageManager && lastState.images) {
    canvasManager.value.multiImageManager.images = [...lastState.images];
  }
  
  // Stelle Texte wieder her
  if (canvasManager.value.textManager && lastState.texts) {
    canvasManager.value.textManager.textObjects = JSON.parse(JSON.stringify(lastState.texts));
  }
  
  // Redraw
  if (canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback();
  }
  
  // Update UI
  if (canvasManager.value.updateUICallback) {
    canvasManager.value.updateUICallback();
  }
  
  console.log('✅ Zustand wiederhergestellt');
}

// ===== RESET-FUNKTIONEN =====

// Prüfe ob Canvas leer ist
const isCanvasEmpty = computed(() => {
  if (!canvasManager.value) return true;
  return canvasManager.value.isCanvasEmpty();
});

// Setze nur den Hintergrund zurück (inkl. Workspace-Hintergrund und Video-Hintergründe)
function resetBackground() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }

  saveCanvasState();

  console.log('🔄 Setze Hintergrund zurück');
  canvasManager.value.setBackground('#ffffff');
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;

  // Workspace-Hintergrund auch zurücksetzen
  canvasManager.value.workspaceBackground = null;

  // ✨ NEU: Video-Hintergründe auch zurücksetzen
  if (canvasManager.value.videoBackground) {
    // Video stoppen und aufräumen
    const video = canvasManager.value.videoBackground.videoElement;
    if (video) {
      video.pause();
      video.src = '';
    }
    canvasManager.value.videoBackground = null;
    console.log('🗑️ Video-Hintergrund entfernt');
  }

  if (canvasManager.value.workspaceVideoBackground) {
    // Workspace-Video stoppen und aufräumen
    const wsVideo = canvasManager.value.workspaceVideoBackground.videoElement;
    if (wsVideo) {
      wsVideo.pause();
      wsVideo.src = '';
    }
    canvasManager.value.workspaceVideoBackground = null;
    console.log('🗑️ Workspace-Video-Hintergrund entfernt');
  }

  canvasManager.value.redrawCallback();

  updateColorDisplay();
  console.log('✅ Hintergrund zurückgesetzt (inkl. Workspace und Video-Hintergründe)');
}

// Bestätige Canvas-Reset
function confirmReset() {
  if (!canvasManager.value) {
    console.warn('⚠️ CanvasManager nicht verfügbar');
    return;
  }
  
  saveCanvasState();
  
  console.log('🗑️ Setze Canvas komplett zurück');
  canvasManager.value.reset();
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;
  updateColorDisplay();
  showResetConfirm.value = false;
  console.log('✅ Canvas zurückgesetzt');
}

// ===== LIFECYCLE =====

// Watcher: Synchronisiere colorDisplay mit backgroundColor und backgroundOpacity
watch([backgroundColor, backgroundOpacity], () => {
  updateColorDisplay();
});

// ✅ FIX: Initialisierungsfunktion für Canvas-Einstellungen
function initializeCanvasSettings() {
  if (!canvasManager.value) return false;

  // ✅ Canvas startet IMMER mit weißem Hintergrund (Grundeinstellung)
  canvasManager.value.setBackground('#ffffff');
  backgroundColor.value = '#ffffff';
  backgroundOpacity.value = 1.0;
  updateColorDisplay();
  console.log('✅ CanvasControlPanel initialisiert - Hintergrund auf Weiß gesetzt');
  return true;
}

// ✅ KRITISCHER FIX: Watcher auf canvasManager
// Vue Lifecycle: Kinder werden VOR dem Eltern-onMounted gemountet.
// Daher ist canvasManager.value in Kind-onMounted() noch NULL.
// Dieser Watcher reagiert, sobald der Eltern-onMounted den CanvasManager setzt.
watch(
  () => canvasManager.value,
  (newValue) => {
    if (newValue) {
      console.log('✅ CanvasManager verfügbar - initialisiere Einstellungen');
      nextTick(() => {
        initializeCanvasSettings();
      });
    }
  },
  { immediate: true }
);

// Initialisiere beim Mounting
onMounted(() => {
  // ✅ Gespeicherte Presets laden
  loadPresets();

  // ✅ Versuche Initialisierung (falls canvasManager bereits verfügbar)
  if (!initializeCanvasSettings()) {
    console.log('⏳ CanvasControlPanel mounted - warte auf CanvasManager...');
  }
});
</script>

<style scoped>
.panel {
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  color: #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0 0 10px 0;
  user-select: none;
  transition: all 0.2s;
}

.panel-header:hover h3 {
  color: #89b4ff;
}

.chevron {
  font-size: 10px;
  color: #6ea8fe;
  transition: transform 0.2s;
  display: inline-block;
  margin-left: 8px;
}

.chevron.open {
  transform: rotate(180deg);
}

.panel-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6ea8fe;
  transition: color 0.2s;
}

h4 {
  margin: 0 0 6px 0;
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.panel-section {
  margin-bottom: 12px;
}

.undo-section {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px;
}

.control-group {
  margin-bottom: 8px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  color: #bbb;
  font-weight: 500;
}

.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 50px;
  height: 34px;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  background-color: #2a2a2a;
}

.color-text-input {
  flex: 1;
  padding: 7px 8px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.color-text-input:focus {
  outline: none;
  border-color: #6ea8fe;
}

/* Styles für den Deckkraft-Slider */
.opacity-slider {
  width: 100%;
  height: 6px;
  background: linear-gradient(to right, 
    rgba(110, 168, 254, 0.2) 0%, 
    rgba(110, 168, 254, 1) 100%);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: #6ea8fe;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

.opacity-slider::-webkit-slider-thumb:hover {
  background-color: #89b4ff;
  transform: scale(1.15);
  box-shadow: 0 0 8px rgba(110, 168, 254, 0.5);
}

.opacity-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background-color: #6ea8fe;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

.opacity-slider::-moz-range-thumb:hover {
  background-color: #89b4ff;
  transform: scale(1.15);
  box-shadow: 0 0 8px rgba(110, 168, 254, 0.5);
}

.info-text {
  font-size: 10px;
  color: #888;
  line-height: 1.3;
  margin: 0 0 8px 0;
}

.info-text.warning {
  color: #ff9800;
  font-weight: 500;
}

.hint-text {
  font-size: 9px;
  color: #888;
  font-style: italic;
}

.btn-primary,
.btn-secondary,
.btn-danger,
.btn-undo {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-undo {
  background-color: #ff9800;
  color: #000;
}

.btn-undo:hover {
  background-color: #fb8c00;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
}

.btn-primary {
  background-color: #6ea8fe;
  color: #000;
}

.btn-primary:hover {
  background-color: #5a96e5;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.3);
}

.btn-secondary {
  background-color: #3a3a3a;
  color: #e0e0e0;
  border: 1px solid #555;
}

.btn-secondary:hover {
  background-color: #4a4a4a;
  border-color: #666;
  transform: translateY(-1px);
}

.btn-danger {
  background-color: #dc3545;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
}

.btn-danger:disabled {
  background-color: #4a4a4a;
  color: #888;
  cursor: not-allowed;
  opacity: 0.5;
}

.full-width {
  width: 100%;
}

.divider {
  height: 1px;
  background-color: #333;
  margin: 12px 0;
}

/* Bestätigungs-Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background-color: #1e1e1e;
  border: 2px solid #dc3545;
  border-radius: 10px;
  padding: 16px;
  max-width: 340px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.confirm-dialog h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #dc3545;
}

.confirm-dialog p {
  margin: 0 0 14px 0;
  font-size: 12px;
  line-height: 1.5;
  color: #e0e0e0;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions button {
  flex: 1;
}

/* ✨ Gradient Styles */
.gradient-section {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.gradient-section h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #60a5fa;
}

.gradient-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.gradient-select {
  width: 100%;
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
}

.angle-slider {
  width: 100%;
}

.color-hex {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

/* ✨ Audio-Reaktiv Styles */
.audio-reactive-section {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
}

.audio-reactive-section h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #a78bfa;
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
  accent-color: #8b5cf6;
}

.audio-controls {
  margin-top: 12px;
}

.audio-select {
  width: 100%;
  padding: 6px 10px;
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
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
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(30, 30, 50, 0.6);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.effect-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #8b5cf6;
}

.effect-slider {
  width: 60px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.effect-value {
  font-size: 11px;
  color: #94a3b8;
  min-width: 32px;
  text-align: right;
}

/* ✨ Preset Styles */
.presets-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.presets-list > label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid #444;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.preset-item:hover {
  border-color: #6ea8fe;
  background: rgba(40, 40, 40, 0.9);
}

.preset-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-name {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
}

.preset-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #555;
}

.preset-actions {
  display: flex;
  gap: 6px;
}

.btn-small {
  padding: 4px 8px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
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
</style>
