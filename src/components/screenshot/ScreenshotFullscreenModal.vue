<template>
  <Teleport to="body">
    <div class="fullscreen-modal-overlay" @click="emit('close')">
      <div class="fullscreen-modal" @click.stop>
        <!-- Close Button (floating) -->
        <button class="btn-close-floating" :title="t('common.close')" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <!-- Modal Image -->
        <div class="modal-image-container">
          <img :src="url" alt="Screenshot" class="modal-image" />
        </div>

        <!-- Compact Footer with Metadata + Download -->
        <div class="modal-footer">
          <div class="metadata-inline">
            <span class="metadata-tag">{{ formatLabel }}</span>
            <span class="metadata-text">{{ dimensions }}</span>
            <span class="metadata-divider">•</span>
            <span class="metadata-text">{{ size }}</span>
          </div>
          <a
            :href="url"
            :download="fileName"
            class="btn-download-icon"
            :title="t('screenshot.download')"
            @click="emit('download')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// Vollbild-Vorschau eines Screenshots. Escape schließt; der Listener lebt
// genau so lange wie die Komponente (Eltern blenden sie per v-if ein).
import { onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../../lib/i18n.js'

defineProps({
  url: { type: String, required: true },
  fileName: { type: String, default: '' },
  formatLabel: { type: String, default: '' },
  dimensions: { type: String, default: '' },
  size: { type: String, default: '' },
})

const emit = defineEmits(['close', 'download'])
const { t } = useI18n()

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
/* Fullscreen Modal Overlay */
.fullscreen-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ds-z-toast);
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Fullscreen Modal */
.fullscreen-modal {
  position: relative;
  background: var(--primary-bg);
  border-radius: var(--ds-radius-lg);
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--ds-shadow-overlay);
  border: 1px solid var(--border-color);
  overflow: hidden;
  animation: scaleIn 0.2s ease;
  font-family: var(--ds-font-sans);
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Floating Close Button */
.btn-close-floating {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: var(--text-primary);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-close-floating svg {
  width: 16px;
  height: 16px;
}

.btn-close-floating:hover {
  background: color-mix(in srgb, var(--ds-danger) 80%, transparent);
  color: #fff;
}

/* Modal Image Container */
.modal-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #000;
  overflow: hidden;
  max-height: calc(85vh - 48px);
}

.modal-image {
  max-width: 100%;
  max-height: calc(85vh - 72px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--ds-radius-sm);
}

/* Compact Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--secondary-bg);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.metadata-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-tag {
  display: inline-block;
  background: var(--ds-link);
  color: #fff;
  padding: 2px 6px;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
}

.metadata-text {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

.metadata-divider {
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
}

.btn-download-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--ds-success);
  color: white;
  text-decoration: none;
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-download-icon:hover {
  background: var(--ds-success);
}

.btn-download-icon svg {
  width: 16px;
  height: 16px;
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .fullscreen-modal {
  background: var(--card-bg);
  border-color: var(--ds-border);
}

[data-theme='light'] .btn-close-floating {
  background: rgba(0, 0, 0, 0.08);
  color: var(--ds-text-2);
}

[data-theme='light'] .modal-footer {
  background: rgba(0, 0, 0, 0.04);
  border-top-color: var(--ds-border);
}

[data-theme='light'] .metadata-tag {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .metadata-text {
  color: var(--ds-text-2);
}

[data-theme='light'] .metadata-divider {
  color: var(--ds-text-2);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-close-floating {
    width: 32px;
    height: 32px;
  }
}

@media (max-width: 480px) {
  .btn-close-floating {
    width: 36px;
    height: 36px;
  }
}
</style>
