<template>
  <!-- ✨ TEXT-ANIMATION (klappbar) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">⌨️</span>
      <span>Text-Animation</span>
      <span v-if="selectedText.animation?.typewriter?.enabled" class="status-badge active"
        >Typewriter</span
      >
      <span v-if="selectedText.animation?.fade?.enabled" class="status-badge active">Fade</span>
      <span v-if="selectedText.animation?.scale?.enabled" class="status-badge active">Scale</span>
      <span v-if="selectedText.animation?.slide?.enabled" class="status-badge active">Slide</span>
    </summary>
    <div class="section-content">
      <!-- Typewriter aktivieren -->
      <div class="control-group">
        <label>Schreibmaschinen-Effekt:</label>
        <div class="button-group">
          <button
            @click="toggleTypewriter"
            :class="['btn-small', { active: selectedText.animation?.typewriter?.enabled }]"
          >
            {{
              selectedText.animation?.typewriter?.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
          <button
            v-if="selectedText.animation?.typewriter?.enabled"
            @click="restartTypewriter"
            class="btn-small"
            title="Animation neu starten"
          >
            🔄 Neustart
          </button>
        </div>
      </div>

      <!-- Typewriter-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.animation?.typewriter?.enabled" class="typewriter-settings">
        <!-- Geschwindigkeit -->
        <div class="control-group">
          <label>Geschwindigkeit: {{ selectedText.animation.typewriter.speed }}ms/Buchstabe</label>
          <input
            type="range"
            v-model.number="selectedText.animation.typewriter.speed"
            @input="updateText"
            min="10"
            max="200"
            class="slider"
          />
          <div class="hint-text">Niedrig = schneller, Hoch = langsamer</div>
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>Start-Verzögerung: {{ selectedText.animation.typewriter.startDelay }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.typewriter.startDelay"
            @input="updateText"
            min="0"
            max="3000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input
              type="checkbox"
              v-model="selectedText.animation.typewriter.loop"
              @change="updateText"
            />
            Animation wiederholen (Loop)
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="selectedText.animation.typewriter.loop" class="control-group">
          <label
            >Pause zwischen Wiederholungen:
            {{ selectedText.animation.typewriter.loopDelay }}ms</label
          >
          <input
            type="range"
            v-model.number="selectedText.animation.typewriter.loopDelay"
            @input="updateText"
            min="0"
            max="5000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Cursor -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input
              type="checkbox"
              v-model="selectedText.animation.typewriter.showCursor"
              @change="updateText"
            />
            Blinkender Cursor anzeigen
          </label>
        </div>

        <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
        <div v-if="selectedText.animation.typewriter.showCursor" class="control-group">
          <label>Cursor-Zeichen:</label>
          <select
            v-model="selectedText.animation.typewriter.cursorChar"
            @change="updateText"
            class="select-input"
          >
            <option value="|">| (Strich)</option>
            <option value="_">_ (Unterstrich)</option>
            <option value="▌">▌ (Block)</option>
            <option value="█">█ (Voller Block)</option>
          </select>
        </div>
      </div>

      <!-- Trennlinie -->
      <hr
        class="section-divider"
        style="margin: 12px 0; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1)"
      />

      <!-- Fade aktivieren -->
      <div class="control-group">
        <label>Einblend-Effekt (Fade):</label>
        <div class="button-group">
          <button
            @click="toggleFade"
            :class="['btn-small', { active: selectedText.animation?.fade?.enabled }]"
          >
            {{
              selectedText.animation?.fade?.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
          <button
            v-if="selectedText.animation?.fade?.enabled"
            @click="restartFade"
            class="btn-small"
            title="Animation neu starten"
          >
            🔄 Neustart
          </button>
        </div>
      </div>

      <!-- Fade-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.animation?.fade?.enabled" class="fade-settings">
        <!-- Richtung -->
        <div class="control-group">
          <label>Richtung:</label>
          <select
            v-model="selectedText.animation.fade.direction"
            @change="updateText"
            class="select-input"
          >
            <option value="in">Einblenden (0% → 100%)</option>
            <option value="out">Ausblenden (100% → 0%)</option>
            <option value="inOut">Ein- und Ausblenden</option>
          </select>
        </div>

        <!-- Dauer -->
        <div class="control-group">
          <label>Dauer: {{ selectedText.animation.fade.duration }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.fade.duration"
            @input="updateText"
            min="100"
            max="20000"
            step="100"
            class="slider"
          />
          <div class="hint-text">Wie lange das Ein-/Ausblenden dauert</div>
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>Start-Verzögerung: {{ selectedText.animation.fade.startDelay }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.fade.startDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Easing -->
        <div class="control-group">
          <label>Animation:</label>
          <select
            v-model="selectedText.animation.fade.easing"
            @change="updateText"
            class="select-input"
          >
            <option value="linear">Linear (gleichmäßig)</option>
            <option value="ease">Ease (natürlich)</option>
            <option value="easeIn">Ease In (langsamer Start)</option>
            <option value="easeOut">Ease Out (langsames Ende)</option>
          </select>
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input
              type="checkbox"
              v-model="selectedText.animation.fade.loop"
              @change="updateText"
            />
            Animation wiederholen (Loop)
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="selectedText.animation.fade.loop" class="control-group">
          <label
            >Pause zwischen Wiederholungen: {{ selectedText.animation.fade.loopDelay }}ms</label
          >
          <input
            type="range"
            v-model.number="selectedText.animation.fade.loopDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>
      </div>

      <!-- Trennlinie -->
      <hr
        class="section-divider"
        style="margin: 12px 0; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1)"
      />

      <!-- Scale aktivieren -->
      <div class="control-group">
        <label>Skalierungs-Effekt (Scale):</label>
        <div class="button-group">
          <button
            @click="toggleScale"
            :class="['btn-small', { active: selectedText.animation?.scale?.enabled }]"
          >
            {{
              selectedText.animation?.scale?.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
          <button
            v-if="selectedText.animation?.scale?.enabled"
            @click="restartScale"
            class="btn-small"
            title="Animation neu starten"
          >
            🔄 Neustart
          </button>
        </div>
      </div>

      <!-- Scale-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.animation?.scale?.enabled" class="scale-settings">
        <!-- Richtung -->
        <div class="control-group">
          <label>Richtung:</label>
          <select
            v-model="selectedText.animation.scale.direction"
            @change="updateText"
            class="select-input"
          >
            <option value="in">Reinzoomen (klein → groß)</option>
            <option value="out">Rauszoomen (groß → klein)</option>
            <option value="inOut">Rein und Raus</option>
          </select>
        </div>

        <!-- Start-Skalierung -->
        <div class="control-group">
          <label
            >Start-Größe: {{ Math.round(selectedText.animation.scale.startScale * 100) }}%</label
          >
          <input
            type="range"
            v-model.number="selectedText.animation.scale.startScale"
            @input="updateText"
            min="0"
            max="3"
            step="0.1"
            class="slider"
          />
          <div class="hint-text">0% = unsichtbar, 100% = normal</div>
        </div>

        <!-- End-Skalierung -->
        <div class="control-group">
          <label>End-Größe: {{ Math.round(selectedText.animation.scale.endScale * 100) }}%</label>
          <input
            type="range"
            v-model.number="selectedText.animation.scale.endScale"
            @input="updateText"
            min="0"
            max="3"
            step="0.1"
            class="slider"
          />
        </div>

        <!-- Dauer -->
        <div class="control-group">
          <label>Dauer: {{ selectedText.animation.scale.duration }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.scale.duration"
            @input="updateText"
            min="100"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>Start-Verzögerung: {{ selectedText.animation.scale.startDelay }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.scale.startDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Easing -->
        <div class="control-group">
          <label>Animation:</label>
          <select
            v-model="selectedText.animation.scale.easing"
            @change="updateText"
            class="select-input"
          >
            <option value="linear">Linear (gleichmäßig)</option>
            <option value="ease">Ease (natürlich)</option>
            <option value="easeIn">Ease In (langsamer Start)</option>
            <option value="easeOut">Ease Out (langsames Ende)</option>
          </select>
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input
              type="checkbox"
              v-model="selectedText.animation.scale.loop"
              @change="updateText"
            />
            Animation wiederholen (Loop)
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="selectedText.animation.scale.loop" class="control-group">
          <label
            >Pause zwischen Wiederholungen: {{ selectedText.animation.scale.loopDelay }}ms</label
          >
          <input
            type="range"
            v-model.number="selectedText.animation.scale.loopDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>
      </div>

      <!-- Trennlinie -->
      <hr
        class="section-divider"
        style="margin: 12px 0; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1)"
      />

      <!-- Slide aktivieren -->
      <div class="control-group">
        <label>Slide-Effekt (Hereingleiten):</label>
        <div class="button-group">
          <button
            @click="toggleSlide"
            :class="['btn-small', { active: selectedText.animation?.slide?.enabled }]"
          >
            {{
              selectedText.animation?.slide?.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
          <button
            v-if="selectedText.animation?.slide?.enabled"
            @click="restartSlide"
            class="btn-small"
            title="Animation neu starten"
          >
            🔄 Neustart
          </button>
        </div>
      </div>

      <!-- Slide-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.animation?.slide?.enabled" class="slide-settings">
        <!-- Richtung -->
        <div class="control-group">
          <label>Richtung:</label>
          <select
            v-model="selectedText.animation.slide.direction"
            @change="updateText"
            class="select-input"
          >
            <option value="in">Hereinfahren</option>
            <option value="out">Herausfahren</option>
            <option value="inOut">Herein und Heraus</option>
          </select>
        </div>

        <!-- Von welcher Seite -->
        <div class="control-group">
          <label>Von welcher Seite:</label>
          <select
            v-model="selectedText.animation.slide.from"
            @change="updateText"
            class="select-input"
          >
            <option value="left">Links</option>
            <option value="right">Rechts</option>
            <option value="top">Oben</option>
            <option value="bottom">Unten</option>
          </select>
        </div>

        <!-- Distanz -->
        <div class="control-group">
          <label>Distanz: {{ selectedText.animation.slide.distance }}px</label>
          <input
            type="range"
            v-model.number="selectedText.animation.slide.distance"
            @input="updateText"
            min="10"
            max="1000"
            step="10"
            class="slider"
          />
        </div>

        <!-- Dauer -->
        <div class="control-group">
          <label>Dauer: {{ selectedText.animation.slide.duration }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.slide.duration"
            @input="updateText"
            min="100"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>Start-Verzögerung: {{ selectedText.animation.slide.startDelay }}ms</label>
          <input
            type="range"
            v-model.number="selectedText.animation.slide.startDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Easing -->
        <div class="control-group">
          <label>Animation:</label>
          <select
            v-model="selectedText.animation.slide.easing"
            @change="updateText"
            class="select-input"
          >
            <option value="linear">Linear (gleichmäßig)</option>
            <option value="ease">Ease (natürlich)</option>
            <option value="easeIn">Ease In (langsamer Start)</option>
            <option value="easeOut">Ease Out (langsames Ende)</option>
          </select>
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input
              type="checkbox"
              v-model="selectedText.animation.slide.loop"
              @change="updateText"
            />
            Animation wiederholen (Loop)
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="selectedText.animation.slide.loop" class="control-group">
          <label
            >Pause zwischen Wiederholungen: {{ selectedText.animation.slide.loopDelay }}ms</label
          >
          <input
            type="range"
            v-model.number="selectedText.animation.slide.loopDelay"
            @input="updateText"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useTextAnimations } from '../../composables/useTextAnimations.js'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()
const canvasManager = inject('canvasManager')

// Wrap prop as ref-like for composable
const selectedTextRef = { value: props.selectedText }

const {
  toggleTypewriter,
  restartTypewriter,
  toggleFade,
  restartFade,
  toggleScale,
  restartScale,
  toggleSlide,
  restartSlide,
} = useTextAnimations(selectedTextRef, canvasManager)

function updateText() {
  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}
</script>

<style scoped>
/* ===== SHARED BASE STYLES ===== */
.control-group {
  margin-bottom: 6px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.select-input {
  width: 100%;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}

.slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.button-group {
  display: flex;
  gap: 4px;
}

.btn-small {
  flex: 1;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-small:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-small.active {
  background: rgba(201, 152, 77, 0.3);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}

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

/* ===== TYPEWRITER SETTINGS ===== */
.typewriter-settings {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
}

.typewriter-settings .control-group {
  margin-bottom: 10px;
}

.typewriter-settings .control-group:last-child {
  margin-bottom: 0;
}

.effect-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--text-primary, #e9e9eb);
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.effect-checkbox input[type='checkbox'] {
  width: 12px;
  height: 12px;
  cursor: pointer;
  accent-color: var(--accent-primary, #c9984d);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .slider::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .typewriter-settings {
  background: rgba(1, 79, 153, 0.04);
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
</style>
