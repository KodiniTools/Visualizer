<template>
  <div class="multi-edit-panel">
    <!-- Header -->
    <div class="multi-header">
      <span class="multi-count">{{ texts.length }} Texte ausgewählt</span>
      <div class="multi-header-actions">
        <button class="btn-select-all" @click="selectAll" title="Alle Texte auswählen">
          ⊞ Alle
        </button>
        <button class="btn-clear" @click="$emit('clear')" title="Auswahl aufheben">✕</button>
      </div>
    </div>

    <p class="hint">Shift+Klick zum Hinzufügen · Ziehen bewegt alle</p>

    <!-- Bulk Style -->
    <div class="section">
      <div class="section-title">Stil für alle</div>

      <div class="control-row">
        <label>Farbe</label>
        <div class="color-row">
          <input type="color" v-model="bulkColor" class="color-input" />
          <button class="btn-apply" @click="applyColor">Anwenden</button>
        </div>
      </div>

      <div class="control-row">
        <label>Schriftgröße</label>
        <div class="size-row">
          <input type="number" v-model.number="bulkFontSize" min="4" max="400" class="num-input" />
          <button class="btn-apply" @click="applyFontSize">Anwenden</button>
        </div>
      </div>

      <div class="control-row">
        <label>Deckkraft</label>
        <div class="size-row">
          <input type="range" v-model.number="bulkOpacity" min="0" max="100" class="slider" />
          <span class="val-label">{{ bulkOpacity }}%</span>
          <button class="btn-apply" @click="applyOpacity">▶</button>
        </div>
      </div>

      <div class="control-row">
        <label>Schriftart</label>
        <div class="size-row">
          <select v-model="bulkFont" class="font-select">
            <option value="">— wählen —</option>
            <option v-for="f in commonFonts" :key="f" :value="f">{{ f }}</option>
          </select>
          <button class="btn-apply" @click="applyFont" :disabled="!bulkFont">Anwenden</button>
        </div>
      </div>
    </div>

    <!-- Bulk Move -->
    <div class="section">
      <div class="section-title">Position (alle)</div>
      <div class="nudge-row">
        <button class="btn-nudge" @click="nudge(0, -0.01)">▲</button>
        <button class="btn-nudge" @click="nudge(-0.01, 0)">◀</button>
        <button class="btn-nudge" @click="nudge(0.01, 0)">▶</button>
        <button class="btn-nudge" @click="nudge(0, 0.01)">▼</button>
        <span class="nudge-hint">Fein-Verschieben</span>
      </div>
      <div class="align-row">
        <button class="btn-align" @click="alignAll('left')" title="Linksbündig">⬛⬜⬜</button>
        <button class="btn-align" @click="alignAll('center')" title="Zentriert">⬜⬛⬜</button>
        <button class="btn-align" @click="alignAll('right')" title="Rechtsbündig">⬜⬜⬛</button>
        <button class="btn-align" @click="alignAll('top')" title="Oben">⬆</button>
        <button class="btn-align" @click="alignAll('middle')" title="Mitte (V)">↕</button>
        <button class="btn-align" @click="alignAll('bottom')" title="Unten">⬇</button>
      </div>
    </div>

    <!-- Bulk Audio-Reactive -->
    <div class="section">
      <div class="section-title">Audio-Reaktiv (alle)</div>
      <p class="hint">Einstellungen vom aktiven Text auf alle anderen übertragen</p>
      <button
        class="btn-copy-audio"
        @click="copyAudioReactive"
        :disabled="!activeText?.audioReactive?.enabled"
      >
        🎵 Audio-Einstellungen kopieren
      </button>
    </div>

    <!-- Bulk Delete -->
    <div class="section">
      <button class="btn-delete-all" @click="deleteAll">🗑 Alle {{ texts.length }} löschen</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'

const props = defineProps({
  texts: { type: Array, required: true },
  activeText: { type: Object, default: null },
})

const emit = defineEmits(['clear'])

const canvasManager = inject('canvasManager')

const bulkColor = ref('#ffffff')
const bulkFontSize = ref(48)
const bulkOpacity = ref(100)
const bulkFont = ref('')

const commonFonts = [
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black',
]

function applyColor() {
  for (const t of props.texts) t.color = bulkColor.value
  redraw()
}

function applyFontSize() {
  for (const t of props.texts) t.fontSize = bulkFontSize.value
  redraw()
}

function applyOpacity() {
  for (const t of props.texts) t.opacity = bulkOpacity.value
  redraw()
}

function applyFont() {
  if (!bulkFont.value) return
  for (const t of props.texts) t.fontFamily = bulkFont.value
  redraw()
}

function nudge(dx, dy) {
  for (const t of props.texts) {
    t.relX += dx
    t.relY += dy
  }
  redraw()
}

function alignAll(direction) {
  if (props.texts.length === 0) return
  if (direction === 'left') {
    const minX = Math.min(...props.texts.map((t) => t.relX))
    for (const t of props.texts) t.relX = minX
  } else if (direction === 'right') {
    const maxX = Math.max(...props.texts.map((t) => t.relX))
    for (const t of props.texts) t.relX = maxX
  } else if (direction === 'center') {
    const avgX = props.texts.reduce((s, t) => s + t.relX, 0) / props.texts.length
    for (const t of props.texts) t.relX = avgX
  } else if (direction === 'top') {
    const minY = Math.min(...props.texts.map((t) => t.relY))
    for (const t of props.texts) t.relY = minY
  } else if (direction === 'bottom') {
    const maxY = Math.max(...props.texts.map((t) => t.relY))
    for (const t of props.texts) t.relY = maxY
  } else if (direction === 'middle') {
    const avgY = props.texts.reduce((s, t) => s + t.relY, 0) / props.texts.length
    for (const t of props.texts) t.relY = avgY
  }
  redraw()
}

function copyAudioReactive() {
  if (!props.activeText?.audioReactive) return
  const src = props.activeText.audioReactive
  for (const t of props.texts) {
    if (t === props.activeText) continue
    t.audioReactive = JSON.parse(JSON.stringify(src))
  }
  redraw()
}

function deleteAll() {
  const cm = canvasManager.value
  if (!cm) return
  for (const t of [...props.texts]) {
    if (cm.textManager) cm.textManager.delete(t)
  }
  cm.clearMultiSelection()
  cm.setActiveObject(null)
  emit('clear')
  redraw()
}

function selectAll() {
  canvasManager.value?.selectAllTexts()
}

function redraw() {
  canvasManager.value?.redrawCallback()
}
</script>

<style scoped>
.multi-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}

.multi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(110, 200, 110, 0.12);
  border: 1px solid rgba(110, 200, 110, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
}

.multi-count {
  font-size: 0.65rem;
  font-weight: 700;
  color: #6ec86e;
}

.multi-header-actions {
  display: flex;
  gap: 4px;
}

.hint {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  margin: 0;
}

.section {
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted, #7a8da0);
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.control-row label {
  font-size: 0.58rem;
  color: var(--text-primary, #e9e9eb);
}

.color-row,
.size-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.color-input {
  width: 32px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.num-input {
  width: 64px;
  padding: 3px 6px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
}

.slider {
  flex: 1;
}

.val-label {
  font-size: 0.58rem;
  color: var(--text-muted, #7a8da0);
  min-width: 32px;
}

.font-select {
  flex: 1;
  padding: 3px 6px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
}

.btn-apply {
  padding: 3px 8px;
  background: var(--accent-primary, #c9984d);
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-select-all {
  padding: 3px 7px;
  background: rgba(110, 200, 110, 0.2);
  border: 1px solid rgba(110, 200, 110, 0.4);
  border-radius: 4px;
  color: #6ec86e;
  font-size: 0.58rem;
  cursor: pointer;
}

.btn-clear {
  padding: 3px 7px;
  background: none;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  color: var(--text-muted, #7a8da0);
  font-size: 0.58rem;
  cursor: pointer;
}

.btn-clear:hover {
  color: #ff4444;
  border-color: #ff4444;
}

.nudge-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-nudge {
  width: 28px;
  height: 28px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nudge:hover {
  background: var(--accent-primary, #c9984d);
  color: #fff;
  border-color: transparent;
}

.nudge-hint {
  font-size: 0.52rem;
  color: var(--text-muted, #7a8da0);
  margin-left: 4px;
}

.align-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.btn-align {
  padding: 3px 6px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  cursor: pointer;
}

.btn-align:hover {
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-primary, #c9984d);
}

.btn-copy-audio {
  padding: 6px 10px;
  background: rgba(100, 150, 255, 0.15);
  border: 1px solid rgba(100, 150, 255, 0.35);
  border-radius: 5px;
  color: #88aaff;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
}

.btn-copy-audio:hover:not(:disabled) {
  background: rgba(100, 150, 255, 0.25);
}

.btn-copy-audio:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-delete-all {
  padding: 6px;
  width: 100%;
  background: rgba(255, 50, 50, 0.1);
  border: 1px solid rgba(255, 50, 50, 0.3);
  border-radius: 5px;
  color: #ff6666;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-delete-all:hover {
  background: rgba(255, 50, 50, 0.2);
}
</style>
