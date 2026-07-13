<template>
  <div v-if="banner" class="shared-banner" :class="'shared-banner-' + banner.type">
    <span>{{ banner.message }}</span>
  </div>
</template>

<script setup>
defineProps({
  // { type: 'success'|'error'|'warning'|'info', message: string } | null
  banner: { type: Object, default: null },
})
</script>

<style scoped>
.shared-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.shared-banner-success {
  background-color: rgba(197, 222, 176, 0.15);
  border: 1px solid rgba(197, 222, 176, 0.4);
  color: var(--success, #c5deb0);
}
.shared-banner-error {
  background-color: rgba(255, 100, 100, 0.15);
  border: 1px solid rgba(255, 100, 100, 0.4);
  color: #ff6464;
}
.shared-banner-warning {
  background-color: rgba(255, 200, 50, 0.15);
  border: 1px solid rgba(255, 200, 50, 0.4);
  color: #ffc832;
}
.shared-banner-info {
  background-color: rgba(100, 180, 255, 0.15);
  border: 1px solid rgba(100, 180, 255, 0.4);
  color: #64b4ff;
}

[data-theme='light'] .shared-banner-success {
  background-color: rgba(56, 142, 60, 0.1);
  border-color: rgba(56, 142, 60, 0.3);
  color: #388e3c;
}
[data-theme='light'] .shared-banner-error {
  background-color: rgba(211, 47, 47, 0.1);
  border-color: rgba(211, 47, 47, 0.3);
  color: #d32f2f;
}
[data-theme='light'] .shared-banner-warning {
  background-color: rgba(245, 124, 0, 0.1);
  border-color: rgba(245, 124, 0, 0.3);
  color: #f57c00;
}
[data-theme='light'] .shared-banner-info {
  background-color: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}
</style>
