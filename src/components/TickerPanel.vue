<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon" aria-hidden="true">📰</span>
      <span>{{ t('ticker.title') }}</span>
      <span v-if="ticker.enabled" class="status-badge">{{ t('ticker.on') }}</span>
    </summary>
    <div class="section-content">
      <UiSwitch v-model="ticker.enabled" :label="t('ticker.on')" />

      <template v-if="ticker.enabled">
        <!-- ══════════ Text & Schrift ══════════ -->
        <details class="sub-section" open>
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionText') }}</span>
            <UiIconButton
              :label="t('ticker.reset')"
              size="sm"
              class="reset-btn"
              @click.stop.prevent="ticker.resetSection('text')"
            >
              <ResetIcon />
            </UiIconButton>
          </summary>
          <div class="sub-content">
            <UiTextField
              v-model="ticker.text"
              :label="t('ticker.text')"
              :placeholder="t('ticker.text')"
            />
            <!-- Gleiche Quelle wie normaler Text: System + eigene Schriften -->
            <UiSelect
              v-model="ticker.fontFamily"
              :label="t('ticker.fontFamily')"
              :options="fontOptions"
              size="sm"
            />
            <UiSwitch v-model="ticker.bold" :label="t('ticker.bold')" />
            <SliderControl
              v-model="ticker.letterSpacing"
              :label="t('ticker.letterSpacing')"
              :min="-5"
              :max="40"
              :default-value="0"
              :value-text="`${ticker.letterSpacing}px`"
            />
            <SliderControl
              v-model="ticker.fontSize"
              :label="t('ticker.fontSize')"
              :min="12"
              :max="200"
              :default-value="48"
              :value-text="`${ticker.fontSize}px`"
            />
            <div class="color-row">
              <span class="color-row__label">{{ t('ticker.color') }}</span>
              <ColorField v-model="ticker.color" :label="t('ticker.color')" />
            </div>
          </div>
        </details>

        <!-- ══════════ Umrandung & Schatten ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionOutline') }}</span>
            <UiIconButton
              :label="t('ticker.reset')"
              size="sm"
              class="reset-btn"
              @click.stop.prevent="ticker.resetSection('outline')"
            >
              <ResetIcon />
            </UiIconButton>
          </summary>
          <div class="sub-content">
            <UiSwitch v-model="ticker.strokeEnabled" :label="t('ticker.stroke')" />
            <template v-if="ticker.strokeEnabled">
              <div class="color-row">
                <span class="color-row__label">{{ t('ticker.strokeColor') }}</span>
                <ColorField v-model="ticker.strokeColor" :label="t('ticker.strokeColor')" />
              </div>
              <SliderControl
                v-model="ticker.strokeWidth"
                :label="t('ticker.strokeWidth')"
                :min="1"
                :max="20"
                :default-value="2"
                :value-text="`${ticker.strokeWidth}px`"
              />
            </template>

            <UiSwitch v-model="ticker.shadowEnabled" :label="t('ticker.shadow')" />
            <template v-if="ticker.shadowEnabled">
              <div class="color-row">
                <span class="color-row__label">{{ t('ticker.shadowColor') }}</span>
                <ColorField v-model="ticker.shadowColor" :label="t('ticker.shadowColor')" />
              </div>
              <SliderControl
                v-model="ticker.shadowBlur"
                :label="t('ticker.shadowBlur')"
                :min="0"
                :max="40"
                :default-value="6"
                :value-text="`${ticker.shadowBlur}px`"
              />
            </template>
          </div>
        </details>

        <!-- ══════════ Hintergrund ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionBackground') }}</span>
            <UiIconButton
              :label="t('ticker.reset')"
              size="sm"
              class="reset-btn"
              @click.stop.prevent="ticker.resetSection('background')"
            >
              <ResetIcon />
            </UiIconButton>
          </summary>
          <div class="sub-content">
            <div class="color-row">
              <span class="color-row__label">{{ t('ticker.bgColor') }}</span>
              <ColorField v-model="ticker.bgColor" :label="t('ticker.bgColor')" />
            </div>
            <SliderControl
              v-model="ticker.bgOpacity"
              :label="t('ticker.bgOpacity')"
              :min="0"
              :max="100"
              :default-value="70"
              :value-text="`${ticker.bgOpacity}%`"
            />
          </div>
        </details>

        <!-- ══════════ Position & Bewegung ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionMotion') }}</span>
            <UiIconButton
              :label="t('ticker.reset')"
              size="sm"
              class="reset-btn"
              @click.stop.prevent="ticker.resetSection('motion')"
            >
              <ResetIcon />
            </UiIconButton>
          </summary>
          <div class="sub-content">
            <!-- Position quer zur Laufrichtung (vertikal bzw. horizontal verschieben) -->
            <div class="position-group">
              <SliderControl
                v-model="ticker.positionY"
                :label="positionLabel"
                :min="0"
                :max="100"
                :default-value="100"
                :value-text="`${ticker.positionY}%`"
              />
              <div class="position-row">
                <p class="hint-text">{{ positionHint }}</p>
                <UiButton
                  :variant="ticker.positionY === 50 ? 'primary' : 'secondary'"
                  size="sm"
                  :title="t('ticker.centerHint')"
                  :aria-pressed="ticker.positionY === 50"
                  @click="ticker.positionY = 50"
                >
                  {{ t('ticker.center') }}
                </UiButton>
              </div>
            </div>
            <UiSelect
              v-model="ticker.direction"
              :label="t('ticker.direction')"
              :options="directionOptions"
              size="sm"
            />
            <SliderControl
              v-model="ticker.speed"
              :label="t('ticker.speed')"
              :min="10"
              :max="600"
              :step="10"
              :default-value="120"
              :value-text="`${ticker.speed} px/s`"
            />
          </div>
        </details>

        <!-- ══════════ Audio-Reaktivität ══════════ -->
        <details class="sub-section">
          <summary class="sub-header">
            <span class="sub-title">{{ t('ticker.sectionAudio') }}</span>
            <UiIconButton
              :label="t('ticker.reset')"
              size="sm"
              class="reset-btn"
              @click.stop.prevent="ticker.resetSection('audio')"
            >
              <ResetIcon />
            </UiIconButton>
          </summary>
          <div class="sub-content">
            <!-- Identische Einstellungen wie Bild-Audio-Reaktiv (+ Lauftext-Effekte) -->
            <TickerAudioReactive />
          </div>
        </details>
      </template>
    </div>
  </details>
</template>

<script setup>
import { computed, h, inject } from 'vue'
import TickerAudioReactive from './ticker/TickerAudioReactive.vue'
import ColorField from './ui/ColorField.vue'
import SliderControl from './ui/SliderControl.vue'
import UiButton from './ui/UiButton.vue'
import UiIconButton from './ui/UiIconButton.vue'
import UiSelect from './ui/UiSelect.vue'
import UiSwitch from './ui/UiSwitch.vue'
import UiTextField from './ui/UiTextField.vue'
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

/** Optionen mit Vorschau in der jeweiligen Schrift */
const fontOption = (font) => ({ value: font, label: font, style: { fontFamily: font } })

const fontOptions = computed(() => [
  ...(missingFont.value ? [{ value: missingFont.value, label: missingFont.value }] : []),
  ...systemFonts.value.map(fontOption),
  ...(customFonts.value.length > 0
    ? [{ label: t('ticker.customFonts'), options: customFonts.value.map(fontOption) }]
    : []),
])

const directionOptions = computed(() =>
  ['left', 'right', 'up', 'down'].map((value) => ({ value, label: t(`ticker.${value}`) })),
)

/** Kreispfeil „zurücksetzen“ (wie SliderField) */
const ResetIcon = () =>
  h(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    [h('path', { d: 'M3 12a9 9 0 1 0 3-6.7L3 8' }), h('path', { d: 'M3 3v5h5' })],
  )
</script>

<style scoped>
.collapsible-section {
  flex-shrink: 0;
  margin-bottom: var(--ds-space-2);
  overflow: hidden;
  background: var(--ds-surface-1);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
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
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  cursor: pointer;
  user-select: none;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text);
}

.section-header::before,
.sub-header::before {
  content: '▶';
  font-size: var(--ds-text-xs);
  color: var(--ds-accent);
  transition: transform var(--ds-duration) var(--ds-ease);
}

.collapsible-section[open] > .section-header::before,
.sub-section[open] > .sub-header::before {
  transform: rotate(90deg);
}

.section-icon {
  flex-shrink: 0;
  font-size: var(--ds-text-md);
}

.status-badge {
  margin-left: auto;
  padding: 0 var(--ds-space-2);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-on-success);
  background: var(--ds-success);
  border-radius: var(--ds-radius-full);
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
}

/* ══════════ Klappbare Unter-Sektionen ══════════ */
.sub-section {
  overflow: hidden;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
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
  gap: var(--ds-space-2);
  padding: var(--ds-space-1) var(--ds-space-1) var(--ds-space-1) var(--ds-space-3);
  cursor: pointer;
  user-select: none;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text);
  background: var(--ds-surface-2);
}

.sub-title {
  flex: 1;
}

.reset-btn svg {
  width: 14px;
  height: 14px;
}

.sub-content {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
}

.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
}

.color-row__label {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.position-group {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.position-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
}

.hint-text {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}
</style>
