<template>
  <!-- ✨ Slide-Einstellungen (klappbar) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">↔️</span>
      <span>Hereingleit-Effekt (Slide)</span>
      <span v-if="settings.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
    </summary>
    <div class="section-content">
      <!-- Slide aktivieren -->
      <div class="control-group">
        <div class="button-group">
          <button
            :class="['btn-small', 'full-width', { active: settings.enabled }]"
            @click="settings.enabled = !settings.enabled"
          >
            {{
              settings.enabled ? '✓ ' + t('textManager.activated') : t('textManager.deactivated')
            }}
          </button>
        </div>
      </div>

      <!-- Slide-Einstellungen (nur wenn aktiviert) -->
      <div v-if="settings.enabled">
        <!-- Richtung (von wo) -->
        <div class="control-group">
          <label>Einfahren von:</label>
          <select v-model="settings.from" class="select-input">
            <option value="left">Links</option>
            <option value="right">Rechts</option>
            <option value="top">Oben</option>
            <option value="bottom">Unten</option>
          </select>
        </div>

        <!-- Animation-Richtung -->
        <div class="control-group">
          <label>Animation:</label>
          <select v-model="settings.direction" class="select-input">
            <option value="in">Hereinfahren</option>
            <option value="out">Herausfahren</option>
            <option value="inOut">Herein und Heraus</option>
          </select>
        </div>

        <!-- Distanz -->
        <div class="control-group">
          <label>Distanz: {{ settings.distance }}%</label>
          <input
            v-model.number="settings.distance"
            type="range"
            min="10"
            max="200"
            step="10"
            class="slider"
          />
          <div class="hint-text">100% = vom Rand des Canvas</div>
        </div>

        <!-- Dauer -->
        <div class="control-group">
          <label>Dauer: {{ settings.duration }}ms</label>
          <input
            v-model.number="settings.duration"
            type="range"
            min="100"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>Start-Verzögerung: {{ settings.startDelay }}ms</label>
          <input
            v-model.number="settings.startDelay"
            type="range"
            min="0"
            max="20000"
            step="100"
            class="slider"
          />
        </div>

        <!-- Easing -->
        <div class="control-group">
          <label>Bewegung:</label>
          <select v-model="settings.easing" class="select-input">
            <option value="linear">Linear (gleichmäßig)</option>
            <option value="ease">Ease (natürlich)</option>
            <option value="easeIn">Ease In (langsamer Start)</option>
            <option value="easeOut">Ease Out (langsames Ende)</option>
          </select>
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input v-model="settings.loop" type="checkbox" />
            Animation wiederholen (Loop)
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="settings.loop" class="control-group">
          <label>Pause zwischen Wiederholungen: {{ settings.loopDelay }}ms</label>
          <input
            v-model.number="settings.loopDelay"
            type="range"
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
import { useI18n } from '../../../lib/i18n.js'

const settings = defineModel('settings', {
  type: Object,
  required: true,
})

const { t } = useI18n()
</script>

<style scoped src="./textFormStyles.css"></style>
