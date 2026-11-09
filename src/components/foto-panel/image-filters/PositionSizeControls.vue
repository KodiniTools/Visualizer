<template>
  <!-- Position (Mittelpunkt) und Größe (B×H) des ausgewählten Canvas-Bildes -->
  <div class="position-size-controls">
    <div class="modern-section-header">
      <h4>{{ t('foto.positionSize') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="slider-stack">
        <SliderControl
          v-for="axis in AXES"
          :key="axis"
          :input-class="`image-${axis}-slider`"
          :label="t(LABELS[axis])"
          :model-value="percent(values[axis])"
          :min="axis === 'x' || axis === 'y' ? 0 : 1"
          :max="axis === 'x' || axis === 'y' ? 100 : 200"
          :step="0.1"
          :default-value="defaultPercent(axis)"
          :value-text="`${percent(values[axis])}%`"
          @update:model-value="(v) => onChange(axis, v)"
        />
        <UiSwitch v-model="keepAspect" class="image-keep-aspect" :label="t('foto.keepAspect')" />
      </div>

      <!-- Exakt an Canvas/Workspace anpassen (Ziehen mit der Maus ist nie pixelgenau) -->
      <div class="image-fit" role="group" :aria-label="t('foto.fitToCanvas')">
        <span class="image-fit__label">{{ t('foto.fitToCanvas') }}</span>
        <div class="image-fit__buttons">
          <UiButton
            v-for="mode in IMAGE_FIT_MODES"
            :key="mode"
            :class="`image-fit-${mode}`"
            variant="secondary"
            size="sm"
            :title="t(FIT_HINTS[mode])"
            @click="fit(mode)"
          >
            {{ t(FIT_LABELS[mode]) }}
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Position- und Größenregler für ein normales Canvas-Bild (Slider + Spinner).
 * - Position = Mittelpunkt in % der Canvas (0–100, ↺ = Mitte)
 * - Größe = Breite/Höhe in % der Canvas (1–200, ↺ = Standardgröße beim Platzieren)
 * Schreibt direkt in relX/relY/relWidth/relHeight des Bildes; der History-
 * Recorder erfasst die Änderung über das input-/change-Event. Änderungen mit
 * der Maus oder per Undo werden pro Frame abgeglichen.
 */
import { reactive, ref, toRaw, watch, onMounted, onBeforeUnmount } from 'vue'
import { loadKeepAspect, saveKeepAspect } from '../../../lib/imagePlacementSettings'
import { useI18n } from '../../../lib/i18n'
import SliderControl from '../../ui/SliderControl.vue'
import UiButton from '../../ui/UiButton.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import {
  getBoundsCenter,
  positionBounds,
  resizeBounds,
  getDefaultImageSize,
  isValidBounds,
  fitBoundsToArea,
  IMAGE_FIT_MODES,
  type ImageFitMode,
} from '../../../lib/imageBoundsControls'
import type { ImageBoundsApi } from './imageFilterContext'

/** Bild mit relativen Bounds (Canvas-Bild) */
interface PositionSizeImage {
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  imageObject?: HTMLImageElement | null
}

type Axis = 'x' | 'y' | 'width' | 'height'

const props = withDefaults(
  defineProps<{
    /** Ausgewähltes Canvas-Bild ({ relX, relY, relWidth, relHeight, imageObject }) */
    image: PositionSizeImage
    /** { getCanvas(): HTMLCanvasElement|null, redraw(): void } – optional */
    api?: ImageBoundsApi | null
  }>(),
  { api: null },
)

const { t } = useI18n()

const AXES: readonly Axis[] = ['x', 'y', 'width', 'height']
const LABELS: Record<Axis, string> = {
  x: 'foto.positionX',
  y: 'foto.positionY',
  width: 'foto.imageWidth',
  height: 'foto.imageHeight',
}

const FIT_LABELS: Record<ImageFitMode, string> = {
  cover: 'foto.fitCover',
  contain: 'foto.fitContain',
  stretch: 'foto.fitStretch',
}
const FIT_HINTS: Record<ImageFitMode, string> = {
  cover: 'foto.fitCoverHint',
  contain: 'foto.fitContainHint',
  stretch: 'foto.fitStretchHint',
}

// Seitenverhältnis beibehalten (Standard) – sonst wird das Bild verzerrt
const keepAspect = ref(loadKeepAspect()) // dauerhaft gespeichert
watch(keepAspect, saveKeepAspect)
// Angezeigte Werte (relativ 0–1)
const values = reactive<Record<Axis, number>>({ x: 0.5, y: 0.5, width: 1 / 3, height: 1 / 3 })

function rawImage() {
  return toRaw(props.image)
}

function readBounds() {
  const img = rawImage()
  if (!img) return null
  const { relX, relY, relWidth, relHeight } = img
  const b = { relX, relY, relWidth, relHeight }
  return isValidBounds(b) ? b : null
}

/** Übernimmt die aktuellen Bounds des Bildes in die Regler (nur bei Änderung). */
function sync() {
  const b = readBounds()
  if (!b) return
  const c = getBoundsCenter(b) as { x: number; y: number } // b ist gültig
  if (values.x !== c.x) values.x = c.x
  if (values.y !== c.y) values.y = c.y
  if (values.width !== b.relWidth) values.width = b.relWidth
  if (values.height !== b.relHeight) values.height = b.relHeight
}

/** Relativ (0–1) → Prozent mit einer Nachkommastelle. */
function percent(value: number) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0
}

function defaultPercent(axis: Axis) {
  if (axis === 'x' || axis === 'y') return 50
  const size = getDefaultImageSize(rawImage()?.imageObject, props.api?.getCanvas?.())
  return size ? percent(size[axis]) : undefined
}

/** Regler-Wert (Prozent) → Bounds des Bildes setzen. */
function onChange(axis: Axis, value: unknown) {
  const p = parseFloat(value as string)
  const base = readBounds()
  if (!Number.isFinite(p) || !base) return
  const rel = p / 100
  const next =
    axis === 'x' || axis === 'y'
      ? positionBounds(base, axis === 'x' ? { centerX: rel } : { centerY: rel })
      : resizeBounds(base, { [axis]: rel, keepAspect: keepAspect.value })
  if (!next) return
  Object.assign(rawImage(), next)
  sync()
  props.api?.redraw?.()
}

/** Bild exakt an Canvas (bzw. aktiven Workspace) anpassen. */
function fit(mode: ImageFitMode) {
  const img = rawImage()
  if (!img || !readBounds()) return
  const next = fitBoundsToArea(
    img.imageObject,
    props.api?.getCanvas?.(),
    mode,
    props.api?.getFitArea?.() ?? null,
  )
  if (!next) return
  Object.assign(img, next)
  sync()
  props.api?.redraw?.()
}

watch(() => props.image, sync, { immediate: true })

// Maus-Verschieben/-Skalieren und Undo ändern das Bild außerhalb von Vue
let frame: number | null = null
function loop() {
  sync()
  frame = requestAnimationFrame(loop)
}
onMounted(() => {
  if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
  frame = null
})

defineExpose({ sync, fit })
</script>

<style scoped src="../../ui/slider-control.css"></style>
<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.image-fit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.image-fit__label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}
.image-fit__buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.image-fit__buttons :deep(.ui-button) {
  justify-content: center;
  min-width: 0;
}
</style>
