<template>
  <div class="placement-section">
    <div class="placement-header">
      <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
    </div>

    <!-- Kompakte Einstellungen Grid -->
    <div class="placement-grid">
      <!-- Animation -->
      <div class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
        <select v-model="localAnimation" class="placement-select" @change="emitUpdate">
          <option value="none">–</option>
          <option value="fade">Fade</option>
          <option value="slideLeft">← Slide</option>
          <option value="slideRight">→ Slide</option>
          <option value="slideUp">↑ Slide</option>
          <option value="slideDown">↓ Slide</option>
          <option value="zoom">Zoom</option>
          <option value="bounce">Bounce</option>
          <option value="spin">Spin</option>
          <option value="elastic">Elastic</option>
        </select>
      </div>

      <!-- Dauer (nur wenn Animation) -->
      <div v-if="localAnimation !== 'none'" class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
        <div class="placement-slider-wrap">
          <SliderField
            v-model="localDuration"
            :min="100"
            :max="5000"
            :step="100"
            :default-value="1000"
            class="placement-slider"
            @update:model-value="emitUpdate"
          />
          <span class="placement-value">{{ (localDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <!-- Größe -->
      <div class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
        <div class="placement-slider-wrap">
          <SliderField
            v-model="localScale"
            :min="1"
            :max="8"
            :step="1"
            :default-value="1"
            class="placement-slider"
            @update:model-value="emitUpdate"
          />
          <span class="placement-value">{{ localScale }}x</span>
        </div>
      </div>

      <!-- X/Y Position in einer Zeile -->
      <div class="placement-row placement-xy">
        <span class="placement-label">X</span>
        <input
          type="number"
          v-model.number="localOffsetX"
          min="-500"
          max="500"
          step="10"
          class="placement-input"
          @input="emitUpdate"
        />
        <span class="placement-label">Y</span>
        <input
          type="number"
          v-model.number="localOffsetY"
          min="-500"
          max="500"
          step="10"
          class="placement-input"
          @input="emitUpdate"
        />
      </div>
    </div>

    <!-- Buttons -->
    <div class="placement-buttons">
      <button @click="$emit('start-draw')" class="btn-placement btn-draw">
        {{ locale === 'de' ? 'Zeichnen' : 'Draw' }}
      </button>
      <button @click="$emit('place-directly')" class="btn-placement btn-place">
        {{ locale === 'de' ? 'Platzieren' : 'Place' }}
      </button>
    </div>
    <p v-if="isInRangeSelectionMode" class="placement-hint">
      {{ locale === 'de' ? 'Bereich auf Canvas ziehen...' : 'Draw area on canvas...' }}
    </p>
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import { ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { locale } = useI18n()

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
  background: color-mix(in srgb, var(--ds-success) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 20%, transparent);
  border-radius: var(--ds-radius-md);
  padding: 10px;
  margin-top: 8px;
}

.placement-header {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
}

.placement-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placement-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  min-width: 40px;
}

.placement-select {
  flex: 1;
  padding: 4px 8px;
  font-size: var(--ds-text-xs);
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.placement-select:hover {
  border-color: color-mix(in srgb, var(--ds-success) 40%, transparent);
}

.placement-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-slider-wrap .slider-field {
  flex: 1;
  min-width: 0;
}

.placement-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-success);
  cursor: pointer;
  border: 2px solid var(--text-primary);
}

.placement-value {
  font-size: var(--ds-text-xs);
  color: var(--ds-success);
  font-family: var(--ds-font-mono);
  min-width: 35px;
  text-align: right;
}

.placement-xy {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 4px;
  align-items: center;
}

.placement-input {
  width: 100%;
  padding: 4px 6px;
  font-size: var(--ds-text-xs);
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  text-align: center;
}

.placement-input:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--ds-success) 50%, transparent);
}

.placement-buttons {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.btn-placement {
  flex: 1;
  padding: 6px 10px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-draw {
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  color: var(--ds-success);
  border: 1px solid color-mix(in srgb, var(--ds-success) 40%, transparent);
}

.btn-draw:hover {
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.btn-place {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
  border: 1px solid color-mix(in srgb, var(--ds-link) 40%, transparent);
}

.btn-place:hover {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.placement-hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-success);
  margin: 6px 0 0 0;
  font-style: italic;
  text-align: center;
}

/* ═══ Responsive ═══ */
@media (max-width: 480px) {
  .placement-grid {
    grid-template-columns: auto 1fr;
    gap: 4px 8px;
  }
}
</style>
