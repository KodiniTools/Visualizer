<template>
  <div class="shortcuts-panel">
    <div class="panel-header">
      <h3>⌨️ Keyboard Shortcuts</h3>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>

    <div class="shortcuts-content">
      <!-- Player Controls -->
      <div class="shortcut-section">
        <h4>🎵 Player</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Space</kbd>
            <span>Play/Pause</span>
          </div>
          <div class="shortcut-item">
            <kbd>M</kbd>
            <span>Add beat marker</span>
          </div>
          <div class="shortcut-item">
            <kbd>Shift</kbd> + <kbd>M</kbd>
            <span>Mute/Unmute</span>
          </div>
          <div class="shortcut-item">
            <kbd>←</kbd> <kbd>→</kbd>
            <span>Previous/Next Track</span>
          </div>
        </div>
      </div>

      <!-- Object Manipulation -->
      <div class="shortcut-section">
        <h4>🎨 Object Manipulation</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>Delete</kbd> <kbd>Backspace</kbd>
            <span>Delete selected</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>D</kbd>
            <span>Duplicate</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>C</kbd>
            <span>Copy</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>V</kbd>
            <span>Paste</span>
          </div>
          <div class="shortcut-item">
            <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
            <span>Move (5px)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Shift</kbd> + <kbd>Arrow</kbd>
            <span>Move fast (20px)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Arrow</kbd>
            <span>Resize (5px)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Arrow</kbd>
            <span>Resize fast (20px)</span>
          </div>
        </div>
      </div>

      <!-- Recording -->
      <div class="shortcut-section">
        <h4>🎬 Recording</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>P</kbd>
            <span>Prepare Recording</span>
          </div>
          <div class="shortcut-item">
            <kbd>R</kbd>
            <span>Start/Stop Recording</span>
          </div>
        </div>
      </div>

      <!-- View -->
      <div class="shortcut-section">
        <h4>👁️ View</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <kbd>G</kbd>
            <span>Toggle Grid</span>
          </div>
          <div class="shortcut-item">
            <kbd>Escape</kbd>
            <span>Deselect all</span>
          </div>
        </div>
      </div>

      <!-- Editing (Coming Soon) -->
      <div class="shortcut-section">
        <h4>✏️ Editing (Coming Soon)</h4>
        <div class="shortcut-list">
          <div class="shortcut-item disabled">
            <kbd>Ctrl</kbd> + <kbd>Z</kbd>
            <span>Undo</span>
          </div>
          <div class="shortcut-item disabled">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>
            <span>Redo</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <p class="tip">💡 Tip: Press <kbd>?</kbd> to toggle this panel</p>
    </div>
  </div>
</template>

<script setup>
// Keine Props oder Emits nötig, nur close emit
defineEmits(['close'])
</script>

<style scoped>
.shortcuts-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--card-bg);
  border: 2px solid var(--ds-link);
  border-radius: 16px;
  padding: 0;
  max-width: 800px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  z-index: 10000;
  backdrop-filter: blur(10px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
}

.panel-header h3 {
  margin: 0;
  font-size: 24px;
  color: var(--ds-link);
  font-weight: 600;
}

.close-btn {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 50%, transparent);
  color: var(--ds-danger);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-color: var(--ds-danger);
  transform: scale(1.1);
}

.shortcuts-content {
  padding: 24px;
  max-height: calc(85vh - 150px);
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.shortcuts-content::-webkit-scrollbar {
  width: 8px;
}

.shortcuts-content::-webkit-scrollbar-track {
  background: var(--secondary-bg);
  border-radius: 4px;
}

.shortcuts-content::-webkit-scrollbar-thumb {
  background: var(--ds-link);
  border-radius: 4px;
}

.shortcuts-content::-webkit-scrollbar-thumb:hover {
  background: var(--ds-link);
}

.shortcut-section {
  background: var(--secondary-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
}

.shortcut-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--ds-link);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--btn-hover);
  border-radius: 8px;
  transition: all 0.2s;
}

.shortcut-item:hover:not(.disabled) {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  transform: translateX(4px);
}

.shortcut-item.disabled {
  opacity: 0.5;
}

.shortcut-item span {
  color: var(--text-primary);
  font-size: 14px;
}

.shortcut-item.disabled span {
  font-style: italic;
}

kbd {
  background: var(--card-bg);
  color: var(--ds-link);
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: inline-block;
  min-width: 32px;
  text-align: center;
  margin: 0 2px;
}

.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--btn-hover);
}

.tip {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.tip kbd {
  font-size: 12px;
  padding: 2px 8px;
}

/* Animation beim Öffnen */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

.shortcuts-panel {
  animation: slideIn 0.3s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
  .shortcuts-panel {
    max-width: 95vw;
    max-height: 90vh;
  }

  .shortcuts-content {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .panel-header h3 {
    font-size: 20px;
  }
}

/* ═══ Light Theme Overrides (accent colors only - backgrounds/text use CSS variables) ═══ */
[data-theme='light'] .shortcuts-panel {
  border-color: var(--accent-primary);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .panel-header {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] .panel-header h3 {
  color: var(--accent-ink);
}

[data-theme='light'] .shortcut-section {
  border-color: var(--border-color);
}

[data-theme='light'] .shortcut-section h4 {
  color: var(--accent-ink);
}

[data-theme='light'] .shortcut-item:hover:not(.disabled) {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] kbd {
  color: var(--accent-ink);
  border-color: var(--border-color);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
</style>
