<template>
  <span
    ref="rootEl"
    class="color-field"
    :class="[$attrs.class, { 'color-field--open': open, 'color-field--disabled': disabled }]"
    :style="$attrs.style"
  >
    <button
      ref="triggerEl"
      type="button"
      class="color-field__swatch"
      v-bind="buttonAttrs($attrs)"
      :disabled="disabled"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="dialog"
      :title="$attrs.title ?? currentHex"
      :style="{ backgroundColor: currentHex }"
      @click="toggle"
    >
      <span class="color-field__sr">{{ label || t('colorField.pickColor') }} {{ currentHex }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="color-field__panel"
        role="dialog"
        :aria-label="label || t('colorField.pickColor')"
        :style="panelStyle"
        @keydown.esc.stop.prevent="close(true)"
      >
        <div v-for="ch in channels" :key="ch.key" class="color-field__row">
          <label class="color-field__label" :for="`${uid}-${ch.key}`" :title="t(ch.labelKey)">{{
            ch.short
          }}</label>
          <input
            type="range"
            class="color-field__range"
            :style="{ background: trackGradients[ch.key] }"
            :min="ch.min"
            :max="ch.max"
            :step="ch.step"
            :value="Math.round(hsl[ch.key])"
            :aria-label="t(ch.labelKey)"
            @pointerdown="beginInteraction"
            @input="onRangeInput(ch.key, $event)"
            @change="commitInteraction"
          />
          <input
            :id="`${uid}-${ch.key}`"
            type="number"
            class="color-field__num"
            inputmode="numeric"
            :min="ch.min"
            :max="ch.max"
            :step="ch.step"
            :value="Math.round(hsl[ch.key])"
            :aria-label="t(ch.labelKey)"
            @input="onNumberInput(ch.key, $event)"
            @change="commitInteraction"
            @blur="onNumberBlur(ch.key, $event)"
          />
          <span class="color-field__unit">{{ ch.unit }}</span>
        </div>

        <div class="color-field__row color-field__row--hex">
          <label class="color-field__label" :for="`${uid}-hex`" :title="t('colorField.hex')"
            >#</label
          >
          <input
            :id="`${uid}-hex`"
            type="text"
            class="color-field__hex"
            :class="{ 'color-field__hex--invalid': hexInvalid }"
            :value="hexDraft"
            maxlength="9"
            spellcheck="false"
            autocomplete="off"
            :aria-invalid="hexInvalid ? 'true' : 'false'"
            :title="hexInvalid ? t('colorField.invalidHex') : ''"
            @focus="hexFocused = true"
            @input="onHexInput"
            @blur="onHexBlur"
            @keydown.enter.prevent="onHexBlur"
          />
          <span class="color-field__preview" :style="{ backgroundColor: currentHex }"></span>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
/**
 * ColorField – Ersatz für `<input type="color">`.
 *
 * Ein Farbfeld (Swatch), das per Klick ein Panel aufklappt: drei Regler (Farbton,
 * Sättigung, Helligkeit) mit Zahlen-Spinner sowie ein Hex-Feld. Das Panel wird
 * nach `<body>` teleportiert, damit es nicht von scrollenden Seitenleisten
 * abgeschnitten wird.
 *
 * v-model: Hex-String `#rrggbb`. Ungültige Eingabewerte werden als Fallback
 * (schwarz) angezeigt, es wird aber nie ein ungültiger Wert emittiert.
 *
 * Events:
 * - `update:modelValue` (hex) – live bei jeder Änderung
 * - `start` (hex vor der Änderung) – Beginn einer Interaktion (für Undo-Snapshots)
 * - `change` (hex) – Abschluss einer Interaktion (Slider losgelassen, Feld verlassen)
 * - `open` / `close`
 *
 * Nicht-Prop-Attribute: `class`/`style` landen auf dem Wurzelelement (damit
 * bestehende Größen-Klassen der Eltern weiter greifen), alle anderen Attribute
 * (`title`, `aria-label`, …) auf dem Button.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import {
  FALLBACK_HEX,
  HSL_RANGES,
  hexToHsl,
  hslToHex,
  hslTrackGradients,
  normalizeHex,
  setHslChannel,
} from '../../lib/color.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: FALLBACK_HEX },
  disabled: { type: Boolean, default: false },
  /** Zugänglicher Name des Feldes; Default: i18n `colorField.pickColor`. */
  label: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'start', 'change', 'open', 'close'])

const { t } = useI18n()
const uid = useId()

const channels = [
  { key: 'h', short: 'H', labelKey: 'colorField.hue', ...HSL_RANGES.h },
  { key: 's', short: 'S', labelKey: 'colorField.saturation', ...HSL_RANGES.s },
  { key: 'l', short: 'L', labelKey: 'colorField.lightness', ...HSL_RANGES.l },
]

// ── Zustand ────────────────────────────────────────────────────────────────
const rootEl = ref(null)
const triggerEl = ref(null)
const panelEl = ref(null)

const open = ref(false)
const panelStyle = ref({})

const hsl = ref(hexToHsl(props.modelValue) ?? hexToHsl(FALLBACK_HEX))
const currentHex = computed(() => hslToHex(hsl.value.h, hsl.value.s, hsl.value.l))
const trackGradients = computed(() => hslTrackGradients(hsl.value))

const hexDraft = ref(currentHex.value)
const hexFocused = ref(false)
const hexInvalid = ref(false)

// Externe Änderungen übernehmen. Ergibt der interne HSL-Zustand bereits denselben
// Hex-Wert, bleibt er unangetastet – so gehen Farbton/Sättigung bei Grau nicht
// verloren und der Slider springt beim Live-Update nicht durch Rundung.
watch(
  () => props.modelValue,
  (value) => {
    const normalized = normalizeHex(value) ?? FALLBACK_HEX
    if (normalized !== currentHex.value) {
      hsl.value = hexToHsl(normalized)
    }
    if (!hexFocused.value) {
      hexDraft.value = normalized
      hexInvalid.value = false
    }
  },
)

// ── Interaktion (start/change für Undo-Gruppierung) ────────────────────────
let interacting = false
let hexBeforeInteraction = null

function beginInteraction() {
  if (interacting) return
  interacting = true
  hexBeforeInteraction = currentHex.value
  emit('start', hexBeforeInteraction)
}

function commitInteraction() {
  if (!interacting) return
  interacting = false
  const hex = currentHex.value
  if (hex !== hexBeforeInteraction) emit('change', hex)
  hexBeforeInteraction = null
}

function applyHsl(next) {
  hsl.value = next
  const hex = currentHex.value
  if (!hexFocused.value) {
    hexDraft.value = hex
    hexInvalid.value = false
  }
  emit('update:modelValue', hex)
}

function onRangeInput(channel, event) {
  beginInteraction()
  applyHsl(setHslChannel(hsl.value, channel, event.target.value))
}

function onNumberInput(channel, event) {
  const raw = event.target.value
  if (raw === '' || raw === '-') return // Nutzer tippt noch
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  beginInteraction()
  applyHsl(setHslChannel(hsl.value, channel, n))
}

function onNumberBlur(channel, event) {
  // Leeres/ungültiges Feld auf den aktuellen Wert zurücksetzen.
  event.target.value = String(Math.round(hsl.value[channel]))
  commitInteraction()
}

function onHexInput(event) {
  hexDraft.value = event.target.value
  const normalized = normalizeHex(hexDraft.value)
  hexInvalid.value = normalized === null
  if (!normalized) return
  beginInteraction()
  if (normalized !== currentHex.value) {
    hsl.value = hexToHsl(normalized)
    emit('update:modelValue', normalized)
  }
}

function onHexBlur() {
  hexFocused.value = false
  hexDraft.value = currentHex.value
  hexInvalid.value = false
  commitInteraction()
}

// ── Öffnen/Schließen & Positionierung ──────────────────────────────────────
const VIEWPORT_MARGIN = 8
const PANEL_GAP = 6

function updatePosition() {
  if (!open.value || !rootEl.value || !panelEl.value) return
  const anchor = rootEl.value.getBoundingClientRect()
  const panel = panelEl.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = anchor.bottom + PANEL_GAP
  if (top + panel.height + VIEWPORT_MARGIN > vh) {
    const above = anchor.top - PANEL_GAP - panel.height
    top =
      above >= VIEWPORT_MARGIN
        ? above
        : Math.max(VIEWPORT_MARGIN, vh - panel.height - VIEWPORT_MARGIN)
  }

  let left = anchor.left
  if (left + panel.width + VIEWPORT_MARGIN > vw) left = vw - panel.width - VIEWPORT_MARGIN
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

  panelStyle.value = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px` }
}

function onDocumentPointerDown(event) {
  const target = event.target
  if (rootEl.value?.contains(target) || panelEl.value?.contains(target)) return
  close(false)
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') close(true)
}

function addGlobalListeners() {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
}

function removeGlobalListeners() {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
}

async function openPanel(viaKeyboard = false) {
  if (open.value || props.disabled) return
  open.value = true
  hexDraft.value = currentHex.value
  hexInvalid.value = false
  emit('open')
  await nextTick()
  updatePosition()
  addGlobalListeners()
  if (viaKeyboard) panelEl.value?.querySelector('input')?.focus()
}

function close(restoreFocus = false) {
  if (!open.value) return
  // Laufende Interaktion sauber abschließen (z. B. Hex-Feld noch fokussiert).
  hexFocused.value = false
  commitInteraction()
  open.value = false
  removeGlobalListeners()
  emit('close')
  if (restoreFocus) triggerEl.value?.focus()
}

function toggle(event) {
  if (open.value) close(false)
  else openPanel(event?.detail === 0)
}

onBeforeUnmount(() => {
  removeGlobalListeners()
})

/** Alle Attribute außer class/style gehen an den Button. */
function buttonAttrs(attrs) {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  )
}

defineExpose({ open: openPanel, close, isOpen: () => open.value })
</script>

<style scoped>
/* Wurzel: übernimmt die Größen-/Rahmen-Klassen der Elternkomponente. */
.color-field {
  position: relative;
  display: inline-block;
  box-sizing: border-box;
  width: 32px;
  height: 24px;
  vertical-align: middle;
  line-height: 0;
}
.color-field--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.color-field__swatch {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: inherit;
  cursor: pointer;
  background-clip: padding-box;
  transition: box-shadow 0.15s ease;
}
.color-field__swatch:focus-visible {
  outline: 2px solid var(--accent-primary, #c9984d);
  outline-offset: 1px;
}
.color-field--open .color-field__swatch {
  box-shadow: 0 0 0 2px var(--accent-primary, #c9984d);
}

.color-field__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Panel (nach <body> teleportiert) */
.color-field__panel {
  position: fixed;
  z-index: 10000;
  box-sizing: border-box;
  width: 236px;
  padding: 10px;
  display: grid;
  gap: 8px;
  background: var(--card-bg, #112036);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 8px;
  box-shadow: var(--shadow-lg, 0 8px 28px rgba(0, 0, 0, 0.6));
  color: var(--text-primary, #f0e8cc);
  font-size: 0.68rem;
  line-height: 1.2;
}

.color-field__row {
  display: grid;
  grid-template-columns: 16px 1fr 50px 12px;
  gap: 6px;
  align-items: center;
}
.color-field__row--hex {
  grid-template-columns: 16px 1fr 22px;
}

.color-field__label {
  color: var(--text-muted, #7a8da0);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.6rem;
}
.color-field__label {
  cursor: help;
}

.color-field__range {
  width: 100%;
  height: 8px;
  margin: 0;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
}
.color-field__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent-primary, #c9984d);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.color-field__range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--accent-primary, #c9984d);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.color-field__range:focus-visible {
  box-shadow: 0 0 0 2px var(--ring, rgba(212, 164, 85, 0.6));
}

.color-field__num,
.color-field__hex {
  box-sizing: border-box;
  width: 100%;
  padding: 3px 4px;
  background: var(--secondary-bg, #0c1828);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #f0e8cc);
  font-size: 0.66rem;
  font-family: 'Courier New', monospace;
}
.color-field__num:focus,
.color-field__hex:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}
.color-field__hex--invalid,
.color-field__hex--invalid:focus {
  border-color: #e5484d;
  color: #e5484d;
}

.color-field__unit {
  color: var(--text-muted, #7a8da0);
  font-size: 0.6rem;
}

.color-field__preview {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

[data-theme='light'] .color-field__panel {
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #00305e);
}
[data-theme='light'] .color-field__range::-webkit-slider-thumb,
[data-theme='light'] .color-field__range::-moz-range-thumb {
  border-color: var(--accent-primary, #0d5cb4);
}

@media (max-width: 768px) {
  .color-field__panel {
    width: min(280px, calc(100vw - 16px));
    font-size: 0.75rem;
  }
  .color-field__range {
    height: 10px;
  }
  .color-field__range::-webkit-slider-thumb,
  .color-field__range::-moz-range-thumb {
    width: 18px;
    height: 18px;
  }
}
</style>
