<template>
  <div class="admin-tab-content">
    <p class="admin-tab-hint">Leere Felder verwenden automatisch den Standardtext (Platzhalter).</p>
    <AdminField
      v-model="content.hero.title"
      label="Titel"
      :placeholder="defaults.hero.title"
      multiline
      :rows="2"
      @edit="save"
    />
    <AdminField
      v-model="content.hero.titleHighlight"
      label="Titel (Hervorhebung)"
      :placeholder="defaults.hero.titleHighlight"
      multiline
      :rows="2"
      @edit="save"
    />
    <AdminField
      v-model="content.hero.subtitle"
      label="Untertitel"
      :placeholder="defaults.hero.subtitle"
      multiline
      :rows="4"
      @edit="save"
    />
    <AdminField
      v-model="content.hero.cta"
      label="Button (Primär)"
      :placeholder="defaults.hero.cta"
      @edit="save"
    />
    <AdminField
      v-model="content.hero.learnMore"
      label="Button (Sekundär)"
      :placeholder="defaults.hero.learnMore"
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
