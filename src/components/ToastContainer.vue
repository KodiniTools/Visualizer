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
          <UiButton
            v-if="toast.action"
            size="sm"
            variant="secondary"
            class="toast__action"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </UiButton>
          <UiIconButton
            v-if="toast.dismissible"
            size="sm"
            class="toast__close"
            :label="t('common.close')"
            @click="removeToast(toast.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </UiIconButton>
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
import UiButton from './ui/UiButton.vue'
import UiIconButton from './ui/UiIconButton.vue'

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
/* Toast-Rezept des Design-Systems v2 (UiToast): ds-surface-1, 1 px ds-border,
   Statusfarbe als 3 px Linie links und im Icon, ds-shadow-overlay. Der
   Visualizer behält Titel, Fortschrittsbalken und das Stapeln mehrerer Toasts. */
.toast-container {
  position: fixed;
  top: var(--ds-space-5);
  right: var(--ds-space-5);
  z-index: var(--ds-z-toast);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  align-items: flex-end;
  width: 100%;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  min-width: 320px;
  max-width: 400px;
  padding: var(--ds-space-3) var(--ds-space-3) var(--ds-space-3) var(--ds-space-4);
  border: var(--ds-border-width) solid var(--ds-border);
  border-left: 3px solid var(--ds-info);
  border-radius: var(--ds-radius-md);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  background-color: var(--ds-surface-1);
  color: var(--ds-text);
  box-shadow: var(--ds-shadow-overlay);
  transition:
    max-height var(--ds-duration-slow) var(--ds-ease),
    margin-top var(--ds-duration-slow) var(--ds-ease),
    opacity var(--ds-duration-slow) var(--ds-ease),
    transform var(--ds-duration-slow) var(--ds-ease);
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
  border-radius: var(--ds-radius-sm);
}

/* Hide any beyond the 3rd */
.toast-container.is-stacked:not(:hover) .toast:nth-child(n + 4) {
  display: none;
}

/* Hover: expand all toasts fully */
.toast-container.is-stacked:hover .toast-list {
  gap: var(--ds-space-2);
}
.toast-container.is-stacked:hover .toast {
  max-height: 500px;
  overflow: hidden;
  margin-top: 0;
  opacity: 1;
  transform: scaleX(1);
  pointer-events: auto;
}

/* Stack count badge (ds-kbd) */
.toast-stack-badge {
  display: none;
  position: absolute;
  top: 6px;
  left: -10px;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--ds-space-1);
  border-radius: var(--ds-radius-full);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  font-variant-numeric: tabular-nums;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.toast-container.is-stacked:not(:hover) .toast-stack-badge {
  display: flex;
}

/* Toast type colors */
.toast--success {
  border-left-color: var(--ds-success);
}
.toast--success .toast__icon {
  color: var(--ds-success);
}
.toast--error {
  border-left-color: var(--ds-danger);
}
.toast--error .toast__icon {
  color: var(--ds-danger);
}
.toast--warning {
  border-left-color: var(--ds-warning);
}
.toast--warning .toast__icon {
  color: var(--ds-warning);
}
.toast--info .toast__icon {
  color: var(--ds-info);
}

.toast__icon {
  flex-shrink: 0;
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
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
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  margin-bottom: 2px;
}
.toast__message {
  font-size: var(--ds-text-sm);
  line-height: var(--ds-leading);
  color: var(--ds-text-2);
  word-wrap: break-word;
}

.toast__action,
.toast__close {
  flex-shrink: 0;
}

/* Progress bar */
.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--ds-accent);
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
  animation: toast-in var(--ds-duration-slow) var(--ds-ease);
}
.toast-leave-active {
  animation: toast-out var(--ds-duration) var(--ds-ease);
  pointer-events: none;
}
.toast-move {
  transition: all var(--ds-duration-slow) var(--ds-ease);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(16px);
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
    transform: translateX(16px);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .toast-container {
    top: auto;
    bottom: calc(var(--sticky-player-bar-height-mobile) + var(--ds-space-3));
    right: var(--ds-space-3);
    left: var(--ds-space-3);
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
