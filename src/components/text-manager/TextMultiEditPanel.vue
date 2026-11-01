<template>
  <div class="multi-edit-panel">
    <!-- Header -->
    <div class="multi-header">
      <span class="multi-count">{{
        t('textManager.multi.selectedCount').replace('{count}', texts.length)
      }}</span>
      <div class="multi-header-actions">
        <UiButton size="sm" :title="t('textManager.multi.selectAllTitle')" @click="selectAll">
          {{ t('textManager.multi.selectAll') }}
        </UiButton>
        <UiIconButton
          size="sm"
          :label="t('textManager.multi.clearSelection')"
          @click="emit('clear')"
        >
          <svg v-bind="ICON_ATTRS">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </UiIconButton>
      </div>
    </div>

    <p class="hint">{{ t('textManager.multi.hint') }}</p>

    <!-- Stil für alle -->
    <div class="section">
      <div class="section-title">{{ t('textManager.multi.styleTitle') }}</div>

      <div class="control-row">
        <span class="row-label">{{ t('textManager.multi.color') }}</span>
        <div class="size-row">
          <ColorField v-model="bulkColor" class="color-input" />
          <UiButton size="sm" @click="applyColor">{{ t('textManager.multi.apply') }}</UiButton>
        </div>
      </div>

      <div class="control-row">
        <span class="row-label">{{ t('textManager.multi.fontSize') }}</span>
        <div class="size-row">
          <SliderField
            v-model="bulkFontSize"
            :min="4"
            :max="400"
            :default-value="48"
            class="slider"
          />
          <UiButton size="sm" @click="applyFontSize">{{ t('textManager.multi.apply') }}</UiButton>
        </div>
      </div>

      <div class="control-row">
        <span class="row-label">{{ t('textManager.multi.opacity') }}</span>
        <div class="size-row">
          <SliderField
            v-model="bulkOpacity"
            :min="0"
            :max="100"
            :default-value="100"
            class="slider"
          />
          <UiButton size="sm" @click="applyOpacity">{{ t('textManager.multi.apply') }}</UiButton>
        </div>
      </div>

      <div class="control-row">
        <div class="size-row">
          <div class="grow">
            <UiSelect
              v-model="bulkFont"
              :options="fontOptions"
              :label="t('textManager.multi.font')"
              size="sm"
            />
          </div>
          <UiButton size="sm" class="align-end" :disabled="!bulkFont" @click="applyFont">
            {{ t('textManager.multi.apply') }}
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Position (alle) -->
    <div class="section">
      <div class="section-title">{{ t('textManager.multi.positionTitle') }}</div>
      <div class="nudge-row">
        <UiIconButton
          v-for="n in NUDGES"
          :key="n.key"
          size="sm"
          variant="secondary"
          :label="t(`textManager.multi.${n.key}`)"
          @click="nudge(n.dx, n.dy)"
        >
          <svg v-bind="ICON_ATTRS"><path :d="n.path" /></svg>
        </UiIconButton>
        <span class="nudge-hint">{{ t('textManager.multi.nudgeHint') }}</span>
      </div>
      <div class="align-row">
        <UiIconButton
          v-for="a in ALIGNS"
          :key="a.direction"
          size="sm"
          variant="secondary"
          :label="t(`textManager.multi.${a.key}`)"
          @click="alignAll(a.direction)"
        >
          <svg v-bind="ICON_ATTRS">
            <component :is="el.tag" v-for="(el, i) in a.icon" :key="i" v-bind="el.attrs" />
          </svg>
        </UiIconButton>
      </div>
    </div>

    <!-- Audio-Reaktiv (alle) -->
    <div class="section">
      <div class="section-title">{{ t('textManager.multi.audioTitle') }}</div>
      <p class="hint">{{ t('textManager.multi.audioHint') }}</p>
      <UiButton
        size="sm"
        block
        :disabled="!activeText?.audioReactive?.enabled"
        @click="copyAudioReactive"
      >
        {{ t('textManager.multi.copyAudio') }}
      </UiButton>
    </div>

    <!-- Alle löschen -->
    <div class="section">
      <UiButton size="sm" variant="danger" block @click="deleteAll">
        {{ t('textManager.multi.deleteAll').replace('{count}', texts.length) }}
      </UiButton>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import SliderField from '../ui/SliderField.vue'
import ColorField from '../ui/ColorField.vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSelect from '../ui/UiSelect.vue'
import { useI18n } from '../../lib/i18n.js'

const props = defineProps({
  texts: { type: Array, required: true },
  activeText: { type: Object, default: null },
})

const emit = defineEmits(['clear'])

const { t } = useI18n()
const canvasManager = inject('canvasManager')

const bulkColor = ref('#ffffff')
const bulkFontSize = ref(48)
const bulkOpacity = ref(100)
const bulkFont = ref('')

const commonFonts = [
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black',
]

const fontOptions = computed(() => [
  { value: '', label: t('textManager.multi.fontPlaceholder') },
  ...commonFonts.map((f) => ({ value: f, label: f })),
])

/** Lucide-Stil: 24er-ViewBox, Stroke 1.75 (siehe components/ui/README.md) */
const ICON_ATTRS = {
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.75,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
}

const NUDGES = [
  { key: 'nudgeUp', dx: 0, dy: -0.01, path: 'm18 15-6-6-6 6' },
  { key: 'nudgeLeft', dx: -0.01, dy: 0, path: 'm15 18-6-6 6-6' },
  { key: 'nudgeRight', dx: 0.01, dy: 0, path: 'm9 18 6-6-6-6' },
  { key: 'nudgeDown', dx: 0, dy: 0.01, path: 'm6 9 6 6 6-6' },
]

const rect = (x, y, width, height) => ({ tag: 'rect', attrs: { x, y, width, height, rx: 2 } })
const path = (d) => ({ tag: 'path', attrs: { d } })

const ALIGNS = [
  {
    direction: 'left',
    key: 'alignLeft',
    icon: [rect(6, 14, 9, 6), rect(6, 4, 16, 6), path('M2 2v20')],
  },
  {
    direction: 'center',
    key: 'alignCenter',
    icon: [path('M12 2v20'), rect(4, 4, 16, 6), rect(7, 14, 10, 6)],
  },
  {
    direction: 'right',
    key: 'alignRight',
    icon: [rect(2, 4, 16, 6), rect(9, 14, 9, 6), path('M22 22V2')],
  },
  {
    direction: 'top',
    key: 'alignTop',
    icon: [rect(4, 6, 6, 16), rect(14, 6, 6, 9), path('M22 2H2')],
  },
  {
    direction: 'middle',
    key: 'alignMiddle',
    icon: [path('M2 12h20'), rect(4, 4, 6, 16), rect(14, 7, 6, 10)],
  },
  {
    direction: 'bottom',
    key: 'alignBottom',
    icon: [rect(4, 2, 6, 16), rect(14, 9, 6, 9), path('M22 22H2')],
  },
]

function applyColor() {
  for (const text of props.texts) text.color = bulkColor.value
  redraw()
}

function applyFontSize() {
  for (const text of props.texts) text.fontSize = bulkFontSize.value
  redraw()
}

function applyOpacity() {
  for (const text of props.texts) text.opacity = bulkOpacity.value
  redraw()
}

function applyFont() {
  if (!bulkFont.value) return
  for (const text of props.texts) text.fontFamily = bulkFont.value
  redraw()
}

function nudge(dx, dy) {
  for (const text of props.texts) {
    text.relX += dx
    text.relY += dy
  }
  redraw()
}

function alignAll(direction) {
  if (props.texts.length === 0) return
  if (direction === 'left') {
    const minX = Math.min(...props.texts.map((text) => text.relX))
    for (const text of props.texts) text.relX = minX
  } else if (direction === 'right') {
    const maxX = Math.max(...props.texts.map((text) => text.relX))
    for (const text of props.texts) text.relX = maxX
  } else if (direction === 'center') {
    const avgX = props.texts.reduce((sum, text) => sum + text.relX, 0) / props.texts.length
    for (const text of props.texts) text.relX = avgX
  } else if (direction === 'top') {
    const minY = Math.min(...props.texts.map((text) => text.relY))
    for (const text of props.texts) text.relY = minY
  } else if (direction === 'bottom') {
    const maxY = Math.max(...props.texts.map((text) => text.relY))
    for (const text of props.texts) text.relY = maxY
  } else if (direction === 'middle') {
    const avgY = props.texts.reduce((sum, text) => sum + text.relY, 0) / props.texts.length
    for (const text of props.texts) text.relY = avgY
  }
  redraw()
}

function copyAudioReactive() {
  if (!props.activeText?.audioReactive) return
  const src = props.activeText.audioReactive
  for (const text of props.texts) {
    if (text === props.activeText) continue
    text.audioReactive = JSON.parse(JSON.stringify(src))
  }
  redraw()
}

function deleteAll() {
  const cm = canvasManager.value
  if (!cm) return
  // Über die undo-fähige Sammel-Löschung: registriert einen History-Command
  // und zeigt einen Toast mit "Rückgängig"-Button, damit ein versehentliches
  // Löschen aller Texte wiederhergestellt werden kann.
  cm.deleteTexts([...props.texts])
  emit('clear')
}

function selectAll() {
  canvasManager.value?.selectAllTexts()
}

function redraw() {
  canvasManager.value?.redrawCallback()
}
</script>

<style scoped>
.multi-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}

.multi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  padding: 6px 10px;
}

.multi-count {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-success);
}

.multi-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hint {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin: 0;
}

.section {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted);
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row-label {
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}

.size-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.slider,
.grow {
  flex: 1;
  min-width: 0;
}

.align-end {
  align-self: flex-end;
}

.color-input {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  padding: 0;
}

.nudge-row,
.align-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.nudge-hint {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-left: 4px;
}
</style>
