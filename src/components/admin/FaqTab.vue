<template>
  <div class="admin-tab-content">
    <p class="admin-tab-hint">Leere Felder verwenden automatisch den Standardtext (Platzhalter).</p>
    <AdminField
      v-model="content.faq.title"
      label="Abschnitt-Titel"
      :placeholder="defaults.faq.title"
      @edit="save"
    />
    <AdminField
      v-model="content.faq.subtitle"
      label="Abschnitt-Untertitel"
      :placeholder="defaults.faq.subtitle"
      @edit="save"
    />

    <div v-for="(item, index) in content.faq.items" :key="index" class="admin-card-group">
      <h4 class="admin-card-title">Frage {{ index + 1 }}</h4>
      <AdminField
        v-model="item.question"
        label="Frage"
        :placeholder="defaults.faq.items[index]?.question"
        multiline
        :rows="2"
        @edit="save"
      />
      <AdminField
        v-model="item.answer"
        label="Antwort"
        :placeholder="defaults.faq.items[index]?.answer"
        multiline
        :rows="4"
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
