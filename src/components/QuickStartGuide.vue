<template>
  <!-- Floating Help Button -->
  <div class="help-button-container">
    <UiIconButton
      class="help-button"
      variant="primary"
      round
      :label="isVisible ? labels.close : labels.open"
      :pressed="isVisible"
      @click="toggleGuide"
    >
      <svg v-if="!isVisible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </UiIconButton>
  </div>

  <!-- Quick Start Panel -->
  <Teleport to="body">
    <transition name="slide-panel">
      <div v-if="isVisible" class="quick-start-panel">
        <div class="panel-header">
          <h3>{{ labels.title }}</h3>
          <div class="header-actions">
            <UiSegmentedControl
              v-model="lang"
              class="lang-toggle"
              size="sm"
              :label="labels.language"
              :options="LANG_OPTIONS"
            />
            <UiIconButton class="close-btn" size="sm" :label="labels.close" @click="toggleGuide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </UiIconButton>
          </div>
        </div>

        <div class="panel-content">
          <!-- Tab Navigation -->
          <UiSegmentedControl
            v-model="activeTab"
            class="tab-nav"
            :label="labels.tabs"
            :options="tabOptions"
          />

          <!-- Tab: Workflow -->
          <div v-if="activeTab === 'workflow'" class="tab-content">
            <div class="workflow-steps">
              <div v-for="(step, idx) in langContent.workflow" :key="idx" class="workflow-step">
                <div class="step-number">{{ idx + 1 }}</div>
                <div class="step-info">
                  <span class="step-title">{{ step.title }}</span>
                  <span class="step-desc">{{ step.desc }}</span>
                </div>
                <span class="step-icon">{{ step.icon }}</span>
              </div>
            </div>
          </div>

          <!-- Tab: Features -->
          <div v-if="activeTab === 'features'" class="tab-content">
            <div class="feature-list">
              <div v-for="(f, idx) in langContent.features" :key="idx" class="feature-item">
                <div class="feature-header">
                  <span class="feature-icon">{{ f.icon }}</span>
                  <span class="feature-title">{{ f.title }}</span>
                </div>
                <ul class="feature-bullets">
                  <li v-for="(b, bidx) in f.bullets" :key="bidx">{{ b }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Tab: Shortcuts -->
          <div v-if="activeTab === 'shortcuts'" class="tab-content">
            <div v-for="(group, gidx) in langContent.shortcuts" :key="gidx" class="shortcut-group">
              <div class="shortcut-group-title">{{ group.title }}</div>
              <div class="shortcuts-grid">
                <div v-for="(sc, sidx) in group.items" :key="sidx" class="shortcut-item">
                  <UiKbd class="shortcut-keys" :keys="sc.keys" />
                  <span class="shortcut-desc">{{ sc.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Tips -->
          <div v-if="activeTab === 'tips'" class="tab-content">
            <div class="tips-list">
              <div v-for="(tip, idx) in langContent.tips" :key="idx" class="tip-item">
                <span class="tip-icon">{{ tip.icon }}</span>
                <div class="tip-body">
                  <span v-if="tip.title" class="tip-title">{{ tip.title }}</span>
                  <span class="tip-text">{{ tip.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { localeRef } from '../lib/i18n'
import { QUICK_START_TABS, QUICK_START_CONTENT } from '../data/quickStartGuide'
import { UiIconButton, UiKbd, UiSegmentedControl } from './ui'

const LANG_OPTIONS = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
]

const isVisible = ref(false)
// Startet in der App-Sprache und folgt ihr; DE/EN im Panel schaltet nur die Anleitung um.
const lang = ref(localeRef.value === 'en' ? 'en' : 'de')
watch(localeRef, (v) => {
  lang.value = v === 'en' ? 'en' : 'de'
})
const activeTab = ref('workflow')

// Inhalte der gewählten Anleitungssprache (UiSegmentedControl liefert nur 'de' oder 'en')
const langContent = computed(() => QUICK_START_CONTENT[lang.value === 'en' ? 'en' : 'de'])
// Beschriftungen folgen der Sprache der Anleitung, nicht nur der App
const labels = computed(() => langContent.value.labels)
const tabOptions = computed(() =>
  QUICK_START_TABS.map((id) => ({ value: id, label: labels.value[id] })),
)

function toggleGuide() {
  isVisible.value = !isVisible.value
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    if (!(e.target as Element).matches('input, textarea, select')) {
      e.preventDefault()
      toggleGuide()
    }
  }
  if (e.key === 'Escape' && isVisible.value) {
    isVisible.value = false
  }
}

function show() {
  isVisible.value = true
}
function hide() {
  isVisible.value = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose({ show, hide, toggleGuide })
</script>

<style scoped>
/* Floating Help Button */
.help-button-container {
  position: fixed;
  bottom: calc(24px + var(--sticky-player-bar-height));
  right: 24px;
  z-index: calc(var(--ds-z-player) - 1);
}

.help-button {
  width: 52px;
  height: 52px;
}

.help-button-container .help-button svg {
  width: 24px;
  height: 24px;
}

/* Quick Start Panel */
.quick-start-panel {
  position: fixed;
  bottom: calc(90px + var(--sticky-player-bar-height));
  right: 24px;
  width: 380px;
  max-height: calc(100vh - 120px - var(--sticky-player-bar-height));
  background: var(--primary-bg);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-overlay);
  z-index: var(--ds-z-player);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ds-border);
  background: rgba(0, 0, 0, 0.2);
  gap: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  margin: 10px 14px 0;
}

.tab-nav :deep(.ui-segmented__option) {
  flex: 1;
}

/* Scrollable content area */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 14px;
}

.tab-content {
  padding: 14px;
}

/* Workflow Steps */
.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--ds-radius-md);
  transition: all var(--ds-duration) var(--ds-ease);
}

.workflow-step:hover {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
}

.step-number {
  width: 22px;
  height: 22px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  color: var(--ds-on-accent);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.step-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.step-desc {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  line-height: 1.35;
}

.step-icon {
  font-size: var(--ds-text-lg);
  flex-shrink: 0;
}

/* Features */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--ds-radius-md);
  padding: 10px 12px;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
}

.feature-icon {
  font-size: var(--ds-text-lg);
}

.feature-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-link);
}

.feature-bullets {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-bullets li {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  line-height: 1.4;
}

/* Shortcuts */
.shortcut-group {
  margin-bottom: 14px;
}

.shortcut-group:last-child {
  margin-bottom: 0;
}

.shortcut-group-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-link);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 7px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 9px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--ds-radius-sm);
}

.shortcut-desc {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

/* Tips */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 11px;
  background: color-mix(in srgb, var(--ds-warning) 7%, transparent);
  border-radius: var(--ds-radius-md);
  border-left: 3px solid color-mix(in srgb, var(--ds-warning) 45%, transparent);
}

.tip-icon {
  font-size: var(--ds-text-lg);
  flex-shrink: 0;
  margin-top: 1px;
}

.tip-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-warning);
}

.tip-text {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  line-height: 1.45;
}

/* Scrollbar */
.panel-content::-webkit-scrollbar {
  width: 5px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--ds-radius-sm);
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Transitions */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all var(--ds-duration-slow) var(--ds-ease);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

/* Responsive */
@media (max-width: 420px) {
  .quick-start-panel {
    right: 10px;
    left: 10px;
    width: auto;
    bottom: calc(78px + var(--sticky-player-bar-height-mobile));
  }

  .help-button-container {
    right: 14px;
    bottom: calc(14px + var(--sticky-player-bar-height-mobile));
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .quick-start-panel {
  background: var(--card-bg);
  border-color: var(--ds-border);
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .panel-header {
  border-bottom-color: var(--ds-border);
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .panel-header h3 {
  color: var(--text-primary);
}

[data-theme='light'] .workflow-step {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .workflow-step:hover {
  background: color-mix(in srgb, var(--accent-primary) 9%, transparent);
}

[data-theme='light'] .step-number {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .step-title {
  color: var(--text-primary);
}
[data-theme='light'] .step-desc {
  color: var(--text-muted);
}

[data-theme='light'] .feature-item {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .feature-title {
  color: var(--accent-ink);
}

[data-theme='light'] .feature-bullets li {
  color: var(--text-muted);
}

[data-theme='light'] .shortcut-item {
  background: color-mix(in srgb, var(--accent-primary) 3%, transparent);
}

[data-theme='light'] .shortcut-group-title {
  color: var(--accent-ink);
}

[data-theme='light'] .shortcut-desc {
  color: var(--text-muted);
}

[data-theme='light'] .tip-item {
  background: color-mix(in srgb, var(--accent-primary) 9%, transparent);
  border-left-color: var(--accent-primary);
}

[data-theme='light'] .tip-title {
  color: var(--accent-ink);
}
[data-theme='light'] .tip-text {
  color: var(--text-muted);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-primary) 28%, transparent);
}
</style>
