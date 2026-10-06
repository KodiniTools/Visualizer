<template>
  <header class="app-header">
    <router-link to="/" class="app-logo" :title="t('common.backToHome')">
      <span class="logo-text">Visualizer</span>
    </router-link>

    <nav class="app-header-nav" aria-label="App navigation">
      <router-link to="/" class="back-link">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
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
/* Topbar nach Design-System v2: ds-topbar-height, ds-surface-1, 1 px Rand unten.
   Der Name steht in Textfarbe (ds-title), nicht in Gold; „Zur Startseite“ ist
   ein Ghost-Button in Größe sm. */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  height: var(--ds-topbar-height);
  padding: 0 var(--ds-space-4);
  background-color: var(--ds-surface-1);
  border-bottom: var(--ds-border-width) solid var(--ds-border);
  flex-shrink: 0;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  text-decoration: none;
  color: var(--ds-text);
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-sm);
  transition: color var(--ds-duration) var(--ds-ease);
}

.app-logo:hover {
  color: var(--ds-text-2);
}

.app-logo:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
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
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-3);
  text-decoration: none;
  color: var(--ds-text-2);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  border: var(--ds-border-width) solid transparent;
  border-radius: var(--ds-radius-sm);
  transition:
    background-color var(--ds-duration) var(--ds-ease),
    color var(--ds-duration) var(--ds-ease);
}

.back-link:hover {
  color: var(--ds-text);
  background-color: var(--ds-surface-2);
}

.back-link:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

/* Mobile: Logo-Text verstecken */
@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--ds-space-3);
  }

  .logo-text {
    display: none;
  }
}
</style>
