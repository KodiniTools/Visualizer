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
import { computed } from 'vue';
import { useHistoryStore } from '../stores/historyStore.js';

// Props
const props = defineProps({
  // Zeige Info-Text an
  showInfo: {
    type: Boolean,
    default: true
  },
  // Zeige komplette History-Liste
  showHistory: {
    type: Boolean,
    default: false
  }
});

// Store
const historyStore = useHistoryStore();

// Computed: Aktuelle Aktion anzeigen
const currentAction = computed(() => {
  if (historyStore.currentIndex >= 0 && historyStore.currentIndex < historyStore.history.length) {
    return historyStore.history[historyStore.currentIndex].name;
  }
  return null;
});

// Methods
async function undo() {
  await historyStore.undo();
}

async function redo() {
  await historyStore.redo();
}

// Springe zu einem bestimmten Punkt in der History
async function jumpToHistory(targetIndex) {
  const currentIndex = historyStore.currentIndex;
  
  if (targetIndex < currentIndex) {
    // Undo bis zum Ziel
    const steps = currentIndex - targetIndex;
    for (let i = 0; i < steps; i++) {
      await historyStore.undo();
    }
  } else if (targetIndex > currentIndex) {
    // Redo bis zum Ziel
    const steps = targetIndex - currentIndex;
    for (let i = 0; i < steps; i++) {
      await historyStore.redo();
    }
  }
}

// Zeit formatieren
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'gerade eben';
  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)}h`;
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.undo-redo-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #1e1e1e;
  border: 1px solid #333;
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
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background: #3a3a3a;
  border-color: #555;
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #1a1a1a;
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
  color: #888;
  padding: 8px;
  background: #151515;
  border-radius: 4px;
}

.position {
  font-weight: 600;
  color: #aaa;
}

.current-action {
  color: #666;
  font-style: italic;
}

/* History Liste */
.history-list {
  max-height: 300px;
  overflow-y: auto;
  background: #151515;
  border-radius: 4px;
  padding: 8px;
}

.history-list-header {
  font-size: 11px;
  font-weight: 600;
  color: #666;
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
  background: #2a2a2a;
}

.history-item.active {
  background: #2d5a8d;
  color: white;
}

.history-index {
  color: #666;
  font-weight: 600;
  min-width: 20px;
}

.history-name {
  flex: 1;
  color: #ccc;
}

.history-item.active .history-name {
  color: white;
  font-weight: 500;
}

.history-time {
  font-size: 10px;
  color: #555;
}

.history-item.active .history-time {
  color: #aaa;
}

/* Scrollbar Styling */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: #0a0a0a;
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
