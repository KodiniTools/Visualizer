<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">📰</span>
      <span>{{ t('ticker.title') }}</span>
      <span v-if="ticker.enabled" class="status-badge active">{{ t('ticker.on') }}</span>
    </summary>
    <div class="section-content">
      <!-- Aktivieren -->
      <div class="control-group">
        <button
          type="button"
          :class="['btn-small', 'full-width', { active: ticker.enabled }]"
          @click="ticker.enabled = !ticker.enabled"
        >
          {{ ticker.enabled ? '✓ ' + t('ticker.on') : t('ticker.off') }}
        </button>
      </div>

      <template v-if="ticker.enabled">
        <!-- ══════════ Text & Schrift ══════════ -->
        <details class="sub-section" open>
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionText') }}</span>
            <button
              type="button"
              class="reset-btn"
              :title="t('ticker.reset')"
              @click.stop.prevent="ticker.resetSection('text')"
            >
              ↺
            </button>
          </summary>
          <div class="sub-content">
            <!-- Text -->
            <div class="control-group">
              <label>{{ t('ticker.text') }}:</label>
              <input
                v-model="ticker.text"
                type="text"
                class="text-input"
                :placeholder="t('ticker.text')"
              />
            </div>

            <!-- Schriftart (gleiche Quelle wie normaler Text: System + Custom Fonts) -->
            <div class="control-group">
              <label>{{ t('ticker.fontFamily') }}:</label>
              <select v-model="ticker.fontFamily" class="select-input">
                <option v-if="missingFont" :value="missingFont">{{ missingFont }}</option>
                <option
                  v-for="font in systemFonts"
                  :key="font"
                  :value="font"
                  :style="{ fontFamily: font }"
                >
                  {{ font }}
                </option>
                <optgroup v-if="customFonts.length > 0" label="── Custom Fonts ──">
                  <option
                    v-for="font in customFonts"
                    :key="font"
                    :value="font"
                    :style="{ fontFamily: font }"
                  >
                    {{ font }}
                  </option>
                </optgroup>
              </select>
            </div>

            <!-- Fett -->
            <div class="control-group">
              <label class="checkbox-label">
                <input v-model="ticker.bold" type="checkbox" />
                {{ t('ticker.bold') }}
              </label>
            </div>

            <!-- Buchstabenabstand -->
            <div class="control-group">
              <label>{{ t('ticker.letterSpacing') }}: {{ ticker.letterSpacing }}px</label>
              <input
                v-model.number="ticker.letterSpacing"
                type="range"
                min="-5"
                max="40"
                step="1"
                class="slider"
              />
            </div>

            <!-- Buchstabengröße -->
            <div class="control-group">
              <label>{{ t('ticker.fontSize') }}: {{ ticker.fontSize }}px</label>
              <input
                v-model.number="ticker.fontSize"
                type="range"
                min="12"
                max="200"
                step="1"
                class="slider"
              />
            </div>

            <!-- Textfarbe -->
            <div class="control-group">
              <label>{{ t('ticker.color') }}:</label>
              <input v-model="ticker.color" type="color" class="color-input" />
            </div>
          </div>
        </details>

        <!-- ══════════ Umrandung & Schatten ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionOutline') }}</span>
            <button
              type="button"
              class="reset-btn"
              :title="t('ticker.reset')"
              @click.stop.prevent="ticker.resetSection('outline')"
            >
              ↺
            </button>
          </summary>
          <div class="sub-content">
            <!-- Umrandung -->
            <div class="control-group">
              <label class="checkbox-label">
                <input v-model="ticker.strokeEnabled" type="checkbox" />
                {{ t('ticker.stroke') }}
              </label>
            </div>
            <template v-if="ticker.strokeEnabled">
              <div class="control-group">
                <label>{{ t('ticker.strokeColor') }}:</label>
                <input v-model="ticker.strokeColor" type="color" class="color-input" />
              </div>
              <div class="control-group">
                <label>{{ t('ticker.strokeWidth') }}: {{ ticker.strokeWidth }}px</label>
                <input
                  v-model.number="ticker.strokeWidth"
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  class="slider"
                />
              </div>
            </template>

            <!-- Schatten -->
            <div class="control-group">
              <label class="checkbox-label">
                <input v-model="ticker.shadowEnabled" type="checkbox" />
                {{ t('ticker.shadow') }}
              </label>
            </div>
            <template v-if="ticker.shadowEnabled">
              <div class="control-group">
                <label>{{ t('ticker.shadowColor') }}:</label>
                <input v-model="ticker.shadowColor" type="color" class="color-input" />
              </div>
              <div class="control-group">
                <label>{{ t('ticker.shadowBlur') }}: {{ ticker.shadowBlur }}px</label>
                <input
                  v-model.number="ticker.shadowBlur"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  class="slider"
                />
              </div>
            </template>
          </div>
        </details>

        <!-- ══════════ Hintergrund ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionBackground') }}</span>
            <button
              type="button"
              class="reset-btn"
              :title="t('ticker.reset')"
              @click.stop.prevent="ticker.resetSection('background')"
            >
              ↺
            </button>
          </summary>
          <div class="sub-content">
            <!-- Hintergrundfarbe -->
            <div class="control-group">
              <label>{{ t('ticker.bgColor') }}:</label>
              <input v-model="ticker.bgColor" type="color" class="color-input" />
            </div>

            <!-- Hintergrund-Transparenz -->
            <div class="control-group">
              <label>{{ t('ticker.bgOpacity') }}: {{ ticker.bgOpacity }}%</label>
              <input
                v-model.number="ticker.bgOpacity"
                type="range"
                min="0"
                max="100"
                step="1"
                class="slider"
              />
            </div>
          </div>
        </details>

        <!-- ══════════ Position & Bewegung ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionMotion') }}</span>
            <button
              type="button"
              class="reset-btn"
              :title="t('ticker.reset')"
              @click.stop.prevent="ticker.resetSection('motion')"
            >
              ↺
            </button>
          </summary>
          <div class="sub-content">
            <!-- Position quer zur Laufrichtung (vertikal bzw. horizontal verschieben) -->
            <div class="control-group">
              <div class="label-row">
                <label>{{ positionLabel }}: {{ ticker.positionY }}%</label>
                <button
                  type="button"
                  class="btn-mini"
                  :class="{ active: ticker.positionY === 50 }"
                  :title="t('ticker.centerHint')"
                  @click="ticker.positionY = 50"
                >
                  {{ t('ticker.center') }}
                </button>
              </div>
              <input
                v-model.number="ticker.positionY"
                type="range"
                min="0"
                max="100"
                step="1"
                class="slider"
              />
              <div class="hint-text">{{ positionHint }}</div>
            </div>

            <!-- Laufrichtung -->
            <div class="control-group">
              <label>{{ t('ticker.direction') }}:</label>
              <select v-model="ticker.direction" class="select-input">
                <option value="left">{{ t('ticker.left') }}</option>
                <option value="right">{{ t('ticker.right') }}</option>
                <option value="up">{{ t('ticker.up') }}</option>
                <option value="down">{{ t('ticker.down') }}</option>
              </select>
            </div>

            <!-- Laufgeschwindigkeit -->
            <div class="control-group">
              <label>{{ t('ticker.speed') }}: {{ ticker.speed }} px/s</label>
              <input
                v-model.number="ticker.speed"
                type="range"
                min="10"
                max="600"
                step="10"
                class="slider"
              />
            </div>
          </div>
        </details>

        <!-- ══════════ Audio-Reaktivität ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionAudio') }}</span>
            <button
              type="button"
              class="reset-btn"
              :title="t('ticker.reset')"
              @click.stop.prevent="ticker.resetSection('audio')"
            >
              ↺
            </button>
          </summary>
          <div class="sub-content">
            <!-- Audio-Reaktivität ein/aus -->
            <div class="control-group">
              <label class="checkbox-label">
                <input v-model="ticker.audioReactive" type="checkbox" />
                {{ t('ticker.audioReactive') }}
              </label>
            </div>

            <template v-if="ticker.audioReactive">
              <!-- Animationsmodus -->
              <div class="control-group">
                <label>{{ t('ticker.reactMode') }}:</label>
                <select v-model="ticker.reactMode" class="select-input">
                  <option value="tempo">{{ t('ticker.reactModeTempo') }}</option>
                  <option value="scale">{{ t('ticker.reactModeScale') }}</option>
                  <option value="glow">{{ t('ticker.reactModeGlow') }}</option>
                  <option value="shake">{{ t('ticker.reactModeShake') }}</option>
                  <option value="opacity">{{ t('ticker.reactModeOpacity') }}</option>
                  <option value="hue">{{ t('ticker.reactModeHue') }}</option>
                </select>
              </div>

              <!-- Beat-Stärke + Audio-Pegel nebeneinander -->
              <div class="control-group slider-row">
                <div class="slider-col">
                  <label>{{ t('ticker.beatIntensity') }}: {{ ticker.beatIntensity }}%</label>
                  <input
                    v-model.number="ticker.beatIntensity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="slider"
                  />
                </div>
                <div class="slider-col">
                  <label>{{ t('ticker.audioLevel') }}: {{ ticker.audioLevel }}%</label>
                  <input
                    v-model.number="ticker.audioLevel"
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    class="slider"
                  />
                </div>
              </div>
            </template>
          </div>
        </details>
      </template>
    </div>
  </details>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useTickerStore } from '../stores/tickerStore.js'

const { t } = useI18n()
const ticker = useTickerStore()

// Gleiche Font-Quelle wie der normale Text: der per provide/inject
// bereitgestellte FontManager (siehe useTextFonts.js).
const fontManager = inject('fontManager', null)

// Identische System-Font-Liste wie im Text-Manager
const SYSTEM_FONT_NAMES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
]

// Benutzerdefinierte Schriftarten (werden asynchron geladen → reaktiv)
const customFonts = computed(() => {
  const fm = fontManager?.value
  if (!fm || !fm.isInitialized) return []
  return Array.from(fm.loadedFonts).sort()
})

const systemFonts = computed(() => SYSTEM_FONT_NAMES)

// Bei vertikalem Lauf verschiebt der Slider die Spalte nach links/rechts
const isVertical = computed(() => ticker.direction === 'up' || ticker.direction === 'down')
const positionLabel = computed(() =>
  isVertical.value ? t('ticker.positionX') : t('ticker.positionY'),
)
const positionHint = computed(() =>
  isVertical.value ? t('ticker.positionXHint') : t('ticker.positionYHint'),
)

// Falls die gewählte Schriftart (noch) nicht in den Listen steht, trotzdem anbieten
const missingFont = computed(() => {
  const f = ticker.fontFamily
  if (!f) return null
  return systemFonts.value.includes(f) || customFonts.value.includes(f) ? null : f
})
</script>

<style scoped>
.collapsible-section {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  /* Direktes Flex-Kind der linken Toolbar (flex-column): overflow:hidden setzt
     die automatische Mindesthöhe auf 0, wodurch das Panel sonst auf ~2px
     zusammengedrückt (unsichtbar) wird. flex-shrink:0 verhindert das. */
  flex-shrink: 0;
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
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
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

.section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  color: #8fdf8f;
  border: 1px solid #4a7a4a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.section-content {
  padding: 12px;
}

/* ══════════ Klappbare Unter-Sektionen ══════════ */
.sub-section {
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.18));
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}
.sub-section:last-child {
  margin-bottom: 0;
}
.sub-section > summary {
  list-style: none;
}
.sub-section > summary::-webkit-details-marker {
  display: none;
}
.sub-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-primary, #e9e9eb);
  background-color: var(--secondary-bg, #0e1c32);
}
.sub-header::before {
  content: '▶';
  font-size: 7px;
  color: var(--accent-primary, #c9984d);
  transition: transform 0.2s ease;
}
.sub-section[open] > .sub-header::before {
  transform: rotate(90deg);
}
.sub-title {
  flex: 1;
}
.reset-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  line-height: 1;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  background-color: var(--card-bg, #142640);
  color: var(--text-muted, #7a8da0);
  cursor: pointer;
  transition: all 0.2s ease;
}
.reset-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}
.reset-btn:active {
  transform: rotate(-90deg);
}
[data-theme='light'] .reset-btn {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.25);
  color: #4d6d8e;
}
[data-theme='light'] .reset-btn:hover {
  border-color: #014f99;
  color: #014f99;
}
.sub-content {
  padding: 10px;
}
.sub-content .control-group:last-child {
  margin-bottom: 0;
}

/* Zwei Slider nebeneinander (Beat-Stärke + Audio-Pegel) */
.slider-row {
  display: flex;
  gap: 10px;
}
.slider-col {
  flex: 1;
  min-width: 0;
}
.slider-col label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

[data-theme='light'] .sub-section {
  border-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .sub-header {
  color: #003971;
  background-color: #f2f6fb;
}

.control-group {
  margin-bottom: 10px;
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

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.label-row label {
  margin-bottom: 0;
}

.btn-mini {
  flex-shrink: 0;
  padding: 2px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-muted, #7a8da0);
  cursor: pointer;
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

.btn-mini:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--text-primary, #e9e9eb);
}

.btn-mini.active {
  background: rgba(201, 152, 77, 0.25);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}

[data-theme='light'] .btn-mini.active {
  background: rgba(1, 79, 153, 0.12);
  border-color: #014f99;
  color: #014f99;
}

.text-input,
.select-input {
  width: 100%;
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.65rem;
  font-family: inherit;
}

.text-input:focus,
.select-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.color-input {
  width: 100%;
  height: 30px;
  padding: 2px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  cursor: pointer;
}

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
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
}

.btn-small {
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

.btn-small:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}

.btn-small.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}

.full-width {
  width: 100%;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  text-transform: none;
  font-size: 0.62rem;
  color: var(--text-primary, #e9e9eb);
}

.checkbox-label input[type='checkbox'] {
  width: 13px;
  height: 13px;
  cursor: pointer;
  accent-color: var(--accent-primary, #c9984d);
}

[data-theme='light'] .collapsible-section {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .section-header {
  color: #003971;
}

[data-theme='light'] .text-input,
[data-theme='light'] .select-input,
[data-theme='light'] .color-input {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.2);
  color: #013a70;
}

[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
  color: #014f99;
}
</style>
