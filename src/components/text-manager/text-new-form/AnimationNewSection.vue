<template>
  <!-- Klappbare Animations-Sektion des Neu-Text-Formulars -->
  <details class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">{{ icon }}</span>
      <span>{{ title }}</span>
      <span v-if="effect.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
    </summary>
    <div class="section-content">
      <!-- Animation aktivieren -->
      <div class="control-group">
        <UiButton
          size="sm"
          :variant="effect.enabled ? 'primary' : 'secondary'"
          :aria-pressed="effect.enabled ? 'true' : 'false'"
          block
          @click="effect.enabled = !effect.enabled"
        >
          {{ effect.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
        </UiButton>
      </div>

      <!-- Einstellungen (nur wenn aktiviert) -->
      <div v-if="effect.enabled">
        <slot />
      </div>

      <!-- Zum Canvas hinzufügen (nur diese Animation) -->
      <div class="control-group add-animation-group">
        <UiButton variant="primary" block :disabled="!canAdd" @click="emit('add')">
          {{ addLabel }}
        </UiButton>
      </div>
    </div>
  </details>
</template>

<script setup>
/**
 * Rahmen einer Animation im Neu-Text-Formular: Kopfzeile mit Status,
 * An/Aus-Schalter, Einstellungen (Slot) und „Mit … hinzufügen“.
 */
import UiButton from '../../ui/UiButton.vue'
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  addLabel: { type: String, required: true },
  canAdd: { type: Boolean, default: true },
})
const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['add'])
const { t } = useI18n()
</script>

<style scoped src="./textFormStyles.css"></style>
