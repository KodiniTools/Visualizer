<template>
  <div class="control-group">
    <label>{{ label }}</label>
    <div class="button-group">
      <UiButton
        size="sm"
        :variant="enabled ? 'primary' : 'secondary'"
        :aria-pressed="enabled ? 'true' : 'false'"
        block
        @click="emit('toggle')"
      >
        {{ enabled ? t('textManager.activated') : t('textManager.deactivated') }}
      </UiButton>
      <UiButton
        v-if="enabled"
        size="sm"
        block
        :title="t('textManager.restartAnimation')"
        @click="emit('restart')"
      >
        {{ t('textManager.restart') }}
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Kopfzeile einer Animations-Sektion im Edit-Panel: Aktivieren/Deaktivieren + Neustart. */
import UiButton from '../../ui/UiButton.vue'
import { useI18n } from '../../../lib/i18n'

withDefaults(defineProps<{ label: string; enabled?: boolean }>(), { enabled: false })
const emit = defineEmits<{ toggle: []; restart: [] }>()
const { t } = useI18n()
</script>

<style scoped src="./text-animations-shared.css"></style>
