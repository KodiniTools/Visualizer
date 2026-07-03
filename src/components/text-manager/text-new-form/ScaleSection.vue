<template>
  <!-- ✨ Scale-Einstellungen (klappbar) -->
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🔍</span>
      <span>{{ t('textManager.scaleEffect') }}</span>
      <span v-if="settings.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
    </summary>
    <div class="section-content">
      <!-- Scale aktivieren -->
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

      <!-- Scale-Einstellungen (nur wenn aktiviert) -->
      <div v-if="settings.enabled">
        <!-- Richtung -->
        <div class="control-group">
          <label>{{ t('textManager.direction') }}:</label>
          <select v-model="settings.direction" class="select-input">
            <option value="in">{{ t('textManager.zoomIn') }}</option>
            <option value="out">{{ t('textManager.zoomOut') }}</option>
            <option value="inOut">{{ t('textManager.zoomInOut') }}</option>
          </select>
        </div>

        <!-- Start-Skalierung -->
        <div class="control-group">
          <label
            >{{ t('textManager.startSize') }}: {{ Math.round(settings.startScale * 100) }}%</label
          >
          <input
            v-model.number="settings.startScale"
            type="range"
            min="0"
            max="3"
            step="0.1"
            class="slider"
          />
          <div class="hint-text">{{ t('textManager.sizeHint') }}</div>
        </div>

        <!-- End-Skalierung -->
        <div class="control-group">
          <label>{{ t('textManager.endSize') }}: {{ Math.round(settings.endScale * 100) }}%</label>
          <input
            v-model.number="settings.endScale"
            type="range"
            min="0"
            max="3"
            step="0.1"
            class="slider"
          />
        </div>

        <!-- Dauer -->
        <div class="control-group">
          <label>{{ t('textManager.duration') }}: {{ settings.duration }}ms</label>
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
          <label>{{ t('textManager.startDelay') }}: {{ settings.startDelay }}ms</label>
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
          <label>{{ t('textManager.animation') }}:</label>
          <select v-model="settings.easing" class="select-input">
            <option value="linear">{{ t('textManager.linear') }}</option>
            <option value="ease">{{ t('textManager.ease') }}</option>
            <option value="easeIn">{{ t('textManager.easeIn') }}</option>
            <option value="easeOut">{{ t('textManager.easeOut') }}</option>
          </select>
        </div>

        <!-- Loop -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input v-model="settings.loop" type="checkbox" />
            {{ t('textManager.loop') }}
          </label>
        </div>

        <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
        <div v-if="settings.loop" class="control-group">
          <label>{{ t('textManager.loopDelay') }}: {{ settings.loopDelay }}ms</label>
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
