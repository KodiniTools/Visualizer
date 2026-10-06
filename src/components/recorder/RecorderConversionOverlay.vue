<template>
  <Teleport to="body">
    <div v-if="isConverting" class="conversion-overlay">
      <div class="conversion-modal">
        <div class="conversion-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </div>
        <h2 class="conversion-title">{{ t('recorder.convertingVideo') }}</h2>
        <p class="conversion-subtitle">
          {{
            status === 'uploading'
              ? t('recorder.uploadingToServer')
              : t('recorder.processingOnServer')
          }}
        </p>
        <div class="conversion-progress-bar">
          <div class="conversion-progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="conversion-percent">{{ progress }}%</span>
        <p class="conversion-hint">{{ t('recorder.dontCloseWindow') }}</p>
        <button class="btn-cancel-conversion" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

defineProps({
  isConverting: Boolean,
  status: { type: String, default: '' },
  progress: { type: Number, default: 0 },
})

defineEmits(['cancel'])
</script>

<style>
.conversion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: var(--ds-z-toast);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: convFadeIn 0.3s ease;
}

.conversion-modal {
  background: var(--card-bg);
  border-radius: var(--ds-radius-lg);
  padding: 40px 50px;
  text-align: center;
  box-shadow: var(--ds-shadow-overlay);
  border: 1px solid var(--border-color);
  max-width: 420px;
  width: 90%;
  animation: convSlideIn 0.4s ease;
}

.conversion-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rotateIcon 2s linear infinite;
}

.conversion-icon svg {
  width: 40px;
  height: 40px;
  color: var(--ds-link);
}

.conversion-title {
  margin: 0 0 12px 0;
  font-size: var(--ds-text-2xl);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.conversion-subtitle {
  margin: 0 0 28px 0;
  font-size: var(--ds-text-md);
  color: var(--text-muted);
}

.conversion-progress-bar {
  height: 10px;
  background: var(--secondary-bg);
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  margin-bottom: 12px;
}

.conversion-progress-fill {
  height: 100%;
  background: var(--ds-link);
  background-size: 200% 100%;
  border-radius: var(--ds-radius-sm);
  transition: width var(--ds-duration-slow) var(--ds-ease);
  animation: shimmer 1.5s ease-in-out infinite;
}

.conversion-percent {
  display: block;
  font-size: var(--ds-text-3xl);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-link);
  margin-bottom: 20px;
  font-family: var(--ds-font-mono);
}

.conversion-hint {
  margin: 0 0 20px 0;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-style: italic;
}

.btn-cancel-conversion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-surface-3);
  color: var(--text-muted);
  border: 1px solid var(--ds-border-strong);
  padding: 8px 20px;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-cancel-conversion:hover {
  background: color-mix(in srgb, var(--ds-danger) 15%, transparent);
  color: var(--ds-danger);
  border-color: color-mix(in srgb, var(--ds-danger) 30%, transparent);
}

@keyframes convFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes convSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes rotateIcon {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 480px) {
  .conversion-modal {
    padding: 30px 25px;
  }
  .conversion-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 20px;
  }
  .conversion-icon svg {
    width: 30px;
    height: 30px;
  }
  .conversion-title {
    font-size: var(--ds-text-xl);
  }
  .conversion-percent {
    font-size: var(--ds-text-2xl);
  }
}

[data-theme='light'] .conversion-overlay {
  background: rgba(0, 0, 0, 0.75);
}

[data-theme='light'] .conversion-modal {
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .conversion-icon svg {
  color: var(--accent-ink);
}

[data-theme='light'] .conversion-percent {
  color: var(--accent-ink);
}

[data-theme='light'] .conversion-progress-fill {
  background: var(--accent-primary);
}

[data-theme='light'] .btn-cancel-conversion {
  background: rgba(0, 0, 0, 0.05);
  border-color: var(--ds-border);
}

[data-theme='light'] .btn-cancel-conversion:hover {
  background: color-mix(in srgb, var(--ds-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--ds-danger) 20%, transparent);
}
</style>
