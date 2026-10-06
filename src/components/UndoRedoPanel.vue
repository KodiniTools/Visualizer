<template>
  <div class="undo-redo-panel">
    <div class="button-group">
      <button
        @click="undo"
        :disabled="!historyStore.canUndo"
        :title="`Rückgängig (${historyStore.undoCount} verfügbar) - Strg+Z`"
        class="undo-button"
      >
        <span class="icon">↩️</span>
        <span class="label">Undo</span>
      </button>

      <button
        @click="redo"
        :disabled="!historyStore.canRedo"
        :title="`Wiederholen (${historyStore.redoCount} verfügbar) - Strg+Y`"
        class="redo-button"
      >
        <span class="icon">↪️</span>
        <span class="label">Redo</span>
      </button>
    </div>

    <div class="history-info" v-if="showInfo">
      <span class="position">
        {{ historyStore.currentIndex + 1 }} / {{ historyStore.history.length }}
      </span>
      <span class="current-action" v-if="currentAction">
        {{ currentAction }}
      </span>
    </div>

    <!-- Optional: History-Liste anzeigen -->
    <div class="history-list" v-if="showHistory && historyStore.history.length > 0">
      <div class="history-list-header">Verlauf:</div>
      <div
        v-for="(command, index) in historyStore.history"
        :key="index"
        :class="['history-item', { active: index === historyStore.currentIndex }]"
        @click="jumpToHistory(index)"
        :title="`Klicken um zu dieser Aktion zu springen`"
      >
        <span class="history-index">{{ index + 1 }}.</span>
        <span class="history-name">{{ command.name || 'Unbenannt' }}</span>
        <span class="history-time">{{ formatTime(command.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHistoryStore } from '../stores/historyStore.js'

// Props
const props = defineProps({
  // Zeige Info-Text an
  showInfo: {
    type: Boolean,
    default: true,
  },
  // Zeige komplette History-Liste
  showHistory: {
    type: Boolean,
    default: false,
  },
})

// Store
const historyStore = useHistoryStore()

// Computed: Aktuelle Aktion anzeigen
const currentAction = computed(() => {
  if (historyStore.currentIndex >= 0 && historyStore.currentIndex < historyStore.history.length) {
    return historyStore.history[historyStore.currentIndex].name
  }
  return null
})

// Methods
async function undo() {
  await historyStore.undo()
}

async function redo() {
  await historyStore.redo()
}

// Springe zu einem bestimmten Punkt in der History
async function jumpToHistory(targetIndex) {
  const currentIndex = historyStore.currentIndex

  if (targetIndex < currentIndex) {
    // Undo bis zum Ziel
    const steps = currentIndex - targetIndex
    for (let i = 0; i < steps; i++) {
      await historyStore.undo()
    }
  } else if (targetIndex > currentIndex) {
    // Redo bis zum Ziel
    const steps = targetIndex - currentIndex
    for (let i = 0; i < steps; i++) {
      await historyStore.redo()
    }
  }
}

// Zeit formatieren
function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'gerade eben'
  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)}h`

  const date = new Date(timestamp)
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.undo-redo-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.button-group {
  display: flex;
  gap: 8px;
}

button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--ds-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background: var(--card-bg);
  border-color: var(--border-color);
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--ds-surface-1);
}

.icon {
  font-size: 16px;
}

.label {
  font-size: 13px;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px;
  background: var(--ds-surface-0);
  border-radius: 4px;
}

.position {
  font-weight: 600;
  color: var(--text-muted);
}

.current-action {
  color: var(--ds-text-3);
  font-style: italic;
}

/* History Liste */
.history-list {
  max-height: 300px;
  overflow-y: auto;
  background: var(--ds-surface-0);
  border-radius: 4px;
  padding: 8px;
}

.history-list-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-text-3);
  text-transform: uppercase;
  margin-bottom: 8px;
  padding: 4px 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: var(--secondary-bg);
}

.history-item.active {
  background: var(--ds-link);
  color: white;
}

.history-index {
  color: var(--ds-text-3);
  font-weight: 600;
  min-width: 20px;
}

.history-name {
  flex: 1;
  color: var(--text-secondary);
}

.history-item.active .history-name {
  color: white;
  font-weight: 500;
}

.history-time {
  font-size: 10px;
  color: var(--text-muted);
}

.history-item.active .history-time {
  color: var(--text-muted);
}

/* Scrollbar Styling */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: var(--ds-surface-0);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--card-bg);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--btn-hover);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .undo-redo-panel {
  background: var(--card-bg);
  border-color: var(--ds-border);
}

[data-theme='light'] button {
  background: var(--ds-surface-3);
  border-color: var(--ds-border);
  color: var(--text-primary);
}

[data-theme='light'] button:hover:not(:disabled) {
  background: var(--ds-surface-3);
  border-color: var(--accent-primary);
}

[data-theme='light'] button:disabled {
  background: var(--ds-surface-2);
}

[data-theme='light'] .history-info {
  background: var(--secondary-bg);
}

[data-theme='light'] .position {
  color: var(--text-primary);
}

[data-theme='light'] .current-action {
  color: var(--text-muted);
}

[data-theme='light'] .history-list {
  background: var(--secondary-bg);
}

[data-theme='light'] .history-list-header {
  color: var(--text-muted);
}

[data-theme='light'] .history-item:hover {
  background: var(--ds-surface-3);
}

[data-theme='light'] .history-item.active {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .history-index {
  color: var(--text-muted);
}

[data-theme='light'] .history-name {
  color: var(--text-primary);
}

[data-theme='light'] .history-item.active .history-name {
  color: var(--accent-text);
}

[data-theme='light'] .history-item.active .history-time {
  color: var(--accent-ink);
}

[data-theme='light'] .history-list::-webkit-scrollbar-track {
  background: var(--ds-surface-2);
}

[data-theme='light'] .history-list::-webkit-scrollbar-thumb {
  background: var(--ds-surface-3);
}

[data-theme='light'] .history-list::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary);
}
</style>
