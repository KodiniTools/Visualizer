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
  font-size: 0.8rem;
  color: var(--text-muted, #7a8da0);
}
.admin-card-group {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 12px;
  background: var(--panel-highlight, rgba(201, 152, 77, 0.05));
}
.admin-card-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-primary, #c9984d);
}
</style>
