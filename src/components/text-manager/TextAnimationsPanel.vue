<template>
  <!-- ✨ TEXT-ANIMATION (klappbar) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">⌨️</span>
      <span>Text-Animation</span>
      <span v-for="badge in activeBadges" :key="badge" class="status-badge active">{{
        badge
      }}</span>
    </summary>
    <div class="section-content">
      <TypewriterAnimationSection />
      <hr class="section-divider" />
      <FadeAnimationSection />
      <hr class="section-divider" />
      <ScaleAnimationSection />
      <hr class="section-divider" />
      <SlideAnimationSection />
    </div>
  </details>
</template>

<script setup>
/**
 * Text-Animationen des markierten Textes (Typewriter, Fade, Scale, Slide).
 *
 * Die vier Sektionen liegen in `text-animations/` und beziehen Text, Redraw
 * und Toggle/Neustart-Aktionen über provide/inject (`textAnimationControls`);
 * gemeinsame Teil-Controls (Dauer/Delay/Easing, Loop, Anzeigedauer) sind dort
 * ebenfalls als eigene Komponenten abgelegt.
 */
import { computed, inject, provide, toRef, watch } from 'vue'
import { useTextAnimations } from '../../composables/useTextAnimations.js'
import TypewriterAnimationSection from './text-animations/TypewriterAnimationSection.vue'
import FadeAnimationSection from './text-animations/FadeAnimationSection.vue'
import ScaleAnimationSection from './text-animations/ScaleAnimationSection.vue'
import SlideAnimationSection from './text-animations/SlideAnimationSection.vue'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
})

// ✨ Backfill: Ältere Text-Objekte kennen die neuen Felder (permanent / displayDuration)
// noch nicht. Standard = permanent anzeigen, damit sich das Verhalten nicht ändert.
function ensureDisplayDefaults(text) {
  const anim = text?.animation
  if (!anim) return
  for (const key of ['typewriter', 'fade', 'scale', 'slide']) {
    const eff = anim[key]
    if (!eff) continue
    if (eff.permanent === undefined) eff.permanent = true
    if (eff.displayDuration === undefined) eff.displayDuration = 5000
  }
}

watch(() => props.selectedText, ensureDisplayDefaults, { immediate: true })

const canvasManager = inject('canvasManager')

// Reaktive Referenz auf den aktuell markierten Text, damit alle Aktionen
// (Toggles, "Neu Starten") sich ausschließlich auf diesen Text beziehen.
const selectedText = toRef(props, 'selectedText')

const animations = useTextAnimations(selectedText, canvasManager)

function updateText() {
  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}

provide('textAnimationControls', { selectedText, updateText, ...animations })

const BADGES = [
  ['typewriter', 'Typewriter'],
  ['fade', 'Fade'],
  ['scale', 'Scale'],
  ['slide', 'Slide'],
]
const activeBadges = computed(() =>
  BADGES.filter(([key]) => props.selectedText?.animation?.[key]?.enabled).map(([, label]) => label),
)
</script>

<style scoped>
/* Klappbare Sektion, Kopfzeile und Status-Badges (nur das Panel selbst) */
/* ===== COLLAPSIBLE SECTIONS ===== */
.collapsible-section {
  background-color: var(--secondary-bg);
  border: 1px solid var(--card-bg);
  border-radius: var(--ds-radius-md);
  margin-bottom: 10px;
  overflow: hidden;
  transition: all var(--ds-duration) var(--ds-ease);
}
.collapsible-section:hover {
  border-color: var(--btn-hover);
}
.collapsible-section[open] {
  border-color: var(--btn-hover);
}
.collapsible-section summary {
  list-style: none;
}
.collapsible-section summary::-webkit-details-marker {
  display: none;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  background: var(--secondary-bg);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all var(--ds-duration) var(--ds-ease);
  user-select: none;
}
.section-header:hover {
  background: var(--card-bg);
  color: var(--ds-text);
}
.collapsible-section[open] .section-header {
  border-bottom: 1px solid var(--card-bg);
  background: var(--card-bg);
}
.section-icon {
  font-size: var(--ds-text-md);
  flex-shrink: 0;
}
.section-header::before {
  content: '▶';
  font-size: var(--ds-text-xs);
  color: var(--ds-link);
  transition: transform var(--ds-duration) var(--ds-ease);
  margin-right: 4px;
}
.collapsible-section[open] .section-header::before {
  transform: rotate(90deg);
}
.section-content {
  padding: 12px;
  background-color: var(--secondary-bg);
}
.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-md);
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.status-badge.active {
  background: var(--ds-success);
  color: var(--ds-success);
  border: 1px solid var(--ds-border-strong);
}
[data-theme='light'] .collapsible-section {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
}
[data-theme='light'] .collapsible-section:hover {
  border-color: var(--border-color);
}
[data-theme='light'] .collapsible-section[open] {
  border-color: var(--border-color);
}
[data-theme='light'] .section-header {
  color: var(--text-primary);
}
[data-theme='light'] .section-header:hover {
  color: var(--accent-ink);
}
[data-theme='light'] .collapsible-section[open] .section-header {
  border-bottom: 1px solid var(--border-color);
}
[data-theme='light'] .section-header::before {
  color: var(--accent-ink);
}
[data-theme='light'] .section-content {
  background-color: var(--card-bg);
}
[data-theme='light'] .status-badge {
  background-color: var(--ds-surface-3);
}
[data-theme='light'] .status-badge.active {
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 35%, transparent);
}

.section-divider {
  margin: 12px 0;
  border: none;
  border-top: 1px solid var(--ds-border);
}
[data-theme='light'] .section-divider {
  border-top-color: var(--ds-border);
}
</style>
