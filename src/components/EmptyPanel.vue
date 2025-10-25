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
  background-color: #252525;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.placeholder-text {
  color: #888;
  font-size: 13px;
  margin: 0;
  font-style: italic;
}
</style>
