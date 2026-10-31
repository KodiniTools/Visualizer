<template>
  <div class="shapes-panel">
    <!-- Galerie -->
    <section class="shapes-section" :aria-label="t('shapes.title')">
      <UiSegmentedControl
        v-model="activeCategory"
        wrap
        size="sm"
        :label="t('shapes.title')"
        :options="categoryOptions"
      />

      <div class="shape-grid">
        <UiTile
          v-for="item in galleryItems"
          :key="item.id"
          :label="addLabel(item)"
          :disabled="disabled"
          :data-shape="item.id"
          :pressed="isDrawToolItem(item) ? drawTool === item.tool : undefined"
          @click="onTileClick(item)"
        >
          <ShapeIcon :item="item" :size="30" :text="stickerText(item)" />
        </UiTile>
      </div>

      <!-- Zeichenwerkzeuge: Stift / Textmarker -->
      <div v-if="activeCategory === 'draw'" class="draw-settings">
        <p class="shapes-hint">
          {{ drawTool ? t('shapes.draw.activeHint') : t('shapes.draw.hint') }}
        </p>
        <template v-if="drawTool">
          <ShapeColorField
            :model-value="drawStyle.color"
            :label="t('shapes.draw.color')"
            :recent-label="t('shapes.edit.recentColors')"
            @update:model-value="setDrawSetting({ color: $event })"
          />
          <SliderControl
            :label="t('shapes.edit.lineWidth')"
            :model-value="drawWidth"
            :min="1"
            :max="SHAPE_LIMITS.maxStroke"
            :value-text="`${drawWidth} px`"
            @update:model-value="setDrawSetting({ width: $event })"
          />
          <SliderControl
            :label="t('shapes.edit.opacity')"
            :model-value="drawStyle.opacity"
            :min="5"
            :max="100"
            :value-text="`${drawStyle.opacity} %`"
            @update:model-value="setDrawSetting({ opacity: $event })"
          />
          <UiButton block size="sm" data-action="draw-done" @click="setDrawTool(null)">
            {{ t('shapes.draw.done') }}
          </UiButton>
        </template>
      </div>

      <!-- Eingefügte Formen -->
      <div v-if="shapes.length" class="shape-list">
        <span class="section-title">{{ t('shapes.listTitle') }} ({{ shapes.length }})</span>
        <div
          v-for="shape in reversedShapes"
          :key="shape.id"
          class="shape-item"
          :class="{ selected: shape.id === selectedId }"
          role="button"
          tabindex="0"
          :aria-pressed="shape.id === selectedId"
          @click="select(shape.id)"
          @keyup.enter="select(shape.id)"
        >
          <span class="shape-item__icon">
            <ShapeIcon :item="galleryItemFor(shape)" :shape="shape" :size="22" />
          </span>
          <span class="shape-item__name">{{ shapeName(shape) }}</span>
          <UiIconButton
            size="sm"
            class="shape-item__delete"
            :label="t('shapes.edit.delete')"
            @click.stop="remove(shape.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
            </svg>
          </UiIconButton>
        </div>
      </div>
    </section>

    <!-- Bearbeiten -->
    <section
      v-if="selectedShape"
      class="shapes-section shape-edit"
      :aria-label="t('shapes.edit.title')"
    >
      <span class="section-title">{{ t('shapes.edit.title') }}</span>
      <p class="shapes-hint">{{ t('shapes.edit.hint') }}</p>

      <!-- Marker: Nummer und Stil -->
      <template v-if="isMarker">
        <SliderControl
          :label="t('shapes.edit.number')"
          :model-value="Number(selectedShape.number) || 1"
          :min="1"
          :max="Math.max(99, Number(selectedShape.number) || 1)"
          :value-text="String(Number(selectedShape.number) || 1)"
          @update:model-value="update({ number: Math.min(MARKER_MAX, Math.max(1, $event)) })"
          @change="commit"
        />
        <UiSegmentedControl
          :model-value="selectedShape.markerStyle || 'circle'"
          size="sm"
          :label="t('shapes.edit.markerStyle')"
          :options="optionsFor(MARKER_STYLES, 'shapes.markerStyles')"
          @update:model-value="setAndCommit({ markerStyle: $event })"
        />
        <ShapeColorField
          :model-value="selectedShape.textColor || '#ffffff'"
          :label="t('shapes.edit.textColor')"
          :recent-label="t('shapes.edit.recentColors')"
          @update:model-value="update({ textColor: $event })"
          @commit="commit"
        />
      </template>

      <!-- Emoji tauschen -->
      <div v-if="isEmoji" class="control-block">
        <span class="field-label">{{ t('shapes.edit.emoji') }}</span>
        <div class="emoji-grid">
          <UiTile
            v-for="(glyph, id) in EMOJI_SET"
            :key="id"
            size="sm"
            class="emoji-option"
            :label="t(`shapes.items.${id}`)"
            :pressed="selectedShape.emoji === glyph"
            @click="setAndCommit({ emoji: glyph, galleryId: id })"
          >
            {{ glyph }}
          </UiTile>
        </div>
      </div>

      <!-- Text in der Form (skaliert mit der Form) -->
      <template v-if="hasTextBox">
        <UiTextArea
          :model-value="selectedShape.text || ''"
          class="shape-text"
          :label="t('shapes.edit.text')"
          :placeholder="t('shapes.edit.textPlaceholder')"
          :rows="2"
          data-shape-text
          @update:model-value="update({ text: $event })"
          @change="commit"
        />
        <UiSelect
          :model-value="selectedShape.fontFamily || SHAPE_TEXT_DEFAULTS.fontFamily"
          size="sm"
          :label="t('shapes.edit.font')"
          :options="fontOptions"
          @update:model-value="setFont"
        />
        <SliderControl
          :label="t('shapes.edit.fontSize')"
          :model-value="fontSizePx"
          :min="4"
          :max="fontSizeMax"
          :value-text="`${fontSizePx} px`"
          @update:model-value="setFontSize"
          @change="commit"
        />
        <ShapeColorField
          :model-value="selectedShape.textColor || SHAPE_TEXT_DEFAULTS.textColor"
          :label="t('shapes.edit.textFill')"
          :recent-label="t('shapes.edit.recentColors')"
          @update:model-value="update({ textColor: $event })"
          @commit="commit"
        />
        <UiSegmentedControl
          :model-value="selectedShape.textAlign || 'center'"
          size="sm"
          :label="t('shapes.edit.textAlign')"
          :options="optionsFor(TEXT_ALIGNS, 'shapes.align')"
          @update:model-value="setAndCommit({ textAlign: $event })"
        />
      </template>

      <!-- Verpixeln / Weichzeichnen -->
      <template v-if="isEffect">
        <UiSegmentedControl
          :model-value="selectedShape.effect || 'pixelate'"
          size="sm"
          :label="t('shapes.edit.effect')"
          :options="optionsFor(CENSOR_EFFECTS, 'shapes.effects')"
          @update:model-value="setAndCommit({ effect: $event })"
        />
        <UiSegmentedControl
          :model-value="selectedShape.region || 'rect'"
          size="sm"
          :label="t('shapes.edit.region')"
          :options="optionsFor(CENSOR_REGIONS, 'shapes.regions')"
          @update:model-value="setAndCommit({ region: $event })"
        />
        <SliderControl
          :label="t('shapes.edit.intensity')"
          :model-value="Number(selectedShape.intensity) || 50"
          :min="1"
          :max="100"
          :default-value="50"
          :value-text="`${Number(selectedShape.intensity) || 50} %`"
          @update:model-value="update({ intensity: $event })"
          @change="commit"
        />
      </template>

      <!-- Farbe / Füllung -->
      <div v-if="isFillKind || isMarker" class="control-block">
        <UiSwitch
          v-if="isFillKind"
          :model-value="selectedShape.filled !== false"
          :label="t('shapes.edit.fill')"
          data-toggle="fill"
          @update:model-value="toggleFill"
        />
        <template v-if="selectedShape.filled !== false">
          <UiSegmentedControl
            :model-value="fillType"
            size="sm"
            :label="t('shapes.edit.fillType')"
            :options="optionsFor(FILL_TYPES, 'shapes.fillTypes')"
            data-fill-type-control
            @update:model-value="setAndCommit({ fillType: $event })"
          />
          <ShapeColorField
            :model-value="selectedShape.fillColor"
            :label="isGradient ? t('shapes.edit.gradientFrom') : t('shapes.edit.fillColor')"
            :recent-label="t('shapes.edit.recentColors')"
            @update:model-value="update({ fillColor: $event })"
            @commit="commit"
          />
          <template v-if="isGradient">
            <ShapeColorField
              :model-value="selectedShape.fillColor2 || '#ffffff'"
              :label="t('shapes.edit.gradientTo')"
              :recent-label="t('shapes.edit.recentColors')"
              @update:model-value="update({ fillColor2: $event })"
              @commit="commit"
            />
            <UiButton size="sm" block data-action="swap-gradient" @click="swapGradient">
              {{ t('shapes.edit.gradientSwap') }}
            </UiButton>
            <SliderControl
              v-if="fillType === 'linear'"
              :label="t('shapes.edit.gradientAngle')"
              :model-value="Math.round(selectedShape.gradientAngle ?? 90)"
              :min="0"
              :max="360"
              :default-value="90"
              :value-text="`${Math.round(selectedShape.gradientAngle ?? 90)}°`"
              @update:model-value="update({ gradientAngle: $event })"
              @change="commit"
            />
          </template>
        </template>
      </div>

      <!-- Linie bzw. Umrandung -->
      <div v-if="!isEffect && !isEmoji" class="control-block">
        <SliderControl
          :label="isStrokeKind ? t('shapes.edit.lineWidth') : t('shapes.edit.stroke')"
          :model-value="selectedShape.strokeWidth || 0"
          :min="isStrokeKind ? 1 : 0"
          :max="SHAPE_LIMITS.maxStroke"
          :value-text="`${selectedShape.strokeWidth || 0} px`"
          @update:model-value="update({ strokeWidth: $event })"
          @change="commit"
        />
        <ShapeColorField
          v-if="hasStroke"
          :model-value="selectedShape.strokeColor"
          :label="t('shapes.edit.strokeColor')"
          :recent-label="t('shapes.edit.recentColors')"
          @update:model-value="update({ strokeColor: $event })"
          @commit="commit"
        />
        <UiSegmentedControl
          v-if="hasStroke && !isMarker"
          :model-value="selectedShape.dash || 'solid'"
          size="sm"
          :label="t('shapes.edit.lineStyle')"
          :options="optionsFor(DASH_STYLES, 'shapes.dash')"
          @update:model-value="setAndCommit({ dash: $event })"
        />
      </div>

      <!-- Deckkraft -->
      <SliderControl
        :label="t('shapes.edit.opacity')"
        :model-value="selectedShape.opacity ?? 100"
        :min="0"
        :max="100"
        :default-value="100"
        :value-text="`${selectedShape.opacity ?? 100} %`"
        @update:model-value="update({ opacity: $event })"
        @change="commit"
      />

      <!-- Drehen + Spiegeln -->
      <div class="control-block">
        <SliderControl
          :label="t('shapes.edit.rotation')"
          :model-value="Math.round(selectedShape.rotation || 0)"
          :min="-180"
          :max="180"
          :default-value="0"
          :value-text="`${Math.round(selectedShape.rotation || 0)}°`"
          @update:model-value="update({ rotation: $event })"
          @change="commit"
        />
        <div v-if="!isMarker && !isEffect" class="flip-row">
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('shapes.edit.flipH')"
            :pressed="!!selectedShape.flipX"
            data-flip="x"
            @click="setAndCommit({ flipX: !selectedShape.flipX })"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3v18M8 7l-5 5 5 5V7Zm8 0 5 5-5 5V7Z" />
            </svg>
          </UiIconButton>
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('shapes.edit.flipV')"
            :pressed="!!selectedShape.flipY"
            data-flip="y"
            @click="setAndCommit({ flipY: !selectedShape.flipY })"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M3 12h18M7 8l5-5 5 5H7Zm0 8 5 5 5-5H7Z" />
            </svg>
          </UiIconButton>
        </div>
      </div>

      <!-- Größe -->
      <SliderControl
        v-if="isMarker || isEmoji"
        :label="t('shapes.edit.size')"
        :model-value="Math.round(selectedShape.width)"
        :min="SHAPE_LIMITS.minSize"
        :max="sizeMax(selectedShape.width)"
        :value-text="`${Math.round(selectedShape.width)} px`"
        @update:model-value="update({ width: $event, height: $event })"
        @change="commit"
      />
      <template v-else>
        <SliderControl
          :label="heightless ? t('shapes.edit.length') : t('shapes.edit.width')"
          :model-value="Math.round(selectedShape.width)"
          :min="SHAPE_LIMITS.minSize"
          :max="sizeMax(selectedShape.width)"
          :value-text="`${Math.round(selectedShape.width)} px`"
          @update:model-value="setWidth"
          @change="commit"
        />
        <template v-if="!heightless">
          <SliderControl
            :label="t('shapes.edit.height')"
            :model-value="Math.round(selectedShape.height)"
            :min="SHAPE_LIMITS.minSize"
            :max="sizeMax(selectedShape.height)"
            :value-text="`${Math.round(selectedShape.height)} px`"
            @update:model-value="setHeight"
            @change="commit"
          />
          <UiSwitch v-model="lockRatio" :label="t('shapes.edit.lockRatio')" />
        </template>
      </template>

      <!-- Position (Mittelpunkt) -->
      <SliderControl
        :label="t('shapes.edit.positionX')"
        :model-value="Math.round(selectedShape.x)"
        :min="rangeX.min"
        :max="rangeX.max"
        :value-text="`${Math.round(selectedShape.x)} px`"
        @update:model-value="update({ x: $event })"
        @change="commit"
      />
      <SliderControl
        :label="t('shapes.edit.positionY')"
        :model-value="Math.round(selectedShape.y)"
        :min="rangeY.min"
        :max="rangeY.max"
        :value-text="`${Math.round(selectedShape.y)} px`"
        @update:model-value="update({ y: $event })"
        @change="commit"
      />

      <!-- Schatten -->
      <div v-if="!isEffect" class="control-block">
        <SliderControl
          :label="t('shapes.edit.shadow')"
          :model-value="selectedShape.shadowBlur || 0"
          :min="0"
          :max="SHAPE_LIMITS.maxShadow"
          :default-value="0"
          :value-text="`${selectedShape.shadowBlur || 0} px`"
          @update:model-value="update({ shadowBlur: $event })"
          @change="commit"
        />
        <ShapeColorField
          v-if="(selectedShape.shadowBlur || 0) > 0"
          :model-value="selectedShape.shadowColor || '#000000'"
          :label="t('shapes.edit.shadowColor')"
          :recent-label="t('shapes.edit.recentColors')"
          @update:model-value="update({ shadowColor: $event })"
          @commit="commit"
        />
      </div>

      <!-- Ebene & Aktionen -->
      <div class="action-grid">
        <UiButton size="sm" :disabled="isTop" data-action="forward" @click="reorder('up')">
          {{ t('shapes.edit.bringForward') }}
        </UiButton>
        <UiButton size="sm" :disabled="isBottom" data-action="backward" @click="reorder('down')">
          {{ t('shapes.edit.sendBackward') }}
        </UiButton>
      </div>
      <UiButton size="sm" block data-action="duplicate" @click="duplicate">
        {{ t('shapes.edit.duplicate') }}
      </UiButton>
      <UiButton
        size="sm"
        block
        variant="danger"
        data-action="delete"
        @click="remove(selectedShape.id)"
      >
        {{ t('shapes.edit.delete') }}
      </UiButton>
      <UiButton size="sm" block variant="ghost" data-action="deselect" @click="select(null)">
        {{ t('shapes.edit.deselect') }}
      </UiButton>
    </section>
  </div>
</template>

<script setup>
/**
 * ShapesPanel – Galerie „Formen & Symbole“ (inkl. Sticker und Emojis) plus
 * Bearbeitung der ausgewählten Form; Nachbau der Galerie aus
 * KodiniTools/Bildkonverter mit den Ui-Komponenten des Visualizers.
 *
 * Arbeitet direkt auf dem shapeStore; die Render-Schleife zeichnet jedes Frame
 * neu. Ein Verlaufsschritt pro abgeschlossener Änderung (commit).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { CUSTOM_FONTS } from '../../lib/fonts.js'
import { useShapeStore } from '../../stores/shapeStore.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { getHistoryRecorder } from '../../lib/history/historyRecorder.js'
import { SHAPES_FOCUS_TEXT_EVENT } from '../../lib/shapes/shapeInteraction.js'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import UiTextArea from '../ui/UiTextArea.vue'
import UiTile from '../ui/UiTile.vue'
import SliderControl from '../ui/SliderControl.vue'
import ShapeIcon from './ShapeIcon.vue'
import ShapeColorField from './ShapeColorField.vue'
import {
  CENSOR_EFFECTS,
  CENSOR_REGIONS,
  DASH_STYLES,
  EMOJI_SET,
  FILL_TYPES,
  MARKER_MAX,
  MARKER_STYLES,
  SHAPE_CATEGORIES,
  SHAPE_GALLERY,
  SHAPE_KIND,
  SHAPE_LIMITS,
  SHAPE_TEXT_DEFAULTS,
  TEXT_ALIGNS,
  TEXT_SCALE_LIMITS,
  getDefaultDrawWidth,
  getShapeFontSize,
  getShapeKind,
  isDrawToolItem,
  isHeightless,
  supportsShapeText,
} from '../../lib/shapes/shapes.js'

const props = defineProps({
  /** Canvas-Größe in px (Startgröße/-position neuer Formen, Reglerbereiche); 0 = Live-Canvas */
  canvasWidth: { type: Number, default: 0 },
  canvasHeight: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})

const { t } = useI18n()
const shapeStore = useShapeStore()
const historyStore = useHistoryStore()

const activeCategory = ref(SHAPE_CATEGORIES[0])
const lockRatio = ref(false)

const categoryOptions = computed(() =>
  SHAPE_CATEGORIES.map((value) => ({ value, label: t(`shapes.categories.${value}`) })),
)

/** Optionen für UiSegmentedControl aus einer Werteliste und einem i18n-Präfix */
function optionsFor(values, prefix) {
  return values.map((value) => ({ value, label: t(`${prefix}.${value}`) }))
}

const fontOptions = computed(() => {
  const names = CUSTOM_FONTS.map((f) => f.name)
  const current = shapeStore.selectedShape?.fontFamily
  if (current && !names.includes(current)) names.unshift(current)
  return names.map((name) => ({ value: name, label: name }))
})

const galleryItems = computed(() =>
  SHAPE_GALLERY.filter((item) => item.category === activeCategory.value),
)

const shapes = computed(() => shapeStore.shapes)
// Oberste Form zuerst (wie in Ebenen-Listen üblich)
const reversedShapes = computed(() => [...shapes.value].reverse())
const selectedId = computed(() => shapeStore.selectedShapeId)
const selectedShape = computed(() => shapeStore.selectedShape)

const selectedKind = computed(() => getShapeKind(selectedShape.value?.type))
const isFillKind = computed(() => selectedKind.value === SHAPE_KIND.FILL)
const isStrokeKind = computed(() => selectedKind.value === SHAPE_KIND.STROKE)
const isMarker = computed(() => selectedKind.value === SHAPE_KIND.MARKER)
const isEffect = computed(() => selectedKind.value === SHAPE_KIND.EFFECT)
const isEmoji = computed(() => selectedKind.value === SHAPE_KIND.EMOJI)
const fillType = computed(() =>
  FILL_TYPES.includes(selectedShape.value?.fillType) ? selectedShape.value.fillType : 'solid',
)
const isGradient = computed(() => fillType.value !== 'solid')
const heightless = computed(() => isHeightless(selectedShape.value?.type))
const hasStroke = computed(() => (selectedShape.value?.strokeWidth || 0) > 0)
const shapeIndex = computed(() => shapes.value.findIndex((s) => s.id === selectedId.value))
const hasTextBox = computed(() => supportsShapeText(selectedShape.value?.type))
const isTop = computed(() => shapeIndex.value === shapes.value.length - 1)
const isBottom = computed(() => shapeIndex.value <= 0)

function swapGradient() {
  const shape = selectedShape.value
  if (!shape) return
  setAndCommit({ fillColor: shape.fillColor2 || '#ffffff', fillColor2: shape.fillColor })
}

// ===== Text in Formen =====
const minSide = computed(() =>
  Math.max(1, Math.min(selectedShape.value?.width || 1, selectedShape.value?.height || 1)),
)
const fontSizePx = computed(() =>
  selectedShape.value ? Math.round(getShapeFontSize(selectedShape.value)) : 0,
)
const fontSizeMax = computed(() =>
  Math.max(8, Math.round(minSide.value * TEXT_SCALE_LIMITS.max), fontSizePx.value),
)

/** Schriftgröße in px → textScale (Anteil an der Form, damit sie mitskaliert) */
function setFontSize(px) {
  const scale = Number(px) / minSide.value
  update({
    textScale:
      Math.round(Math.max(TEXT_SCALE_LIMITS.min, Math.min(TEXT_SCALE_LIMITS.max, scale)) * 10000) /
      10000,
  })
}

function setFont(fontFamily) {
  setAndCommit({ fontFamily })
  // Schrift laden; die Render-Schleife zeichnet ohnehin jedes Frame neu
  document.fonts?.load?.(`32px "${fontFamily}"`).catch(() => {})
}

// ===== Zeichenwerkzeuge =====
const drawTool = computed(() => shapeStore.drawTool)
const drawStyle = computed(
  () => shapeStore.drawSettings[drawTool.value] ?? { color: '#000000', opacity: 100 },
)
const drawWidth = computed(() => {
  const { width, height } = canvasSize()
  return drawStyle.value.width ?? getDefaultDrawWidth(drawTool.value, width, height)
})

function setDrawTool(tool) {
  shapeStore.setDrawTool(tool)
}

function setDrawSetting(patch) {
  if (drawTool.value) shapeStore.updateDrawSettings(drawTool.value, patch)
}

function onTileClick(item) {
  if (props.disabled) return
  if (isDrawToolItem(item)) {
    setDrawTool(drawTool.value === item.tool ? null : item.tool)
    return
  }
  setDrawTool(null)
  addShape(item.id)
}

// Zeichenmodus endet beim Verlassen des Reiters „Zeichnen“
watch(activeCategory, (category) => {
  if (category !== 'draw' && drawTool.value) setDrawTool(null)
})
// Wird der Modus von außen gestartet, Reiter passend halten
watch(drawTool, (tool) => {
  if (tool) activeCategory.value = 'draw'
})

/** Doppelklick auf eine Form mit Text: Texteingabe fokussieren */
function focusTextInput() {
  nextTick(() => {
    const input = document.querySelector('.shapes-panel [data-shape-text]')
    if (input) {
      input.focus()
      input.select?.()
    }
  })
}
onMounted(() => window.addEventListener(SHAPES_FOCUS_TEXT_EVENT, focusTextInput))
onBeforeUnmount(() => {
  window.removeEventListener(SHAPES_FOCUS_TEXT_EVENT, focusTextInput)
  if (drawTool.value) setDrawTool(null)
})

function canvasSize() {
  const live =
    typeof document !== 'undefined' ? document.querySelector('.canvas-wrapper canvas') : null
  return {
    width: props.canvasWidth || live?.width || shapeStore.canvasSize.width || 1920,
    height: props.canvasHeight || live?.height || shapeStore.canvasSize.height || 1080,
  }
}

// Reglerbereich = Canvas; liegt die Form außerhalb, wird er erweitert
const rangeX = computed(() => {
  const x = Math.round(selectedShape.value?.x || 0)
  return { min: Math.min(0, x), max: Math.max(1, canvasSize().width, x) }
})
const rangeY = computed(() => {
  const y = Math.round(selectedShape.value?.y || 0)
  return { min: Math.min(0, y), max: Math.max(1, canvasSize().height, y) }
})

function sizeMax(current) {
  const { width, height } = canvasSize()
  return Math.max(SHAPE_LIMITS.minSize + 1, Math.round(Math.max(width, height) * 2), current)
}

function galleryItemFor(shape) {
  return (
    SHAPE_GALLERY.find((g) => g.id === shape.galleryId) ?? {
      id: shape.type,
      type: shape.type,
      aspect: shape.width / Math.max(1, shape.height),
    }
  )
}

function shapeName(shape) {
  return SHAPE_GALLERY.some((g) => g.id === shape.galleryId)
    ? t(`shapes.items.${shape.galleryId}`)
    : shape.type
}

function addLabel(item) {
  return t('shapes.add').replace('{name}', t(`shapes.items.${item.id}`))
}

/** Sticker mit übersetzbarem Text (z. B. „Neu“) */
function stickerText(item) {
  const key = item?.preset?.textKey
  return key ? t(`shapes.stickerText.${key}`) : null
}

function commit() {
  try {
    getHistoryRecorder(historyStore).checkpoint()
  } catch (error) {
    console.error('❌ [Shapes] Verlaufsschritt fehlgeschlagen:', error)
  }
}

function update(patch) {
  if (!selectedShape.value) return
  shapeStore.updateShape(selectedShape.value.id, patch)
}

function setAndCommit(patch) {
  update(patch)
  commit()
}

function toggleFill(filled) {
  const shape = selectedShape.value
  if (!shape) return
  // Ohne Füllung muss eine Kontur sichtbar bleiben, sonst verschwindet die Form
  const patch = { filled }
  if (!filled && !(shape.strokeWidth > 0)) {
    patch.strokeWidth = Math.max(2, Math.round(Math.min(shape.width, shape.height) * 0.05))
  }
  setAndCommit(patch)
}

function setWidth(width) {
  const shape = selectedShape.value
  if (!shape) return
  const patch = { width }
  if (lockRatio.value && !heightless.value && shape.width > 0) {
    patch.height = Math.max(SHAPE_LIMITS.minSize, Math.round(width * (shape.height / shape.width)))
  }
  update(patch)
}

function setHeight(height) {
  const shape = selectedShape.value
  if (!shape) return
  const patch = { height }
  if (lockRatio.value && shape.height > 0) {
    patch.width = Math.max(SHAPE_LIMITS.minSize, Math.round(height * (shape.width / shape.height)))
  }
  update(patch)
}

function addShape(galleryId) {
  const { width, height } = canvasSize()
  const shape = shapeStore.addShape(galleryId, width, height)
  if (!shape) return
  const text = stickerText(SHAPE_GALLERY.find((g) => g.id === galleryId))
  if (text) shapeStore.updateShape(shape.id, { text })
  commit()
}

function select(id) {
  if (id !== null && drawTool.value) setDrawTool(null)
  shapeStore.selectShape(id)
}

function remove(id) {
  if (shapeStore.deleteShape(id)) commit()
}

function duplicate() {
  if (selectedShape.value && shapeStore.duplicateShape(selectedShape.value.id)) commit()
}

function reorder(direction) {
  if (selectedShape.value && shapeStore.moveShapeOrder(selectedShape.value.id, direction)) {
    commit()
  }
}
</script>

<style scoped>
.shapes-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}

.shapes-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.shape-edit {
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

/* ds-eyebrow */
.section-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.field-label {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-2);
}

.shapes-hint {
  margin: 0;
  font-size: var(--ds-text-sm);
  line-height: var(--ds-leading);
  color: var(--ds-text-3);
}

.control-block {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.control-block > .ui-segmented,
.shapes-section > .ui-segmented {
  align-self: stretch;
}

/* Galerie-Kacheln */
.shape-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ds-space-2);
}

.draw-settings {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

/* Liste der eingefügten Formen (wie die Textliste) */
.shape-list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.shape-item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-1) var(--ds-space-1) var(--ds-space-1) var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition:
    background-color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.shape-item:hover {
  background: var(--ds-surface-3);
}

.shape-item:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.shape-item.selected {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.shape-item__icon {
  display: flex;
  color: var(--ds-text-2);
}

.shape-item__name {
  flex: 1;
  min-width: 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shape-item__delete:hover:not(:disabled) {
  color: var(--ds-danger);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--ds-space-1);
}

.flip-row {
  display: flex;
  gap: var(--ds-space-2);
}

.action-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--ds-space-2);
}
</style>
