<template>
  <div class="empty-panel">
    <h3 class="panel-title">Neue Sektion</h3>
    <div class="panel-content">
      <!-- Hier kann später Inhalt hinzugefügt werden -->
      <p class="placeholder-text">Diese Sektion ist bereit für neue Inhalte</p>
    </div>
  </div>
</template>

<script setup>
// Hier können später Funktionen und Logik hinzugefügt werden
</script>

<style scoped>
.empty-panel {
  background-color: var(--secondary-bg);
  border-radius: var(--ds-radius-md);
  padding: 16px;
  border: 1px solid var(--border-color);
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.placeholder-text {
  color: var(--text-muted);
  font-size: var(--ds-text-sm);
  margin: 0;
  font-style: italic;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .empty-panel {
  background-color: var(--card-bg);
  border-color: var(--ds-border);
}

[data-theme='light'] .panel-title {
  color: var(--text-primary);
}
</style>
