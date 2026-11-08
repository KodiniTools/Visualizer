<template>
  <div class="audio-reactive-group">
    <UiSwitch
      :model-value="isEnabled"
      class="ar-master-switch"
      :label="t('foto.audioReactive')"
      @update:model-value="setEnabled"
    />

    <!-- Audio-Level Anzeige (Breite/Farbe setzen die Verwender pro Frame) -->
    <div v-if="isEnabled" class="audio-level-indicator">
      <span class="level-label">{{ t('foto.audioLevel') }}</span>
      <div class="level-bar-container">
        <div :ref="arc.audioLevelBarRef" class="level-bar"></div>
      </div>
    </div>

    <!-- Master-Einstellungen -->
    <div v-if="isEnabled" class="ar-master-controls">
      <UiSelect
        :model-value="master.source"
        size="sm"
        inline
        :label="t('foto.audioSource')"
        :options="sourceOptions"
        @update:model-value="(v) => setMaster('source', v as string)"
      />
      <SliderControl
        :label="t('foto.smoothing')"
        :model-value="master.smoothing"
        :min="0"
        :max="100"
        :default-value="50"
        :value-text="`${master.smoothing}%`"
        @update:model-value="(v) => setMaster('smoothing', v)"
      />
      <SliderControl
        :label="t('foto.audioGain')"
        :model-value="master.gain"
        :min="0"
        :max="2"
        :step="0.05"
        :default-value="1"
        :value-text="`${Math.round(master.gain * 100)}%`"
        @update:model-value="(v) => setMaster('gain', v)"
      />
      <UiSelect
        :model-value="master.easing"
        size="sm"
        inline
        :label="t('foto.easing')"
        :options="easingSelectOptions"
        @update:model-value="(v) => setMaster('easing', v as string)"
      />
      <SliderControl
        :label="t('foto.beatBoost')"
        :model-value="master.beatBoost"
        :min="1"
        :max="3"
        :step="0.1"
        :default-value="1"
        :value-text="beatBoostText"
        @update:model-value="(v) => setMaster('beatBoost', v)"
      />
      <SliderControl
        :label="t('foto.phase')"
        :model-value="master.phase"
        :min="0"
        :max="360"
        :default-value="0"
        :value-text="`${master.phase}°`"
        @update:model-value="(v) => setMaster('phase', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from '../../../lib/i18n'
import UiSwitch from '../../ui/UiSwitch.vue'
import UiSelect from '../../ui/UiSelect.vue'
import SliderControl from '../../ui/SliderControl.vue'
import { audioSourceOptions, easingOptions } from './audioReactiveOptions'
import type { AudioReactiveControls } from './audioReactiveControls'

const { t } = useI18n()
const arc = inject('audioReactiveControls') as AudioReactiveControls
const { isEnabled, master, setEnabled, setMaster } = arc

const sourceOptions = computed(() => audioSourceOptions(t))
const easingSelectOptions = computed(() => easingOptions(t))
const beatBoostText = computed(() =>
  master.beatBoost <= 1 ? t('foto.beatBoostOff') : `${Math.round((master.beatBoost - 1) * 100)}%`,
)
</script>

<style scoped>
.audio-reactive-group {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid color-mix(in srgb, var(--ds-link) 15%, transparent);
  border-radius: var(--ds-radius-md);
  padding: 10px;
}
.ar-master-controls {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  margin-top: var(--ds-space-1);
}
.ar-master-controls :deep(.control-group) {
  margin-bottom: 0;
}
.audio-level-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.level-label {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  min-width: 80px;
}
.level-bar-container {
  flex: 1;
  height: 8px;
  background: var(--secondary-bg);
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
}
.level-bar {
  height: 100%;
  width: 0%;
  background: var(--ds-success);
  border-radius: var(--ds-radius-sm);
  transition: width 0.05s ease-out;
}

[data-theme='light'] .audio-reactive-group {
  border-color: var(--border-color);
}
[data-theme='light'] .level-bar-container {
  border-color: var(--border-color);
}
</style>
