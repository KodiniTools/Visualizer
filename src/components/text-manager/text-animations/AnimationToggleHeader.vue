<template>
  <div class="control-group">
    <label>{{ label }}</label>
    <div class="button-group">
      <button type="button" :class="['btn-small', { active: enabled }]" @click="emit('toggle')">
        {{ enabled ? t('textManager.activated') : t('textManager.deactivated') }}
      </button>
      <button
        v-if="enabled"
        type="button"
        class="btn-small"
        title="Animation neu starten"
        @click="emit('restart')"
      >
        🔄 Neustart
      </button>
    </div>
  </div>
</template>

<script setup>
/** Kopfzeile einer Animations-Sektion: Aktivieren/Deaktivieren + Neustart. */
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  label: { type: String, required: true },
  enabled: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'restart'])
const { t } = useI18n()
</script>

<style scoped src="./text-animations-shared.css"></style>
