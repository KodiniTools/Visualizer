<template>
  <div class="admin-tab-content">
    <p class="admin-tab-hint">Leere Felder verwenden automatisch den Standardtext (Platzhalter).</p>
    <AdminField
      v-model="content.cta.title"
      label="Titel"
      :placeholder="defaults.cta.title"
      @edit="save"
    />
    <AdminField
      v-model="content.cta.subtitle"
      label="Untertitel"
      :placeholder="defaults.cta.subtitle"
      multiline
      :rows="3"
      @edit="save"
    />
    <AdminField
      v-model="content.cta.button"
      label="Button"
      :placeholder="defaults.cta.button"
      @edit="save"
    />
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
</style>
