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

<script setup lang="ts">
/** Schreibmaschinen-Effekt im Neu-Text-Formular; die Einstellungen teilt es mit dem Edit-Panel. */
import AnimationNewSection from './AnimationNewSection.vue'
import TypewriterControls from '../text-animations/TypewriterControls.vue'
import type { TypewriterAnimation } from '../../../lib/textManager/types'
import { useI18n } from '../../../lib/i18n'

const settings = defineModel<TypewriterAnimation>('settings', { required: true })

withDefaults(defineProps<{ canAdd?: boolean }>(), { canAdd: true })

const emit = defineEmits<{ add: [] }>()

const { t } = useI18n()
</script>
