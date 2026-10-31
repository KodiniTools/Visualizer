<template>
  <svg
    class="shape-icon"
    :viewBox="preview.viewBox"
    :width="size"
    :height="size"
    aria-hidden="true"
    focusable="false"
  >
    <defs v-if="gradient">
      <linearGradient
        v-if="gradient.type === 'linear'"
        :id="gradientId"
        :gradientTransform="`rotate(${gradient.angle} 0.5 0.5)`"
      >
        <stop offset="0" :stop-color="gradient.from" />
        <stop offset="1" :stop-color="gradient.to" />
      </linearGradient>
      <radialGradient v-else :id="gradientId">
        <stop offset="0" :stop-color="gradient.from" />
        <stop offset="1" :stop-color="gradient.to" />
      </radialGradient>
    </defs>
    <text
      v-if="preview.emoji"
      class="shape-icon__emoji"
      font-size="26"
      font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"
      x="0"
      y="1"
      text-anchor="middle"
      dominant-baseline="central"
    >
      {{ shape?.emoji || preview.emoji }}
    </text>
    <path
      v-else
      :d="preview.d"
      :fill="fill"
      :fill-opacity="isEffect && preview.effect === 'blur' ? 0.35 : undefined"
      :fill-rule="preview.fillRule"
      :stroke="stroke"
      :stroke-width="strokeWidth"
      :stroke-opacity="isHighlighter ? 0.55 : undefined"
      :stroke-dasharray="dashArray"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path v-if="preview.pattern" :d="preview.pattern" fill="currentColor" />
    <text
      v-if="isMarker"
      class="shape-icon__label"
      x="0"
      y="1"
      text-anchor="middle"
      dominant-baseline="central"
      :style="{
        fill: shape?.textColor || 'var(--ds-surface-1)',
        fontSize: markerLabel.length > 2 ? '11px' : '15px',
      }"
    >
      {{ markerLabel }}
    </text>
    <!-- Kurzer Text (Sticker) direkt, längerer als angedeutete Zeilen -->
    <text
      v-if="shortText"
      class="shape-icon__label"
      :x="shortText.x"
      :y="shortText.y + 0.5"
      text-anchor="middle"
      dominant-baseline="central"
      :style="{ fill: textFill, fontSize: `${shortText.fontSize}px` }"
    >
      {{ shortText.value }}
    </text>
    <path
      v-else-if="textLines"
      :d="textLines"
      fill="none"
      :stroke="textFill"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup>
/**
 * Vorschau einer Form als Inline-SVG – dieselbe Pfadgeometrie wie auf dem
 * Canvas (src/lib/shapes/shapes.js); übernommen aus KodiniTools/Bildkonverter. Farbe folgt `currentColor` (Theme-Text) bzw.
 * optional den Farben einer konkreten Form.
 */
import { computed } from 'vue'
import { getGalleryPreview, SHAPE_KIND, SHAPE_PATHS } from '../../lib/shapes/shapes.js'

const props = defineProps({
  /** Galerie-Eintrag ({ type, aspect, preset }) */
  item: { type: Object, required: true },
  size: { type: Number, default: 32 },
  /** Konkrete Form: übernimmt Füll-/Linienfarbe statt currentColor */
  shape: { type: Object, default: null },
  /** Angezeigter Text (z. B. übersetzter Sticker-Text), sonst Text der Form/Vorlage */
  text: { type: String, default: null },
})

// Eindeutige id je Instanz (mehrere Vorschaubilder auf der Seite)
const gradientId = `shape-icon-gradient-${Math.random().toString(36).slice(2, 10)}`

const VIEW = 40
const preview = computed(() => {
  const s = props.shape
  if (!s) return getGalleryPreview(props.item, VIEW)
  // Varianten der konkreten Form (Marker-Stil, Effekt, Umriss) übernehmen
  const preset = { ...props.item.preset }
  for (const key of ['markerStyle', 'region', 'effect', 'points']) if (s[key]) preset[key] = s[key]
  // Freihand: eigenes Seitenverhältnis des Strichs
  const aspect = s.type === 'freehand' ? s.width / Math.max(1, s.height) : props.item.aspect
  const base = getGalleryPreview({ ...props.item, aspect, preset }, VIEW)
  return { ...base, filled: s.filled !== false, dash: s.dash || 'solid' }
})

const isStroke = computed(() => preview.value.kind === SHAPE_KIND.STROKE)
const isMarker = computed(() => preview.value.kind === SHAPE_KIND.MARKER)
const isEffect = computed(() => preview.value.kind === SHAPE_KIND.EFFECT)
const markerLabel = computed(() => String(props.shape?.number ?? 1))
const isHighlighter = computed(() => (props.shape?.tool ?? props.item.tool) === 'highlighter')

// Galerie-Kacheln sind in Textfarbe gefüllt → Text/Linien in Flächenfarbe
const textLineColor = 'var(--ds-surface-1)'

const iconText = computed(() =>
  String(props.text ?? (props.shape ? props.shape.text : props.item.preset?.text) ?? '').trim(),
)

/** Sticker-Texte bis 5 Zeichen werden als Text gezeigt */
const shortText = computed(() => {
  const def = SHAPE_PATHS[props.item.type]
  const value = iconText.value
  if (!def?.textBox || !value || value.length > 5 || value.includes('\n')) return null
  const box = def.textBox(preview.value.width, preview.value.height)
  const fontSize = Math.min(box.height * 0.9, (box.width / value.length) * 1.5, 22)
  return { value, x: box.x, y: box.y, fontSize: Math.max(5, fontSize) }
})

/** Galerie: Text in Flächenfarbe auf currentColor; eigene Form/Preset-Farbe sonst */
const textFill = computed(() => props.shape?.textColor || textLineColor)

/** Füllverlauf der konkreten Form bzw. Vorlage */
const gradient = computed(() => {
  const src = props.shape ?? props.item.preset
  if (!src || (src.fillType !== 'linear' && src.fillType !== 'radial')) return null
  if (isStroke.value || isEffect.value || !preview.value.filled) return null
  return {
    type: src.fillType,
    angle: Number(src.gradientAngle ?? 90),
    from: src.fillColor || 'currentColor',
    to: src.fillColor2 || 'var(--ds-surface-1)',
  }
})

/** Kurze Linien als Platzhalter für Text (nur Formen mit Textfeld und Text) */
const textLines = computed(() => {
  const def = SHAPE_PATHS[props.item.type]
  const text = iconText.value
  if (!def?.textBox || !text) return ''
  const box = def.textBox(preview.value.width, preview.value.height)
  const half = Math.max(2, box.width * 0.32)
  const gap = Math.min(5, box.height * 0.3)
  return (
    `M ${box.x - half} ${box.y - gap / 2} H ${box.x + half} ` +
    `M ${box.x - half * 0.65} ${box.y + gap / 2} H ${box.x + half * 0.65}`
  )
})
const fill = computed(() => {
  if (gradient.value) return `url(#${gradientId})`
  if (isEffect.value) return preview.value.effect === 'blur' ? 'currentColor' : 'none'
  if (isStroke.value || !preview.value.filled) return 'none'
  return props.shape?.fillColor || 'currentColor'
})
const stroke = computed(() => {
  if (isEffect.value) return 'currentColor'
  if (isStroke.value || !preview.value.filled) return props.shape?.strokeColor || 'currentColor'
  // Gefüllte Form mit Umrandung (z. B. weiße Sprechblase) bleibt so erkennbar
  return props.shape?.strokeWidth > 0 ? props.shape.strokeColor : 'none'
})
const strokeWidth = computed(() =>
  isHighlighter.value ? 7 : isStroke.value ? 3 : isEffect.value ? 1.5 : 2.5,
)
const dashArray = computed(() => {
  if (isEffect.value) return '3 2'
  if (preview.value.dash === 'dashed') return '6 4'
  if (preview.value.dash === 'dotted') return '0.1 5'
  return undefined
})
</script>

<style scoped>
.shape-icon {
  display: block;
  flex-shrink: 0;
  overflow: visible;
}

.shape-icon__label {
  font-family: var(--ds-font-sans);
  font-weight: 700;
}
</style>
