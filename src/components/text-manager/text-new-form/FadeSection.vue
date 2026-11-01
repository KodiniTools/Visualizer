<template>
  <AnimationNewSection
    :effect="settings"
    icon="🌫️"
    :title="t('textManager.fadeEffect')"
    :add-label="t('textManager.addToCanvasFade')"
    :can-add="canAdd"
    @add="emit('add')"
  >
    <FadeControls :effect="settings" />
  </AnimationNewSection>
</template>

<script setup>
/** Fade-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import FadeControls from '../text-animations/FadeControls.vue'
import { useI18n } from '../../../lib/i18n.js'

const settings = defineModel('settings', {
  type: Object,
  required: true,
})

defineProps({
  canAdd: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['add'])

const { t } = useI18n()
</script>
