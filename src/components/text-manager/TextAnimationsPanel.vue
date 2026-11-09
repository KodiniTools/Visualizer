<template>
  <!-- ✨ TEXT-ANIMATION (klappbar) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">⌨️</span>
      <span>{{ t('textManager.textAnimation') }}</span>
      <span v-for="badge in activeBadges" :key="badge" class="status-badge active">{{
        badge
      }}</span>
    </summary>
    <div class="section-content">
      <template v-for="(section, index) in SECTIONS" :key="section.key">
        <hr v-if="index > 0" class="section-divider" />
        <AnimationEditSection
          :label="`${t(section.label)}:`"
          :effect="selectedText.animation?.[section.key] ?? null"
          @toggle="onToggle(section)"
          @restart="onRestart(section)"
        >
          <component
            :is="section.controls"
            :effect="selectedText.animation[section.key]"
            @change="onChange(section)"
          />
        </AnimationEditSection>
      </template>
    </div>
  </details>
</template>

<script setup lang="ts">
/**
 * Text-Animationen des markierten Textes (Typewriter, Fade, Scale, Slide).
 *
 * Die Einstellungen je Effekt liegen in `text-animations/*Controls.vue` und
 * werden auch vom Neu-Text-Formular (`text-new-form/`) genutzt. Das Panel
 * reicht das Effekt-Objekt des markierten Textes hinein und zeichnet bei
 * jeder Änderung (`change`) den Canvas neu.
 */
import { computed, inject, onUnmounted, toRef, watch } from 'vue'
import { notifyMarkerTargetEdited } from '../../lib/markerTargetEdits'
import type { Component } from 'vue'
import type { CanvasManagerRef } from '../../composables/types'
import type { TextObject } from '../../lib/textManager/types'
import { useI18n } from '../../lib/i18n'
import { useTextAnimations } from '../../composables/useTextAnimations'
import AnimationEditSection from './text-animations/AnimationEditSection.vue'
import TypewriterControls from './text-animations/TypewriterControls.vue'
import FadeControls from './text-animations/FadeControls.vue'
import ScaleControls from './text-animations/ScaleControls.vue'
import SlideControls from './text-animations/SlideControls.vue'

const props = defineProps<{ selectedText: TextObject }>()

type AnimationKey = 'typewriter' | 'fade' | 'scale' | 'slide'
const ANIMATION_KEYS: AnimationKey[] = ['typewriter', 'fade', 'scale', 'slide']

// ✨ Backfill: Ältere Text-Objekte kennen die neuen Felder (permanent / displayDuration)
// noch nicht. Standard = permanent anzeigen, damit sich das Verhalten nicht ändert.
function ensureDisplayDefaults(text: TextObject | null | undefined) {
  const anim = text?.animation
  if (!anim) return
  for (const key of ANIMATION_KEYS) {
    const eff = anim[key]
    if (!eff) continue
    if (eff.permanent === undefined) eff.permanent = true
    if (eff.displayDuration === undefined) eff.displayDuration = 5000
  }
}

watch(() => props.selectedText, ensureDisplayDefaults, { immediate: true })

const canvasManager = inject('canvasManager') as CanvasManagerRef

// Reaktive Referenz auf den aktuell markierten Text, damit alle Aktionen
// (Toggles, "Neu Starten") sich ausschließlich auf diesen Text beziehen.
const selectedText = toRef(props, 'selectedText')

const animations = useTextAnimations(selectedText, canvasManager)

function updateText() {
  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}

const { t } = useI18n()

/** Section-Eintrag (siehe SECTIONS) */
type Section = (typeof SECTIONS)[number]

/**
 * Bearbeitung an Beat-Marker melden: Ein vom Marker bis zu seinem Zeitpunkt
 * ausgeblendeter Text wird sichtbar, damit man die Änderung sieht.
 */
function notifyEdit() {
  const id = selectedText.value?.id
  if (id !== undefined && id !== null) notifyMarkerTargetEdited({ kind: 'text', id })
}

function onToggle(section: Section) {
  section.toggle()
  notifyEdit()
}

function onRestart(section: Section) {
  section.restart()
  notifyEdit()
}

// Geänderte Regler sofort sichtbar machen: Effekt kurz nach der letzten
// Änderung von vorn abspielen (nicht bei jedem Zwischenwert eines Reglers)
const CHANGE_RESTART_MS = 350
let changeTimer: ReturnType<typeof setTimeout> | null = null
const changedSections = new Set<Section>()

function onChange(section: Section) {
  updateText()
  notifyEdit()
  changedSections.add(section)
  if (changeTimer !== null) clearTimeout(changeTimer)
  changeTimer = setTimeout(() => {
    changeTimer = null
    for (const s of changedSections) s.restart()
    changedSections.clear()
  }, CHANGE_RESTART_MS)
}

function cancelChangeRestart() {
  if (changeTimer !== null) clearTimeout(changeTimer)
  changeTimer = null
  changedSections.clear()
}
// Neustart gilt nur dem Text, an dem geändert wurde
watch(selectedText, cancelChangeRestart)
onUnmounted(cancelChangeRestart)

const SECTIONS: {
  key: AnimationKey
  label: string
  controls: Component
  toggle: () => void
  restart: () => void
}[] = [
  {
    key: 'typewriter',
    label: 'textManager.typewriterEffect',
    controls: TypewriterControls,
    toggle: animations.toggleTypewriter,
    restart: animations.restartTypewriter,
  },
  {
    key: 'fade',
    label: 'textManager.fadeEffect',
    controls: FadeControls,
    toggle: animations.toggleFade,
    restart: animations.restartFade,
  },
  {
    key: 'scale',
    label: 'textManager.scaleEffect',
    controls: ScaleControls,
    toggle: animations.toggleScale,
    restart: animations.restartScale,
  },
  {
    key: 'slide',
    label: 'textManager.slideEffect',
    controls: SlideControls,
    toggle: animations.toggleSlide,
    restart: animations.restartSlide,
  },
]

const BADGES: [AnimationKey, string][] = [
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
  color: var(--ds-on-success);
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
  color: var(--ds-success);
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
