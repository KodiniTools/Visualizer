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

<script setup lang="ts">
import { computed } from 'vue'
import UiCallout from './ui/UiCallout.vue'
import type { StatusBanner as StatusBannerData } from '../composables/useStatusBanner'

/**
 * Transienter Statushinweis (useStatusBanner) als UiCallout des Design-Systems:
 * Fläche ds-surface-2, Status nur im Icon. `error` wird zu `danger`.
 */
type CalloutType = 'info' | 'success' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    // { type: 'success'|'error'|'warning'|'info', message: string } | null
    banner?: StatusBannerData | null
  }>(),
  { banner: null },
)

const calloutType = computed((): CalloutType => {
  const type = props.banner?.type
  if (type === 'error') return 'danger'
  return type === 'success' || type === 'warning' || type === 'info' ? type : 'info'
})
</script>
