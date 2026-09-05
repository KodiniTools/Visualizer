<template>
  <!-- ✨ Typewriter-Einstellungen (klappbar) -->
  <details class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">⌨️</span>
      <span>{{ t('textManager.typewriterEffect') }}</span>
      <span v-if="settings.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
    </summary>
    <div class="section-content">
      <!-- Typewriter aktivieren -->
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

      <!-- Typewriter-Einstellungen (nur wenn aktiviert) -->
      <div v-if="settings.enabled">
        <!-- Geschwindigkeit -->
        <div class="control-group">
          <label
            >{{ t('textManager.speed') }}: {{ settings.speed
            }}{{ t('textManager.msPerChar') }}</label
          >
          <SliderField
            v-model="settings.speed"
            :min="10"
            :max="200"
            :default-value="50"
            class="slider"
          />
          <div class="hint-text">{{ t('textManager.speedHint') }}</div>
        </div>

        <!-- Start-Verzögerung -->
        <div class="control-group">
          <label>{{ t('textManager.startDelay') }}: {{ settings.startDelay }}ms</label>
          <SliderField
            v-model="settings.startDelay"
            :min="0"
            :max="3000"
            :step="100"
            :default-value="0"
            class="slider"
          />
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
          <SliderField
            v-model="settings.loopDelay"
            :min="0"
            :max="5000"
            :step="100"
            :default-value="1000"
            class="slider"
          />
        </div>

        <!-- Cursor -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input v-model="settings.showCursor" type="checkbox" />
            {{ t('textManager.showCursor') }}
          </label>
        </div>

        <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
        <div v-if="settings.showCursor" class="control-group">
          <label>{{ t('textManager.cursorChar') }}:</label>
          <select v-model="settings.cursorChar" class="select-input">
            <option value="|">{{ t('textManager.cursorLine') }}</option>
            <option value="_">{{ t('textManager.cursorUnderscore') }}</option>
            <option value="▌">{{ t('textManager.cursorBlock') }}</option>
            <option value="█">{{ t('textManager.cursorFullBlock') }}</option>
          </select>
        </div>

        <!-- Permanent anzeigen -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input v-model="settings.permanent" type="checkbox" />
            {{ t('textManager.permanentDisplay') }}
          </label>
          <div class="hint-text">{{ t('textManager.permanentDisplayHint') }}</div>
        </div>

        <!-- Anzeigedauer (nur wenn nicht permanent) -->
        <div v-if="!settings.permanent" class="control-group">
          <label>{{ t('textManager.displayDuration') }}: {{ settings.displayDuration }}ms</label>
          <div class="dur-row">
            <SliderField
              v-model="settings.displayDuration"
              :min="500"
              :max="30000"
              :step="100"
              :default-value="5000"
              class="slider"
            />
          </div>
          <div class="hint-text">{{ t('textManager.displayDurationHint') }}</div>
        </div>
      </div>

      <!-- Zum Canvas hinzufügen (nur diese Animation) -->
      <div class="control-group add-animation-group">
        <button class="btn-primary full-width" :disabled="!canAdd" @click="emit('add')">
          {{ t('textManager.addToCanvasTypewriter') }}
        </button>
      </div>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import { useI18n } from '../../../lib/i18n.js'

const settings = defineModel('settings', {
  type: Object,
  required: true,
})

defineProps({
  canAdd: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['add'])

const { t } = useI18n()
</script>

<style scoped src="./textFormStyles.css"></style>
