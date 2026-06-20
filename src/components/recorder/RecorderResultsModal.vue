<template>
  <Teleport to="body">
    <div
      id="results-panel"
      class="results-modal"
      style="display: none"
      @click.self="$emit('close')"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ t('recorder.recordingPreview') }}</h2>
          <button
            @click="$emit('close')"
            class="modal-close-btn"
            :title="t('common.close') + ' (ESC)'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="video-container">
            <video id="preview" controls class="preview-video"></video>
          </div>
          <div class="modal-actions">
            <button @click="$emit('close')" class="cancel-btn">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()
defineEmits(['close'])
</script>

<style>
.results-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: modalFadeIn 0.3s ease;
  margin: 0;
  overflow: auto;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--card-bg) 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 800px;
  max-height: 85vh;
  width: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease;
  margin: auto;
  position: relative;
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--secondary-bg);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--btn-hover);
  color: var(--text-muted);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.modal-close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-close-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  transform: rotate(90deg);
}

.modal-body {
  padding: 20px 24px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  flex: 1;
  min-height: 0;
}

.preview-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
}

.cancel-btn:hover {
  background: var(--btn-hover);
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 95%;
    max-height: 90vh;
    width: 95%;
    margin: auto;
  }
  .modal-header {
    padding: 16px 20px;
  }
  .modal-header h2 {
    font-size: 16px;
  }
  .modal-body {
    padding: 16px 20px;
    gap: 16px;
  }
  .preview-video {
    max-height: 35vh;
  }
  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }
  .cancel-btn {
    width: 100%;
    justify-content: center;
    font-size: 14px;
  }
}

@media (min-width: 769px) {
  .modal-content {
    margin: auto;
  }
}

[data-theme='light'] .results-modal {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme='light'] .modal-content {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
</style>
