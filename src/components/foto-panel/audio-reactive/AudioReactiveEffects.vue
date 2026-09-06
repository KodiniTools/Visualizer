<template>
  <div class="effects-grid">
    <div class="modern-label">
      <span class="label-text">{{ t('foto.effects') }}</span>
    </div>

    <AudioReactiveEffectCategory
      v-if="colorEffects.length"
      :title="t('foto.colorEffects')"
      :effects="colorEffects"
      :default-intensity="80"
    />
    <AudioReactiveEffectCategory
      v-if="transformEffects.length"
      :title="t('foto.transformEffects')"
      :effects="transformEffects"
      :default-intensity="50"
    />
    <AudioReactiveEffectCategory
      v-if="movementEffects.length"
      :title="t('foto.movementEffects')"
      :effects="movementEffects"
      :default-intensity="50"
    />
    <AudioReactiveEffectCategory
      v-if="specialEffects.length"
      :title="t('foto.specialEffects')"
      :effects="specialEffects"
      :default-intensity="60"
    />
    <AudioReactiveEffectCategory
      v-if="rhythmEffects.length"
      :title="t('foto.rhythmEffects')"
      :effects="rhythmEffects"
      :default-intensity="70"
    />
    <AudioReactiveEffectCategory
      v-for="cat in extraCategories"
      :key="cat.title"
      :title="cat.title"
      :effects="cat.effects"
      :default-intensity="cat.defaultIntensity ?? 80"
    />
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import AudioReactiveEffectCategory from './AudioReactiveEffectCategory.vue'

const { t } = useI18n()
const arc = inject('audioReactiveControls')
const { colorEffects, transformEffects, movementEffects, specialEffects, rhythmEffects } = arc
const extraCategories = arc.extraCategories ?? []
</script>

<style scoped src="./audio-reactive-shared.css"></style>
<style scoped>
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}
</style>
