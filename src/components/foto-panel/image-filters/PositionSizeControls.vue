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
        <label class="toggle-label">
          <input v-model="keepAspect" class="image-keep-aspect" type="checkbox" />
          <span class="toggle-text">{{ t('foto.keepAspect') }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Position- und Größenregler für ein normales Canvas-Bild (Slider + Spinner).
 * - Position = Mittelpunkt in % der Canvas (0–100, ↺ = Mitte)
 * - Größe = Breite/Höhe in % der Canvas (1–200, ↺ = Standardgröße beim Platzieren)
 * Schreibt direkt in relX/relY/relWidth/relHeight des Bildes; der History-
 * Recorder erfasst die Änderung über das input-/change-Event. Änderungen mit
 * der Maus oder per Undo werden pro Frame abgeglichen.
 */
import { reactive, ref, toRaw, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import SliderControl from '../../ui/SliderControl.vue'
import {
  getBoundsCenter,
  positionBounds,
  resizeBounds,
  getDefaultImageSize,
  isValidBounds,
} from '../../../lib/imageBoundsControls.js'

const props = defineProps({
  // Ausgewähltes Canvas-Bild ({ relX, relY, relWidth, relHeight, imageObject })
  image: { type: Object, required: true },
  // { getCanvas(): HTMLCanvasElement|null, redraw(): void } – optional
  api: { type: Object, default: null },
})

const { t } = useI18n()

const AXES = ['x', 'y', 'width', 'height']
const LABELS = {
  x: 'foto.positionX',
  y: 'foto.positionY',
  width: 'foto.imageWidth',
  height: 'foto.imageHeight',
}

// Seitenverhältnis beibehalten (Standard) – sonst wird das Bild verzerrt
const keepAspect = ref(true)
// Angezeigte Werte (relativ 0–1)
const values = reactive({ x: 0.5, y: 0.5, width: 1 / 3, height: 1 / 3 })

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
  const c = getBoundsCenter(b)
  if (values.x !== c.x) values.x = c.x
  if (values.y !== c.y) values.y = c.y
  if (values.width !== b.relWidth) values.width = b.relWidth
  if (values.height !== b.relHeight) values.height = b.relHeight
}

/** Relativ (0–1) → Prozent mit einer Nachkommastelle. */
function percent(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0
}

function defaultPercent(axis) {
  if (axis === 'x' || axis === 'y') return 50
  const size = getDefaultImageSize(rawImage()?.imageObject, props.api?.getCanvas?.())
  return size ? percent(size[axis]) : undefined
}

/** Regler-Wert (Prozent) → Bounds des Bildes setzen. */
function onChange(axis, value) {
  const p = parseFloat(value)
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

watch(() => props.image, sync, { immediate: true })

// Maus-Verschieben/-Skalieren und Undo ändern das Bild außerhalb von Vue
let frame = null
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

defineExpose({ sync })
</script>

<style scoped src="../../ui/slider-control.css"></style>
<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--text-primary, #e9e9eb);
}
.toggle-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary, #c9984d);
  cursor: pointer;
}
[data-theme='light'] .toggle-label {
  color: #003971;
}
</style>
