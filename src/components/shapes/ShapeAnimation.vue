<template>
  <div class="shape-animation" data-shape-animation>
    <UiSelect
      :model-value="type"
      size="sm"
      :label="t('shapes.animation.type')"
      label-hidden
      :options="typeOptions"
      data-animation-type
      @update:model-value="(v) => setType(v as ShapeAnimationType)"
    />
    <template v-if="config">
      <SliderControl
        :label="isOneShot ? t('shapes.animation.duration') : t('shapes.animation.cycle')"
        :model-value="config.duration"
        :min="LIMITS.duration.min"
        :max="LIMITS.duration.max"
        :step="LIMITS.duration.step"
        :default-value="defaults.duration"
        :value-text="`${config.duration.toFixed(1)} s`"
        data-animation-duration
        @update:model-value="patch({ duration: Number($event) })"
        @change="emit('commit')"
      />
      <SliderControl
        v-if="hasIntensity"
        :label="t('shapes.animation.intensity')"
        :model-value="config.intensity"
        :min="LIMITS.intensity.min"
        :max="LIMITS.intensity.max"
        :step="LIMITS.intensity.step"
        :default-value="defaults.intensity"
        :value-text="`${Math.round(config.intensity)} %`"
        data-animation-intensity
        @update:model-value="patch({ intensity: Number($event) })"
        @change="emit('commit')"
      />
      <SliderControl
        v-if="isOneShot"
        :label="t('shapes.animation.delay')"
        :model-value="config.delay"
        :min="LIMITS.delay.min"
        :max="LIMITS.delay.max"
        :step="LIMITS.delay.step"
        :default-value="0"
        :value-text="`${config.delay.toFixed(1)} s`"
        data-animation-delay
        @update:model-value="patch({ delay: Number($event) })"
        @change="emit('commit')"
      />
      <p v-if="isOneShot" class="shape-animation__hint">{{ t('shapes.animation.oneShotHint') }}</p>
      <UiButton size="sm" block variant="secondary" data-animation-restart @click="restart">
        {{ t('shapes.animation.restart') }}
      </UiButton>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Animation der ausgewählten Form (Formen & Symbole): Pulsieren,
 * Ein-/Ausblenden, Blinken, Drehen, Pendeln, Hüpfen, Schweben, Wackeln sowie
 * einmaliges Einblenden, Ausblenden und Hereinzoomen.
 *
 * Arbeitet auf `shape.animation` im shapeStore (Logik in
 * lib/shapes/shapeAnimation.ts). Jede abgeschlossene Änderung meldet `commit`
 * (ein Verlaufsschritt im Formen-Panel) und startet die Vorschau neu.
 */
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useShapeStore } from '../../stores/shapeStore'
import {
  SHAPE_ANIMATION_DEFAULTS,
  SHAPE_ANIMATION_LIMITS,
  SHAPE_ANIMATION_NO_INTENSITY,
  SHAPE_ANIMATION_ONE_SHOT,
  SHAPE_ANIMATION_TYPES,
  createShapeAnimation,
  isOneShotAnimation,
  normalizeShapeAnimation,
} from '../../lib/shapes/shapeAnimation'
import type { ShapeAnimation, ShapeAnimationType } from '../../lib/shapes/shapeAnimation'
import type { Shape } from '../../stores/shapeStore'
import UiButton from '../ui/UiButton.vue'
import UiSelect from '../ui/UiSelect.vue'
import SliderControl from '../ui/SliderControl.vue'

const props = withDefaults(
  defineProps<{
    /** Ausgewählte Form aus dem shapeStore */
    shape?: Shape | null
  }>(),
  { shape: null },
)
const emit = defineEmits<{ commit: [] }>()

const { t } = useI18n()
const store = useShapeStore()
const LIMITS = SHAPE_ANIMATION_LIMITS

interface AnimationDefaults {
  duration: number
  intensity: number
}

const config = computed(() => normalizeShapeAnimation(props.shape?.animation))
const type = computed(() => config.value?.type ?? 'none')
const isOneShot = computed(() => isOneShotAnimation(type.value))
const hasIntensity = computed(() => !SHAPE_ANIMATION_NO_INTENSITY.includes(type.value))
const defaults = computed(
  () =>
    (SHAPE_ANIMATION_DEFAULTS as Partial<Record<ShapeAnimationType, AnimationDefaults>>)[
      type.value
    ] ?? { duration: 1, intensity: 100 },
)

const label = (value: ShapeAnimationType) => t(`shapes.animation.types.${value}`)

/** Auswahl gruppiert: Schleifen und einmalige Animationen */
const typeOptions = computed(() => {
  const loops = SHAPE_ANIMATION_TYPES.filter(
    (v) => v !== 'none' && !SHAPE_ANIMATION_ONE_SHOT.includes(v),
  )
  return [
    { value: 'none', label: label('none') },
    {
      label: t('shapes.animation.groupLoop'),
      options: loops.map((value) => ({ value, label: label(value) })),
    },
    {
      label: t('shapes.animation.groupOnce'),
      options: SHAPE_ANIMATION_ONE_SHOT.map((value) => ({ value, label: label(value) })),
    },
  ]
})

function restart() {
  if (props.shape) store.restartAnimation(props.shape.id)
}

function setType(value: ShapeAnimationType) {
  if (!props.shape || value === type.value) return
  store.updateShape(props.shape.id, { animation: createShapeAnimation(value) })
  restart()
  emit('commit')
}

/** Ändert einen Parameter (ohne Verlaufsschritt; der folgt bei `change`) */
function patch(update: Partial<ShapeAnimation>) {
  if (!props.shape || !config.value) return
  store.updateShape(props.shape.id, {
    animation: normalizeShapeAnimation({ ...config.value, ...update }),
  })
  restart()
}
</script>

<style scoped>
.shape-animation {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.shape-animation__hint {
  margin: 0;
  font-size: var(--ds-text-sm);
  line-height: var(--ds-leading);
  color: var(--ds-text-3);
}
</style>
