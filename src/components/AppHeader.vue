<template>
  <header class="app-header">
    <router-link to="/" class="app-logo" :title="t('common.backToHome')">
      <img class="brand-logo" :src="logoSrc" alt="" width="40" height="40" />
      <span class="logo-text">Visualizer</span>
    </router-link>

    <nav class="app-header-nav" aria-label="Visualizer-Navigation">
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

<script setup lang="ts">
import { useI18n } from '../lib/i18n'

const { t } = useI18n()

// Base-aware (Produktion: /visualizer/), sonst 404 auf /kodini-logo.png.
const logoSrc = `${import.meta.env.BASE_URL}kodini-logo.png`
</script>

<style scoped>
/* Etappe 2: ausschliesslich Darstellung. Router und i18n bleiben unveraendert. */
.app-header {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 72px;
  padding: 10px clamp(14px, 2.4vw, 34px);
  background: linear-gradient(105deg, var(--ds-surface-1), var(--ds-surface-0));
  border-bottom: 1px solid var(--ds-border);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.app-header::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #3aa8ef55 35%, #d4a25770 70%, transparent);
  pointer-events: none;
}
.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: var(--ds-text);
  text-decoration: none;
  border-radius: 12px;
}
.brand-logo {
  display: block;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 75, 165, 0.16);
}
.logo-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(16px, 1.45vw, 21px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.app-header-nav {
  display: flex;
  align-items: center;
  min-width: 0;
}
.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  color: var(--ds-text-2);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.back-link svg {
  flex-shrink: 0;
}
.back-link:hover {
  color: var(--ds-text);
  border-color: var(--ds-link);
  background: var(--ds-surface-3);
  transform: translateY(-1px);
}
.app-logo:focus-visible,
.back-link:focus-visible {
  outline: 2px solid var(--ds-link);
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .app-header {
    min-height: 62px;
    padding: 8px 12px;
    gap: 8px;
  }
  .brand-logo {
    width: 40px;
    height: 40px;
    flex-basis: 40px;
  }
  .app-logo {
    gap: 8px;
  }
  .logo-text {
    font-size: 16px;
  }
  .back-link {
    min-height: 38px;
    padding: 8px 10px;
    font-size: 12px;
  }
}
@media (max-width: 370px) {
  .logo-text {
    font-size: 14px;
  }
  .back-link {
    gap: 4px;
    padding: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .back-link {
    transition: none;
  }
}
</style>
