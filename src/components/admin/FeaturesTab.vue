<template>
  <div class="admin-tab-content">
    <p class="admin-tab-hint">Leere Felder verwenden automatisch den Standardtext (Platzhalter).</p>
    <AdminField
      v-model="content.features.title"
      label="Abschnitt-Titel"
      :placeholder="defaults.features.title"
      @edit="save"
    />
    <AdminField
      v-model="content.features.subtitle"
      label="Abschnitt-Untertitel"
      :placeholder="defaults.features.subtitle"
      multiline
      :rows="2"
      @edit="save"
    />

    <div v-for="(card, index) in content.features.cards" :key="index" class="admin-card-group">
      <h4 class="admin-card-title">Karte {{ index + 1 }}</h4>
      <AdminField
        v-model="card.title"
        label="Titel"
        :placeholder="defaults.features.cards[index]?.title"
        @edit="save"
      />
      <AdminField
        v-model="card.description"
        label="Beschreibung"
        :placeholder="defaults.features.cards[index]?.description"
        multiline
        :rows="3"
        @edit="save"
      />
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useLandingContentStore } from '../../stores/landingContent'
import AdminField from './AdminField.vue'

const store = useLandingContentStore()
const { defaults } = storeToRefs(store)
const content = store.content
const save = () => store.save()
</script>

<style scoped>
.admin-tab-content {
  display: flex;
  flex-direction: column;
}
.admin-tab-hint {
  margin: 0 0 16px 0;
  font-size: var(--ds-text-sm);
  color: var(--text-muted);
}
.admin-card-group {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  background: var(--panel-highlight);
}
.admin-card-title {
  margin: 0 0 12px 0;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-bold);
  color: var(--accent-ink);
}
</style>
