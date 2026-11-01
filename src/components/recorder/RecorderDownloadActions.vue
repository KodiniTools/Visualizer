<template>
  <div class="download-actions">
    <button
      type="button"
      class="mp4-download-btn"
      :class="variant !== 'mp4' && `${variant}-download-btn`"
      @click="emit('download')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {{ label }}
    </button>
    <button class="btn-close-conversion" :title="closeTitle" @click="emit('dismiss')">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<script setup>
// Download-Knopf + Schließen-Knopf für fertige Recorder-Exporte
// (WebM direkt im Panel, MP4/GIF/HQ in RecorderConversionProgress).
defineProps({
  /** 'mp4' | 'gif' | 'hq' | 'webm' – bestimmt die Farbe des Download-Knopfs */
  variant: { type: String, default: 'mp4' },
  label: { type: String, required: true },
  closeTitle: { type: String, default: '' },
})

const emit = defineEmits(['download', 'dismiss'])
</script>

<style scoped>
.download-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mp4-download-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--ds-success);
  color: white;
  text-decoration: none;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  transition: all var(--ds-duration) var(--ds-ease);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.mp4-download-btn:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.mp4-download-btn svg {
  width: 14px;
  height: 14px;
}

.mp4-download-btn:hover {
  background: var(--ds-success);
}

/* Varianten */
.gif-download-btn {
  background: var(--ds-success) !important;
}

.gif-download-btn:hover {
  background: var(--ds-success) !important;
}

.hq-download-btn {
  background: var(--ds-warning) !important;
}

.hq-download-btn:hover {
  background: var(--ds-warning) !important;
}

.webm-download-btn {
  background: var(--ds-link) !important;
  margin-top: 6px;
}

.webm-download-btn:hover {
  background: var(--ds-link) !important;
}

.btn-close-conversion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-surface-3);
  color: var(--ds-text-2);
  border: 1px solid var(--ds-border-strong);
  padding: 8px;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  flex-shrink: 0;
}

.btn-close-conversion:hover {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  color: var(--ds-danger);
  border-color: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

.icon {
  width: 12px;
  height: 12px;
}

/* Light Theme */
[data-theme='light'] .btn-close-conversion {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-muted);
  border-color: var(--ds-border);
}

[data-theme='light'] .btn-close-conversion:hover {
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 20%, transparent);
}
</style>
