<template>
  <AnimationNewSection
    :effect="settings"
    icon="🔍"
    :title="t('textManager.scaleEffect')"
    :add-label="t('textManager.addToCanvasScale')"
    :can-add="canAdd"
    @add="emit('add')"
  >
    <ScaleControls :effect="settings" />
  </AnimationNewSection>
</template>

<script setup>
/** Scale-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import ScaleControls from '../text-animations/ScaleControls.vue'
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
