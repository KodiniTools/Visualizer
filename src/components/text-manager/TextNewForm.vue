<template>
  <!-- Neuer Text Eingabemodus -->
  <div v-if="isAddingNewText" class="panel-section">
    <h4>{{ t('textManager.createNewText') }}</h4>

    <div class="control-group">
      <label>{{ t('textManager.enterText') }}:</label>
      <textarea
        ref="newTextInput"
        v-model="newTextContent"
        @keydown.esc="cancelNewText"
        @paste="handlePasteForNewText"
        class="text-area"
        placeholder="Mehrzeiliger Text wird unterstützt!
Zeile 1
Zeile 2
Zeile 3..."
        rows="8"
      ></textarea>
      <div class="hint-text">
        <strong>{{ t('textManager.browserTextTip') }}:</strong>
        {{
          locale === 'de'
            ? 'Nach dem Einfügen drücken Sie Enter, um Zeilenumbrüche hinzuzufügen'
            : 'After pasting, press Enter to add line breaks'
        }}
      </div>
      <div class="hint-text" style="margin-top: 4px">
        <strong>{{ t('textManager.notepadTip') }}:</strong>
        {{
          locale === 'de'
            ? 'Zeilenumbrüche werden automatisch erkannt'
            : 'Line breaks are automatically detected'
        }}
      </div>
      <div v-if="newTextContent.includes('\n')" class="success-hint">
        {{
          locale === 'de'
            ? newTextContent.split('\n').length + ' Zeilen erkannt'
            : newTextContent.split('\n').length + ' lines detected'
        }}
      </div>
    </div>

    <!-- ✨ Text-Stil Einstellungen (klappbar) -->
    <details class="collapsible-section" open>
      <summary class="section-header">
        <span class="section-icon">🎨</span>
        <span>{{ t('textManager.textStyle') }}</span>
      </summary>
      <div class="section-content">
        <!-- Schriftart -->
        <div class="control-group">
          <label>{{ t('textManager.font') }}:</label>
          <select
            ref="newTextFontSelect"
            v-model="newTextStyle.fontFamily"
            class="select-input font-select"
          >
            <!-- Wird dynamisch befüllt -->
          </select>
        </div>

        <!-- Schriftgröße -->
        <div class="control-group">
          <label>{{ t('textManager.fontSize') }}: {{ newTextStyle.fontSize }}px</label>
          <input
            type="range"
            v-model.number="newTextStyle.fontSize"
            min="12"
            max="200"
            class="slider"
            :disabled="newTextStyle.autoFit"
          />
        </div>

        <!-- Auto-Fit -->
        <div class="control-group">
          <label class="effect-checkbox">
            <input type="checkbox" v-model="newTextStyle.autoFit" />
            📐 {{ t('textManager.autoFit') }}
          </label>
          <div v-if="newTextStyle.autoFit" class="auto-fit-settings">
            <label>{{ t('textManager.autoFitPadding') }}: {{ newTextStyle.autoFitPadding }}%</label>
            <input
              type="range"
              v-model.number="newTextStyle.autoFitPadding"
              min="0"
              max="30"
              class="slider"
            />
          </div>
        </div>

        <!-- Textfarbe -->
        <div class="control-group">
          <label>{{ t('textManager.textColor') }}:</label>
          <div class="color-picker-group">
            <input type="color" v-model="newTextStyle.color" class="color-input" />
            <input
              type="text"
              v-model="newTextStyle.color"
              class="color-text-input"
              placeholder="#ff0000"
            />
          </div>
        </div>

        <!-- Deckkraft -->
        <div class="control-group">
          <label>{{ t('textManager.opacity') }}: {{ newTextStyle.opacity }}%</label>
          <input
            type="range"
            v-model.number="newTextStyle.opacity"
            min="0"
            max="100"
            class="slider"
          />
        </div>

        <!-- Schriftstil -->
        <div class="control-group">
          <label>{{ t('textManager.style') }}:</label>
          <div class="button-group">
            <button
              @click="
                newTextStyle.fontWeight = newTextStyle.fontWeight === 'bold' ? 'normal' : 'bold'
              "
              :class="['btn-small', { active: newTextStyle.fontWeight === 'bold' }]"
            >
              <strong>B</strong>
            </button>
            <button
              @click="
                newTextStyle.fontStyle = newTextStyle.fontStyle === 'italic' ? 'normal' : 'italic'
              "
              :class="['btn-small', { active: newTextStyle.fontStyle === 'italic' }]"
            >
              <em>I</em>
            </button>
          </div>
        </div>

        <!-- Ausrichtung -->
        <div class="control-group">
          <label>{{ t('textManager.alignment') }}:</label>
          <div class="button-group">
            <button
              @click="newTextStyle.textAlign = 'left'"
              :class="['btn-small', { active: newTextStyle.textAlign === 'left' }]"
            >
              {{ t('textManager.left') }}
            </button>
            <button
              @click="newTextStyle.textAlign = 'center'"
              :class="['btn-small', { active: newTextStyle.textAlign === 'center' }]"
            >
              {{ t('textManager.center') }}
            </button>
            <button
              @click="newTextStyle.textAlign = 'right'"
              :class="['btn-small', { active: newTextStyle.textAlign === 'right' }]"
            >
              {{ t('textManager.right') }}
            </button>
          </div>
        </div>

        <!-- Einstellungen speichern/laden -->
        <div class="settings-actions">
          <button
            @click="saveCurrentSettings"
            class="btn-save"
            :title="
              locale === 'de'
                ? 'Aktuelle Einstellungen als Standard speichern'
                : 'Save current settings as default'
            "
          >
            💾 {{ t('textManager.saveAsDefault') }}
          </button>
          <button
            @click="clearSavedSettings"
            class="btn-reset-small"
            :title="
              locale === 'de' ? 'Auf Werkseinstellungen zurücksetzen' : 'Reset to factory settings'
            "
          >
            🔄 {{ t('textManager.resetToDefault') }}
          </button>
        </div>
      </div>
    </details>

    <!-- ✨ Typewriter-Einstellungen (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">⌨️</span>
        <span>{{ t('textManager.typewriterEffect') }}</span>
        <span v-if="newTextTypewriter.enabled" class="status-badge active">{{
          t('textManager.active')
        }}</span>
      </summary>
      <div class="section-content">
        <!-- Typewriter aktivieren -->
        <div class="control-group">
          <div class="button-group">
            <button
              @click="newTextTypewriter.enabled = !newTextTypewriter.enabled"
              :class="['btn-small', 'full-width', { active: newTextTypewriter.enabled }]"
            >
              {{
                newTextTypewriter.enabled
                  ? '✓ ' + t('textManager.activated')
                  : t('textManager.deactivated')
              }}
            </button>
          </div>
        </div>

        <!-- Typewriter-Einstellungen (nur wenn aktiviert) -->
        <div v-if="newTextTypewriter.enabled">
          <!-- Geschwindigkeit -->
          <div class="control-group">
            <label
              >{{ t('textManager.speed') }}: {{ newTextTypewriter.speed
              }}{{ t('textManager.msPerChar') }}</label
            >
            <input
              type="range"
              v-model.number="newTextTypewriter.speed"
              min="10"
              max="200"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.speedHint') }}</div>
          </div>

          <!-- Start-Verzögerung -->
          <div class="control-group">
            <label>{{ t('textManager.startDelay') }}: {{ newTextTypewriter.startDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextTypewriter.startDelay"
              min="0"
              max="3000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Loop -->
          <div class="control-group">
            <label class="effect-checkbox">
              <input type="checkbox" v-model="newTextTypewriter.loop" />
              {{ t('textManager.loop') }}
            </label>
          </div>

          <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
          <div v-if="newTextTypewriter.loop" class="control-group">
            <label>{{ t('textManager.loopDelay') }}: {{ newTextTypewriter.loopDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextTypewriter.loopDelay"
              min="0"
              max="5000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Cursor -->
          <div class="control-group">
            <label class="effect-checkbox">
              <input type="checkbox" v-model="newTextTypewriter.showCursor" />
              {{ t('textManager.showCursor') }}
            </label>
          </div>

          <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
          <div v-if="newTextTypewriter.showCursor" class="control-group">
            <label>{{ t('textManager.cursorChar') }}:</label>
            <select v-model="newTextTypewriter.cursorChar" class="select-input">
              <option value="|">{{ t('textManager.cursorLine') }}</option>
              <option value="_">{{ t('textManager.cursorUnderscore') }}</option>
              <option value="▌">{{ t('textManager.cursorBlock') }}</option>
              <option value="█">{{ t('textManager.cursorFullBlock') }}</option>
            </select>
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ Fade-Einstellungen (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">🌫️</span>
        <span>{{ t('textManager.fadeEffect') }}</span>
        <span v-if="newTextFade.enabled" class="status-badge active">{{
          t('textManager.active')
        }}</span>
      </summary>
      <div class="section-content">
        <!-- Fade aktivieren -->
        <div class="control-group">
          <div class="button-group">
            <button
              @click="newTextFade.enabled = !newTextFade.enabled"
              :class="['btn-small', 'full-width', { active: newTextFade.enabled }]"
            >
              {{
                newTextFade.enabled
                  ? '✓ ' + t('textManager.activated')
                  : t('textManager.deactivated')
              }}
            </button>
          </div>
        </div>

        <!-- Fade-Einstellungen (nur wenn aktiviert) -->
        <div v-if="newTextFade.enabled">
          <!-- Richtung -->
          <div class="control-group">
            <label>{{ t('textManager.direction') }}:</label>
            <select v-model="newTextFade.direction" class="select-input">
              <option value="in">{{ t('textManager.fadeIn') }}</option>
              <option value="out">{{ t('textManager.fadeOut') }}</option>
              <option value="inOut">{{ t('textManager.fadeInOut') }}</option>
            </select>
          </div>

          <!-- Dauer -->
          <div class="control-group">
            <label>{{ t('textManager.duration') }}: {{ newTextFade.duration }}ms</label>
            <input
              type="range"
              v-model.number="newTextFade.duration"
              min="100"
              max="20000"
              step="100"
              class="slider"
            />
            <div class="hint-text">
              {{
                locale === 'de'
                  ? 'Wie lange das Ein-/Ausblenden dauert'
                  : 'How long the fade in/out takes'
              }}
            </div>
          </div>

          <!-- Start-Verzögerung -->
          <div class="control-group">
            <label>{{ t('textManager.startDelay') }}: {{ newTextFade.startDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextFade.startDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Easing -->
          <div class="control-group">
            <label>{{ t('textManager.animation') }}:</label>
            <select v-model="newTextFade.easing" class="select-input">
              <option value="linear">{{ t('textManager.linear') }}</option>
              <option value="ease">{{ t('textManager.ease') }}</option>
              <option value="easeIn">{{ t('textManager.easeIn') }}</option>
              <option value="easeOut">{{ t('textManager.easeOut') }}</option>
            </select>
          </div>

          <!-- Loop -->
          <div class="control-group">
            <label class="effect-checkbox">
              <input type="checkbox" v-model="newTextFade.loop" />
              {{ t('textManager.loop') }}
            </label>
          </div>

          <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
          <div v-if="newTextFade.loop" class="control-group">
            <label>{{ t('textManager.loopDelay') }}: {{ newTextFade.loopDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextFade.loopDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ Scale-Einstellungen (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">🔍</span>
        <span>{{ t('textManager.scaleEffect') }}</span>
        <span v-if="newTextScale.enabled" class="status-badge active">{{
          t('textManager.active')
        }}</span>
      </summary>
      <div class="section-content">
        <!-- Scale aktivieren -->
        <div class="control-group">
          <div class="button-group">
            <button
              @click="newTextScale.enabled = !newTextScale.enabled"
              :class="['btn-small', 'full-width', { active: newTextScale.enabled }]"
            >
              {{
                newTextScale.enabled
                  ? '✓ ' + t('textManager.activated')
                  : t('textManager.deactivated')
              }}
            </button>
          </div>
        </div>

        <!-- Scale-Einstellungen (nur wenn aktiviert) -->
        <div v-if="newTextScale.enabled">
          <!-- Richtung -->
          <div class="control-group">
            <label>{{ t('textManager.direction') }}:</label>
            <select v-model="newTextScale.direction" class="select-input">
              <option value="in">{{ t('textManager.zoomIn') }}</option>
              <option value="out">{{ t('textManager.zoomOut') }}</option>
              <option value="inOut">{{ t('textManager.zoomInOut') }}</option>
            </select>
          </div>

          <!-- Start-Skalierung -->
          <div class="control-group">
            <label
              >{{ t('textManager.startSize') }}:
              {{ Math.round(newTextScale.startScale * 100) }}%</label
            >
            <input
              type="range"
              v-model.number="newTextScale.startScale"
              min="0"
              max="3"
              step="0.1"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.sizeHint') }}</div>
          </div>

          <!-- End-Skalierung -->
          <div class="control-group">
            <label
              >{{ t('textManager.endSize') }}: {{ Math.round(newTextScale.endScale * 100) }}%</label
            >
            <input
              type="range"
              v-model.number="newTextScale.endScale"
              min="0"
              max="3"
              step="0.1"
              class="slider"
            />
          </div>

          <!-- Dauer -->
          <div class="control-group">
            <label>{{ t('textManager.duration') }}: {{ newTextScale.duration }}ms</label>
            <input
              type="range"
              v-model.number="newTextScale.duration"
              min="100"
              max="20000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Start-Verzögerung -->
          <div class="control-group">
            <label>{{ t('textManager.startDelay') }}: {{ newTextScale.startDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextScale.startDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Easing -->
          <div class="control-group">
            <label>{{ t('textManager.animation') }}:</label>
            <select v-model="newTextScale.easing" class="select-input">
              <option value="linear">{{ t('textManager.linear') }}</option>
              <option value="ease">{{ t('textManager.ease') }}</option>
              <option value="easeIn">{{ t('textManager.easeIn') }}</option>
              <option value="easeOut">{{ t('textManager.easeOut') }}</option>
            </select>
          </div>

          <!-- Loop -->
          <div class="control-group">
            <label class="effect-checkbox">
              <input type="checkbox" v-model="newTextScale.loop" />
              {{ t('textManager.loop') }}
            </label>
          </div>

          <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
          <div v-if="newTextScale.loop" class="control-group">
            <label>{{ t('textManager.loopDelay') }}: {{ newTextScale.loopDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextScale.loopDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ Slide-Einstellungen (klappbar) -->
    <details class="collapsible-section">
      <summary class="section-header">
        <span class="section-icon">↔️</span>
        <span>Hereingleit-Effekt (Slide)</span>
        <span v-if="newTextSlide.enabled" class="status-badge active">{{
          t('textManager.active')
        }}</span>
      </summary>
      <div class="section-content">
        <!-- Slide aktivieren -->
        <div class="control-group">
          <div class="button-group">
            <button
              @click="newTextSlide.enabled = !newTextSlide.enabled"
              :class="['btn-small', 'full-width', { active: newTextSlide.enabled }]"
            >
              {{
                newTextSlide.enabled
                  ? '✓ ' + t('textManager.activated')
                  : t('textManager.deactivated')
              }}
            </button>
          </div>
        </div>

        <!-- Slide-Einstellungen (nur wenn aktiviert) -->
        <div v-if="newTextSlide.enabled">
          <!-- Richtung (von wo) -->
          <div class="control-group">
            <label>Einfahren von:</label>
            <select v-model="newTextSlide.from" class="select-input">
              <option value="left">Links</option>
              <option value="right">Rechts</option>
              <option value="top">Oben</option>
              <option value="bottom">Unten</option>
            </select>
          </div>

          <!-- Animation-Richtung -->
          <div class="control-group">
            <label>Animation:</label>
            <select v-model="newTextSlide.direction" class="select-input">
              <option value="in">Hereinfahren</option>
              <option value="out">Herausfahren</option>
              <option value="inOut">Herein und Heraus</option>
            </select>
          </div>

          <!-- Distanz -->
          <div class="control-group">
            <label>Distanz: {{ newTextSlide.distance }}%</label>
            <input
              type="range"
              v-model.number="newTextSlide.distance"
              min="10"
              max="200"
              step="10"
              class="slider"
            />
            <div class="hint-text">100% = vom Rand des Canvas</div>
          </div>

          <!-- Dauer -->
          <div class="control-group">
            <label>Dauer: {{ newTextSlide.duration }}ms</label>
            <input
              type="range"
              v-model.number="newTextSlide.duration"
              min="100"
              max="20000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Start-Verzögerung -->
          <div class="control-group">
            <label>Start-Verzögerung: {{ newTextSlide.startDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextSlide.startDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>

          <!-- Easing -->
          <div class="control-group">
            <label>Bewegung:</label>
            <select v-model="newTextSlide.easing" class="select-input">
              <option value="linear">Linear (gleichmäßig)</option>
              <option value="ease">Ease (natürlich)</option>
              <option value="easeIn">Ease In (langsamer Start)</option>
              <option value="easeOut">Ease Out (langsames Ende)</option>
            </select>
          </div>

          <!-- Loop -->
          <div class="control-group">
            <label class="effect-checkbox">
              <input type="checkbox" v-model="newTextSlide.loop" />
              Animation wiederholen (Loop)
            </label>
          </div>

          <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
          <div v-if="newTextSlide.loop" class="control-group">
            <label>Pause zwischen Wiederholungen: {{ newTextSlide.loopDelay }}ms</label>
            <input
              type="range"
              v-model.number="newTextSlide.loopDelay"
              min="0"
              max="20000"
              step="100"
              class="slider"
            />
          </div>
        </div>
      </div>
    </details>

    <!-- ✨ NEU: Position & Bereich (klappbar) -->
    <details class="collapsible-section" :open="textSelectionBounds !== null">
      <summary class="section-header">
        <span class="section-icon">📍</span>
        <span>Position &amp; Bereich</span>
        <span v-if="textSelectionBounds" class="status-badge active">Auswahl</span>
      </summary>
      <div class="section-content">
        <!-- Rechteck auf Canvas zeichnen -->
        <div class="control-group">
          <button
            @click="startTextSelectionOnCanvas"
            :class="['btn-selection', 'full-width', { active: isSelectingOnCanvas }]"
            :disabled="isSelectingOnCanvas"
          >
            <span v-if="isSelectingOnCanvas">✓ Zeichnen Sie ein Rechteck auf dem Canvas...</span>
            <span v-else>🖱️ Bereich auf Canvas markieren</span>
          </button>
          <div class="hint-text">
            Ziehen Sie ein Rechteck auf dem Canvas, um die Position des Textes festzulegen
          </div>
        </div>

        <!-- Auswahl-Info (nur wenn Auswahl vorhanden) -->
        <div v-if="textSelectionBounds" class="selection-info">
          <div class="selection-preview">
            <span class="selection-label">Ausgewählter Bereich:</span>
            <span class="selection-value"
              >{{ Math.round(textSelectionBounds.width) }} ×
              {{ Math.round(textSelectionBounds.height) }} px</span
            >
          </div>
          <button @click="clearTextSelection" class="btn-small btn-clear">Auswahl löschen</button>
        </div>

        <!-- Manuelle Position X -->
        <div class="control-group">
          <label>Position X: {{ Math.round(newTextPosition.x * 100) }}%</label>
          <input
            type="range"
            v-model.number="newTextPosition.x"
            min="0"
            max="1"
            step="0.01"
            class="slider"
          />
          <input
            type="number"
            v-model.number="newTextPosition.xPixel"
            @input="updatePositionFromPixel('x')"
            class="number-input"
            :placeholder="'0 - ' + canvasWidth"
          />
          <span class="unit-label">px</span>
        </div>

        <!-- Manuelle Position Y -->
        <div class="control-group">
          <label>Position Y: {{ Math.round(newTextPosition.y * 100) }}%</label>
          <input
            type="range"
            v-model.number="newTextPosition.y"
            min="0"
            max="1"
            step="0.01"
            class="slider"
          />
          <input
            type="number"
            v-model.number="newTextPosition.yPixel"
            @input="updatePositionFromPixel('y')"
            class="number-input"
            :placeholder="'0 - ' + canvasHeight"
          />
          <span class="unit-label">px</span>
        </div>

        <!-- Schnellauswahl-Buttons -->
        <div class="control-group">
          <label>Schnellauswahl:</label>
          <div class="position-grid">
            <button @click="setQuickPosition('top-left')" class="btn-pos" title="Oben Links">
              ↖
            </button>
            <button @click="setQuickPosition('top-center')" class="btn-pos" title="Oben Mitte">
              ↑
            </button>
            <button @click="setQuickPosition('top-right')" class="btn-pos" title="Oben Rechts">
              ↗
            </button>
            <button @click="setQuickPosition('middle-left')" class="btn-pos" title="Mitte Links">
              ←
            </button>
            <button @click="setQuickPosition('center')" class="btn-pos active" title="Zentrum">
              ⊙
            </button>
            <button @click="setQuickPosition('middle-right')" class="btn-pos" title="Mitte Rechts">
              →
            </button>
            <button @click="setQuickPosition('bottom-left')" class="btn-pos" title="Unten Links">
              ↙
            </button>
            <button @click="setQuickPosition('bottom-center')" class="btn-pos" title="Unten Mitte">
              ↓
            </button>
            <button @click="setQuickPosition('bottom-right')" class="btn-pos" title="Unten Rechts">
              ↘
            </button>
          </div>
        </div>
      </div>
    </details>

    <div class="button-row">
      <button @click="createNewText" class="btn-primary" :disabled="!newTextContent.trim()">
        {{ t('textManager.addToCanvas') }}
      </button>
      <button
        v-if="newTextContent && !newTextContent.includes('\n') && newTextContent.length > 60"
        @click="autoWrapText"
        class="btn-secondary"
        :title="t('textManager.autoWrapTitle')"
      >
        {{ t('textManager.autoWrap') }}
      </button>
      <button @click="cancelNewText" class="btn-secondary">
        {{ t('textManager.cancel') }}
      </button>
    </div>
  </div>

  <!-- Normal: Button zum Hinzufügen -->
  <div v-else class="panel-section">
    <button @click="startAddingText" class="btn-primary full-width">
      {{ t('textManager.addNewText') }}
    </button>
    <button
      @click="startAddingTextWithSelection"
      class="btn-selection full-width"
      style="margin-top: 8px"
    >
      🖱️ {{ t('textManager.addWithArea') }}
    </button>
  </div>
</template>

<script setup>
import { ref, inject, nextTick, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useNewTextSettings } from '../../composables/useNewTextSettings.js'
import { useTextFonts } from '../../composables/useTextFonts.js'

const { t, locale } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const emit = defineEmits(['created', 'cancel'])

const isAddingNewText = ref(false)
const newTextContent = ref('')
const newTextInput = ref(null)
const newTextFontSelect = ref(null)

const {
  newTextStyle,
  newTextTypewriter,
  newTextFade,
  newTextScale,
  newTextSlide,
  newTextPosition,
  isSelectingOnCanvas,
  textSelectionBounds,
  canvasWidth,
  canvasHeight,
  loadSavedSettings,
  saveCurrentSettings,
  clearSavedSettings,
  resetNewTextSettings,
  calculateAutoFitFontSize,
  normalizeLineBreaks,
  updateCanvasDimensions,
  resetNewTextPosition,
  updatePositionFromPixel,
  setQuickPosition,
  updatePositionPreview,
  clearPositionPreview,
  startTextSelectionOnCanvas,
  cancelTextSelectionOnCanvas,
  clearTextSelection,
} = useNewTextSettings(canvasManager)

// newTextStyle as ref for font composable
const { populateNewTextFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  { value: null }, // fontSelectRef - not used here
  newTextFontSelect,
  { value: null }, // selectedText - not used here
  newTextStyle,
)

// Watch position changes for canvas preview
watch(
  () => newTextPosition.value.x,
  () => {
    if (isAddingNewText.value) {
      newTextPosition.value.xPixel = Math.round(newTextPosition.value.x * canvasWidth.value)
      updatePositionPreview()
    }
  },
)

watch(
  () => newTextPosition.value.y,
  () => {
    if (isAddingNewText.value) {
      newTextPosition.value.yPixel = Math.round(newTextPosition.value.y * canvasHeight.value)
      updatePositionPreview()
    }
  },
)

// Clear preview when leaving add mode
watch(isAddingNewText, (newValue) => {
  if (!newValue) {
    clearPositionPreview()
  }
})

// Position sync watch
watch(
  () => [newTextPosition.value.x, newTextPosition.value.y],
  ([newX, newY]) => {
    newTextPosition.value.xPixel = Math.round(newX * canvasWidth.value)
    newTextPosition.value.yPixel = Math.round(newY * canvasHeight.value)
  },
)

function handlePasteForNewText() {
  setTimeout(() => {
    if (newTextContent.value) {
      newTextContent.value = normalizeLineBreaks(newTextContent.value)
    }
  }, 50)
}

function startAddingText() {
  isAddingNewText.value = true
  newTextContent.value = ''

  loadSavedSettings()
  updateCanvasDimensions()
  resetNewTextPosition()

  nextTick(() => {
    updatePositionPreview()
  })

  nextTick(() => {
    if (newTextInput.value) {
      newTextInput.value.focus()
    }
    populateNewTextFontDropdown()
  })
}

function startAddingTextWithSelection() {
  startAddingText()

  nextTick(() => {
    startTextSelectionOnCanvas()
  })
}

function createNewText() {
  if (!canvasManager.value || !newTextContent.value.trim()) {
    return
  }

  const normalizedText = normalizeLineBreaks(newTextContent.value)

  let fontSize = newTextStyle.value.fontSize
  if (newTextStyle.value.autoFit) {
    fontSize = calculateAutoFitFontSize(
      normalizedText,
      newTextStyle.value.fontFamily,
      newTextStyle.value.fontWeight,
      newTextStyle.value.fontStyle,
      newTextStyle.value.autoFitPadding,
    )
    console.log(`📐 Auto-Fit: Schriftgröße angepasst auf ${fontSize}px`)
  }

  const posX = newTextPosition.value.x
  const posY = newTextPosition.value.y

  console.log(`📍 Text-Position: X=${Math.round(posX * 100)}%, Y=${Math.round(posY * 100)}%`)

  const newTextObj = canvasManager.value.addText(normalizedText, {
    relX: posX,
    relY: posY,
    fontSize: fontSize,
    fontFamily: newTextStyle.value.fontFamily,
    color: newTextStyle.value.color,
    fontWeight: newTextStyle.value.fontWeight,
    fontStyle: newTextStyle.value.fontStyle,
    textAlign: newTextStyle.value.textAlign,
    opacity: newTextStyle.value.opacity,
    letterSpacing: 0,
    lineHeightMultiplier: 120,
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  })

  if (newTextObj) {
    newTextObj.fontWeight = newTextStyle.value.fontWeight
    newTextObj.fontStyle = newTextStyle.value.fontStyle
    newTextObj.textAlign = newTextStyle.value.textAlign

    const hasTypewriter = newTextTypewriter.value.enabled
    const hasFade = newTextFade.value.enabled
    const hasScale = newTextScale.value.enabled
    const hasSlide = newTextSlide.value.enabled

    if (hasTypewriter || hasFade || hasScale || hasSlide) {
      const types = []
      if (hasTypewriter) types.push('typewriter')
      if (hasFade) types.push('fade')
      if (hasScale) types.push('scale')
      if (hasSlide) types.push('slide')
      const animationType = types.join('+') || 'none'

      newTextObj.animation = {
        type: animationType,
        typewriter: {
          enabled: hasTypewriter,
          speed: newTextTypewriter.value.speed,
          startDelay: newTextTypewriter.value.startDelay,
          loop: newTextTypewriter.value.loop,
          loopDelay: newTextTypewriter.value.loopDelay,
          showCursor: newTextTypewriter.value.showCursor,
          cursorChar: newTextTypewriter.value.cursorChar,
        },
        fade: {
          enabled: hasFade,
          duration: newTextFade.value.duration,
          startDelay: newTextFade.value.startDelay,
          direction: newTextFade.value.direction,
          loop: newTextFade.value.loop,
          loopDelay: newTextFade.value.loopDelay,
          easing: newTextFade.value.easing,
        },
        scale: {
          enabled: hasScale,
          duration: newTextScale.value.duration,
          startDelay: newTextScale.value.startDelay,
          startScale: newTextScale.value.startScale,
          endScale: newTextScale.value.endScale,
          direction: newTextScale.value.direction,
          loop: newTextScale.value.loop,
          loopDelay: newTextScale.value.loopDelay,
          easing: newTextScale.value.easing,
        },
        slide: {
          enabled: hasSlide,
          duration: newTextSlide.value.duration,
          startDelay: newTextSlide.value.startDelay,
          from: newTextSlide.value.from,
          distance: newTextSlide.value.distance,
          direction: newTextSlide.value.direction,
          loop: newTextSlide.value.loop,
          loopDelay: newTextSlide.value.loopDelay,
          easing: newTextSlide.value.easing,
        },
        _state: {
          startTime: null,
          isPlaying: false,
          currentIndex: 0,
        },
      }

      if (hasTypewriter) console.log('⌨️ Text mit Typewriter-Effekt erstellt')
      if (hasFade) console.log('🌫️ Text mit Fade-Effekt erstellt')
      if (hasScale) console.log('🔍 Text mit Scale-Effekt erstellt')
      if (hasSlide) console.log('➡️ Text mit Slide-Effekt erstellt')
    }

    console.log('✅ Text erstellt mit Stil:', newTextStyle.value)
    toastStore.success(t('toast.textAdded'))
    emit('created', newTextObj)
  }

  isAddingNewText.value = false
  newTextContent.value = ''
  resetNewTextSettings()

  clearTextSelection()
  clearPositionPreview()
  resetNewTextPosition()
}

function cancelNewText() {
  isAddingNewText.value = false
  newTextContent.value = ''
  resetNewTextSettings()

  cancelTextSelectionOnCanvas()
  clearPositionPreview()
  textSelectionBounds.value = null

  emit('cancel')
}

function autoWrapText() {
  if (!newTextContent.value) return

  const maxCharsPerLine = 50
  const text = newTextContent.value.trim()
  const words = text.split(/\s+/)

  let lines = []
  let currentLine = ''

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word
    }
  })

  if (currentLine) {
    lines.push(currentLine.trim())
  }

  newTextContent.value = lines.join('\n')
}
</script>

<style scoped>
/* ===== SECTIONS ===== */
.panel-section {
  margin-bottom: 8px;
}

/* ===== CONTROL GROUPS ===== */
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

h4 {
  margin: 8px 0 6px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ===== INPUTS ===== */
.text-input,
.select-input,
.color-text-input,
.text-area {
  width: 100%;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
}

.font-select {
  max-height: 400px;
}

.font-select option {
  padding: 6px;
}

.text-area {
  min-height: 50px;
  line-height: 1.5;
  font-family: 'Courier New', monospace;
}

.text-input:focus,
.select-input:focus,
.color-text-input:focus,
.text-area:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

/* ===== HINT TEXT ===== */
.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}

.success-hint {
  font-size: 0.5rem;
  color: #4ade80;
  margin-top: 3px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ===== SLIDERS ===== */
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

/* Disabled slider style */
.slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.slider:disabled::-webkit-slider-thumb {
  background: #666;
  cursor: not-allowed;
}

/* ===== COLOR PICKER ===== */
.color-picker-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.color-input {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  cursor: pointer;
  background-color: var(--secondary-bg, #0e1c32);
  transition: all 0.2s ease;
}

.color-input:hover {
  border-color: var(--accent-primary, #c9984d);
}

.color-text-input {
  flex: 1;
  font-family: 'Courier New', monospace;
}

/* ===== BUTTONS ===== */
.button-group {
  display: flex;
  gap: 4px;
}

.button-row {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.button-row button {
  flex: 1;
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

.btn-primary,
.btn-secondary {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-primary {
  background: rgba(201, 152, 77, 0.2);
  color: var(--accent-tertiary, #f8e1a9);
  border: 1px solid rgba(201, 152, 77, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: rgba(201, 152, 77, 0.3);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-muted, #7a8da0);
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-secondary {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.full-width {
  width: 100%;
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

/* ===== SETTINGS ACTIONS ===== */
.settings-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(110, 168, 254, 0.2);
}

.btn-save {
  flex: 1;
  padding: 8px 12px;
  font-size: 11px;
  background: linear-gradient(135deg, #2a4a2a 0%, #3a5a3a 100%);
  border: 1px solid #4a7a4a;
  border-radius: 6px;
  color: #aaffaa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save:hover {
  background: linear-gradient(135deg, #3a5a3a 0%, #4a6a4a 100%);
  border-color: #6a9a6a;
  color: #ccffcc;
}

.btn-reset-small {
  padding: 8px 12px;
  font-size: 11px;
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--btn-hover) 100%);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-small:hover {
  background: linear-gradient(135deg, var(--btn-hover) 0%, var(--btn-hover) 100%);
  border-color: #777;
  color: #fff;
}

/* ===== AUTO-FIT SETTINGS ===== */
.auto-fit-settings {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.auto-fit-settings label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

/* ✨ Position & Bereich Styles */
.btn-selection {
  background: linear-gradient(135deg, #3a5a8a 0%, #2a4a7a 100%);
  border: 2px dashed #6ea8fe;
  color: #6ea8fe;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.btn-selection:hover:not(:disabled) {
  background: linear-gradient(135deg, #4a6a9a 0%, #3a5a8a 100%);
  border-color: #8ec8ff;
  color: #8ec8ff;
}

.btn-selection.active {
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  border-color: #8fdf8f;
  border-style: solid;
  color: #8fdf8f;
  animation: pulse-border 1.5s ease-in-out infinite;
}

.btn-selection:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: #8fdf8f;
  }
  50% {
    border-color: #4a7a4a;
  }
}

.selection-info {
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 8px;
  padding: 10px;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selection-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selection-value {
  font-size: 14px;
  font-weight: 600;
  color: #6ea8fe;
}

.btn-clear {
  background: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
  font-size: 11px;
  padding: 4px 8px;
}

.btn-clear:hover {
  background: rgba(220, 53, 69, 0.2);
}

.number-input {
  width: 70px;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  margin-left: 8px;
}

.number-input:focus {
  border-color: #6ea8fe;
  outline: none;
}

.unit-label {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 4px;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}

.btn-pos {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pos:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg) 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}

.btn-pos.active {
  background: linear-gradient(135deg, #3a5a8a 0%, #2a4a7a 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .success-hint {
  color: #16a34a;
}

[data-theme='light'] .slider::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider:disabled::-webkit-slider-thumb {
  background: #bbb;
}

[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.08);
}

[data-theme='light'] .btn-primary:hover:not(:disabled) {
  background: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .settings-actions {
  border-top: 1px solid rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .btn-save {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.05) 100%);
  border: 1px solid rgba(76, 175, 80, 0.35);
  color: #2e7d32;
}

[data-theme='light'] .btn-save:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%);
  border-color: rgba(76, 175, 80, 0.5);
  color: #1b5e20;
}

[data-theme='light'] .btn-reset-small {
  background: linear-gradient(135deg, #f0ead0 0%, #e8e0c4 100%);
  border: 1px solid rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
}

[data-theme='light'] .btn-reset-small:hover {
  background: linear-gradient(135deg, #e8e0c4 0%, #ddd6b6 100%);
  border-color: rgba(1, 79, 153, 0.3);
  color: #003971;
}

[data-theme='light'] .auto-fit-settings {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .auto-fit-settings label {
  color: #4d6d8e;
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

[data-theme='light'] .btn-selection {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.08) 0%, rgba(1, 79, 153, 0.04) 100%);
  border: 2px dashed #014f99;
  color: #014f99;
}

[data-theme='light'] .btn-selection:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.12) 0%, rgba(1, 79, 153, 0.08) 100%);
  border-color: #003971;
  color: #003971;
}

[data-theme='light'] .btn-selection.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.06) 100%);
  border-color: #2e7d32;
  color: #2e7d32;
  animation: pulse-border-light 1.5s ease-in-out infinite;
}

@keyframes pulse-border-light {
  0%,
  100% {
    border-color: #2e7d32;
  }
  50% {
    border-color: rgba(76, 175, 80, 0.3);
  }
}

[data-theme='light'] .selection-info {
  background: rgba(1, 79, 153, 0.04);
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .selection-label {
  color: #4d6d8e;
}

[data-theme='light'] .selection-value {
  color: #014f99;
}

[data-theme='light'] .number-input {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.2);
  color: #003971;
}

[data-theme='light'] .number-input:focus {
  border-color: #014f99;
}

[data-theme='light'] .unit-label {
  color: #4d6d8e;
}

[data-theme='light'] .btn-pos {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  border: 1px solid rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
}

[data-theme='light'] .btn-pos:hover {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .btn-pos.active {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(1, 79, 153, 0.06) 100%);
  border-color: #014f99;
  color: #014f99;
}

/* Responsive */
@media (max-width: 768px) {
  .text-area {
    min-height: 44px;
    font-size: 0.8rem;
  }

  .color-input {
    width: 40px;
    height: 36px;
  }

  .btn-pos {
    min-height: 36px;
    min-width: 36px;
  }
}

@media (max-width: 480px) {
  .color-input {
    width: 44px;
    height: 40px;
  }

  .btn-pos {
    min-height: 40px;
    min-width: 40px;
  }

  .text-area {
    min-height: 50px;
    font-size: 0.85rem;
  }
}
</style>
