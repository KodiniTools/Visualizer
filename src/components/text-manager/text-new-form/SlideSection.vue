<template>
  <AnimationNewSection
    :effect="settings"
    icon="↔️"
    :title="t('textManager.slideEffect')"
    :add-label="t('textManager.addToCanvasSlide')"
    :can-add="canAdd"
    @add="emit('add')"
  >
    <SlideControls :effect="settings" />
  </AnimationNewSection>
</template>

<script setup>
/** Slide-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import SlideControls from '../text-animations/SlideControls.vue'
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
