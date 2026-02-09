<template>
  <!-- Floating Help Button -->
  <div class="help-button-container">
    <button @click="toggleGuide" class="help-button" :class="{ active: isVisible }" title="Schnellstart-Hilfe (?)">
      <svg v-if="!isVisible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

  <!-- Quick Start Panel -->
  <Teleport to="body">
    <transition name="slide-panel">
      <div v-if="isVisible" class="quick-start-panel">
        <div class="panel-header">
          <h3>Schnellstart-Anleitung</h3>
          <button @click="toggleGuide" class="close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="panel-content">
          <!-- Workflow Steps -->
          <div class="workflow-section">
            <h4>Workflow</h4>
            <div class="workflow-steps">
              <div class="workflow-step" v-for="(step, idx) in workflowSteps" :key="idx">
                <div class="step-number">{{ idx + 1 }}</div>
                <div class="step-info">
                  <span class="step-title">{{ step.title }}</span>
                  <span class="step-desc">{{ step.desc }}</span>
                </div>
                <span class="step-icon">{{ step.icon }}</span>
              </div>
            </div>
          </div>

          <!-- Keyboard Shortcuts -->
          <div class="shortcuts-section">
            <h4>Tastenkürzel</h4>
            <div class="shortcuts-grid">
              <div class="shortcut-item" v-for="(shortcut, idx) in shortcuts" :key="idx">
                <div class="shortcut-keys">
                  <kbd v-for="(key, kidx) in shortcut.keys" :key="kidx">{{ key }}</kbd>
                </div>
                <span class="shortcut-desc">{{ shortcut.desc }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-section">
            <h4>Tipps</h4>
            <div class="tips-list">
              <div class="tip-item" v-for="(tip, idx) in tips" :key="idx">
                <span class="tip-icon">{{ tip.icon }}</span>
                <span class="tip-text">{{ tip.text }}</span>
              </div>
            </div>
          </div>

          <!-- Panel Locations -->
          <div class="locations-section">
            <h4>Bereiche</h4>
            <div class="location-grid">
              <div class="location-item">
                <div class="location-icon left">◀</div>
                <div class="location-info">
                  <span class="location-title">Linkes Panel</span>
                  <span class="location-desc">Text-Manager, Bilder</span>
                </div>
              </div>
              <div class="location-item">
                <div class="location-icon center">■</div>
                <div class="location-info">
                  <span class="location-title">Mitte</span>
                  <span class="location-desc">Canvas / Vorschau</span>
                </div>
              </div>
              <div class="location-item">
                <div class="location-icon right">▶</div>
                <div class="location-info">
                  <span class="location-title">Rechtes Panel</span>
                  <span class="location-desc">Audio, Player, Recorder</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isVisible = ref(false);

const workflowSteps = [
  { title: 'Audio hochladen', desc: 'MP3, WAV, OGG oder M4A', icon: '🎵' },
  { title: 'Visualizer wählen', desc: '30+ Effekte verfügbar', icon: '🎨' },
  { title: 'Text/Bilder hinzufügen', desc: 'Optional personalisieren', icon: '✏️' },
  { title: 'Aufnehmen', desc: 'Prepare → Start → Stop', icon: '🎬' }
];

const shortcuts = [
  { keys: ['Space'], desc: 'Play / Pause' },
  { keys: ['Strg', 'Z'], desc: 'Rückgängig' },
  { keys: ['G'], desc: 'Gitter ein/aus' },
  { keys: ['Entf'], desc: 'Auswahl löschen' },
  { keys: ['?'], desc: 'Hilfe anzeigen' },
  { keys: ['Esc'], desc: 'Schließen' }
];

const tips = [
  { icon: '💡', text: 'Wählen Sie einen Workspace (z.B. TikTok) für das richtige Videoformat.' },
  { icon: '🎯', text: 'Starten Sie die Musik, um die Visualisierung live zu sehen.' },
  { icon: '⚡', text: 'Höhere Qualität = größere Datei. "High" reicht meist aus.' },
  { icon: '📱', text: 'Vertikale Formate (9:16) sind ideal für TikTok & Instagram.' }
];

function toggleGuide() {
  isVisible.value = !isVisible.value;
}

function handleKeydown(e) {
  // ? key to toggle help
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    e.preventDefault();
    toggleGuide();
  }
  // Escape to close
  if (e.key === 'Escape' && isVisible.value) {
    isVisible.value = false;
  }
}

// Public method to show the guide
function show() {
  isVisible.value = true;
}

function hide() {
  isVisible.value = false;
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

defineExpose({ show, hide, toggleGuide });
</script>

<style scoped>
/* Floating Help Button */
.help-button-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9998;
}

.help-button {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 20px rgba(110, 168, 254, 0.4),
    0 0 0 0 rgba(110, 168, 254, 0.4);
  transition: all 0.3s ease;
  animation: pulse-shadow 2s infinite;
}

.help-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(110, 168, 254, 0.5);
}

.help-button.active {
  background: linear-gradient(135deg, #F44336 0%, #E91E63 100%);
  animation: none;
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
}

.help-button svg {
  width: 24px;
  height: 24px;
}

@keyframes pulse-shadow {
  0%, 100% {
    box-shadow:
      0 4px 20px rgba(110, 168, 254, 0.4),
      0 0 0 0 rgba(110, 168, 254, 0.4);
  }
  50% {
    box-shadow:
      0 4px 20px rgba(110, 168, 254, 0.4),
      0 0 0 12px rgba(110, 168, 254, 0);
  }
}

/* Quick Start Panel */
.quick-start-panel {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 360px;
  max-height: calc(100vh - 120px);
  background: linear-gradient(145deg, #1e1e1e 0%, #252525 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
}

.close-btn svg {
  width: 14px;
  height: 14px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.panel-content h4 {
  margin: 0 0 12px 0;
  font-size: 11px;
  font-weight: 600;
  color: #6ea8fe;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Workflow Steps */
.workflow-section {
  margin-bottom: 20px;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.workflow-step:hover {
  background: rgba(110, 168, 254, 0.1);
  transform: translateX(4px);
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
  color: #121212;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.step-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.step-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* Shortcuts */
.shortcuts-section {
  margin-bottom: 20px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
}

.shortcut-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
}

.shortcut-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

/* Tips */
.tips-section {
  margin-bottom: 20px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 193, 7, 0.08);
  border-radius: 8px;
  border-left: 3px solid rgba(255, 193, 7, 0.5);
}

.tip-item .tip-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tip-item .tip-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

/* Locations */
.locations-section {
  margin-bottom: 8px;
}

.location-grid {
  display: flex;
  gap: 8px;
}

.location-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  text-align: center;
}

.location-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
}

.location-icon.left {
  background: linear-gradient(135deg, #9C27B0 0%, #E91E63 100%);
}

.location-icon.center {
  background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
}

.location-icon.right {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
}

.location-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.location-title {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.location-desc {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
}

/* Scrollbar */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Transitions */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.3s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Responsive */
@media (max-width: 420px) {
  .quick-start-panel {
    right: 12px;
    left: 12px;
    width: auto;
    bottom: 80px;
  }

  .help-button-container {
    right: 16px;
    bottom: 16px;
  }

  .help-button {
    width: 48px;
    height: 48px;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .help-button {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  box-shadow: 0 4px 20px rgba(1, 79, 153, 0.4),
              0 0 0 0 rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .help-button:hover {
  box-shadow: 0 6px 30px rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .help-button.active {
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
}

[data-theme='light'] .quick-start-panel {
  background: linear-gradient(145deg, #FFFFFF 0%, #f9f2d5 100%);
  border-color: #d4c8a8;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(0, 57, 113, 0.1);
}

[data-theme='light'] .panel-header {
  border-bottom-color: #d4c8a8;
  background: rgba(1, 79, 153, 0.05);
}

[data-theme='light'] .panel-header h3 {
  color: #003971;
}

[data-theme='light'] .close-btn {
  background: rgba(0, 57, 113, 0.1);
  color: rgba(0, 57, 113, 0.6);
}

[data-theme='light'] .close-btn:hover {
  background: rgba(244, 67, 54, 0.15);
  color: #F44336;
}

[data-theme='light'] .panel-content h4 {
  color: #014f99;
}

[data-theme='light'] .workflow-step {
  background: rgba(1, 79, 153, 0.05);
}

[data-theme='light'] .workflow-step:hover {
  background: rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .step-number {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #F5F4D6;
}

[data-theme='light'] .step-title {
  color: #003971;
}

[data-theme='light'] .step-desc {
  color: #4d6d8e;
}

[data-theme='light'] .shortcut-item {
  background: rgba(1, 79, 153, 0.03);
}

[data-theme='light'] .shortcut-keys kbd {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.2);
  color: #003971;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .shortcut-desc {
  color: #4d6d8e;
}

[data-theme='light'] .tip-item {
  background: rgba(201, 152, 77, 0.1);
  border-left-color: rgba(201, 152, 77, 0.5);
}

[data-theme='light'] .tip-item .tip-text {
  color: #003971;
}

[data-theme='light'] .location-item {
  background: rgba(1, 79, 153, 0.03);
}

[data-theme='light'] .location-icon {
  color: #F5F4D6;
}

[data-theme='light'] .location-title {
  color: #003971;
}

[data-theme='light'] .location-desc {
  color: #4d6d8e;
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(1, 79, 153, 0.3);
}
</style>
