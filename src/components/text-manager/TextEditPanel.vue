<template>
  <!-- Text-Einstellungen (nur wenn Text ausgewählt) -->
  <div class="panel-section">
    <!-- ✨ Text bearbeiten (klappbar) -->
    <details class="collapsible-section" open>
      <summary class="section-header">
        <span class="section-icon">✏️</span>
        <span>{{ t('textManager.editText') }}</span>
      </summary>
      <div class="section-content">
        <!-- Text-Inhalt -->
        <div class="control-group">
          <label>Text:</label>
          <textarea
            ref="editTextInput"
            v-model="selectedText.content"
            @input="updateText"
            @paste="handleEditPaste"
            class="text-area"
            placeholder="Mehrzeiliger Text wird unterstützt..."
            rows="5"
          ></textarea>
          <div class="hint-text">Enter für Zeilenumbrüche oder mehrzeiligen Text einfügen</div>
          <div v-if="selectedText.content.includes('\n')" class="success-hint">
            {{ selectedText.content.split('\n').length }} Zeilen
          </div>
        </div>

        <!-- Schriftart -->
        <div class="control-group">
          <label>{{ t('textManager.font') }}:</label>
          <select
            ref="fontSelect"
            v-model="selectedText.fontFamily"
            @change="updateText"
            class="select-input font-select"
          >
            <!-- Wird dynamisch befüllt -->
          </select>
        </div>

        <!-- Schriftgröße -->
        <div class="control-group">
          <label>Größe: {{ selectedText.fontSize }}px</label>
          <input
            type="range"
            v-model.number="selectedText.fontSize"
            @input="updateText"
            min="12"
            max="200"
            class="slider"
          />
        </div>

        <!-- ✨ TRANSPARENZ/DECKKRAFT -->
        <div class="control-group">
          <label>Deckkraft: {{ selectedText.opacity }}%</label>
          <input
            type="range"
            v-model.number="selectedText.opacity"
            @input="updateText"
            min="0"
            max="100"
            class="slider"
          />
        </div>

        <!-- Textfarbe -->
        <div class="control-group">
          <label>{{ t('textManager.textColor') }}:</label>
          <div class="color-picker-group">
            <input
              type="color"
              v-model="selectedText.color"
              @input="updateText"
              class="color-input"
            />
            <input
              type="text"
              v-model="selectedText.color"
              @input="updateText"
              class="color-text-input"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <!-- Schriftstil -->
        <div class="control-group">
          <label>{{ t('textManager.style') }}:</label>
          <div class="button-group">
            <button
              @click="toggleFontWeight"
              :class="['btn-small', { active: selectedText.fontWeight === 'bold' }]"
            >
              <strong>B</strong>
            </button>
            <button
              @click="toggleFontStyle"
              :class="['btn-small', { active: selectedText.fontStyle === 'italic' }]"
            >
              <em>I</em>
            </button>
          </div>
        </div>

        <!-- Ausrichtung -->
        <div class="control-group">
          <label>{{ t('textManager.alignment') }}:</label>
          <div class="button-group">
            <button
              @click="setTextAlign('left')"
              :class="['btn-small', { active: selectedText.textAlign === 'left' }]"
            >
              {{ t('textManager.left') }}
            </button>
            <button
              @click="setTextAlign('center')"
              :class="['btn-small', { active: selectedText.textAlign === 'center' }]"
            >
              {{ t('textManager.center') }}
            </button>
            <button
              @click="setTextAlign('right')"
              :class="['btn-small', { active: selectedText.textAlign === 'right' }]"
            >
              {{ t('textManager.right') }}
            </button>
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ NEU: Position (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">📍</span>
        <span>Position</span>
      </summary>
      <div class="section-content">
        <!-- Position X -->
        <div class="control-group">
          <label>Position X: {{ Math.round(selectedText.relX * 100) }}%</label>
          <input
            type="range"
            v-model.number="selectedText.relX"
            @input="updateText"
            min="0"
            max="1"
            step="0.01"
            class="slider"
          />
          <input
            type="number"
            :value="Math.round(selectedText.relX * canvasWidth)"
            @input="handleUpdateSelectedTextPixelPosition('x', $event)"
            class="number-input"
            :placeholder="'0 - ' + canvasWidth"
          />
          <span class="unit-label">px</span>
        </div>

        <!-- Position Y -->
        <div class="control-group">
          <label>Position Y: {{ Math.round(selectedText.relY * 100) }}%</label>
          <input
            type="range"
            v-model.number="selectedText.relY"
            @input="updateText"
            min="0"
            max="1"
            step="0.01"
            class="slider"
          />
          <input
            type="number"
            :value="Math.round(selectedText.relY * canvasHeight)"
            @input="handleUpdateSelectedTextPixelPosition('y', $event)"
            class="number-input"
            :placeholder="'0 - ' + canvasHeight"
          />
          <span class="unit-label">px</span>
        </div>

        <!-- Schnellauswahl-Buttons -->
        <div class="control-group">
          <label>Schnellauswahl:</label>
          <div class="position-grid">
            <button
              @click="handleSetSelectedTextQuickPosition('top-left')"
              class="btn-pos"
              title="Oben Links"
            >
              ↖
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('top-center')"
              class="btn-pos"
              title="Oben Mitte"
            >
              ↑
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('top-right')"
              class="btn-pos"
              title="Oben Rechts"
            >
              ↗
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('middle-left')"
              class="btn-pos"
              title="Mitte Links"
            >
              ←
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('center')"
              class="btn-pos"
              title="Zentrum"
            >
              ⊙
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('middle-right')"
              class="btn-pos"
              title="Mitte Rechts"
            >
              →
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('bottom-left')"
              class="btn-pos"
              title="Unten Links"
            >
              ↙
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('bottom-center')"
              class="btn-pos"
              title="Unten Mitte"
            >
              ↓
            </button>
            <button
              @click="handleSetSelectedTextQuickPosition('bottom-right')"
              class="btn-pos"
              title="Unten Rechts"
            >
              ↘
            </button>
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ Abstände & Kontur (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">↔️</span>
        <span>Abstände &amp; Kontur</span>
        <span v-if="selectedText.stroke.enabled" class="status-badge active">{{
          t('textManager.outline')
        }}</span>
      </summary>
      <div class="section-content">
        <!-- Buchstabenabstand -->
        <div class="control-group">
          <label>Buchstabenabstand: {{ selectedText.letterSpacing }}px</label>
          <input
            type="range"
            v-model.number="selectedText.letterSpacing"
            @input="updateText"
            min="-20"
            max="50"
            class="slider"
          />
        </div>

        <!-- Zeilenabstand -->
        <div class="control-group">
          <label>Zeilenabstand: {{ selectedText.lineHeightMultiplier }}%</label>
          <input
            type="range"
            v-model.number="selectedText.lineHeightMultiplier"
            @input="updateText"
            min="100"
            max="300"
            class="slider"
          />
        </div>

        <!-- Text-Kontur -->
        <div class="control-group">
          <label>Text-Kontur:</label>
          <div class="button-group">
            <button
              @click="toggleStroke"
              :class="['btn-small', { active: selectedText.stroke.enabled }]"
            >
              {{
                selectedText.stroke.enabled
                  ? t('textManager.activated')
                  : t('textManager.deactivated')
              }}
            </button>
          </div>
        </div>

        <!-- Kontur-Einstellungen (nur wenn aktiviert) -->
        <div v-if="selectedText.stroke.enabled">
          <!-- Konturfarbe -->
          <div class="control-group">
            <label>{{ t('textManager.outlineColor') }}:</label>
            <div class="color-picker-group">
              <input
                type="color"
                v-model="selectedText.stroke.color"
                @input="updateText"
                class="color-input"
              />
              <input
                type="text"
                v-model="selectedText.stroke.color"
                @input="updateText"
                class="color-text-input"
                placeholder="#000000"
              />
            </div>
          </div>

          <!-- Konturdicke -->
          <div class="control-group">
            <label>{{ t('textManager.outlineWidth') }}: {{ selectedText.stroke.width }}px</label>
            <input
              type="range"
              v-model.number="selectedText.stroke.width"
              @input="updateText"
              min="1"
              max="100"
              class="slider"
            />
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ Schatten (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">🌑</span>
        <span>{{ t('textManager.shadow') }}</span>
        <span
          v-if="
            selectedText.shadow.blur > 0 ||
            selectedText.shadow.offsetX !== 0 ||
            selectedText.shadow.offsetY !== 0
          "
          class="status-badge active"
          >{{ t('textManager.active') }}</span
        >
      </summary>
      <div class="section-content">
        <!-- Schattenfarbe -->
        <div class="control-group">
          <label>{{ t('textManager.shadowColor') }}:</label>
          <div class="color-picker-group">
            <input
              type="color"
              v-model="selectedText.shadow.color"
              @input="updateText"
              class="color-input"
            />
            <input
              type="text"
              v-model="selectedText.shadow.color"
              @input="updateText"
              class="color-text-input"
              placeholder="#000000"
            />
          </div>
        </div>

        <!-- Schatten-Unschärfe -->
        <div class="control-group">
          <label>{{ t('textManager.shadowBlur') }}: {{ selectedText.shadow.blur }}px</label>
          <input
            type="range"
            v-model.number="selectedText.shadow.blur"
            @input="updateText"
            min="0"
            max="50"
            class="slider"
          />
        </div>

        <!-- Schatten X-Offset -->
        <div class="control-group">
          <label>{{ t('textManager.shadowX') }}-Offset: {{ selectedText.shadow.offsetX }}px</label>
          <input
            type="range"
            v-model.number="selectedText.shadow.offsetX"
            @input="updateText"
            min="-50"
            max="50"
            class="slider"
          />
        </div>

        <!-- Schatten Y-Offset -->
        <div class="control-group">
          <label>{{ t('textManager.shadowY') }}-Offset: {{ selectedText.shadow.offsetY }}px</label>
          <input
            type="range"
            v-model.number="selectedText.shadow.offsetY"
            @input="updateText"
            min="-50"
            max="50"
            class="slider"
          />
        </div>
      </div>
    </details>

    <!-- ✨ Rotation (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">🔄</span>
        <span>Rotation</span>
        <span v-if="selectedText.rotation !== 0" class="status-badge"
          >{{ selectedText.rotation }}°</span
        >
      </summary>
      <div class="section-content">
        <div class="control-group">
          <label>Rotation: {{ selectedText.rotation }}°</label>
          <input
            type="range"
            v-model.number="selectedText.rotation"
            @input="updateText"
            min="-180"
            max="180"
            class="slider"
          />
        </div>
      </div>
    </details>

    <!-- Audio Reactive Panel -->
    <TextAudioReactivePanel :selected-text="selectedText" />

    <!-- Animations Panel -->
    <TextAnimationsPanel :selected-text="selectedText" />

    <!-- Löschen Button -->
    <button @click="deleteSelectedText" class="btn-danger full-width" style="margin-top: 16px">
      {{ t('textManager.deleteText') }}
    </button>
  </div>
</template>

<script setup>
import { ref, inject, nextTick, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useTextFonts } from '../../composables/useTextFonts.js'
import TextAudioReactivePanel from './TextAudioReactivePanel.vue'
import TextAnimationsPanel from './TextAnimationsPanel.vue'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
  canvasWidth: {
    type: Number,
    default: 1920,
  },
  canvasHeight: {
    type: Number,
    default: 1080,
  },
})

const emit = defineEmits(['delete'])

const { t } = useI18n()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const editTextInput = ref(null)
const fontSelect = ref(null)

// Wrap props as ref-like for composable
const selectedTextRef = { value: props.selectedText }

const { populateFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  fontSelect,
  { value: null }, // newTextFontSelectRef - not used in edit mode
  selectedTextRef,
  { value: null }, // newTextStyle - not used in edit mode
)

// Watch for font changes to repopulate
watch(
  () => props.selectedText,
  () => {
    nextTick(() => {
      populateFontDropdown()
    })
  },
  { immediate: true },
)

// Watch fontManager initialization
if (fontManager?.value) {
  watch(
    () => fontManager.value?.isInitialized,
    (isInitialized) => {
      if (isInitialized) {
        nextTick(() => {
          populateFontDropdown()
        })
      }
    },
    { immediate: true },
  )
}

function updateText() {
  // Normalisiere Zeilenumbrüche wenn Text bearbeitet wird
  if (props.selectedText && props.selectedText.content) {
    props.selectedText.content = normalizeLineBreaks(props.selectedText.content)
  }

  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}

function normalizeLineBreaks(text) {
  if (!text) return text
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function handleEditPaste() {
  setTimeout(() => {
    if (props.selectedText) {
      const normalized = normalizeLineBreaks(props.selectedText.content)
      props.selectedText.content = normalized
      updateText()
    }
  }, 50)
}

function toggleFontWeight() {
  if (props.selectedText) {
    props.selectedText.fontWeight = props.selectedText.fontWeight === 'bold' ? 'normal' : 'bold'
    updateText()
  }
}

function toggleFontStyle() {
  if (props.selectedText) {
    props.selectedText.fontStyle = props.selectedText.fontStyle === 'italic' ? 'normal' : 'italic'
    updateText()
  }
}

function setTextAlign(align) {
  if (props.selectedText) {
    props.selectedText.textAlign = align
    updateText()
  }
}

function toggleStroke() {
  if (props.selectedText) {
    props.selectedText.stroke.enabled = !props.selectedText.stroke.enabled
    updateText()
  }
}

function deleteSelectedText() {
  if (canvasManager.value && props.selectedText) {
    canvasManager.value.deleteActiveObject()
    emit('delete')
  }
}

function handleUpdateSelectedTextPixelPosition(axis, event) {
  if (!props.selectedText) return

  const value = parseFloat(event.target.value)
  if (isNaN(value)) return

  if (axis === 'x') {
    props.selectedText.relX = value / props.canvasWidth
  } else {
    props.selectedText.relY = value / props.canvasHeight
  }
  updateText()
}

function handleSetSelectedTextQuickPosition(position) {
  if (!props.selectedText) return

  const positions = {
    'top-left': { x: 0.1, y: 0.1 },
    'top-center': { x: 0.5, y: 0.1 },
    'top-right': { x: 0.9, y: 0.1 },
    'middle-left': { x: 0.1, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    'middle-right': { x: 0.9, y: 0.5 },
    'bottom-left': { x: 0.1, y: 0.9 },
    'bottom-center': { x: 0.5, y: 0.9 },
    'bottom-right': { x: 0.9, y: 0.9 },
  }

  const pos = positions[position]
  if (pos) {
    props.selectedText.relX = pos.x
    props.selectedText.relY = pos.y
    updateText()
  }
}

// Expose focusEditor for parent
defineExpose({ editTextInput, populateFontDropdown })
</script>

<style scoped>
/* ===== SECTIONS ===== */
.panel-section {
  margin-bottom: 8px;
}

/* ===== CONTROL GROUPS ===== */
.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

/* ===== INPUTS ===== */
.text-input,
.select-input,
.color-text-input,
.text-area {
  width: 100%;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
}

.font-select {
  max-height: 400px;
}

.font-select option {
  padding: 6px;
}

.text-area {
  min-height: 50px;
  line-height: 1.5;
  font-family: 'Courier New', monospace;
}

.text-input:focus,
.select-input:focus,
.color-text-input:focus,
.text-area:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

/* ===== HINT TEXT ===== */
.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}

.success-hint {
  font-size: 0.5rem;
  color: #4ade80;
  margin-top: 3px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ===== MODERN SLIDERS ===== */
.slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

/* ===== COLOR PICKER ===== */
.color-picker-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.color-input {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  cursor: pointer;
  background-color: var(--secondary-bg, #0e1c32);
  transition: all 0.2s ease;
}

.color-input:hover {
  border-color: var(--accent-primary, #c9984d);
}

.color-text-input {
  flex: 1;
  font-family: 'Courier New', monospace;
}

/* ===== BUTTONS ===== */
.button-group {
  display: flex;
  gap: 4px;
}

.btn-small {
  flex: 1;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-small:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-small.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}

.btn-danger {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-danger:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.full-width {
  width: 100%;
}

/* ===== COLLAPSIBLE SECTIONS ===== */
.collapsible-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--card-bg);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.collapsible-section:hover {
  border-color: var(--btn-hover);
}

.collapsible-section[open] {
  border-color: var(--btn-hover);
}

.collapsible-section summary {
  list-style: none;
}

.collapsible-section summary::-webkit-details-marker {
  display: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--secondary-bg) 100%);
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  user-select: none;
}

.section-header:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  color: #fff;
}

.collapsible-section[open] .section-header {
  border-bottom: 1px solid var(--card-bg);
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
}

.section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.section-header::before {
  content: '▶';
  font-size: 8px;
  color: #6ea8fe;
  transition: transform 0.2s ease;
  margin-right: 4px;
}

.collapsible-section[open] .section-header::before {
  transform: rotate(90deg);
}

.section-content {
  padding: 12px;
  background-color: var(--secondary-bg);
}

.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-badge.active {
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  color: #8fdf8f;
  border: 1px solid #4a7a4a;
}

/* ===== POSITION STYLES ===== */
.number-input {
  width: 70px;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  margin-left: 8px;
}

.number-input:focus {
  border-color: #6ea8fe;
  outline: none;
}

.unit-label {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 4px;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}

.btn-pos {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pos:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg) 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}

.btn-pos.active {
  background: linear-gradient(135deg, #3a5a8a 0%, #2a4a7a 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .success-hint {
  color: #16a34a;
}

[data-theme='light'] .slider::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.08);
}

[data-theme='light'] .btn-primary:hover:not(:disabled) {
  background: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .btn-danger {
  background: rgba(244, 67, 54, 0.08);
  color: #c62828;
}

[data-theme='light'] .btn-danger:hover {
  background: rgba(244, 67, 54, 0.12);
}

[data-theme='light'] .collapsible-section {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .collapsible-section:hover {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .collapsible-section[open] {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .section-header {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  color: #003971;
}

[data-theme='light'] .section-header:hover {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  color: #014f99;
}

[data-theme='light'] .collapsible-section[open] .section-header {
  border-bottom: 1px solid rgba(1, 79, 153, 0.12);
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
}

[data-theme='light'] .section-header::before {
  color: #014f99;
}

[data-theme='light'] .section-content {
  background-color: #ffffff;
}

[data-theme='light'] .status-badge {
  background-color: #e8e0c4;
  color: #4d6d8e;
}

[data-theme='light'] .status-badge.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.08) 100%);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.35);
}

[data-theme='light'] .number-input {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.2);
  color: #003971;
}

[data-theme='light'] .number-input:focus {
  border-color: #014f99;
}

[data-theme='light'] .unit-label {
  color: #4d6d8e;
}

[data-theme='light'] .btn-pos {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  border: 1px solid rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
}

[data-theme='light'] .btn-pos:hover {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .btn-pos.active {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(1, 79, 153, 0.06) 100%);
  border-color: #014f99;
  color: #014f99;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .text-area {
    min-height: 44px;
    font-size: 0.8rem;
  }

  .color-input {
    width: 40px;
    height: 36px;
  }

  .btn-pos {
    min-height: 36px;
    min-width: 36px;
  }
}

@media (max-width: 480px) {
  .color-input {
    width: 44px;
    height: 40px;
  }

  .btn-pos {
    min-height: 40px;
    min-width: 40px;
  }

  .text-area {
    min-height: 50px;
    font-size: 0.85rem;
  }
}
</style>
