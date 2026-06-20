<template>
  <header class="app-header">
    <router-link to="/" class="app-logo" :title="t('common.backToHome')">
      <span class="logo-text">Visualizer</span>
    </router-link>

    <nav class="app-header-nav" aria-label="App navigation">
      <router-link to="/" class="back-link">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>{{ t('common.backToHome') }}</span>
      </router-link>
    </nav>
  </header>
</template>

<script setup>
import { useI18n } from '../lib/i18n.js'

const { t } = useI18n()
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 14px;
  background-color: var(--primary-bg, #091428);
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  flex-shrink: 0;
  gap: 12px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  color: var(--accent-primary, #c9984d);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  transition: color 0.2s;
}

.app-logo:hover {
  color: var(--accent-tertiary, #f8e1a9);
}

.app-logo svg {
  flex-shrink: 0;
}

.logo-text {
  line-height: 1;
}

.app-header-nav {
  display: flex;
  align-items: center;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--text-muted, #7a8da0);
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.3px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.back-link:hover {
  color: var(--text-primary, #e9e9eb);
  border-color: var(--border-color, rgba(201, 152, 77, 0.2));
  background-color: var(--secondary-bg, #0e1c32);
}

/* Light theme */
[data-theme='light'] .app-header {
  border-bottom-color: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .app-logo {
  color: var(--accent-primary, #014f99);
}

[data-theme='light'] .app-logo:hover {
  color: #003971;
}

/* Mobile: Logo-Text verstecken, nur Icon zeigen */
@media (max-width: 768px) {
  .app-header {
    height: 38px;
    padding: 0 10px;
  }

  .logo-text {
    display: none;
  }
}
</style>
