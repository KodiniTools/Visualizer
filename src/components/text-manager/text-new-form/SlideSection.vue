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

<script setup lang="ts">
/** Slide-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import SlideControls from '../text-animations/SlideControls.vue'
import type { SlideAnimation } from '../../../lib/textManager/types'
import { useI18n } from '../../../lib/i18n'

const settings = defineModel<SlideAnimation>('settings', { required: true })

withDefaults(defineProps<{ canAdd?: boolean }>(), { canAdd: true })

const emit = defineEmits<{ add: [] }>()

const { t } = useI18n()
</script>
