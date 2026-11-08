<template>
  <div class="audio-fx-section">
    <button type="button" class="fx-header" :aria-expanded="open" @click="open = !open">
      <span>{{ t('audioFx.title') }}</span>
      <span class="chevron" :class="{ open }" aria-hidden="true"></span>
    </button>

    <template v-if="open">
      <UiSwitch v-model="store.enabled" class="fx-master" :label="t('audioFx.active')" />

      <template v-if="store.enabled">
        <template v-for="group in AUDIO_FX_GROUPS" :key="group.id">
          <div v-if="group.label" class="fx-group-label">{{ t(group.label) }}</div>
          <FxEffect
            v-for="fx in group.effects"
            :key="fx.key"
            v-model="store[`${fx.key}Enabled`]"
            :title="t(`audioFx.effects.${fx.key}`)"
          >
            <FxSource v-if="fx.source" v-model="store[`${fx.key}Source`]" />
            <div v-if="fx.color" class="fx-row">
              <span>{{ t('audioFx.color') }}</span>
              <ColorField
                v-model="store[`${fx.key}Color`]"
                :label="`${t('audioFx.color')} – ${t(`audioFx.effects.${fx.key}`)}`"
              />
            </div>
            <FxRange
              v-for="r in fx.ranges"
              :key="r.prop"
              v-model="store[r.prop]"
              :label="t(`audioFx.${r.label}`)"
              :min="r.min"
              :max="r.max"
              :unit="r.unit"
            />
          </FxEffect>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useAudioFxStore } from '../stores/audioFxStore'
import { AUDIO_FX_GROUPS } from '../data/audioFxEffects.js'
import ColorField from './ui/ColorField.vue'
import UiSwitch from './ui/UiSwitch.vue'
import FxEffect from './audio-fx/FxEffect.vue'
import FxSource from './audio-fx/FxSource.vue'
import FxRange from './audio-fx/FxRange.vue'

const { t } = useI18n()
const store = useAudioFxStore()
const open = ref(false)
</script>

<style scoped>
.audio-fx-section {
  border-top: var(--ds-border-width) solid var(--ds-border);
  padding-top: var(--ds-space-2);
  margin-top: var(--ds-space-1);
}
.fx-header {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: var(--ds-space-1) 2px;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text-2);
  text-align: left;
  cursor: pointer;
  border-radius: var(--ds-radius-sm);
  transition: color var(--ds-duration) var(--ds-ease);
}
.fx-header:hover {
  color: var(--ds-text);
}
.fx-header:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}
.chevron {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform var(--ds-duration) var(--ds-ease);
  opacity: 0.6;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(-135deg);
}
.fx-master {
  margin: var(--ds-space-2) 0 var(--ds-space-1);
}
.fx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}
.fx-group-label {
  margin: var(--ds-space-3) 0 2px;
  padding-top: var(--ds-space-2);
  border-top: var(--ds-border-width) solid var(--ds-border);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--ds-text-2);
}
</style>
