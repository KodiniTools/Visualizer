<template>
  <div class="placement-section">
    <h4 class="placement-header">{{ t('placement.title') }}</h4>

    <UiSelect
      :model-value="localAnimation"
      :label="t('placement.effect')"
      :options="animationOptions"
      size="sm"
      inline
      @update:model-value="update('Animation', $event)"
    />

    <SliderControl
      v-if="localAnimation !== 'none'"
      :model-value="localDuration"
      :label="t('placement.duration')"
      :min="100"
      :max="5000"
      :step="100"
      :default-value="1000"
      :value-text="`${(localDuration / 1000).toFixed(1)}s`"
      @update:model-value="update('Duration', $event)"
    />

    <SliderControl
      :model-value="localScale"
      :label="t('placement.size')"
      :min="1"
      :max="8"
      :step="1"
      :default-value="1"
      :value-text="`${localScale}x`"
      @update:model-value="update('Scale', $event)"
    />

    <SliderControl
      :model-value="localOffsetX"
      label="X"
      :min="-500"
      :max="500"
      :step="10"
      :default-value="0"
      value-text="px"
      @update:model-value="update('OffsetX', $event)"
    />

    <SliderControl
      :model-value="localOffsetY"
      label="Y"
      :min="-500"
      :max="500"
      :step="10"
      :default-value="0"
      value-text="px"
      @update:model-value="update('OffsetY', $event)"
    />

    <div class="placement-buttons">
      <UiButton variant="secondary" size="sm" @click="$emit('start-draw')">
        {{ t('placement.draw') }}
      </UiButton>
      <UiButton variant="primary" size="sm" @click="$emit('place-directly')">
        {{ t('placement.place') }}
      </UiButton>
    </div>
    <p v-if="isInRangeSelectionMode" class="placement-hint" role="status">
      {{ t('placement.drawHint') }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n'
import { placementAnimationOptions } from '../../lib/placementAnimations'
import SliderControl from '../ui/SliderControl.vue'
import UiButton from '../ui/UiButton.vue'
import UiSelect from '../ui/UiSelect.vue'

const { t } = useI18n()

const props = defineProps({
  selectedAnimation: {
    type: String,
    default: 'none',
  },
  animationDuration: {
    type: Number,
    default: 1000,
  },
  imageScale: {
    type: Number,
    default: 1,
  },
  imageOffsetX: {
    type: Number,
    default: 0,
  },
  imageOffsetY: {
    type: Number,
    default: 0,
  },
  isInRangeSelectionMode: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:settings', 'start-draw', 'place-directly'])

const localAnimation = ref(props.selectedAnimation)
const localDuration = ref(props.animationDuration)
const localScale = ref(props.imageScale)
const localOffsetX = ref(props.imageOffsetX)
const localOffsetY = ref(props.imageOffsetY)

watch(
  () => props.selectedAnimation,
  (val) => (localAnimation.value = val),
)
watch(
  () => props.animationDuration,
  (val) => (localDuration.value = val),
)
watch(
  () => props.imageScale,
  (val) => (localScale.value = val),
)
watch(
  () => props.imageOffsetX,
  (val) => (localOffsetX.value = val),
)
watch(
  () => props.imageOffsetY,
  (val) => (localOffsetY.value = val),
)

const animationOptions = computed(() => placementAnimationOptions(t))

const locals = {
  Animation: localAnimation,
  Duration: localDuration,
  Scale: localScale,
  OffsetX: localOffsetX,
  OffsetY: localOffsetY,
}

/** Lokalen Wert setzen und alle Einstellungen melden (Schnittstelle wie bisher). */
function update(key, value) {
  locals[key].value = value
  emitUpdate()
}

function emitUpdate() {
  emit('update:settings', {
    selectedAnimation: localAnimation.value,
    animationDuration: localDuration.value,
    imageScale: localScale.value,
    imageOffsetX: localOffsetX.value,
    imageOffsetY: localOffsetY.value,
  })
}
</script>

<style scoped>
.placement-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  margin-top: var(--ds-space-2);
  padding: var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.placement-header {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

/* Auswahl füllt die Zeile; Label in derselben Optik wie die Regler-Labels */
.placement-section > .ui-select :deep(.ui-select__control) {
  flex: 1;
}

.placement-section > .ui-select :deep(.ui-select__label) {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.placement-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ds-space-2);
}

.placement-hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  text-align: center;
}
</style>
