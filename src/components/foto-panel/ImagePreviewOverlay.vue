<template>
  <div v-if="previewImage" class="image-preview-overlay" @click="$emit('close')">
    <div class="preview-container" @click.stop>
      <button class="preview-close" @click="$emit('close')">✕</button>
      <img :src="previewImage.src" :alt="previewImage.name" class="preview-image">
      <div class="preview-info">
        <span class="preview-name">{{ previewImage.name }}</span>
      </div>
      <div class="preview-actions">
        <button @click="$emit('add-to-canvas')" class="btn-primary">{{ t('foto.placeOnCanvas') }}</button>
        <button @click="$emit('set-as-background')" class="btn-secondary">{{ t('foto.asBackground') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js';

const { t } = useI18n();

defineProps({
  previewImage: {
    type: Object,
    default: null
  }
});

defineEmits(['close', 'add-to-canvas', 'set-as-background']);
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.preview-close {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--btn-hover);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-close:hover {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
  transform: scale(1.1);
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  object-fit: contain;
}

.preview-info {
  text-align: center;
}

.preview-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.preview-actions .btn-primary,
.preview-actions .btn-secondary {
  padding: 12px 24px;
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-actions .btn-primary {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%));
  color: var(--accent-text);
  font-weight: 600;
  border: none;
}

.preview-actions .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(110, 168, 254, 0.4);
}

.preview-actions .btn-secondary {
  background-color: var(--btn-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.preview-actions .btn-secondary:hover {
  background-color: var(--btn-hover);
  transform: translateY(-2px);
}
</style>
