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
</script>

<style>
.conversion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: convFadeIn 0.3s ease;
}

.conversion-modal {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border-radius: 20px;
  padding: 40px 50px;
  text-align: center;
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.6),
    0 0 60px rgba(110, 168, 254, 0.15);
  border: 1px solid var(--border-color);
  max-width: 420px;
  width: 90%;
  animation: convSlideIn 0.4s ease;
}

.conversion-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, rgba(110, 168, 254, 0.2) 0%, rgba(79, 195, 247, 0.2) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rotateIcon 2s linear infinite;
}

.conversion-icon svg {
  width: 40px;
  height: 40px;
  color: #6ea8fe;
}

.conversion-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.conversion-subtitle {
  margin: 0 0 28px 0;
  font-size: 14px;
  color: var(--text-muted);
}

.conversion-progress-bar {
  height: 10px;
  background: var(--secondary-bg);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.conversion-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6ea8fe 0%, #4fc3f7 50%, #6ea8fe 100%);
  background-size: 200% 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
  animation: shimmer 1.5s ease-in-out infinite;
}

.conversion-percent {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #6ea8fe;
  margin-bottom: 20px;
  font-family: 'Courier New', monospace;
}

.conversion-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
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
    font-size: 18px;
  }
  .conversion-percent {
    font-size: 24px;
  }
}

[data-theme='light'] .conversion-overlay {
  background: rgba(0, 0, 0, 0.75);
}

[data-theme='light'] .conversion-modal {
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.25),
    0 0 60px rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .conversion-icon svg {
  color: #014f99;
}

[data-theme='light'] .conversion-percent {
  color: #014f99;
}

[data-theme='light'] .conversion-progress-bar {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .conversion-progress-fill {
  background: linear-gradient(90deg, #014f99 0%, #3a7cc6 50%, #014f99 100%);
  background-size: 200% 100%;
}
</style>
