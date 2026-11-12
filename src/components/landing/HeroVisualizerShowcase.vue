<template>
  <figure ref="rootEl" class="hero-showcase" :aria-label="t('hero.showcase.label')">
    <canvas
      ref="canvasEl"
      class="hero-showcase-canvas"
      :class="{ 'is-ready': hasFrame, 'is-fading': fading }"
      width="1040"
      height="585"
      aria-hidden="true"
    />
    <figcaption class="hero-showcase-bar">
      <span class="hero-showcase-name" aria-live="polite">{{ currentName }}</span>
      <span class="hero-showcase-actions">
        <UiIconButton
          size="sm"
          round
          :label="playing ? t('hero.showcase.pause') : t('hero.showcase.play')"
          class="hero-showcase-btn"
          data-test="showcase-toggle"
          @click="togglePlaying"
        >
          <svg
            v-if="playing"
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
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
          <svg
            v-else
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
            <path d="M7 5l12 7-12 7z" />
          </svg>
        </UiIconButton>
        <UiIconButton
          size="sm"
          round
          :label="t('hero.showcase.next')"
          class="hero-showcase-btn"
          data-test="showcase-next"
          @click="showNext"
        >
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
            <path d="M9 6l6 6-6 6" />
          </svg>
        </UiIconButton>
      </span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
/**
 * Live-Vorschau im Hero der Landingpage: ausgewählte Visualizer laufen ohne
 * Audio mit synthetischen Frequenzdaten und wechseln automatisch.
 *
 * - Presets werden erst beim Mounten nachgeladen (eigene Chunks).
 * - Gerendert wird nur, solange die Vorschau sichtbar und der Tab aktiv ist.
 * - `prefers-reduced-motion`: startet pausiert und zeigt ein Standbild.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../../lib/i18n'
import { UiIconButton } from '../ui'
import { fillSyntheticSpectrum, fillSyntheticWaveform } from '../../lib/landing/syntheticSpectrum'
import {
  HERO_SHOWCASE,
  HERO_SHOWCASE_INTERVAL_MS,
  nextShowcaseIndex,
  shuffledOrder,
  type HeroShowcaseEntry,
} from '../../lib/landing/heroShowcase'
import type { VisualizerDefinition } from '../../lib/visualizers/core/types'

const props = withDefaults(
  defineProps<{
    /** Überschreibt die Auswahl (Tests) */
    entries?: readonly HeroShowcaseEntry[]
    /** Anzeigedauer je Visualizer in ms */
    intervalMs?: number
    /** Zufallsquelle für die Reihenfolge (Tests); Standard Math.random */
    random?: () => number
  }>(),
  {
    entries: () => HERO_SHOWCASE,
    intervalMs: HERO_SHOWCASE_INTERVAL_MS,
    random: () => Math.random(),
  },
)

const { t } = useI18n()

/** Wie der AnalyserNode der App (fftSize 2048) */
const BUFFER_LENGTH = 1024
/** Obergrenze der Canvas-Breite in Gerätepixeln (Performance) */
const MAX_PIXEL_WIDTH = 1280
/** = --ds-duration-slow */
const FADE_MS = 250
const BACKDROP_TOP = '#0d1024'
const BACKDROP_BOTTOM = '#1b1338'

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const index = ref(0)
const playing = ref(true)
const hasFrame = ref(false)
const fading = ref(false)
const inView = ref(true)
const pageVisible = ref(true)

const currentEntry = computed(() => props.entries[index.value])
const currentName = computed(() =>
  currentEntry.value ? t(`hero.showcase.names.${currentEntry.value.id}`) : '',
)

// Zufällige Reihenfolge pro Besuch; jeder Eintrag einmal pro Runde.
const order = shuffledOrder(props.entries.length, props.random)
let orderPos = 0

const data = new Uint8Array(BUFFER_LENGTH)
const loaded = new Map<string, VisualizerDefinition>()
let active: VisualizerDefinition | null = null
let rafId = 0
let lastTs = 0
let elapsed = 0
let shownMs = 0
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false
let intersection: IntersectionObserver | null = null
let reducedMotion: MediaQueryList | null = null

type CreateGl = (typeof import('../../lib/visualizers/gl/createGlVisualizer'))['createGlVisualizer']
let createGl: CreateGl | null = null
type SharedState = (typeof import('../../lib/visualizers/core/state'))['visualizerState']
let sharedState: SharedState | null = null

/** Lädt (einmalig) den Visualizer eines Eintrags; null bei Fehler. */
async function loadVisualizer(entry: HeroShowcaseEntry): Promise<VisualizerDefinition | null> {
  const cached = loaded.get(entry.id)
  if (cached) return cached
  try {
    if (!createGl || !sharedState) {
      const [glMod, stateMod] = await Promise.all([
        import('../../lib/visualizers/gl/createGlVisualizer'),
        import('../../lib/visualizers/core/state'),
      ])
      createGl = glMod.createGlVisualizer
      sharedState = stateMod.visualizerState
    }
    const viz = createGl(await entry.load())
    loaded.set(entry.id, viz)
    return viz
  } catch (err) {
    console.warn('[HeroVisualizerShowcase] Visualizer nicht ladbar:', entry.id, err)
    return null
  }
}

async function activate(i: number): Promise<void> {
  const entry = props.entries[i]
  if (!entry) return
  const viz = await loadVisualizer(entry)
  if (disposed || !viz) return
  active?.cleanup?.()
  active = viz
  index.value = i
  shownMs = 0
  try {
    viz.init?.(canvasEl.value?.width ?? 0, canvasEl.value?.height ?? 0)
  } catch {
    /* Vorschau läuft auch ohne init */
  }
  // Nächsten Eintrag schon vorladen, damit der Wechsel ohne Lücke klappt.
  const upcoming = props.entries[order[nextShowcaseIndex(orderPos, order.length)] ?? 0]
  if (upcoming) void loadVisualizer(upcoming)
  if (!playing.value) renderStill()
}

/** Passt die Canvas-Pixelgröße an die angezeigte Größe an (DPR, gedeckelt). */
function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  if (!cssWidth || !cssHeight) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scale = Math.min(dpr, MAX_PIXEL_WIDTH / cssWidth)
  const w = Math.max(1, Math.round(cssWidth * scale))
  const h = Math.max(1, Math.round(cssHeight * scale))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

function drawFrame(dtMs: number): void {
  const canvas = canvasEl.value
  const ctx = canvas?.getContext('2d')
  const entry = currentEntry.value
  if (!canvas || !ctx || !active || !entry) return
  syncCanvasSize(canvas)
  const { width: w, height: h } = canvas

  elapsed += dtMs / 1000
  if (active.needsTimeData) fillSyntheticWaveform(data, elapsed)
  else fillSyntheticSpectrum(data, elapsed)
  if (sharedState) sharedState._dtMs = dtMs

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, BACKDROP_TOP)
  bg.addColorStop(1, BACKDROP_BOTTOM)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  try {
    active.draw(ctx, data, BUFFER_LENGTH, w, h, entry.color, 1)
    hasFrame.value = true
  } catch (err) {
    console.warn('[HeroVisualizerShowcase] Zeichnen fehlgeschlagen:', entry.id, err)
  }
}

/** Standbild für pausierte Vorschau: ein paar Frames vorlaufen lassen, damit
 *  die Glättung der Visualizer eingeschwungen ist. */
function renderStill(): void {
  for (let i = 0; i < 24; i++) drawFrame(1000 / 60)
}

function shouldRun(): boolean {
  return playing.value && inView.value && pageVisible.value && !disposed
}

function tick(ts: number): void {
  rafId = 0
  if (!shouldRun()) return
  const dt = lastTs ? Math.min(ts - lastTs, 100) : 1000 / 60
  lastTs = ts
  drawFrame(dt)
  shownMs += dt
  if (shownMs >= props.intervalMs && !fading.value && props.entries.length > 1) {
    showNext()
  }
  rafId = requestAnimationFrame(tick)
}

function startLoop(): void {
  if (rafId || !shouldRun()) return
  lastTs = 0
  rafId = requestAnimationFrame(tick)
}

function stopLoop(): void {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

function updateLoop(): void {
  if (shouldRun()) startLoop()
  else stopLoop()
}

function togglePlaying(): void {
  playing.value = !playing.value
  updateLoop()
}

/** Zum nächsten Visualizer wechseln (mit kurzer Überblendung). */
function showNext(): void {
  if (fading.value || props.entries.length < 2) return
  orderPos = nextShowcaseIndex(orderPos, order.length)
  const target = order[orderPos] ?? 0
  fading.value = true
  shownMs = 0
  if (fadeTimer) clearTimeout(fadeTimer)
  fadeTimer = setTimeout(async () => {
    fadeTimer = null
    await activate(target)
    fading.value = false
  }, FADE_MS)
}

function onVisibilityChange(): void {
  pageVisible.value = document.visibilityState !== 'hidden'
  updateLoop()
}

function onReducedMotionChange(e: MediaQueryListEvent): void {
  if (e.matches) {
    playing.value = false
    updateLoop()
  }
}

onMounted(async () => {
  reducedMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
  if (reducedMotion?.matches) playing.value = false
  reducedMotion?.addEventListener?.('change', onReducedMotionChange)

  document.addEventListener('visibilitychange', onVisibilityChange)
  if (typeof IntersectionObserver === 'function' && rootEl.value) {
    intersection = new IntersectionObserver((records) => {
      const last = records[records.length - 1]
      if (!last) return
      inView.value = last.isIntersecting
      updateLoop()
    })
    intersection.observe(rootEl.value)
  }

  await activate(order[0] ?? 0)
  updateLoop()
})

onBeforeUnmount(() => {
  disposed = true
  stopLoop()
  if (fadeTimer) clearTimeout(fadeTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  reducedMotion?.removeEventListener?.('change', onReducedMotionChange)
  intersection?.disconnect()
  active?.cleanup?.()
  active = null
})

defineExpose({ showNext, togglePlaying })
</script>

<style scoped>
.hero-showcase {
  position: relative;
  margin: 0;
  aspect-ratio: 16 / 9;
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  background: black;
}

.hero-showcase-canvas {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity var(--ds-duration-slow) var(--ds-ease);
}

.hero-showcase-canvas.is-ready {
  opacity: 1;
}

.hero-showcase-canvas.is-ready.is-fading {
  opacity: 0;
}

.hero-showcase-bar {
  position: absolute;
  left: var(--ds-space-3);
  right: var(--ds-space-3);
  bottom: var(--ds-space-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
  pointer-events: none;
}

.hero-showcase-name {
  padding: var(--ds-space-1) var(--ds-space-3);
  border-radius: var(--ds-radius-full);
  background: color-mix(in srgb, black 55%, transparent);
  color: white;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-showcase-actions {
  display: flex;
  gap: var(--ds-space-1);
  pointer-events: auto;
}

.hero-showcase-btn {
  background: color-mix(in srgb, black 55%, transparent);
  color: white;
}

@media (prefers-reduced-motion: reduce) {
  .hero-showcase-canvas {
    transition: none;
  }
}
</style>
