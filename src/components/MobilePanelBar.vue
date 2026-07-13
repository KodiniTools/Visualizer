<template>
  <div class="mobile-panel-bar" role="tablist">
    <button
      class="mobile-panel-btn"
      :class="{ active: modelValue === 'left' }"
      role="tab"
      :aria-selected="modelValue === 'left'"
      @click="$emit('update:modelValue', 'left')"
    >
      <svg
        class="mobile-panel-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span class="mobile-panel-label">{{ t('app.mobileTabFoto') }}</span>
      <span class="mobile-active-bar" aria-hidden="true"></span>
    </button>
    <button
      class="mobile-panel-btn"
      :class="{ active: modelValue === 'canvas' }"
      role="tab"
      :aria-selected="modelValue === 'canvas'"
      @click="$emit('update:modelValue', 'canvas')"
    >
      <svg
        class="mobile-panel-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M8 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="mobile-panel-label">Canvas</span>
      <span class="mobile-active-bar" aria-hidden="true"></span>
    </button>
    <button
      class="mobile-panel-btn"
      :class="{ active: modelValue === 'right' }"
      role="tab"
      :aria-selected="modelValue === 'right'"
      @click="$emit('update:modelValue', 'right')"
    >
      <svg
        class="mobile-panel-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 4V2M12 22v-2"
        />
      </svg>
      <span class="mobile-panel-label">{{ t('app.mobileTabControls') }}</span>
      <span class="mobile-active-bar" aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  t: { type: Function, required: true },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.mobile-panel-bar {
  display: none;
}

@media (max-width: 768px) {
  .mobile-panel-bar {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: var(--card-bg, #142640);
    border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-panel-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 6px 6px;
    min-height: 52px;
    background: var(--secondary-bg, #0e1c32);
    border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
    border-radius: 8px;
    color: var(--text-muted, #7a8da0);
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
    position: relative;
    overflow: hidden;
  }

  .mobile-panel-btn.active {
    background: color-mix(
      in srgb,
      var(--accent-primary, #c9984d) 12%,
      var(--secondary-bg, #0e1c32)
    );
    color: var(--accent-primary, #c9984d);
    border-color: var(--accent-primary, #c9984d);
  }

  .mobile-panel-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  /* Bottom indicator bar — slides in on active */
  .mobile-active-bar {
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--accent-primary, #c9984d);
    transform: scaleX(0);
    transition: transform 0.2s ease;
  }
  .mobile-panel-btn.active .mobile-active-bar {
    transform: scaleX(1);
  }

  [data-theme='light'] .mobile-panel-btn {
    background: #fdfbf2;
    color: #5a7b9a;
    border-color: var(--border-color);
  }
  [data-theme='light'] .mobile-panel-btn.active {
    background: rgba(1, 79, 153, 0.08);
    color: #014f99;
    border-color: #014f99;
  }
  [data-theme='light'] .mobile-active-bar {
    background: #014f99;
  }
}

@media (max-width: 480px) {
  .mobile-panel-bar {
    padding: 4px 6px;
  }

  .mobile-panel-btn {
    padding: 6px 4px 4px;
    min-height: 44px;
    gap: 2px;
  }

  .mobile-panel-label {
    display: none;
  }

  .mobile-panel-icon {
    width: 22px;
    height: 22px;
  }
}
</style>
