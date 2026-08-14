<template>
  <div class="admin-panel">
    <div class="admin-header">
      <h3>🔧 Landing-Page verwalten</h3>
      <div class="admin-user">
        <span class="user-badge">👤 {{ authStore.user?.username || 'Admin' }}</span>
        <button class="btn-reset" title="Alle Texte auf Standard zurücksetzen" @click="onReset">
          Zurücksetzen
        </button>
        <button class="btn-logout" @click="authStore.logout">Abmelden</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="admin-content">
      <HeroTab v-if="activeTab === 'hero'" />
      <FeaturesTab v-else-if="activeTab === 'features'" />
      <VideoTab v-else-if="activeTab === 'video'" />
      <FaqTab v-else-if="activeTab === 'faq'" />
      <CtaTab v-else-if="activeTab === 'cta'" />
    </div>

    <p class="admin-footer">
      Änderungen werden automatisch gespeichert und für alle Besucher übernommen.
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useLandingContentStore } from '../../stores/landingContent'
import HeroTab from './HeroTab.vue'
import FeaturesTab from './FeaturesTab.vue'
import VideoTab from './VideoTab.vue'
import FaqTab from './FaqTab.vue'
import CtaTab from './CtaTab.vue'

const authStore = useAuthStore()
const contentStore = useLandingContentStore()

const activeTab = ref('hero')

const tabs = [
  { id: 'hero', label: 'Hero', icon: '✨' },
  { id: 'features', label: 'Funktionen', icon: '🎛️' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'faq', label: 'FAQ', icon: '❓' },
  { id: 'cta', label: 'Call-to-Action', icon: '🚀' },
]

function onReset() {
  if (
    typeof window !== 'undefined' &&
    !window.confirm('Wirklich alle Landing-Page-Texte auf den Standard zurücksetzen?')
  ) {
    return
  }
  contentStore.resetAll()
}
</script>

<style scoped>
.admin-panel {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg, rgba(20, 38, 64, 0.9));
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.25));
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.admin-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary, #f9f2d5);
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-badge {
  background: var(--panel-highlight, rgba(201, 152, 77, 0.1));
  padding: 6px 12px;
  border-radius: 20px;
  color: var(--text-secondary, #f8e1a9);
  font-size: 0.8rem;
}

.btn-reset,
.btn-logout {
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font-sans, 'Supreme', sans-serif);
  transition: all 0.2s ease;
}

.btn-reset {
  background: transparent;
  color: var(--text-secondary, #f8e1a9);
}

.btn-reset:hover {
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-primary, #c9984d);
}

.btn-logout {
  background: var(--red, #ef4444);
  border-color: var(--red, #ef4444);
  color: #fff;
}

.btn-logout:hover {
  filter: brightness(1.1);
}

.admin-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  background: var(--secondary-bg, rgba(14, 28, 50, 0.6));
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  color: var(--text-secondary, #f8e1a9);
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: var(--font-sans, 'Supreme', sans-serif);
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--accent-primary, #c9984d);
}

.tab-btn.active {
  background: var(--panel-highlight, rgba(201, 152, 77, 0.15));
  border-color: var(--accent-primary, #c9984d);
  color: var(--text-primary, #f9f2d5);
  font-weight: 600;
}

.admin-footer {
  margin: 20px 0 0 0;
  font-size: 0.78rem;
  color: var(--text-muted, #7a8da0);
  text-align: center;
}

@media (max-width: 600px) {
  .admin-panel {
    padding: 18px;
  }
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
