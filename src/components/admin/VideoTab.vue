<template>
  <div class="admin-tab-content">
    <p class="admin-tab-hint">Leere Felder verwenden automatisch den Standardtext (Platzhalter).</p>
    <AdminField
      v-model="content.video.title"
      label="Abschnitt-Titel"
      :placeholder="defaults.video.title"
      multiline
      :rows="2"
      @edit="save"
    />
    <AdminField
      v-model="content.video.subtitle"
      label="Abschnitt-Untertitel"
      :placeholder="defaults.video.subtitle"
      multiline
      :rows="3"
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
