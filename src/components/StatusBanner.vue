<template>
  <UiCallout
    v-if="banner"
    class="shared-banner"
    :class="'shared-banner-' + banner.type"
    :type="calloutType"
  >
    {{ banner.message }}
  </UiCallout>
</template>

<script setup>
import { computed } from 'vue'
import UiCallout from './ui/UiCallout.vue'

/**
 * Transienter Statushinweis (useStatusBanner) als UiCallout des Design-Systems:
 * Fläche ds-surface-2, Status nur im Icon. `error` wird zu `danger`.
 */
const props = defineProps({
  // { type: 'success'|'error'|'warning'|'info', message: string } | null
  banner: { type: Object, default: null },
})

const calloutType = computed(() => {
  const type = props.banner?.type
  if (type === 'error') return 'danger'
  return ['success', 'warning', 'info'].includes(type) ? type : 'info'
})
</script>
