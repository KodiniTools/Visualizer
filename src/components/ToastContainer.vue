<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div
          v-for="toast in activeToasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
          role="alert"
        >
          <div class="toast__icon">
            <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="toast.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v4M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div class="toast__content">
            <div v-if="toast.title" class="toast__title">{{ toast.title }}</div>
            <div class="toast__message">{{ toast.message }}</div>
          </div>
          <button
            v-if="toast.dismissible"
            class="toast__close"
            @click="removeToast(toast.id)"
            :aria-label="t('common.close')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="toast__progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { useToastStore } from '../stores/toastStore';
import { useI18n } from '../lib/i18n';

const toastStore = useToastStore();
const { t } = useI18n();

const activeToasts = computed(() => toastStore.activeToasts);

function removeToast(id) {
  toastStore.removeToast(id);
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 80vh;
  overflow-y: auto;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 320px;
  max-width: 400px;
  padding: 14px 16px;
  border-radius: 8px;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  /* Dark theme als Standard (passend zur rechten Spalte) */
  background-color: #142640;
  border: 1px solid rgba(201, 152, 77, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

/* Light theme Unterstützung */
[data-theme='light'] .toast {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.2);
  box-shadow: 0 4px 12px rgba(0, 57, 113, 0.1);
}

/* Toast type colors */
.toast--success {
  border-left: 4px solid #4ade80;
}

.toast--success .toast__icon {
  color: #4ade80;
}

.toast--error {
  border-left: 4px solid #f87171;
}

.toast--error .toast__icon {
  color: #f87171;
}

.toast--warning {
  border-left: 4px solid #fbbf24;
}

.toast--warning .toast__icon {
  color: #fbbf24;
}

.toast--info {
  border-left: 4px solid #c9984d;
}

.toast--info .toast__icon {
  color: #c9984d;
}

.toast__icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
}

.toast__icon svg {
  width: 100%;
  height: 100%;
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-weight: 600;
  font-size: 14px;
  color: #E9E9EB;
  margin-bottom: 4px;
}

[data-theme='light'] .toast__title {
  color: #003971;
}

.toast__message {
  font-size: 13px;
  color: #7A8DA0;
  line-height: 1.4;
  word-wrap: break-word;
}

[data-theme='light'] .toast__message {
  color: #4d6d8e;
}

.toast__close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: #7A8DA0;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s, color 0.2s;
}

.toast__close:hover {
  opacity: 1;
  color: #E9E9EB;
}

[data-theme='light'] .toast__close {
  color: #4d6d8e;
}

[data-theme='light'] .toast__close:hover {
  color: #003971;
}

.toast__close svg {
  width: 100%;
  height: 100%;
}

/* Progress bar */
.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #c9984d;
  opacity: 0.5;
  animation: toast-progress linear forwards;
  transform-origin: left;
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Transition animations */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Scrollbar styling matching right panel */
.toast-container::-webkit-scrollbar {
  width: 6px;
}

.toast-container::-webkit-scrollbar-track {
  background: rgba(201, 152, 77, 0.1);
}

.toast-container::-webkit-scrollbar-thumb {
  background: rgba(201, 152, 77, 0.4);
  border-radius: 3px;
}

.toast-container::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 152, 77, 0.6);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .toast--info {
  border-left: 4px solid #014f99;
}

[data-theme='light'] .toast--info .toast__icon {
  color: #014f99;
}

[data-theme='light'] .toast__progress {
  background: #014f99;
}

[data-theme='light'] .toast-container::-webkit-scrollbar-track {
  background: rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .toast-container::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.4);
  border-radius: 3px;
}

[data-theme='light'] .toast-container::-webkit-scrollbar-thumb:hover {
  background: rgba(1, 79, 153, 0.6);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .toast-container {
    right: 10px;
    left: 10px;
    transform: translateY(-50%);
  }

  .toast {
    min-width: unset;
    max-width: none;
  }
}
</style>
