<template>
  <div class="conversion-progress" :class="themeClass">
    <div class="progress-header">
      <span class="progress-label">{{ label }}</span>
      <span class="progress-percent">{{ progress }}%</span>
    </div>
    <div class="progress-bar">
      <div
        class="progress-fill"
        :class="[fillClass, { completed: status === 'completed', error: status === 'error' }]"
        :style="{ width: progress + '%' }"
      ></div>
    </div>

    <!-- Download -->
    <div v-if="downloadUrl && status === 'completed'" class="download-actions">
      <a
        :href="downloadUrl"
        :download="filename"
        class="mp4-download-btn"
        :class="downloadBtnClass"
        @click="$emit('download')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ downloadLabel }}
      </a>
      <button class="btn btn-close-conversion" @click="$emit('dismiss', true)" :title="closeTitle">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Error -->
    <div v-if="status === 'error'" class="error-actions">
      <span class="error-message">{{ errorMessage }}</span>
      <button v-if="onRetry" class="btn btn-retry" @click="$emit('retry')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </svg>
        {{ retryLabel }}
      </button>
      <button class="btn btn-dismiss" @click="$emit('dismiss')">{{ closeTitle }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  status: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  label: { type: String, default: '' },
  downloadUrl: { type: String, default: null },
  filename: { type: String, default: null },
  downloadLabel: { type: String, default: 'Download' },
  downloadBtnClass: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  retryLabel: { type: String, default: 'Retry' },
  closeTitle: { type: String, default: 'Close' },
  themeClass: { type: String, default: '' },
  fillClass: { type: String, default: '' },
  onRetry: { type: Function, default: null },
})
defineEmits(['download', 'dismiss', 'retry'])
</script>
