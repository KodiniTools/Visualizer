<template>
  <AnimationNewSection
    :effect="settings"
    icon="⌨️"
    :title="t('textManager.typewriterEffect')"
    :add-label="t('textManager.addToCanvasTypewriter')"
    :can-add="canAdd"
    @add="emit('add')"
  >
    <TypewriterControls :effect="settings" />
  </AnimationNewSection>
</template>

<script setup>
/** Schreibmaschinen-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import TypewriterControls from '../text-animations/TypewriterControls.vue'
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
