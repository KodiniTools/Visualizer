<template>
  <Teleport to="body">
    <div
      class="toast-container"
      :class="{ 'is-stacked': toastCount > 1 }"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="(toast, i) in displayToasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
          :style="{ '--depth': i }"
          role="alert"
        >
          <div class="toast__icon">
            <svg
              v-if="toast.type === 'success'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg
              v-else-if="toast.type === 'error'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round" />
            </svg>
            <svg
              v-else-if="toast.type === 'warning'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 9v4M12 17h.01" />
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div class="toast__content">
            <div v-if="toast.title" class="toast__title">{{ toast.title }}</div>
            <div class="toast__message">{{ toast.message }}</div>
          </div>
          <button v-if="toast.action" class="toast__action" @click="handleAction(toast)">
            {{ toast.action.label }}
          </button>
          <button
            v-if="toast.dismissible"
            class="toast__close"
            @click="removeToast(toast.id)"
            :aria-label="t('common.close')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
          <div class="toast__progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
        </div>
      </TransitionGroup>

      <!-- Stack count badge when 2+ toasts exist and container is not hovered -->
      <div v-if="toastCount > 1" class="toast-stack-badge">{{ toastCount }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useToastStore } from '../stores/toastStore'
import { useI18n } from '../lib/i18n'

const toastStore = useToastStore()
const { t } = useI18n()

// Newest toast first → appears at top of the stack
const displayToasts = computed(() => [...toastStore.activeToasts].reverse().slice(0, 5))
const toastCount = computed(() => toastStore.activeToasts.length)

function removeToast(id) {
  toastStore.removeToast(id)
}

function handleAction(toast) {
  try {
    toast.action?.handler?.()
  } finally {
    toastStore.removeToast(toast.id)
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  width: 100%;
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
  background-color: var(--card-bg, #142640);
  border: 1px solid rgba(201, 152, 77, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition:
    max-height 0.28s ease,
    margin-top 0.28s ease,
    opacity 0.28s ease,
    transform 0.28s ease;
  max-height: 500px;
}

/* ── Stacked (collapsed) mode ─────────────────────────────────────────── */

/* When 2+ toasts exist and not hovered: collapse older toasts into a thin peek */
.toast-container.is-stacked:not(:hover) .toast-list {
  gap: 0;
}

.toast-container.is-stacked:not(:hover) .toast:not(:first-child) {
  max-height: 10px;
  overflow: hidden;
  margin-top: 3px;
  opacity: calc(0.8 - var(--depth) * 0.15);
  transform: scaleX(calc(1 - var(--depth) * 0.04));
  transform-origin: right center;
  pointer-events: none;
  border-radius: 4px;
}

/* Hide any beyond the 3rd */
.toast-container.is-stacked:not(:hover) .toast:nth-child(n + 4) {
  display: none;
}

/* Hover: expand all toasts fully */
.toast-container.is-stacked:hover .toast-list {
  gap: 8px;
}
.toast-container.is-stacked:hover .toast {
  max-height: 500px;
  overflow: hidden;
  margin-top: 0;
  opacity: 1;
  transform: scaleX(1);
  pointer-events: auto;
}

/* Stack count badge */
.toast-stack-badge {
  display: none;
  position: absolute;
  top: 6px;
  left: -10px;
  background: var(--accent-primary, #c9984d);
  color: #000;
  font-size: 0.6rem;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: opacity 0.2s;
}
.toast-container.is-stacked:not(:hover) .toast-stack-badge {
  display: flex;
}

/* Light theme */
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
  color: #e9e9eb;
  margin-bottom: 4px;
}
[data-theme='light'] .toast__title {
  color: #003971;
}
.toast__message {
  font-size: 13px;
  color: #7a8da0;
  line-height: 1.4;
  word-wrap: break-word;
}
[data-theme='light'] .toast__message {
  color: #4d6d8e;
}

.toast__action {
  flex-shrink: 0;
  align-self: center;
  padding: 5px 12px;
  border: 1px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
  background: transparent;
  color: var(--accent-primary, #c9984d);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}
.toast__action:hover {
  background: var(--accent-primary, #c9984d);
  color: #000;
}
[data-theme='light'] .toast__action {
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .toast__action:hover {
  background: #014f99;
  color: #fff;
}

.toast__close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: #7a8da0;
  cursor: pointer;
  opacity: 0.6;
  transition:
    opacity 0.2s,
    color 0.2s;
}
.toast__close:hover {
  opacity: 1;
  color: #e9e9eb;
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

/* TransitionGroup enter/leave */
.toast-enter-active {
  animation: toast-in 0.28s ease-out;
}
.toast-leave-active {
  animation: toast-out 0.22s ease-in;
  pointer-events: none;
}
.toast-move {
  transition: all 0.28s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(calc(100% + 20px));
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
    transform: translateX(calc(100% + 20px));
  }
}

/* Light theme type overrides */
[data-theme='light'] .toast--info {
  border-left: 4px solid #014f99;
}
[data-theme='light'] .toast--info .toast__icon {
  color: #014f99;
}
[data-theme='light'] .toast__progress {
  background: #014f99;
}

/* Responsive */
@media (max-width: 768px) {
  .toast-container {
    top: auto;
    bottom: 16px;
    right: 10px;
    left: 10px;
    align-items: stretch;
  }
  .toast-list {
    align-items: stretch;
  }
  .toast {
    min-width: unset;
    max-width: none;
  }
  .toast-container.is-stacked:not(:hover) .toast:not(:first-child) {
    transform: scaleX(calc(1 - var(--depth) * 0.02));
  }
}
</style>
