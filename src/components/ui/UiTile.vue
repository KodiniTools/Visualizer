<template>
  <button
    type="button"
    :class="['ui-tile', `ui-tile--${size}`, { 'ui-tile--active': active || pressed === true }]"
    :aria-label="label"
    :title="label"
    :aria-pressed="pressed === undefined ? undefined : pressed"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup>
/**
 * Quadratische Auswahl-Kachel für Galerien (Formen, Sticker, Emojis).
 * `label` ist Pflicht (aria-label und title). `pressed` macht die Kachel zum
 * Umschalter mit aria-pressed, `active` markiert sie nur optisch (z. B. die
 * aktuelle Auswahl einer Liste).
 */
defineProps({
  label: { type: String, required: true },
  /** 'sm' | 'md' */
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
  /** undefined = kein Umschalter (kein aria-pressed) */
  pressed: { type: Boolean, default: undefined },
  active: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
</script>

<style scoped>
.ui-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-2);
  color: var(--ds-text);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease),
    color var(--ds-duration) var(--ds-ease);
}

.ui-tile:hover:not(:disabled) {
  background: var(--ds-surface-3);
  border-color: var(--ds-accent);
}

.ui-tile:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.ui-tile:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-tile--sm {
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-lg);
}

.ui-tile--active {
  background: var(--ds-accent-soft);
  border-color: var(--ds-accent);
}
</style>
