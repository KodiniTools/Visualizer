<template>
  <div v-if="payload" class="handoff-banner">
    <div class="handoff-banner__preview">
      <img :src="payload.images[0].dataUrl" alt="" />
    </div>
    <div class="handoff-banner__body">
      <strong>{{ t('handoff.title').replace('{source}', payload.source) }}</strong>
      <span>{{ t('handoff.text') }}</span>
    </div>
    <div class="handoff-banner__actions">
      <button class="handoff-banner__accept" @click="$emit('accept')">
        {{ t('handoff.accept') }}
      </button>
      <button class="handoff-banner__dismiss" @click="$emit('reject')">
        {{ t('handoff.dismiss') }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  payload: { type: Object, default: null },
  t: { type: Function, required: true },
})
defineEmits(['accept', 'reject'])
</script>

<style scoped>
.handoff-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--accent-primary) 55%, transparent);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.handoff-banner__preview {
  width: 44px;
  height: 44px;
  border-radius: var(--ds-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}
.handoff-banner__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.handoff-banner__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.handoff-banner__body strong {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
}
.handoff-banner__body span {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

.handoff-banner__actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}
.handoff-banner__accept,
.handoff-banner__dismiss {
  border: 1px solid transparent;
  border-radius: var(--ds-radius-sm);
  padding: 6px 10px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--ds-duration) var(--ds-ease);
}
/* Primär: Akzentfläche mit garantiert kontrastierendem Akzent-Text
   (dunkel auf Gold im Dark-Mode, hell auf Blau im Light-Mode) */
.handoff-banner__accept {
  background: var(--accent-primary);
  color: var(--accent-text);
}
/* Sekundär: Umriss mit primärer Theme-Textfarbe für hohen Kontrast in beiden Modi */
.handoff-banner__dismiss {
  background: transparent;
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--text-primary) 35%, transparent);
}
.handoff-banner__dismiss:hover {
  background: var(--btn-hover);
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--accent-primary) 45%, transparent);
}
</style>
