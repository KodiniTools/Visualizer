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

<script setup lang="ts">
/** Fade-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import FadeControls from '../text-animations/FadeControls.vue'
import type { TimedTextAnimation } from '../../../lib/textManager/types'
import { useI18n } from '../../../lib/i18n'

const settings = defineModel<TimedTextAnimation>('settings', { required: true })

withDefaults(defineProps<{ canAdd?: boolean }>(), { canAdd: true })

const emit = defineEmits<{ add: [] }>()

const { t } = useI18n()
</script>
