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
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
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
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--secondary-bg) 100%);
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  user-select: none;
}
.section-header:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  color: #fff;
}
.collapsible-section[open] .section-header {
  border-bottom: 1px solid var(--card-bg);
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
}
.section-icon {
  font-size: 14px;
  flex-shrink: 0;
}
.section-header::before {
  content: '▶';
  font-size: 8px;
  color: #6ea8fe;
  transition: transform 0.2s ease;
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
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.status-badge.active {
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  color: #8fdf8f;
  border: 1px solid #4a7a4a;
}
[data-theme='light'] .collapsible-section {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .collapsible-section:hover {
  border-color: rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .collapsible-section[open] {
  border-color: rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .section-header {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  color: #003971;
}
[data-theme='light'] .section-header:hover {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  color: #014f99;
}
[data-theme='light'] .collapsible-section[open] .section-header {
  border-bottom: 1px solid rgba(1, 79, 153, 0.12);
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
}
[data-theme='light'] .section-header::before {
  color: #014f99;
}
[data-theme='light'] .section-content {
  background-color: #ffffff;
}
[data-theme='light'] .status-badge {
  background-color: #e8e0c4;
  color: #4d6d8e;
}
[data-theme='light'] .status-badge.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.08) 100%);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.35);
}

.section-divider {
  margin: 12px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
[data-theme='light'] .section-divider {
  border-top-color: rgba(0, 0, 0, 0.08);
}
</style>
