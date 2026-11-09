import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  handler: () => void
}

export interface ToastOptions {
  /** Die anzuzeigende Nachricht (oder i18n key) */
  message?: string
  /** Toast-Typ (Standard: 'info') */
  type?: ToastType
  /** Anzeigedauer in ms (Standard: 3000); 0 = bleibt bis zum Schließen */
  duration?: number
  /** Optionaler Titel */
  title?: string | null
  /** Kann vom Benutzer geschlossen werden (Standard: true) */
  dismissible?: boolean
  /** Optionaler Aktions-Button */
  action?: ToastAction | null
}

export interface Toast {
  id: number
  message: string
  type: ToastType
  title: string | null
  duration: number
  dismissible: boolean
  action: ToastAction | null
  createdAt: number
}

/** Zusatzoptionen der Kurzformen success/error/warning/info */
export type ToastShortcutOptions = Omit<ToastOptions, 'message' | 'type'>

/**
 * Toast-Benachrichtigungen Store
 * Verwaltet alle Toast-Nachrichten in der Anwendung
 */
export const useToastStore = defineStore('toast', () => {
  // === STATE ===
  const toasts = ref<Toast[]>([])
  let toastIdCounter = 0

  // Standard-Anzeigedauer in Millisekunden
  const DEFAULT_DURATION = 3000

  // === GETTERS ===
  const activeToasts = computed(() => toasts.value)
  const hasToasts = computed(() => toasts.value.length > 0)

  // === ACTIONS ===

  /**
   * Fügt einen neuen Toast hinzu
   * @returns Die ID des erstellten Toasts
   */
  function addToast(options: ToastOptions): number {
    const id = ++toastIdCounter

    const toast: Toast = {
      id,
      message: options.message || '',
      type: options.type || 'info',
      title: options.title || null,
      duration: options.duration ?? DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
      action: options.action || null,
      createdAt: Date.now(),
    }

    toasts.value.push(toast)

    // Auto-Entfernung nach Ablauf der Dauer
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  /** Entfernt einen Toast nach ID */
  function removeToast(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  /** Entfernt alle Toasts */
  function clearAll() {
    toasts.value = []
  }

  // === CONVENIENCE METHODS ===

  /** Zeigt einen Erfolgs-Toast */
  function success(message: string, options: ToastShortcutOptions = {}) {
    return addToast({ ...options, message, type: 'success' })
  }

  /** Zeigt einen Fehler-Toast */
  function error(message: string, options: ToastShortcutOptions = {}) {
    return addToast({ ...options, message, type: 'error' })
  }

  /** Zeigt einen Warnungs-Toast */
  function warning(message: string, options: ToastShortcutOptions = {}) {
    return addToast({ ...options, message, type: 'warning' })
  }

  /** Zeigt einen Info-Toast */
  function info(message: string, options: ToastShortcutOptions = {}) {
    return addToast({ ...options, message, type: 'info' })
  }

  return {
    // State
    toasts,

    // Getters
    activeToasts,
    hasToasts,

    // Actions
    addToast,
    removeToast,
    clearAll,

    // Convenience methods
    success,
    error,
    warning,
    info,
  }
})
