<template>
  <div class="slider-field" :class="{ 'slider-field--disabled': disabled }">
    <input
      type="range"
      class="slider-field__range"
      :class="$attrs.class"
      :style="$attrs.style"
      v-bind="rangeAttrs($attrs)"
      :min="min"
      :max="max"
      :step="step"
      :value="numericValue"
      :disabled="disabled"
      @pointerdown="beginInteraction"
      @keydown="beginInteraction"
      @input="onRangeInput"
      @change="commitInteraction"
    />
    <input
      type="number"
      class="slider-field__num"
      inputmode="decimal"
      :min="min"
      :max="max"
      :step="step"
      :value="displayValue"
      :disabled="disabled"
      :aria-label="
        $attrs['aria-label']
          ? `${$attrs['aria-label']} (${t('sliderField.value')})`
          : t('sliderField.value')
      "
      @input="onNumberInput"
      @change="commitInteraction"
      @blur="onNumberBlur"
    />
    <button
      v-if="hasDefault"
      type="button"
      class="slider-field__reset"
      :title="resetTitle"
      :aria-label="resetTitle"
      :disabled="disabled || isAtDefault"
      @click="reset"
    >
      ↺
    </button>
  </div>
</template>

<script setup>
/**
 * SliderField – Ersatz für einen nackten `<input type="range">`.
 *
 * Zeile aus Regler, Zahlen-Spinner (`type="number"`) und Reset-Button, der auf
 * `defaultValue` zurücksetzt. Ohne `defaultValue` wird kein Reset-Button gerendert.
 *
 * v-model: Zahl (Strings werden beim Empfang in Zahlen gewandelt, emittiert
 * werden immer Zahlen, gerundet auf die Nachkommastellen von `step`).
 *
 * Events:
 * - `update:modelValue` (number) – live bei jeder Änderung
 * - `start` (number: Wert vor der Änderung) – Beginn einer Interaktion (Undo-Snapshot)
 * - `change` (number) – Abschluss einer Interaktion (Regler losgelassen, Feld verlassen, Reset)
 * - `reset` (number) – nach einem Klick auf den Reset-Button
 *
 * Nicht-Prop-Attribute (`class`, `style`, `id`, `aria-*`, `title`, …) landen auf
 * dem Range-Input, damit bestehende Slider-Klassen der Eltern weiter greifen.
 * Damit deren *scoped* CSS auch den Range-Input trifft, erhält er zusätzlich die
 * Scope-Attribute des Elternkontexts (siehe `useParentScopeAttrs`).
 */
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { clamp } from '../../lib/color.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  min: { type: [Number, String], default: 0 },
  max: { type: [Number, String], default: 100 },
  step: { type: [Number, String], default: 1 },
  /** Wert für den Reset-Button. Ohne Angabe gibt es keinen Reset-Button. */
  defaultValue: { type: [Number, String], default: undefined },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'start', 'change', 'reset'])

const { t } = useI18n()

// ── Scope-Attribute des Elternkontexts (für dessen scoped CSS) ─────────────
/**
 * Vue setzt die `data-v-…`-Scope-Attribute eines Elternteils nur auf das
 * Wurzelelement einer Kindkomponente. Der Range-Input ist hier aber ein
 * Kindelement, soll jedoch von Eltern-Selektoren wie `.slider[data-v-…]`
 * getroffen werden. Deshalb werden dieselben Attribute, die Vue dem Wurzel-
 * element gibt, hier eingesammelt und zusätzlich an den Range-Input gebunden.
 */
function useParentScopeAttrs() {
  const attrs = {}
  let inst = getCurrentInstance()
  while (inst) {
    const vnode = inst.vnode
    if (vnode.scopeId) attrs[vnode.scopeId] = ''
    if (vnode.slotScopeIds) for (const id of vnode.slotScopeIds) attrs[id] = ''
    const parent = inst.parent
    // Ist diese Komponente die Wurzel ihres Elternteils, erbt sie auch dessen Scope.
    if (parent && parent.subTree === vnode) inst = parent
    else break
  }
  return attrs
}
const parentScopeAttrs = useParentScopeAttrs()

/** Alle Attribute außer class/style (die werden separat gebunden) + Scope-Attribute. */
function rangeAttrs(attrs) {
  const rest = Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  )
  return { ...parentScopeAttrs, ...rest }
}

// ── Werte ──────────────────────────────────────────────────────────────────
const decimals = computed(() => {
  const s = String(props.step)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
})

function roundTo(value) {
  const f = 10 ** decimals.value
  return Math.round(value * f) / f
}

function toNumber(value, fallback) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

const minNum = computed(() => toNumber(props.min, 0))
const maxNum = computed(() => toNumber(props.max, 100))
const numericValue = computed(() => toNumber(props.modelValue, minNum.value))
const hasDefault = computed(() => props.defaultValue !== undefined && props.defaultValue !== null)
const defaultNum = computed(() => toNumber(props.defaultValue, minNum.value))
const isAtDefault = computed(
  () => hasDefault.value && roundTo(numericValue.value) === roundTo(defaultNum.value),
)
const resetTitle = computed(() =>
  hasDefault.value ? `${t('sliderField.reset')} (${formatValue(defaultNum.value)})` : '',
)

function formatValue(n) {
  return roundTo(n).toFixed(decimals.value)
}

// Anzeige im Zahlenfeld; während der Nutzer tippt, wird sie nicht überschrieben.
const numberEditing = ref(false)
const displayValue = ref(formatValue(numericValue.value))
watch(numericValue, (n) => {
  if (!numberEditing.value) displayValue.value = formatValue(n)
})

// ── Interaktion (start/change für Undo-Gruppierung) ────────────────────────
let interacting = false
let valueBeforeInteraction = null
// Zuletzt emittierter Wert – unabhängig davon, ob der Elternteil den Prop
// schon zurückgespielt hat (z. B. bei :model-value ohne sofortiges Update).
let lastEmitted = null

function beginInteraction() {
  if (interacting) return
  interacting = true
  valueBeforeInteraction = numericValue.value
  emit('start', valueBeforeInteraction)
}

function commitInteraction() {
  if (!interacting) return
  interacting = false
  const value = lastEmitted ?? numericValue.value
  if (value !== valueBeforeInteraction) emit('change', value)
  valueBeforeInteraction = null
  lastEmitted = null
}

function applyValue(raw) {
  const value = roundTo(clamp(raw, minNum.value, maxNum.value))
  if (value === numericValue.value && typeof props.modelValue === 'number') return
  lastEmitted = value
  emit('update:modelValue', value)
}

function onRangeInput(event) {
  beginInteraction()
  applyValue(parseFloat(event.target.value))
}

function onNumberInput(event) {
  numberEditing.value = true
  const raw = event.target.value
  if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return // Nutzer tippt noch
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  beginInteraction()
  applyValue(n)
}

function onNumberBlur(event) {
  numberEditing.value = false
  displayValue.value = formatValue(numericValue.value)
  event.target.value = displayValue.value
  commitInteraction()
}

function reset() {
  if (!hasDefault.value || isAtDefault.value) return
  beginInteraction()
  applyValue(defaultNum.value)
  commitInteraction()
  emit('reset', roundTo(defaultNum.value))
}
</script>

<style scoped>
.slider-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  /* In Flex-Zeilen der Eltern (Slider + Wert-Anzeige) den Restplatz einnehmen. */
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
}
.slider-field--disabled {
  opacity: 0.55;
}

/* Der Range-Input trägt zusätzlich die Klasse(n) der Elternkomponente. */
.slider-field__range {
  flex: 1 1 auto;
  min-width: 0;
}

.slider-field__num {
  flex: none;
  box-sizing: border-box;
  width: 58px;
  padding: 2px 4px;
  background: var(--secondary-bg, #0c1828);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #f0e8cc);
  font-size: 0.66rem;
  font-family: 'Courier New', monospace;
  line-height: 1.3;
}
.slider-field__num:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.slider-field__reset {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary-bg, #0c1828);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-muted, #7a8da0);
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}
.slider-field__reset:hover:not(:disabled) {
  color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
}
.slider-field__reset:focus-visible {
  outline: 2px solid var(--accent-primary, #c9984d);
  outline-offset: 1px;
}
.slider-field__reset:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 768px) {
  .slider-field__num {
    width: 64px;
    font-size: 0.75rem;
    padding: 4px;
  }
  .slider-field__reset {
    width: 28px;
    height: 28px;
    font-size: 0.95rem;
  }
}
</style>
