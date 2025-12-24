import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Toast-Benachrichtigungen Store
 * Verwaltet alle Toast-Nachrichten in der Anwendung
 */
export const useToastStore = defineStore('toast', () => {
  // === STATE ===
  const toasts = ref([]);
  let toastIdCounter = 0;

  // Standard-Anzeigedauer in Millisekunden
  const DEFAULT_DURATION = 3000;

  // === GETTERS ===
  const activeToasts = computed(() => toasts.value);
  const hasToasts = computed(() => toasts.value.length > 0);

  // === ACTIONS ===

  /**
   * Fügt einen neuen Toast hinzu
   * @param {Object} options - Toast-Optionen
   * @param {string} options.message - Die anzuzeigende Nachricht (oder i18n key)
   * @param {string} options.type - Toast-Typ: 'success', 'error', 'warning', 'info'
   * @param {number} options.duration - Anzeigedauer in ms (Standard: 3000)
   * @param {string} options.title - Optionaler Titel
   * @param {boolean} options.dismissible - Kann vom Benutzer geschlossen werden (Standard: true)
   * @returns {number} Die ID des erstellten Toasts
   */
  function addToast(options) {
    const id = ++toastIdCounter;

    const toast = {
      id,
      message: options.message || '',
      type: options.type || 'info',
      title: options.title || null,
      duration: options.duration ?? DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
      createdAt: Date.now()
    };

    toasts.value.push(toast);

    // Auto-Entfernung nach Ablauf der Dauer
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }

  /**
   * Entfernt einen Toast nach ID
   * @param {number} id - Die Toast-ID
   */
  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  /**
   * Entfernt alle Toasts
   */
  function clearAll() {
    toasts.value = [];
  }

  // === CONVENIENCE METHODS ===

  /**
   * Zeigt einen Erfolgs-Toast
   * @param {string} message - Die Nachricht
   * @param {Object} options - Zusätzliche Optionen
   */
  function success(message, options = {}) {
    return addToast({ ...options, message, type: 'success' });
  }

  /**
   * Zeigt einen Fehler-Toast
   * @param {string} message - Die Nachricht
   * @param {Object} options - Zusätzliche Optionen
   */
  function error(message, options = {}) {
    return addToast({ ...options, message, type: 'error' });
  }

  /**
   * Zeigt einen Warnungs-Toast
   * @param {string} message - Die Nachricht
   * @param {Object} options - Zusätzliche Optionen
   */
  function warning(message, options = {}) {
    return addToast({ ...options, message, type: 'warning' });
  }

  /**
   * Zeigt einen Info-Toast
   * @param {string} message - Die Nachricht
   * @param {Object} options - Zusätzliche Optionen
   */
  function info(message, options = {}) {
    return addToast({ ...options, message, type: 'info' });
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
    info
  };
});
