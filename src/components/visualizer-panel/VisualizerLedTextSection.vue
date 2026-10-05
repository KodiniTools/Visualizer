<template>
  <!--
    LED-Text (glLedText) und LED-Zahlen (glLedNumber): Text, Modus
    (fester Text / Uhrzeit / Countdown), Zeitzone, Sekunden und Countdown-Ziel.
    Wird im Single-Modus (VisualizerControlsPanel) und je Layer
    (VisualizerLayerPanel) verwendet; Werte kommen als Objekt herein,
    Änderungen gehen als (Feld, Wert) hinaus.
  -->
  <div class="led-text" :class="{ 'led-text--compact': compact }">
    <!-- LED-Text: Wörter -->
    <template v-if="!isNumber">
      <span class="led-text__label">{{ t('visualizer.led.text') }}</span>
      <textarea
        class="led-text__input led-text__textarea"
        rows="2"
        spellcheck="false"
        :value="cfg.ledText"
        :aria-label="t('visualizer.led.text')"
        @input="emit('update', 'ledText', $event.target.value)"
      ></textarea>
      <span class="led-text__hint">{{ t('visualizer.led.textHint') }}</span>
    </template>

    <!-- LED-Zahlen: Modus -->
    <template v-else>
      <span class="led-text__label">{{ t('visualizer.led.mode') }}</span>
      <div class="led-text__seg" role="radiogroup" :aria-label="t('visualizer.led.mode')">
        <button
          v-for="m in LED_NUMBER_MODES"
          :key="m"
          type="button"
          role="radio"
          class="led-text__seg-btn"
          :class="{ active: cfg.ledNumberMode === m }"
          :aria-checked="cfg.ledNumberMode === m"
          @click="emit('update', 'ledNumberMode', m)"
        >
          {{ t(`visualizer.led.mode_${m}`) }}
        </button>
      </div>

      <template v-if="cfg.ledNumberMode === 'text'">
        <span class="led-text__label">{{ t('visualizer.led.number') }}</span>
        <textarea
          class="led-text__input led-text__textarea"
          rows="2"
          spellcheck="false"
          :value="cfg.ledNumberText"
          :aria-label="t('visualizer.led.number')"
          @input="emit('update', 'ledNumberText', $event.target.value)"
        ></textarea>
        <span class="led-text__hint">{{ t('visualizer.led.numberHint') }}</span>
      </template>

      <template v-else>
        <template v-if="cfg.ledNumberMode === 'countdown'">
          <span class="led-text__label">{{ t('visualizer.led.countdownTarget') }}</span>
          <input
            type="datetime-local"
            class="led-text__input"
            :value="toLocalInput(cfg.ledCountdownTarget)"
            :aria-label="t('visualizer.led.countdownTarget')"
            @change="setTarget($event.target.value)"
          />
        </template>
        <template v-else>
          <span class="led-text__label">{{ t('visualizer.led.timeZone') }}</span>
          <select
            class="led-text__input"
            :value="cfg.ledNumberTimeZone"
            :aria-label="t('visualizer.led.timeZone')"
            @change="emit('update', 'ledNumberTimeZone', $event.target.value)"
          >
            <option v-for="tz in LED_TIME_ZONES" :key="tz" :value="tz">
              {{ tz ? tz.replace('_', ' ') : t('visualizer.led.timeZoneLocal') }}
            </option>
          </select>
        </template>

        <label class="led-text__check">
          <input
            type="checkbox"
            :checked="cfg.ledNumberSeconds"
            @change="emit('update', 'ledNumberSeconds', $event.target.checked)"
          />
          {{ t('visualizer.led.showSeconds') }}
        </label>
        <span class="led-text__hint">
          {{ t('visualizer.led.now') }}: <strong class="led-text__preview">{{ preview }}</strong>
          ·
          {{
            cfg.ledNumberMode === 'countdown'
              ? t('visualizer.led.countdownHint')
              : t('visualizer.led.clockHint')
          }}
        </span>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import {
  LED_NUMBER_ID,
  LED_NUMBER_MODES,
  LED_TIME_ZONES,
  normalizeLedConfig,
  ledDisplayText,
} from '../../lib/visualizers/gl/ledTextSettings.js'

const props = defineProps({
  /** glLedText oder glLedNumber */
  visualizerId: { type: String, required: true },
  /** Objekt mit den LED-Feldern (Store-Konfiguration oder Layer). */
  config: { type: Object, required: true },
  /** Kompakte Darstellung (Layer-Popover). */
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update'])

const { t } = useI18n()

const isNumber = computed(() => props.visualizerId === LED_NUMBER_ID)
// Fehlende Felder (ältere Layer/Presets) → Standardwerte für die Anzeige
const cfg = computed(() => normalizeLedConfig(props.config))

// Vorschau des aktuellen Werts (Uhrzeit/Countdown), jede Sekunde aktualisiert
const now = ref(new Date())
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))
const preview = computed(() => ledDisplayText(LED_NUMBER_ID, cfg.value, now.value))

// ISO (UTC) <-> datetime-local (Ortszeit dieses Browsers)
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function setTarget(local) {
  const d = local ? new Date(local) : null
  emit('update', 'ledCountdownTarget', d && !Number.isNaN(d.getTime()) ? d.toISOString() : '')
}
</script>

<style scoped>
.led-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.led-text__label {
  display: block;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.led-text--compact .led-text__label {
  font-size: 0.55rem;
  text-transform: none;
  letter-spacing: 0;
}

.led-text__input {
  width: 100%;
  box-sizing: border-box;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.65rem;
  color-scheme: dark;
}

.led-text__textarea {
  resize: vertical;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.led-text__input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.led-text__seg {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.led-text__seg-btn {
  flex: 1 1 auto;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-muted, #7a8da0);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.6rem;
  cursor: pointer;
}

.led-text__seg-btn.active {
  color: var(--text-primary, #e9e9eb);
  border-color: var(--accent-primary, #c9984d);
  background-color: rgba(201, 152, 77, 0.18);
  font-weight: 600;
}

.led-text__check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.62rem;
  color: var(--text-muted, #7a8da0);
  cursor: pointer;
}

.led-text__hint {
  font-size: 0.58rem;
  color: var(--text-muted, #7a8da0);
  opacity: 0.85;
}

.led-text__preview {
  font-family: monospace;
  color: var(--text-primary, #e9e9eb);
  letter-spacing: 0.05em;
}

[data-theme='light'] .led-text__label,
[data-theme='light'] .led-text__hint,
[data-theme='light'] .led-text__check {
  color: var(--text-muted);
}

[data-theme='light'] .led-text__input,
[data-theme='light'] .led-text__seg-btn {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border-color: var(--border-color);
  color-scheme: light;
}

[data-theme='light'] .led-text__seg-btn.active {
  background-color: color-mix(in srgb, var(--accent-primary) 12%, transparent);
}
</style>
