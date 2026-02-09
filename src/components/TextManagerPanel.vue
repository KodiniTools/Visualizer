<template>
  <div class="panel">
    <h3>{{ t('textManager.title') }}</h3>
    
    <!-- Neuer Text Eingabemodus -->
    <div v-if="isAddingNewText" class="panel-section">
      <h4>{{ t('textManager.createNewText') }}</h4>
      
      <div class="control-group">
        <label>{{ t('textManager.enterText') }}:</label>
        <textarea
          ref="newTextInput"
          v-model="newTextContent"
          @keydown.esc="cancelNewText"
          @paste="handlePaste"
          class="text-area"
          placeholder="Mehrzeiliger Text wird unterstützt!
Zeile 1
Zeile 2
Zeile 3..."
          rows="8"
        ></textarea>
        <div class="hint-text">
          <strong>{{ t('textManager.browserTextTip') }}:</strong> {{ locale === 'de' ? 'Nach dem Einfügen drücken Sie Enter, um Zeilenumbrüche hinzuzufügen' : 'After pasting, press Enter to add line breaks' }}
        </div>
        <div class="hint-text" style="margin-top: 4px;">
          <strong>{{ t('textManager.notepadTip') }}:</strong> {{ locale === 'de' ? 'Zeilenumbrüche werden automatisch erkannt' : 'Line breaks are automatically detected' }}
        </div>
        <div v-if="newTextContent.includes('\n')" class="success-hint">
          {{ locale === 'de' ? newTextContent.split('\n').length + ' Zeilen erkannt' : newTextContent.split('\n').length + ' lines detected' }}
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
              <input
                type="checkbox"
                v-model="newTextStyle.autoFit"
              />
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
              <input
                type="color"
                v-model="newTextStyle.color"
                class="color-input"
              />
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
                @click="newTextStyle.fontWeight = newTextStyle.fontWeight === 'bold' ? 'normal' : 'bold'"
                :class="['btn-small', { active: newTextStyle.fontWeight === 'bold' }]"
              >
                <strong>B</strong>
              </button>
              <button
                @click="newTextStyle.fontStyle = newTextStyle.fontStyle === 'italic' ? 'normal' : 'italic'"
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
            <button @click="saveCurrentSettings" class="btn-save" :title="locale === 'de' ? 'Aktuelle Einstellungen als Standard speichern' : 'Save current settings as default'">
              💾 {{ t('textManager.saveAsDefault') }}
            </button>
            <button @click="clearSavedSettings" class="btn-reset-small" :title="locale === 'de' ? 'Auf Werkseinstellungen zurücksetzen' : 'Reset to factory settings'">
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
          <span v-if="newTextTypewriter.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">
          <!-- Typewriter aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextTypewriter.enabled = !newTextTypewriter.enabled"
                :class="['btn-small', 'full-width', { active: newTextTypewriter.enabled }]"
              >
                {{ newTextTypewriter.enabled ? '✓ ' + t('textManager.activated') : t('textManager.deactivated') }}
              </button>
            </div>
          </div>

          <!-- Typewriter-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextTypewriter.enabled">
            <!-- Geschwindigkeit -->
            <div class="control-group">
              <label>{{ t('textManager.speed') }}: {{ newTextTypewriter.speed }}{{ t('textManager.msPerChar') }}</label>
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
                <input
                  type="checkbox"
                  v-model="newTextTypewriter.loop"
                />
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
                <input
                  type="checkbox"
                  v-model="newTextTypewriter.showCursor"
                />
                {{ t('textManager.showCursor') }}
              </label>
            </div>

            <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
            <div v-if="newTextTypewriter.showCursor" class="control-group">
              <label>{{ t('textManager.cursorChar') }}:</label>
              <select
                v-model="newTextTypewriter.cursorChar"
                class="select-input"
              >
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
          <span v-if="newTextFade.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">
          <!-- Fade aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextFade.enabled = !newTextFade.enabled"
                :class="['btn-small', 'full-width', { active: newTextFade.enabled }]"
              >
                {{ newTextFade.enabled ? '✓ ' + t('textManager.activated') : t('textManager.deactivated') }}
              </button>
            </div>
          </div>

          <!-- Fade-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextFade.enabled">
            <!-- Richtung -->
            <div class="control-group">
              <label>{{ t('textManager.direction') }}:</label>
              <select
                v-model="newTextFade.direction"
                class="select-input"
              >
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
              <div class="hint-text">{{ locale === 'de' ? 'Wie lange das Ein-/Ausblenden dauert' : 'How long the fade in/out takes' }}</div>
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
              <select
                v-model="newTextFade.easing"
                class="select-input"
              >
                <option value="linear">{{ t('textManager.linear') }}</option>
                <option value="ease">{{ t('textManager.ease') }}</option>
                <option value="easeIn">{{ t('textManager.easeIn') }}</option>
                <option value="easeOut">{{ t('textManager.easeOut') }}</option>
              </select>
            </div>

            <!-- Loop -->
            <div class="control-group">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="newTextFade.loop"
                />
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
          <span v-if="newTextScale.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">
          <!-- Scale aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextScale.enabled = !newTextScale.enabled"
                :class="['btn-small', 'full-width', { active: newTextScale.enabled }]"
              >
                {{ newTextScale.enabled ? '✓ ' + t('textManager.activated') : t('textManager.deactivated') }}
              </button>
            </div>
          </div>

          <!-- Scale-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextScale.enabled">
            <!-- Richtung -->
            <div class="control-group">
              <label>{{ t('textManager.direction') }}:</label>
              <select
                v-model="newTextScale.direction"
                class="select-input"
              >
                <option value="in">{{ t('textManager.zoomIn') }}</option>
                <option value="out">{{ t('textManager.zoomOut') }}</option>
                <option value="inOut">{{ t('textManager.zoomInOut') }}</option>
              </select>
            </div>

            <!-- Start-Skalierung -->
            <div class="control-group">
              <label>{{ t('textManager.startSize') }}: {{ Math.round(newTextScale.startScale * 100) }}%</label>
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
              <label>{{ t('textManager.endSize') }}: {{ Math.round(newTextScale.endScale * 100) }}%</label>
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
              <select
                v-model="newTextScale.easing"
                class="select-input"
              >
                <option value="linear">{{ t('textManager.linear') }}</option>
                <option value="ease">{{ t('textManager.ease') }}</option>
                <option value="easeIn">{{ t('textManager.easeIn') }}</option>
                <option value="easeOut">{{ t('textManager.easeOut') }}</option>
              </select>
            </div>

            <!-- Loop -->
            <div class="control-group">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="newTextScale.loop"
                />
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
          <span v-if="newTextSlide.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">
          <!-- Slide aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextSlide.enabled = !newTextSlide.enabled"
                :class="['btn-small', 'full-width', { active: newTextSlide.enabled }]"
              >
                {{ newTextSlide.enabled ? '✓ ' + t('textManager.activated') : t('textManager.deactivated') }}
              </button>
            </div>
          </div>

          <!-- Slide-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextSlide.enabled">
            <!-- Richtung (von wo) -->
            <div class="control-group">
              <label>Einfahren von:</label>
              <select
                v-model="newTextSlide.from"
                class="select-input"
              >
                <option value="left">Links</option>
                <option value="right">Rechts</option>
                <option value="top">Oben</option>
                <option value="bottom">Unten</option>
              </select>
            </div>

            <!-- Animation-Richtung -->
            <div class="control-group">
              <label>Animation:</label>
              <select
                v-model="newTextSlide.direction"
                class="select-input"
              >
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
              <select
                v-model="newTextSlide.easing"
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
                  v-model="newTextSlide.loop"
                />
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
          <span>Position & Bereich</span>
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
              <span class="selection-value">{{ Math.round(textSelectionBounds.width) }} × {{ Math.round(textSelectionBounds.height) }} px</span>
            </div>
            <button @click="clearTextSelection" class="btn-small btn-clear">
              Auswahl löschen
            </button>
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
              <button @click="setQuickPosition('top-left')" class="btn-pos" title="Oben Links">↖</button>
              <button @click="setQuickPosition('top-center')" class="btn-pos" title="Oben Mitte">↑</button>
              <button @click="setQuickPosition('top-right')" class="btn-pos" title="Oben Rechts">↗</button>
              <button @click="setQuickPosition('middle-left')" class="btn-pos" title="Mitte Links">←</button>
              <button @click="setQuickPosition('center')" class="btn-pos active" title="Zentrum">⊙</button>
              <button @click="setQuickPosition('middle-right')" class="btn-pos" title="Mitte Rechts">→</button>
              <button @click="setQuickPosition('bottom-left')" class="btn-pos" title="Unten Links">↙</button>
              <button @click="setQuickPosition('bottom-center')" class="btn-pos" title="Unten Mitte">↓</button>
              <button @click="setQuickPosition('bottom-right')" class="btn-pos" title="Unten Rechts">↘</button>
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
      <button @click="startAddingTextWithSelection" class="btn-selection full-width" style="margin-top: 8px;">
        🖱️ {{ t('textManager.addWithArea') }}
      </button>
    </div>

    <!-- Text-Einstellungen (nur wenn Text ausgewählt) -->
    <div v-if="selectedText" class="panel-section">

      <!-- ✨ Text bearbeiten (klappbar) -->
      <details class="collapsible-section" open>
        <summary class="section-header">
          <span class="section-icon">✏️</span>
          <span>{{ t('textManager.editText') }}</span>
        </summary>
        <div class="section-content">
          <!-- Text-Inhalt -->
          <div class="control-group">
            <label>Text:</label>
            <textarea
              ref="editTextInput"
              v-model="selectedText.content"
              @input="updateText"
              @paste="handlePaste"
              class="text-area"
              placeholder="Mehrzeiliger Text wird unterstützt..."
              rows="5"
            ></textarea>
            <div class="hint-text">
              Enter für Zeilenumbrüche oder mehrzeiligen Text einfügen
            </div>
            <div v-if="selectedText.content.includes('\n')" class="success-hint">
              {{ selectedText.content.split('\n').length }} Zeilen
            </div>
          </div>

          <!-- Schriftart -->
          <div class="control-group">
            <label>{{ t('textManager.font') }}:</label>
            <select
              ref="fontSelect"
              v-model="selectedText.fontFamily"
              @change="updateText"
              class="select-input font-select"
            >
              <!-- Wird dynamisch befüllt -->
            </select>
          </div>

          <!-- Schriftgröße -->
          <div class="control-group">
            <label>Größe: {{ selectedText.fontSize }}px</label>
            <input
              type="range"
              v-model.number="selectedText.fontSize"
              @input="updateText"
              min="12"
              max="200"
              class="slider"
            />
          </div>

          <!-- ✨ TRANSPARENZ/DECKKRAFT -->
          <div class="control-group">
            <label>Deckkraft: {{ selectedText.opacity }}%</label>
            <input
              type="range"
              v-model.number="selectedText.opacity"
              @input="updateText"
              min="0"
              max="100"
              class="slider"
            />
          </div>

          <!-- Textfarbe -->
          <div class="control-group">
            <label>{{ t('textManager.textColor') }}:</label>
            <div class="color-picker-group">
              <input
                type="color"
                v-model="selectedText.color"
                @input="updateText"
                class="color-input"
              />
              <input
                type="text"
                v-model="selectedText.color"
                @input="updateText"
                class="color-text-input"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <!-- Schriftstil -->
          <div class="control-group">
            <label>{{ t('textManager.style') }}:</label>
            <div class="button-group">
              <button
                @click="toggleFontWeight"
                :class="['btn-small', { active: selectedText.fontWeight === 'bold' }]"
              >
                <strong>B</strong>
              </button>
              <button
                @click="toggleFontStyle"
                :class="['btn-small', { active: selectedText.fontStyle === 'italic' }]"
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
                @click="setTextAlign('left')"
                :class="['btn-small', { active: selectedText.textAlign === 'left' }]"
              >
                {{ t('textManager.left') }}
              </button>
              <button
                @click="setTextAlign('center')"
                :class="['btn-small', { active: selectedText.textAlign === 'center' }]"
              >
                {{ t('textManager.center') }}
              </button>
              <button
                @click="setTextAlign('right')"
                :class="['btn-small', { active: selectedText.textAlign === 'right' }]"
              >
                {{ t('textManager.right') }}
              </button>
            </div>
          </div>
        </div>
      </details>

      <!-- ✨ NEU: Position (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">📍</span>
          <span>Position</span>
        </summary>
        <div class="section-content">
          <!-- Position X -->
          <div class="control-group">
            <label>Position X: {{ Math.round(selectedText.relX * 100) }}%</label>
            <input
              type="range"
              v-model.number="selectedText.relX"
              @input="updateText"
              min="0"
              max="1"
              step="0.01"
              class="slider"
            />
            <input
              type="number"
              :value="Math.round(selectedText.relX * canvasWidth)"
              @input="updateSelectedTextPixelPosition('x', $event)"
              class="number-input"
              :placeholder="'0 - ' + canvasWidth"
            />
            <span class="unit-label">px</span>
          </div>

          <!-- Position Y -->
          <div class="control-group">
            <label>Position Y: {{ Math.round(selectedText.relY * 100) }}%</label>
            <input
              type="range"
              v-model.number="selectedText.relY"
              @input="updateText"
              min="0"
              max="1"
              step="0.01"
              class="slider"
            />
            <input
              type="number"
              :value="Math.round(selectedText.relY * canvasHeight)"
              @input="updateSelectedTextPixelPosition('y', $event)"
              class="number-input"
              :placeholder="'0 - ' + canvasHeight"
            />
            <span class="unit-label">px</span>
          </div>

          <!-- Schnellauswahl-Buttons -->
          <div class="control-group">
            <label>Schnellauswahl:</label>
            <div class="position-grid">
              <button @click="setSelectedTextQuickPosition('top-left')" class="btn-pos" title="Oben Links">↖</button>
              <button @click="setSelectedTextQuickPosition('top-center')" class="btn-pos" title="Oben Mitte">↑</button>
              <button @click="setSelectedTextQuickPosition('top-right')" class="btn-pos" title="Oben Rechts">↗</button>
              <button @click="setSelectedTextQuickPosition('middle-left')" class="btn-pos" title="Mitte Links">←</button>
              <button @click="setSelectedTextQuickPosition('center')" class="btn-pos" title="Zentrum">⊙</button>
              <button @click="setSelectedTextQuickPosition('middle-right')" class="btn-pos" title="Mitte Rechts">→</button>
              <button @click="setSelectedTextQuickPosition('bottom-left')" class="btn-pos" title="Unten Links">↙</button>
              <button @click="setSelectedTextQuickPosition('bottom-center')" class="btn-pos" title="Unten Mitte">↓</button>
              <button @click="setSelectedTextQuickPosition('bottom-right')" class="btn-pos" title="Unten Rechts">↘</button>
            </div>
          </div>
        </div>
      </details>

      <!-- ✨ Abstände & Kontur (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">↔️</span>
          <span>Abstände & Kontur</span>
          <span v-if="selectedText.stroke.enabled" class="status-badge active">{{ t('textManager.outline') }}</span>
        </summary>
        <div class="section-content">
          <!-- Buchstabenabstand -->
          <div class="control-group">
            <label>Buchstabenabstand: {{ selectedText.letterSpacing }}px</label>
            <input
              type="range"
              v-model.number="selectedText.letterSpacing"
              @input="updateText"
              min="-20"
              max="50"
              class="slider"
            />
          </div>

          <!-- Zeilenabstand -->
          <div class="control-group">
            <label>Zeilenabstand: {{ selectedText.lineHeightMultiplier }}%</label>
            <input
              type="range"
              v-model.number="selectedText.lineHeightMultiplier"
              @input="updateText"
              min="100"
              max="300"
              class="slider"
            />
          </div>

          <!-- Text-Kontur -->
          <div class="control-group">
            <label>Text-Kontur:</label>
            <div class="button-group">
              <button
                @click="toggleStroke"
                :class="['btn-small', { active: selectedText.stroke.enabled }]"
              >
                {{ selectedText.stroke.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
              </button>
            </div>
          </div>

          <!-- Kontur-Einstellungen (nur wenn aktiviert) -->
          <div v-if="selectedText.stroke.enabled">
            <!-- Konturfarbe -->
            <div class="control-group">
              <label>{{ t('textManager.outlineColor') }}:</label>
              <div class="color-picker-group">
                <input
                  type="color"
                  v-model="selectedText.stroke.color"
                  @input="updateText"
                  class="color-input"
                />
                <input
                  type="text"
                  v-model="selectedText.stroke.color"
                  @input="updateText"
                  class="color-text-input"
                  placeholder="#000000"
                />
              </div>
            </div>

            <!-- Konturdicke -->
            <div class="control-group">
              <label>{{ t('textManager.outlineWidth') }}: {{ selectedText.stroke.width }}px</label>
              <input
                type="range"
                v-model.number="selectedText.stroke.width"
                @input="updateText"
                min="1"
                max="100"
                class="slider"
              />
            </div>
          </div>
        </div>
      </details>

      <!-- ✨ Schatten (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">🌑</span>
          <span>{{ t('textManager.shadow') }}</span>
          <span v-if="selectedText.shadow.blur > 0 || selectedText.shadow.offsetX !== 0 || selectedText.shadow.offsetY !== 0" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">
          <!-- Schattenfarbe -->
          <div class="control-group">
            <label>{{ t('textManager.shadowColor') }}:</label>
            <div class="color-picker-group">
              <input
                type="color"
                v-model="selectedText.shadow.color"
                @input="updateText"
                class="color-input"
              />
              <input
                type="text"
                v-model="selectedText.shadow.color"
                @input="updateText"
                class="color-text-input"
                placeholder="#000000"
              />
            </div>
          </div>

          <!-- Schatten-Unschärfe -->
          <div class="control-group">
            <label>{{ t('textManager.shadowBlur') }}: {{ selectedText.shadow.blur }}px</label>
            <input
              type="range"
              v-model.number="selectedText.shadow.blur"
              @input="updateText"
              min="0"
              max="50"
              class="slider"
            />
          </div>

          <!-- Schatten X-Offset -->
          <div class="control-group">
            <label>{{ t('textManager.shadowX') }}-Offset: {{ selectedText.shadow.offsetX }}px</label>
            <input
              type="range"
              v-model.number="selectedText.shadow.offsetX"
              @input="updateText"
              min="-50"
              max="50"
              class="slider"
            />
          </div>

          <!-- Schatten Y-Offset -->
          <div class="control-group">
            <label>{{ t('textManager.shadowY') }}-Offset: {{ selectedText.shadow.offsetY }}px</label>
            <input
              type="range"
              v-model.number="selectedText.shadow.offsetY"
              @input="updateText"
              min="-50"
              max="50"
              class="slider"
            />
          </div>
        </div>
      </details>

      <!-- ✨ Rotation (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">🔄</span>
          <span>Rotation</span>
          <span v-if="selectedText.rotation !== 0" class="status-badge">{{ selectedText.rotation }}°</span>
        </summary>
        <div class="section-content">
          <div class="control-group">
            <label>Rotation: {{ selectedText.rotation }}°</label>
            <input
              type="range"
              v-model.number="selectedText.rotation"
              @input="updateText"
              min="-180"
              max="180"
              class="slider"
            />
          </div>
        </div>
      </details>

      <!-- ✨ AUDIO-REACTIVE EFFECTS (collapsible) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">🎵</span>
          <span>{{ t('canvas.audioReactive') }}</span>
          <span v-if="selectedText.audioReactive?.enabled" class="status-badge active">{{ t('textManager.active') }}</span>
        </summary>
        <div class="section-content">

      <!-- Enable/Disable -->
      <div class="control-group">
        <label>{{ t('textManager.audioReactiveEffects') }}:</label>
        <div class="button-group">
          <button
            @click="toggleAudioReactive"
            :class="['btn-small', { active: selectedText.audioReactive?.enabled }]"
          >
            {{ selectedText.audioReactive?.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
          </button>
        </div>
      </div>

      <!-- Audio settings (only when enabled) -->
      <div v-if="selectedText.audioReactive?.enabled">
        <!-- Audio Source -->
        <div class="control-group">
          <label>{{ t('textManager.audioSource') }}:</label>
          <select
            v-model="selectedText.audioReactive.source"
            @change="updateText"
            class="select-input"
          >
            <option value="bass">{{ t('textManager.bassKickDrums') }}</option>
            <option value="mid">{{ t('textManager.midVocalsMelody') }}</option>
            <option value="treble">{{ t('textManager.trebleHiHatsHighs') }}</option>
            <option value="volume">{{ t('textManager.volumeOverall') }}</option>
            <option value="dynamic">✨ {{ t('textManager.dynamicAutoBlend') }}</option>
          </select>
          <div v-if="selectedText.audioReactive.source === 'dynamic'" class="hint-text" style="color: var(--accent-primary, #c9984d);">
            {{ t('textManager.dynamicHint') }}
          </div>
        </div>

        <!-- Smoothing -->
        <div class="control-group">
          <label>{{ t('textManager.smoothing') }}: {{ selectedText.audioReactive.smoothing }}%</label>
          <input
            type="range"
            v-model.number="selectedText.audioReactive.smoothing"
            @input="updateText"
            min="0"
            max="100"
            class="slider"
          />
          <div class="hint-text">
            {{ t('textManager.smoothingHint') }}
          </div>
        </div>

        <!-- ✨ Advanced Audio Settings -->
        <details class="advanced-settings">
          <summary>⚙️ {{ t('textManager.advancedSettings') }}</summary>

          <!-- Presets -->
          <div class="control-group">
            <label>Presets:</label>
            <div class="preset-buttons">
              <button @click="applyAudioPreset('punchy')" class="btn-preset" :title="t('textManager.presetPunchyTitle')">
                ⚡ {{ t('textManager.presetPunchy') }}
              </button>
              <button @click="applyAudioPreset('smooth')" class="btn-preset" :title="t('textManager.presetSmoothTitle')">
                🌊 {{ t('textManager.presetSmooth') }}
              </button>
              <button @click="applyAudioPreset('subtle')" class="btn-preset" :title="t('textManager.presetSubtleTitle')">
                🎭 {{ t('textManager.presetSubtle') }}
              </button>
              <button @click="applyAudioPreset('extreme')" class="btn-preset" :title="t('textManager.presetExtremeTitle')">
                🔥 {{ t('textManager.presetExtreme') }}
              </button>
            </div>
          </div>

          <!-- Threshold -->
          <div class="control-group">
            <label>{{ t('textManager.threshold') }}: {{ selectedText.audioReactive.threshold || 0 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.threshold"
              @input="updateText"
              min="0"
              max="50"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.thresholdHint') }}</div>
          </div>

          <!-- Attack -->
          <div class="control-group">
            <label>{{ t('textManager.attack') }}: {{ selectedText.audioReactive.attack || 90 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.attack"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.attackHint') }}</div>
          </div>

          <!-- Release -->
          <div class="control-group">
            <label>{{ t('textManager.release') }}: {{ selectedText.audioReactive.release || 50 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.release"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">{{ t('textManager.releaseHint') }}</div>
          </div>

          <!-- Reset Button -->
          <button @click="resetAudioSettings" class="btn-reset">
            🔄 {{ t('textManager.reset') }}
          </button>
        </details>

        <div class="divider"></div>

        <h4>{{ t('textManager.selectEffects') }}</h4>

        <!-- Effects List -->
        <div class="effects-grid">
          <!-- Hue (Color Rotation) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.hue.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🎨</span> {{ t('textManager.colorRotation') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.hue.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.hue.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.hue.intensity }}%</span>
            </div>
          </div>

          <!-- Brightness -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.brightness.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">☀️</span> {{ t('textManager.brightness') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.brightness.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.brightness.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.brightness.intensity }}%</span>
            </div>
          </div>

          <!-- Scale (Pulsate) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.scale.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">📐</span> {{ t('textManager.pulsate') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.scale.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.scale.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.scale.intensity }}%</span>
            </div>
          </div>

          <!-- Glow -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.glow.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">✨</span> {{ t('textManager.glow') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.glow.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.glow.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.glow.intensity }}%</span>
            </div>
          </div>

          <!-- Shake -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.shake.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🫨</span> {{ t('textManager.shake') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.shake.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.shake.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.shake.intensity }}%</span>
            </div>
          </div>

          <!-- Bounce -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.bounce.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">⬆️</span> {{ t('textManager.bounce') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.bounce.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.bounce.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.bounce.intensity }}%</span>
            </div>
          </div>

          <!-- Swing -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.swing.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">➡️</span> {{ t('textManager.swing') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.swing.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.swing.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.swing.intensity }}%</span>
            </div>
          </div>

          <!-- Opacity (Blink) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.opacity.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">👁️</span> {{ t('textManager.blink') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.opacity.enabled" class="effect-details">
              <div class="effect-intensity">
                <span class="effect-label">{{ t('textManager.intensity') }}:</span>
                <input
                  type="range"
                  v-model.number="selectedText.audioReactive.effects.opacity.intensity"
                  @input="updateText"
                  min="10"
                  max="100"
                  class="slider-small"
                />
                <span class="intensity-value">{{ selectedText.audioReactive.effects.opacity.intensity }}%</span>
              </div>
              <div class="effect-intensity">
                <span class="effect-label">{{ t('textManager.minimum') }}:</span>
                <input
                  type="range"
                  v-model.number="selectedText.audioReactive.effects.opacity.minimum"
                  @input="updateText"
                  min="0"
                  max="90"
                  class="slider-small"
                />
                <span class="intensity-value">{{ selectedText.audioReactive.effects.opacity.minimum || 0 }}%</span>
              </div>
              <label class="effect-checkbox-small">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.opacity.ease"
                  @change="updateText"
                />
                {{ t('textManager.easeCurve') }}
              </label>
            </div>
          </div>

          <!-- Letter Spacing -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.letterSpacing.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">↔️</span> {{ t('textManager.spacing') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.letterSpacing.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.letterSpacing.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.letterSpacing.intensity }}%</span>
            </div>
          </div>

          <!-- Stroke Width (Outline) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.strokeWidth.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🖼️</span> {{ t('textManager.outline') }}
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.strokeWidth.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.strokeWidth.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.strokeWidth.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: Skew (Verzerrung) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.skew.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">📐</span> {{ t('textManager.skew') }}
              </label>
              <span class="effect-hint" :title="t('textManager.skewHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.skew.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.skew.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.skew.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: Strobe (Blitz-Effekt) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.strobe.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">⚡</span> {{ t('textManager.strobe') }}
              </label>
              <span class="effect-hint" :title="t('textManager.strobeHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.strobe.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.strobe.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.strobe.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: RGB-Glitch (Chromatische Aberration) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.rgbGlitch.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🌈</span> {{ t('textManager.rgbGlitch') }}
              </label>
              <span class="effect-hint" :title="t('textManager.rgbGlitchHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.rgbGlitch.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.rgbGlitch.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.rgbGlitch.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: 3D-Perspektive -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.perspective3d.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🎲</span> {{ t('textManager.perspective3d') }}
              </label>
              <span class="effect-hint" :title="t('textManager.perspective3dHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.perspective3d.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.perspective3d.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.perspective3d.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: Welle (Wave) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.wave.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🌊</span> {{ t('textManager.wave') }}
              </label>
              <span class="effect-hint" :title="t('textManager.waveHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.wave.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.wave.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.wave.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: Rotation -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.rotation.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🔄</span> {{ t('textManager.rotation') }}
              </label>
              <span class="effect-hint" :title="t('textManager.rotationHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.rotation.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.rotation.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.rotation.intensity }}%</span>
            </div>
          </div>

          <!-- ✨ NEU: Elastic -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.elastic.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🎈</span> {{ t('textManager.elastic') }}
              </label>
              <span class="effect-hint" :title="t('textManager.elasticHint')">ℹ️</span>
            </div>
            <div v-if="selectedText.audioReactive.effects.elastic.enabled" class="effect-intensity">
              <input
                type="range"
                v-model.number="selectedText.audioReactive.effects.elastic.intensity"
                @input="updateText"
                min="10"
                max="100"
                class="slider-small"
              />
              <span class="intensity-value">{{ selectedText.audioReactive.effects.elastic.intensity }}%</span>
            </div>
          </div>
        </div>

        <!-- Reset All Effects Button -->
        <button @click="resetAllAudioEffects" class="btn-reset-all-effects">
          <span class="reset-icon">🔄</span>
          {{ t('textManager.resetAllEffects') || 'Alle Effekte zurücksetzen' }}
        </button>

        <!-- Save/Load Audio Effects Preset -->
        <div class="audio-preset-actions">
          <button @click="saveAudioEffectsPreset" class="btn-save-preset">
            <span class="preset-icon">💾</span>
            {{ t('textManager.saveEffectsPreset') || 'Effekte speichern' }}
          </button>
          <button
            @click="loadAudioEffectsPreset"
            class="btn-load-preset"
            :disabled="!hasAudioEffectsPreset"
            :title="hasAudioEffectsPreset ? '' : (t('textManager.noPresetSaved') || 'Kein Preset gespeichert')"
          >
            <span class="preset-icon">📂</span>
            {{ t('textManager.loadEffectsPreset') || 'Effekte laden' }}
          </button>
        </div>

        <div class="hint-text" style="margin-top: 10px;">
          {{ t('textManager.effectsTip') }}
        </div>
      </div>
      </div>
      </details>

      <!-- ✨ TEXT-ANIMATION (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">⌨️</span>
          <span>Text-Animation</span>
          <span v-if="selectedText.animation?.typewriter?.enabled" class="status-badge active">Typewriter</span>
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
                {{ selectedText.animation?.typewriter?.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
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
              <label>Pause zwischen Wiederholungen: {{ selectedText.animation.typewriter.loopDelay }}ms</label>
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
          <hr class="section-divider" style="margin: 12px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);" />

          <!-- Fade aktivieren -->
          <div class="control-group">
            <label>Einblend-Effekt (Fade):</label>
            <div class="button-group">
              <button
                @click="toggleFade"
                :class="['btn-small', { active: selectedText.animation?.fade?.enabled }]"
              >
                {{ selectedText.animation?.fade?.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
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
              <label>Pause zwischen Wiederholungen: {{ selectedText.animation.fade.loopDelay }}ms</label>
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
          <hr class="section-divider" style="margin: 12px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);" />

          <!-- Scale aktivieren -->
          <div class="control-group">
            <label>Skalierungs-Effekt (Scale):</label>
            <div class="button-group">
              <button
                @click="toggleScale"
                :class="['btn-small', { active: selectedText.animation?.scale?.enabled }]"
              >
                {{ selectedText.animation?.scale?.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
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
              <label>Start-Größe: {{ Math.round(selectedText.animation.scale.startScale * 100) }}%</label>
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
              <label>Pause zwischen Wiederholungen: {{ selectedText.animation.scale.loopDelay }}ms</label>
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
          <hr class="section-divider" style="margin: 12px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);" />

          <!-- Slide aktivieren -->
          <div class="control-group">
            <label>Slide-Effekt (Hereingleiten):</label>
            <div class="button-group">
              <button
                @click="toggleSlide"
                :class="['btn-small', { active: selectedText.animation?.slide?.enabled }]"
              >
                {{ selectedText.animation?.slide?.enabled ? t('textManager.activated') : t('textManager.deactivated') }}
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
              <label>Pause zwischen Wiederholungen: {{ selectedText.animation.slide.loopDelay }}ms</label>
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

      <!-- Löschen Button -->
      <button @click="deleteSelectedText" class="btn-danger full-width" style="margin-top: 16px;">
        {{ t('textManager.deleteText') }}
      </button>
    </div>

    <!-- Info wenn kein Text ausgewählt und nicht im Eingabemodus -->
    <div v-else-if="!isAddingNewText" class="panel-section">
      <p class="info-text">
        {{ t('textManager.clickToEdit') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useToastStore } from '../stores/toastStore.js';

const { t, locale } = useI18n();
const toastStore = useToastStore();
const canvasManager = inject('canvasManager');
const fontManager = inject('fontManager');
const selectedText = ref(null);
const isAddingNewText = ref(false);
const newTextContent = ref('');
const newTextInput = ref(null);
const editTextInput = ref(null); // ✨ NEU: Referenz für das Editor-Textarea
const fontSelect = ref(null);
const newTextFontSelect = ref(null); // ✨ NEU: Referenz für Font-Dropdown im Eingabemodus

// ✨ Typewriter-Einstellungen für neuen Text (im Eingabemodus)
const newTextTypewriter = ref({
  enabled: false,
  speed: 50,
  startDelay: 0,
  loop: false,
  loopDelay: 1000,
  showCursor: true,
  cursorChar: '|'
});

// ✨ Fade-Einstellungen für neuen Text (im Eingabemodus)
const newTextFade = ref({
  enabled: false,
  duration: 1000,
  startDelay: 0,
  direction: 'in',
  loop: false,
  loopDelay: 1000,
  easing: 'ease'
});

// ✨ Scale-Einstellungen für neuen Text (im Eingabemodus)
const newTextScale = ref({
  enabled: false,
  duration: 1000,
  startDelay: 0,
  startScale: 0,
  endScale: 1,
  direction: 'in',
  loop: false,
  loopDelay: 1000,
  easing: 'ease'
});

// ✨ Slide-Einstellungen für neuen Text (im Eingabemodus)
const newTextSlide = ref({
  enabled: false,
  duration: 1000,
  startDelay: 0,
  from: 'left',
  distance: 100,
  direction: 'in',
  loop: false,
  loopDelay: 1000,
  easing: 'ease'
});

// ✨ Text-Stil-Einstellungen für neuen Text (im Eingabemodus)
const newTextStyle = ref({
  fontSize: 48,
  fontFamily: 'Arial',
  color: '#ff0000',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  opacity: 100,
  autoFit: false,        // ✨ NEU: Automatische Größenanpassung
  autoFitPadding: 10     // ✨ NEU: Abstand zum Rand in %
});

// ✨ NEU: Position für neuen Text
const newTextPosition = ref({
  x: 0.5,      // Relativ (0-1), Standard: Mitte
  y: 0.5,      // Relativ (0-1), Standard: Mitte
  xPixel: 0,   // Pixel-Wert für Anzeige
  yPixel: 0    // Pixel-Wert für Anzeige
});

// ✨ NEU: Canvas-Rechteck-Auswahl-Modus
const isSelectingOnCanvas = ref(false);
const textSelectionBounds = ref(null); // { x, y, width, height, relX, relY, ... }

// ✨ NEU: Canvas-Dimensionen für Pixel-Berechnungen
const canvasWidth = ref(1920);
const canvasHeight = ref(1080);

// ✨ LocalStorage Key für gespeicherte Einstellungen
const SAVED_SETTINGS_KEY = 'visualizer_text_settings';

// ✨ Lädt gespeicherte Einstellungen aus localStorage
function loadSavedSettings() {
  try {
    const saved = localStorage.getItem(SAVED_SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);

      // Stil-Einstellungen laden
      if (settings.style) {
        newTextStyle.value = { ...newTextStyle.value, ...settings.style };
      }

      // Typewriter-Einstellungen laden
      if (settings.typewriter) {
        newTextTypewriter.value = { ...newTextTypewriter.value, ...settings.typewriter };
      }

      // Fade-Einstellungen laden
      if (settings.fade) {
        newTextFade.value = { ...newTextFade.value, ...settings.fade };
      }

      // Scale-Einstellungen laden
      if (settings.scale) {
        newTextScale.value = { ...newTextScale.value, ...settings.scale };
      }

      // Slide-Einstellungen laden
      if (settings.slide) {
        newTextSlide.value = { ...newTextSlide.value, ...settings.slide };
      }

      console.log('✅ Gespeicherte Text-Einstellungen geladen');
      return true;
    }
  } catch (e) {
    console.warn('⚠️ Fehler beim Laden der Einstellungen:', e);
  }
  return false;
}

// ✨ Speichert aktuelle Einstellungen in localStorage
function saveCurrentSettings() {
  try {
    const settings = {
      style: {
        fontSize: newTextStyle.value.fontSize,
        fontFamily: newTextStyle.value.fontFamily,
        color: newTextStyle.value.color,
        fontWeight: newTextStyle.value.fontWeight,
        fontStyle: newTextStyle.value.fontStyle,
        textAlign: newTextStyle.value.textAlign,
        opacity: newTextStyle.value.opacity,
        autoFit: newTextStyle.value.autoFit,
        autoFitPadding: newTextStyle.value.autoFitPadding
      },
      typewriter: {
        enabled: newTextTypewriter.value.enabled,
        speed: newTextTypewriter.value.speed,
        startDelay: newTextTypewriter.value.startDelay,
        loop: newTextTypewriter.value.loop,
        loopDelay: newTextTypewriter.value.loopDelay,
        showCursor: newTextTypewriter.value.showCursor,
        cursorChar: newTextTypewriter.value.cursorChar
      },
      fade: {
        enabled: newTextFade.value.enabled,
        duration: newTextFade.value.duration,
        startDelay: newTextFade.value.startDelay,
        direction: newTextFade.value.direction,
        loop: newTextFade.value.loop,
        loopDelay: newTextFade.value.loopDelay,
        easing: newTextFade.value.easing
      },
      scale: {
        enabled: newTextScale.value.enabled,
        duration: newTextScale.value.duration,
        startDelay: newTextScale.value.startDelay,
        startScale: newTextScale.value.startScale,
        endScale: newTextScale.value.endScale,
        direction: newTextScale.value.direction,
        loop: newTextScale.value.loop,
        loopDelay: newTextScale.value.loopDelay,
        easing: newTextScale.value.easing
      },
      slide: {
        enabled: newTextSlide.value.enabled,
        duration: newTextSlide.value.duration,
        startDelay: newTextSlide.value.startDelay,
        from: newTextSlide.value.from,
        distance: newTextSlide.value.distance,
        direction: newTextSlide.value.direction,
        loop: newTextSlide.value.loop,
        loopDelay: newTextSlide.value.loopDelay,
        easing: newTextSlide.value.easing
      }
    };

    localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(settings));
    console.log('💾 Text-Einstellungen gespeichert');
    return true;
  } catch (e) {
    console.warn('⚠️ Fehler beim Speichern der Einstellungen:', e);
    return false;
  }
}

// ✨ Löscht gespeicherte Einstellungen und setzt auf Standard zurück
function clearSavedSettings() {
  try {
    localStorage.removeItem(SAVED_SETTINGS_KEY);
    resetNewTextSettings();
    console.log('🗑️ Gespeicherte Einstellungen gelöscht');
    return true;
  } catch (e) {
    console.warn('⚠️ Fehler beim Löschen der Einstellungen:', e);
    return false;
  }
}

// ✨ Prüft ob gespeicherte Einstellungen existieren
function hasSavedSettings() {
  return localStorage.getItem(SAVED_SETTINGS_KEY) !== null;
}

// ✨ Berechnet die optimale Schriftgröße, damit der Text ins Canvas passt
function calculateAutoFitFontSize(text, fontFamily, fontWeight, fontStyle, paddingPercent = 10) {
  if (!canvasManager.value || !text) return 48;

  const canvas = canvasManager.value.canvas;
  if (!canvas) return 48;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Verfügbarer Platz mit Padding
  const padding = paddingPercent / 100;
  const availableWidth = canvasWidth * (1 - padding * 2);
  const availableHeight = canvasHeight * (1 - padding * 2);

  // Temporäres Canvas für Textmessung
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');

  // Teile Text in Zeilen
  const lines = text.split('\n');
  const lineCount = lines.length;

  // Starte mit einer großen Schriftgröße und reduziere
  let fontSize = 200; // Maximale Startgröße
  const minFontSize = 12; // Minimale Schriftgröße
  const lineHeightMultiplier = 1.2; // Standard Zeilenabstand

  while (fontSize > minFontSize) {
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    // Berechne Gesamthöhe (alle Zeilen)
    const totalHeight = fontSize * lineHeightMultiplier * lineCount;

    // Finde die breiteste Zeile
    let maxWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) {
        maxWidth = metrics.width;
      }
    });

    // Passt der Text?
    if (maxWidth <= availableWidth && totalHeight <= availableHeight) {
      break;
    }

    // Reduziere Schriftgröße
    fontSize -= 2;
  }

  return Math.max(fontSize, minFontSize);
}

let eventListenerRegistered = false;

// ✨ Normalisiere Zeilenumbrüche (Windows \r\n, Mac \r, Unix \n → alle zu \n)
function normalizeLineBreaks(text) {
  if (!text) return text;
  // Ersetze Windows (\r\n) und alte Mac (\r) Zeilenumbrüche mit Unix (\n)
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized;
}

// ✨ Handle Paste Events - Lasse Browser die Arbeit machen, dann normalisieren
function handlePaste(event) {
  
  const clipboardData = event.clipboardData || window.clipboardData;
  
  if (clipboardData) {
    const plainText = clipboardData.getData('text/plain') || '';
    const html = clipboardData.getData('text/html') || '';
  }
  
  // ✨ NEUE STRATEGIE: Lasse das normale Paste-Verhalten zu
  // Das Textarea handhabt die Konvertierung automatisch besser als wir
  // Wir normalisieren nur NACHHER
  setTimeout(() => {
    let textToNormalize = '';
    let targetRef = null;
    
    if (isAddingNewText.value) {
      textToNormalize = newTextContent.value;
      targetRef = 'newText';
    } else if (selectedText.value) {
      textToNormalize = selectedText.value.content;
      targetRef = 'selectedText';
    }
    
    if (textToNormalize) {
      // Normalisiere ALLE Arten von Zeilenumbrüchen
      const normalized = normalizeLineBreaks(textToNormalize);
      
      const lineCount = normalized.split('\n').length;
      
      if (targetRef === 'newText') {
        newTextContent.value = normalized;
      } else {
        selectedText.value.content = normalized;
        updateText();
      }
    }
  }, 50); // Längeres Timeout um sicherzustellen dass der Browser fertig ist
}

// Starte den Eingabemodus für neuen Text
function startAddingText() {
  isAddingNewText.value = true;
  newTextContent.value = '';

  // ✨ Gespeicherte Einstellungen laden (falls vorhanden)
  loadSavedSettings();

  // ✨ NEU: Canvas-Dimensionen aktualisieren
  updateCanvasDimensions();

  // ✨ NEU: Position zurücksetzen auf Mitte
  resetNewTextPosition();

  // ✅ NEU: Positions-Vorschau auf Canvas anzeigen
  nextTick(() => {
    updatePositionPreview();
  });

  nextTick(() => {
    if (newTextInput.value) {
      newTextInput.value.focus();
    }
    // ✨ Font-Dropdown im Eingabemodus befüllen
    populateNewTextFontDropdown();
  });
}

// ✨ NEU: Starte Text hinzufügen mit Bereichsauswahl
function startAddingTextWithSelection() {
  // Erst in den Eingabemodus wechseln
  startAddingText();

  // Dann direkt den Canvas-Auswahl-Modus starten
  nextTick(() => {
    startTextSelectionOnCanvas();
  });
}

// ✨ NEU: Canvas-Dimensionen aktualisieren
function updateCanvasDimensions() {
  if (canvasManager.value && canvasManager.value.canvas) {
    canvasWidth.value = canvasManager.value.canvas.width;
    canvasHeight.value = canvasManager.value.canvas.height;

    // Pixel-Werte aktualisieren
    newTextPosition.value.xPixel = Math.round(newTextPosition.value.x * canvasWidth.value);
    newTextPosition.value.yPixel = Math.round(newTextPosition.value.y * canvasHeight.value);
  }
}

// ✨ NEU: Position für neuen Text zurücksetzen
function resetNewTextPosition() {
  newTextPosition.value = {
    x: 0.5,
    y: 0.5,
    xPixel: Math.round(canvasWidth.value / 2),
    yPixel: Math.round(canvasHeight.value / 2)
  };
  textSelectionBounds.value = null;
  isSelectingOnCanvas.value = false;
}

// ✨ NEU: Canvas-Rechteck-Auswahl starten
function startTextSelectionOnCanvas() {
  if (!canvasManager.value) return;

  isSelectingOnCanvas.value = true;

  canvasManager.value.startTextSelectionMode((bounds) => {
    // Callback wenn Auswahl abgeschlossen
    textSelectionBounds.value = bounds;

    // Position aus der Auswahl übernehmen (Zentrum des Rechtecks)
    newTextPosition.value.x = bounds.relCenterX;
    newTextPosition.value.y = bounds.relCenterY;
    newTextPosition.value.xPixel = Math.round(bounds.centerX);
    newTextPosition.value.yPixel = Math.round(bounds.centerY);

    isSelectingOnCanvas.value = false;

    console.log('✅ Text-Bereich ausgewählt:', bounds);
  });
}

// ✨ NEU: Canvas-Auswahl abbrechen
function cancelTextSelectionOnCanvas() {
  if (canvasManager.value) {
    canvasManager.value.cancelTextSelectionMode();
  }
  isSelectingOnCanvas.value = false;
}

// ✨ NEU: Text-Auswahl löschen
function clearTextSelection() {
  textSelectionBounds.value = null;
  if (canvasManager.value) {
    canvasManager.value.cancelTextSelectionMode();
  }
}

// ✨ NEU: Position aus Pixel-Eingabe aktualisieren
function updatePositionFromPixel(axis) {
  if (axis === 'x') {
    newTextPosition.value.x = newTextPosition.value.xPixel / canvasWidth.value;
  } else {
    newTextPosition.value.y = newTextPosition.value.yPixel / canvasHeight.value;
  }
  // ✅ NEU: Canvas-Vorschau aktualisieren
  updatePositionPreview();
}

// ✨ NEU: Schnellposition setzen für neuen Text
function setQuickPosition(position) {
  const positions = {
    'top-left': { x: 0.1, y: 0.1 },
    'top-center': { x: 0.5, y: 0.1 },
    'top-right': { x: 0.9, y: 0.1 },
    'middle-left': { x: 0.1, y: 0.5 },
    'center': { x: 0.5, y: 0.5 },
    'middle-right': { x: 0.9, y: 0.5 },
    'bottom-left': { x: 0.1, y: 0.9 },
    'bottom-center': { x: 0.5, y: 0.9 },
    'bottom-right': { x: 0.9, y: 0.9 }
  };

  const pos = positions[position];
  if (pos) {
    newTextPosition.value.x = pos.x;
    newTextPosition.value.y = pos.y;
    newTextPosition.value.xPixel = Math.round(pos.x * canvasWidth.value);
    newTextPosition.value.yPixel = Math.round(pos.y * canvasHeight.value);
    textSelectionBounds.value = null;

    // ✅ NEU: Canvas-Vorschau aktualisieren
    updatePositionPreview();
  }
}

// ✨ NEU: Aktualisiert die Positions-Vorschau auf dem Canvas
function updatePositionPreview() {
  if (canvasManager.value && isAddingNewText.value) {
    canvasManager.value.setTextPositionPreview(
      newTextPosition.value.x,
      newTextPosition.value.y
    );
  }
}

// ✨ NEU: Löscht die Positions-Vorschau vom Canvas
function clearPositionPreview() {
  if (canvasManager.value) {
    canvasManager.value.clearTextPositionPreview();
  }
}

// ✨ NEU: Schnellposition setzen für ausgewählten Text
function setSelectedTextQuickPosition(position) {
  if (!selectedText.value) return;

  const positions = {
    'top-left': { x: 0.1, y: 0.1 },
    'top-center': { x: 0.5, y: 0.1 },
    'top-right': { x: 0.9, y: 0.1 },
    'middle-left': { x: 0.1, y: 0.5 },
    'center': { x: 0.5, y: 0.5 },
    'middle-right': { x: 0.9, y: 0.5 },
    'bottom-left': { x: 0.1, y: 0.9 },
    'bottom-center': { x: 0.5, y: 0.9 },
    'bottom-right': { x: 0.9, y: 0.9 }
  };

  const pos = positions[position];
  if (pos) {
    selectedText.value.relX = pos.x;
    selectedText.value.relY = pos.y;
    updateText();
  }
}

// ✨ NEU: Pixel-Position für ausgewählten Text aktualisieren
function updateSelectedTextPixelPosition(axis, event) {
  if (!selectedText.value) return;

  const value = parseFloat(event.target.value);
  if (isNaN(value)) return;

  if (axis === 'x') {
    selectedText.value.relX = value / canvasWidth.value;
  } else {
    selectedText.value.relY = value / canvasHeight.value;
  }
  updateText();
}

// ✨ Befülle das Font-Dropdown im Eingabemodus mit System + Custom Fonts
function populateNewTextFontDropdown() {
  if (!newTextFontSelect.value) {
    return;
  }

  // Leere das Dropdown
  newTextFontSelect.value.innerHTML = '';

  // System Fonts
  const systemFonts = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Impact',
    'Comic Sans MS',
    'Trebuchet MS'
  ];

  // Custom Fonts sammeln
  const customFonts = fontManager?.value && fontManager.value.isInitialized
    ? Array.from(fontManager.value.loadedFonts).sort()
    : [];

  // 1️⃣ System Fonts
  systemFonts.forEach(fontName => {
    const option = document.createElement('option');
    option.value = fontName;
    option.textContent = fontName;
    option.style.fontFamily = fontName;
    newTextFontSelect.value.appendChild(option);
  });

  // 2️⃣ Custom Fonts (mit Separator, falls vorhanden)
  if (customFonts.length > 0) {
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '── Custom Fonts ──';
    newTextFontSelect.value.appendChild(separator);

    customFonts.forEach(fontName => {
      const option = document.createElement('option');
      option.value = fontName;
      option.textContent = fontName;
      option.style.fontFamily = fontName;
      newTextFontSelect.value.appendChild(option);
    });
  }

  // Setze den Wert auf die aktuelle Auswahl
  newTextFontSelect.value.value = newTextStyle.value.fontFamily;
}

// Erstelle den Text auf dem Canvas
function createNewText() {
  if (!canvasManager.value || !newTextContent.value.trim()) {
    return;
  }

  // ✨ Normalisiere Zeilenumbrüche bevor der Text erstellt wird
  const normalizedText = normalizeLineBreaks(newTextContent.value);
  const lineCount = normalizedText.split('\n').length;

  // ✨ Auto-Fit: Berechne optimale Schriftgröße wenn aktiviert
  let fontSize = newTextStyle.value.fontSize;
  if (newTextStyle.value.autoFit) {
    fontSize = calculateAutoFitFontSize(
      normalizedText,
      newTextStyle.value.fontFamily,
      newTextStyle.value.fontWeight,
      newTextStyle.value.fontStyle,
      newTextStyle.value.autoFitPadding
    );
    console.log(`📐 Auto-Fit: Schriftgröße angepasst auf ${fontSize}px`);
  }

  // ✨ NEU: Position aus Auswahl oder manueller Eingabe verwenden
  const posX = newTextPosition.value.x;
  const posY = newTextPosition.value.y;

  console.log(`📍 Text-Position: X=${Math.round(posX * 100)}%, Y=${Math.round(posY * 100)}%`);

  // ✨ Erstelle den Text mit den benutzerdefinierten Stil-Einstellungen
  const newTextObj = canvasManager.value.addText(normalizedText, {
    relX: posX,  // ✨ NEU: Position aus Eingabe/Auswahl
    relY: posY,  // ✨ NEU: Position aus Eingabe/Auswahl
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
    shadowOffsetY: 0
  });

  // ✨ FIX: Setze den neuen Text direkt als selectedText
  if (newTextObj) {
    // ✨ Stil-Einstellungen direkt auf das Objekt setzen (für Eigenschaften die nicht über options gehen)
    newTextObj.fontWeight = newTextStyle.value.fontWeight;
    newTextObj.fontStyle = newTextStyle.value.fontStyle;
    newTextObj.textAlign = newTextStyle.value.textAlign;

    // ✨ Animations-Einstellungen übernehmen (Typewriter, Fade, Scale und/oder Slide)
    const hasTypewriter = newTextTypewriter.value.enabled;
    const hasFade = newTextFade.value.enabled;
    const hasScale = newTextScale.value.enabled;
    const hasSlide = newTextSlide.value.enabled;

    if (hasTypewriter || hasFade || hasScale || hasSlide) {
      // Bestimme den Animations-Typ (für Logging)
      const types = [];
      if (hasTypewriter) types.push('typewriter');
      if (hasFade) types.push('fade');
      if (hasScale) types.push('scale');
      if (hasSlide) types.push('slide');
      const animationType = types.join('+') || 'none';

      newTextObj.animation = {
        type: animationType,
        typewriter: {
          enabled: hasTypewriter,
          speed: newTextTypewriter.value.speed,
          startDelay: newTextTypewriter.value.startDelay,
          loop: newTextTypewriter.value.loop,
          loopDelay: newTextTypewriter.value.loopDelay,
          showCursor: newTextTypewriter.value.showCursor,
          cursorChar: newTextTypewriter.value.cursorChar
        },
        fade: {
          enabled: hasFade,
          duration: newTextFade.value.duration,
          startDelay: newTextFade.value.startDelay,
          direction: newTextFade.value.direction,
          loop: newTextFade.value.loop,
          loopDelay: newTextFade.value.loopDelay,
          easing: newTextFade.value.easing
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
          easing: newTextScale.value.easing
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
          easing: newTextSlide.value.easing
        },
        _state: {
          startTime: null,
          isPlaying: false,
          currentIndex: 0
        }
      };

      if (hasTypewriter) console.log('⌨️ Text mit Typewriter-Effekt erstellt');
      if (hasFade) console.log('🌫️ Text mit Fade-Effekt erstellt');
      if (hasScale) console.log('🔍 Text mit Scale-Effekt erstellt');
      if (hasSlide) console.log('➡️ Text mit Slide-Effekt erstellt');
    }

    selectedText.value = newTextObj;
    console.log('✅ Text erstellt mit Stil:', newTextStyle.value);
    toastStore.success(t('toast.textAdded'));
  }

  // Beende den Eingabemodus und setze alle Einstellungen zurück
  isAddingNewText.value = false;
  newTextContent.value = '';
  resetNewTextSettings();

  // ✅ FIX: Canvas-Auswahl-Rechteck und Positions-Vorschau löschen nach Texterstellung
  clearTextSelection();
  clearPositionPreview();
  resetNewTextPosition();
}

// Abbrechen und Eingabemodus verlassen
function cancelNewText() {
  isAddingNewText.value = false;
  newTextContent.value = '';
  resetNewTextSettings();

  // ✨ NEU: Canvas-Auswahl-Modus und Positions-Vorschau beenden
  cancelTextSelectionOnCanvas();
  clearPositionPreview();
  textSelectionBounds.value = null;
}

// ✨ Alle Einstellungen für neuen Text zurücksetzen
function resetNewTextSettings() {
  // Typewriter zurücksetzen
  newTextTypewriter.value = {
    enabled: false,
    speed: 50,
    startDelay: 0,
    loop: false,
    loopDelay: 1000,
    showCursor: true,
    cursorChar: '|'
  };

  // Fade zurücksetzen
  newTextFade.value = {
    enabled: false,
    duration: 1000,
    startDelay: 0,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    easing: 'ease'
  };

  // Scale zurücksetzen
  newTextScale.value = {
    enabled: false,
    duration: 1000,
    startDelay: 0,
    startScale: 0,
    endScale: 1,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    easing: 'ease'
  };

  // Slide zurücksetzen
  newTextSlide.value = {
    enabled: false,
    duration: 1000,
    startDelay: 0,
    from: 'left',
    distance: 100,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    easing: 'ease'
  };

  // Stil zurücksetzen
  newTextStyle.value = {
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ff0000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'center',
    opacity: 100,
    autoFit: false,
    autoFitPadding: 10
  };
}

// ✨ Auto-Wrap: Bricht langen Text automatisch in sinnvolle Zeilen um
function autoWrapText() {
  if (!newTextContent.value) return;
  
  const maxCharsPerLine = 50; // Maximale Zeichenanzahl pro Zeile
  const text = newTextContent.value.trim();
  const words = text.split(/\s+/); // Teile in Wörter
  
  let lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    // Wenn das Hinzufügen des Wortes die Zeile zu lang macht
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  });
  
  // Füge die letzte Zeile hinzu
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  
  newTextContent.value = lines.join('\n');
}

// Text aktualisieren (bei jeder Änderung)
function updateText() {
  // ✨ Normalisiere Zeilenumbrüche wenn Text bearbeitet wird
  if (selectedText.value && selectedText.value.content) {
    selectedText.value.content = normalizeLineBreaks(selectedText.value.content);
  }
  
  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback();
  }
}

// Fett/Normal umschalten
function toggleFontWeight() {
  if (selectedText.value) {
    selectedText.value.fontWeight = selectedText.value.fontWeight === 'bold' ? 'normal' : 'bold';
    updateText();
  }
}

// Kursiv/Normal umschalten
function toggleFontStyle() {
  if (selectedText.value) {
    selectedText.value.fontStyle = selectedText.value.fontStyle === 'italic' ? 'normal' : 'italic';
    updateText();
  }
}

// Text-Ausrichtung setzen
function setTextAlign(align) {
  if (selectedText.value) {
    selectedText.value.textAlign = align;
    updateText();
  }
}

// Text-Kontur aktivieren/deaktivieren
function toggleStroke() {
  if (selectedText.value) {
    selectedText.value.stroke.enabled = !selectedText.value.stroke.enabled;
    updateText();
  }
}

// ✨ Audio-Reaktive Effekte aktivieren/deaktivieren
function toggleAudioReactive() {
  if (selectedText.value) {
    // Initialisiere audioReactive wenn nicht vorhanden
    if (!selectedText.value.audioReactive) {
      selectedText.value.audioReactive = {
        enabled: false,
        source: 'bass',
        smoothing: 50,
        threshold: 0,
        attack: 90,
        release: 50,
        effects: {
          hue: { enabled: false, intensity: 80 },
          brightness: { enabled: false, intensity: 80 },
          scale: { enabled: false, intensity: 80 },
          glow: { enabled: false, intensity: 80 },
          shake: { enabled: false, intensity: 80 },
          bounce: { enabled: false, intensity: 80 },
          swing: { enabled: false, intensity: 80 },
          opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
          letterSpacing: { enabled: false, intensity: 80 },
          strokeWidth: { enabled: false, intensity: 80 }
        }
      };
    }
    selectedText.value.audioReactive.enabled = !selectedText.value.audioReactive.enabled;
    updateText();
  }
}

// ✨ Audio-Presets anwenden
function applyAudioPreset(presetName) {
  if (!selectedText.value?.audioReactive) return;

  const presets = {
    punchy: {
      threshold: 10,
      attack: 95,
      release: 70,
      smoothing: 20
    },
    smooth: {
      threshold: 5,
      attack: 50,
      release: 30,
      smoothing: 70
    },
    subtle: {
      threshold: 15,
      attack: 60,
      release: 40,
      smoothing: 60
    },
    extreme: {
      threshold: 0,
      attack: 100,
      release: 85,
      smoothing: 10
    }
  };

  const preset = presets[presetName];
  if (preset) {
    selectedText.value.audioReactive.threshold = preset.threshold;
    selectedText.value.audioReactive.attack = preset.attack;
    selectedText.value.audioReactive.release = preset.release;
    selectedText.value.audioReactive.smoothing = preset.smoothing;
    updateText();
    console.log(`🎛️ Audio-Preset "${presetName}" angewendet`);
  }
}

// ✨ Audio-Einstellungen zurücksetzen
function resetAudioSettings() {
  if (!selectedText.value?.audioReactive) return;

  selectedText.value.audioReactive.threshold = 0;
  selectedText.value.audioReactive.attack = 90;
  selectedText.value.audioReactive.release = 50;
  selectedText.value.audioReactive.smoothing = 50;

  // Auch Opacity-spezifische Einstellungen zurücksetzen
  if (selectedText.value.audioReactive.effects?.opacity) {
    selectedText.value.audioReactive.effects.opacity.minimum = 0;
    selectedText.value.audioReactive.effects.opacity.ease = false;
  }

  updateText();
  console.log('🔄 Audio-Einstellungen zurückgesetzt');
}

// ✨ Alle Audio-Effekte zurücksetzen
function resetAllAudioEffects() {
  if (!selectedText.value?.audioReactive?.effects) return;

  const effects = selectedText.value.audioReactive.effects;

  // Alle Effekte deaktivieren und Intensität zurücksetzen
  const effectKeys = [
    'hue', 'brightness', 'scale', 'glow', 'shake', 'bounce',
    'swing', 'opacity', 'letterSpacing', 'strokeWidth',
    'skew', 'strobe', 'rgbGlitch', 'perspective3d', 'wave', 'rotation', 'elastic'
  ];

  effectKeys.forEach(key => {
    if (effects[key]) {
      effects[key].enabled = false;
      effects[key].intensity = 50;
      // Reset special properties
      if (key === 'opacity') {
        effects[key].minimum = 0;
        effects[key].ease = false;
      }
    }
  });

  updateText();
  console.log('🔄 Alle Audio-Effekte zurückgesetzt');
}

// ✨ Audio-Effekte Preset speichern
const AUDIO_EFFECTS_PRESET_KEY = 'visualizer_audio_effects_preset';

const hasAudioEffectsPreset = ref(false);

// Check on mount if preset exists
function checkAudioEffectsPreset() {
  try {
    const saved = localStorage.getItem(AUDIO_EFFECTS_PRESET_KEY);
    hasAudioEffectsPreset.value = !!saved;
  } catch (e) {
    hasAudioEffectsPreset.value = false;
  }
}

function saveAudioEffectsPreset() {
  if (!selectedText.value?.audioReactive) {
    toastStore.warning(t('textManager.noEffectsToSave') || 'Keine Effekte zum Speichern');
    return;
  }

  try {
    const preset = {
      source: selectedText.value.audioReactive.source,
      smoothing: selectedText.value.audioReactive.smoothing,
      threshold: selectedText.value.audioReactive.threshold,
      attack: selectedText.value.audioReactive.attack,
      release: selectedText.value.audioReactive.release,
      effects: JSON.parse(JSON.stringify(selectedText.value.audioReactive.effects))
    };

    localStorage.setItem(AUDIO_EFFECTS_PRESET_KEY, JSON.stringify(preset));
    hasAudioEffectsPreset.value = true;
    toastStore.success(t('textManager.effectsPresetSaved') || 'Audio-Effekte gespeichert');
    console.log('💾 Audio-Effekte Preset gespeichert');
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Presets:', error);
    toastStore.error(t('textManager.effectsPresetSaveError') || 'Fehler beim Speichern');
  }
}

function loadAudioEffectsPreset() {
  if (!selectedText.value?.audioReactive) {
    toastStore.warning(t('textManager.selectTextFirst') || 'Bitte wähle zuerst einen Text aus');
    return;
  }

  try {
    const saved = localStorage.getItem(AUDIO_EFFECTS_PRESET_KEY);
    if (!saved) {
      toastStore.warning(t('textManager.noPresetSaved') || 'Kein Preset gespeichert');
      return;
    }

    const preset = JSON.parse(saved);

    // Apply preset to current text
    selectedText.value.audioReactive.enabled = true;
    selectedText.value.audioReactive.source = preset.source || 'bass';
    selectedText.value.audioReactive.smoothing = preset.smoothing || 50;
    selectedText.value.audioReactive.threshold = preset.threshold || 0;
    selectedText.value.audioReactive.attack = preset.attack || 90;
    selectedText.value.audioReactive.release = preset.release || 50;

    // Deep copy effects
    if (preset.effects) {
      Object.keys(preset.effects).forEach(key => {
        if (selectedText.value.audioReactive.effects[key]) {
          Object.assign(selectedText.value.audioReactive.effects[key], preset.effects[key]);
        }
      });
    }

    updateText();
    toastStore.success(t('textManager.effectsPresetLoaded') || 'Audio-Effekte geladen');
    console.log('📂 Audio-Effekte Preset geladen');
  } catch (error) {
    console.error('❌ Fehler beim Laden des Presets:', error);
    toastStore.error(t('textManager.effectsPresetLoadError') || 'Fehler beim Laden');
  }
}

// ✨ Typewriter-Animation aktivieren/deaktivieren
function toggleTypewriter() {
  if (!selectedText.value) return;

  // Initialisiere animation wenn nicht vorhanden
  if (!selectedText.value.animation) {
    selectedText.value.animation = {
      type: 'none',
      typewriter: {
        enabled: false,
        speed: 50,
        startDelay: 0,
        loop: false,
        loopDelay: 1000,
        showCursor: true,
        cursorChar: '|'
      },
      fade: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      scale: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      slide: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      _state: {
        startTime: null,
        isPlaying: false,
        currentIndex: 0
      }
    };
  }

  // Toggle enabled
  selectedText.value.animation.typewriter.enabled = !selectedText.value.animation.typewriter.enabled;

  // Animation-Typ aktualisieren (berücksichtigt Fade, Scale und Slide)
  const hasTypewriter = selectedText.value.animation.typewriter.enabled;
  const hasFade = selectedText.value.animation.fade?.enabled;
  const hasScale = selectedText.value.animation.scale?.enabled;
  const hasSlide = selectedText.value.animation.slide?.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
  if (hasSlide) types.push('slide');
  selectedText.value.animation.type = types.join('+') || 'none';

  // Bei Aktivierung: Animation-State zurücksetzen für sofortigen Start
  if (selectedText.value.animation.typewriter.enabled) {
    selectedText.value.animation._state.startTime = null;
    selectedText.value.animation._state.isPlaying = false;
    selectedText.value.animation._state.currentIndex = 0;
  }

  updateText();
  console.log(`⌨️ Typewriter ${selectedText.value.animation.typewriter.enabled ? 'aktiviert' : 'deaktiviert'}`);
}

// ✨ Typewriter-Animation neu starten
function restartTypewriter() {
  if (!selectedText.value?.animation) return;

  // State zurücksetzen
  selectedText.value.animation._state = {
    startTime: null,
    isPlaying: false,
    currentIndex: 0
  };

  updateText();
  console.log('🔄 Typewriter-Animation neu gestartet');
}

// ✨ Fade-Animation aktivieren/deaktivieren
function toggleFade() {
  if (!selectedText.value) return;

  // Initialisiere animation wenn nicht vorhanden
  if (!selectedText.value.animation) {
    selectedText.value.animation = {
      type: 'none',
      typewriter: {
        enabled: false,
        speed: 50,
        startDelay: 0,
        loop: false,
        loopDelay: 1000,
        showCursor: true,
        cursorChar: '|'
      },
      fade: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      scale: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      slide: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      _state: {
        startTime: null,
        isPlaying: false,
        currentIndex: 0
      }
    };
  }

  // Initialisiere fade wenn nicht vorhanden
  if (!selectedText.value.animation.fade) {
    selectedText.value.animation.fade = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      easing: 'ease'
    };
  }

  // Toggle enabled
  selectedText.value.animation.fade.enabled = !selectedText.value.animation.fade.enabled;

  // Animation-Typ aktualisieren (berücksichtigt Scale und Slide)
  const hasTypewriter = selectedText.value.animation.typewriter?.enabled;
  const hasFade = selectedText.value.animation.fade.enabled;
  const hasScale = selectedText.value.animation.scale?.enabled;
  const hasSlide = selectedText.value.animation.slide?.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
  if (hasSlide) types.push('slide');
  selectedText.value.animation.type = types.join('+') || 'none';

  // Bei Aktivierung: Fade-State zurücksetzen für sofortigen Start
  if (selectedText.value.animation.fade.enabled) {
    selectedText.value.animation._state.fadeStartTime = null;
    selectedText.value.animation._state.fadePhase = null;
  }

  updateText();
  console.log(`🌫️ Fade ${selectedText.value.animation.fade.enabled ? 'aktiviert' : 'deaktiviert'}`);
}

// ✨ Fade-Animation neu starten
function restartFade() {
  if (!selectedText.value?.animation) return;

  // Fade-State zurücksetzen
  selectedText.value.animation._state.fadeStartTime = null;
  selectedText.value.animation._state.fadePhase = null;

  updateText();
  console.log('🔄 Fade-Animation neu gestartet');
}

// ✨ Scale-Animation aktivieren/deaktivieren
function toggleScale() {
  if (!selectedText.value) return;

  // Initialisiere animation wenn nicht vorhanden
  if (!selectedText.value.animation) {
    selectedText.value.animation = {
      type: 'none',
      typewriter: {
        enabled: false,
        speed: 50,
        startDelay: 0,
        loop: false,
        loopDelay: 1000,
        showCursor: true,
        cursorChar: '|'
      },
      fade: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      scale: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      slide: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      _state: {
        startTime: null,
        isPlaying: false,
        currentIndex: 0
      }
    };
  }

  // Initialisiere scale wenn nicht vorhanden
  if (!selectedText.value.animation.scale) {
    selectedText.value.animation.scale = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      startScale: 0,
      endScale: 1,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      easing: 'ease'
    };
  }

  // Toggle enabled
  selectedText.value.animation.scale.enabled = !selectedText.value.animation.scale.enabled;

  // Animation-Typ aktualisieren
  const hasTypewriter = selectedText.value.animation.typewriter?.enabled;
  const hasFade = selectedText.value.animation.fade?.enabled;
  const hasScale = selectedText.value.animation.scale.enabled;
  const hasSlide = selectedText.value.animation.slide?.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
  if (hasSlide) types.push('slide');
  selectedText.value.animation.type = types.join('+') || 'none';

  // Bei Aktivierung: Scale-State zurücksetzen für sofortigen Start
  if (selectedText.value.animation.scale.enabled) {
    selectedText.value.animation._state.scaleStartTime = null;
  }

  updateText();
  console.log(`🔍 Scale ${selectedText.value.animation.scale.enabled ? 'aktiviert' : 'deaktiviert'}`);
}

// ✨ Scale-Animation neu starten
function restartScale() {
  if (!selectedText.value?.animation) return;

  // Scale-State zurücksetzen
  selectedText.value.animation._state.scaleStartTime = null;

  updateText();
  console.log('🔄 Scale-Animation neu gestartet');
}

// ✨ Slide-Animation aktivieren/deaktivieren
function toggleSlide() {
  if (!selectedText.value) return;

  // Initialisiere animation wenn nicht vorhanden
  if (!selectedText.value.animation) {
    selectedText.value.animation = {
      type: 'none',
      typewriter: {
        enabled: false,
        speed: 50,
        startDelay: 0,
        loop: false,
        loopDelay: 1000,
        showCursor: true,
        cursorChar: '|'
      },
      fade: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      scale: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      slide: {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease'
      },
      _state: {
        startTime: null,
        isPlaying: false,
        currentIndex: 0
      }
    };
  }

  // Initialisiere slide wenn nicht vorhanden
  if (!selectedText.value.animation.slide) {
    selectedText.value.animation.slide = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      from: 'left',
      distance: 100,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      easing: 'ease'
    };
  }

  // Toggle enabled
  selectedText.value.animation.slide.enabled = !selectedText.value.animation.slide.enabled;

  // Animation-Typ aktualisieren
  const hasTypewriter = selectedText.value.animation.typewriter?.enabled;
  const hasFade = selectedText.value.animation.fade?.enabled;
  const hasScale = selectedText.value.animation.scale?.enabled;
  const hasSlide = selectedText.value.animation.slide.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
  if (hasSlide) types.push('slide');
  selectedText.value.animation.type = types.join('+') || 'none';

  // Bei Aktivierung: Slide-State zurücksetzen für sofortigen Start
  if (selectedText.value.animation.slide.enabled) {
    selectedText.value.animation._state.slideStartTime = null;
  }

  updateText();
  console.log(`➡️ Slide ${selectedText.value.animation.slide.enabled ? 'aktiviert' : 'deaktiviert'}`);
}

// ✨ Slide-Animation neu starten
function restartSlide() {
  if (!selectedText.value?.animation) return;

  // Slide-State zurücksetzen
  selectedText.value.animation._state.slideStartTime = null;

  updateText();
  console.log('🔄 Slide-Animation neu gestartet');
}

// Ausgewählten Text löschen
function deleteSelectedText() {
  if (canvasManager.value && selectedText.value) {
    canvasManager.value.deleteActiveObject();
    selectedText.value = null;
  }
}

// ✨ FIX: Verbesserte Callback-Funktion für Selection-Changes
function handleSelectionChange(obj) {

  if (obj && obj.type === 'text') {
    // Sicherheitsprüfung: Initialisiere fehlende Properties
    if (!obj.letterSpacing && obj.letterSpacing !== 0) {
      obj.letterSpacing = 0;
    }
    if (!obj.lineHeightMultiplier) {
      obj.lineHeightMultiplier = 120;
    }
    if (!obj.stroke) {
      obj.stroke = { enabled: false, color: '#000000', width: 2 };
    }
    if (obj.stroke && obj.stroke.enabled === undefined) {
      obj.stroke.enabled = false;
    }
    if (!obj.shadow) {
      obj.shadow = {
        color: '#000000',
        blur: 0,
        offsetX: 0,
        offsetY: 0
      };
    }

    // ✨ Initialisiere audioReactive wenn nicht vorhanden (für ältere Text-Objekte)
    if (!obj.audioReactive) {
      obj.audioReactive = {
        enabled: false,
        source: 'bass',
        smoothing: 50,
        threshold: 0,
        attack: 90,
        release: 50,
        effects: {
          hue: { enabled: false, intensity: 80 },
          brightness: { enabled: false, intensity: 80 },
          scale: { enabled: false, intensity: 80 },
          glow: { enabled: false, intensity: 80 },
          shake: { enabled: false, intensity: 80 },
          bounce: { enabled: false, intensity: 80 },
          swing: { enabled: false, intensity: 80 },
          opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
          letterSpacing: { enabled: false, intensity: 80 },
          strokeWidth: { enabled: false, intensity: 80 }
        }
      };
    }

    // ✨ Initialisiere animation wenn nicht vorhanden (für ältere Text-Objekte)
    if (!obj.animation) {
      obj.animation = {
        type: 'none',
        typewriter: {
          enabled: false,
          speed: 50,
          startDelay: 0,
          loop: false,
          loopDelay: 1000,
          showCursor: true,
          cursorChar: '|'
        },
        _state: {
          startTime: null,
          isPlaying: false,
          currentIndex: 0
        }
      };
    }

    selectedText.value = obj;
    isAddingNewText.value = false;

    // ✨ FIX: Font-Dropdown befüllen - KEIN automatischer Fokus auf Text-Eingabe
    // Der Benutzer kann selbst nach oben scrollen wenn Textbearbeitung gewünscht
    nextTick(() => {
      populateFontDropdown();
    });

  } else {
    selectedText.value = null;
  }
}

// ✨ Befülle das Font-Dropdown mit System + Custom Fonts
// 🎯 Die aktuelle Schriftart des ausgewählten Textes wird IMMER an erster Stelle angezeigt
function populateFontDropdown() {
  if (!fontSelect.value) {
    return;
  }
  
  // Leere das Dropdown
  fontSelect.value.innerHTML = '';
  
  // System Fonts
  const systemFonts = [
    'Arial',
    'Helvetica', 
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
    'Impact',
    'Comic Sans MS',
    'Trebuchet MS'
  ];
  
  // Custom Fonts sammeln
  const customFonts = fontManager?.value && fontManager.value.isInitialized 
    ? Array.from(fontManager.value.loadedFonts).sort()
    : [];
  
  // Alle verfügbaren Fonts kombinieren
  const allFonts = [...systemFonts, ...customFonts];
  
  // 🎯 AKTUELLE SCHRIFTART DES AUSGEWÄHLTEN TEXTES
  const currentFont = selectedText.value?.fontFamily || 'Arial';
  
  // 1️⃣ Aktuelle Schriftart an erster Stelle (hervorgehoben)
  if (currentFont && allFonts.includes(currentFont)) {
    const currentOption = document.createElement('option');
    currentOption.value = currentFont;
    currentOption.textContent = `✨ ${currentFont} (aktuell)`;
    currentOption.style.fontFamily = currentFont;
    currentOption.style.fontWeight = 'bold';
    currentOption.style.backgroundColor = 'var(--card-bg)';
    fontSelect.value.appendChild(currentOption);
    
    // Separator
    const separator1 = document.createElement('option');
    separator1.disabled = true;
    separator1.textContent = '──────────────────';
    fontSelect.value.appendChild(separator1);
  }
  
  // 2️⃣ System Fonts (ohne die aktuelle Schriftart, falls bereits oben)
  systemFonts.forEach(fontName => {
    if (fontName === currentFont) return; // Überspringe aktuelle Schriftart
    
    const option = document.createElement('option');
    option.value = fontName;
    option.textContent = fontName;
    option.style.fontFamily = fontName;
    fontSelect.value.appendChild(option);
  });
  
  // 3️⃣ Custom Fonts (mit Separator, falls vorhanden)
  if (customFonts.length > 0) {
    const separator2 = document.createElement('option');
    separator2.disabled = true;
    separator2.textContent = '── Custom Fonts ──';
    fontSelect.value.appendChild(separator2);
    
    customFonts.forEach(fontName => {
      if (fontName === currentFont) return; // Überspringe aktuelle Schriftart
      
      const option = document.createElement('option');
      option.value = fontName;
      option.textContent = fontName;
      option.style.fontFamily = fontName;
      fontSelect.value.appendChild(option);
    });
    
  } else {
  }
}

// ✨ FIX: Überwache canvasManager.activeObject direkt
watch(() => canvasManager.value?.activeObject, (newObj) => {
  handleSelectionChange(newObj);
}, { deep: true });

// ✨ NEU: Überwache Position-Änderungen für Canvas-Vorschau (Slider v-model)
watch(() => newTextPosition.value.x, () => {
  if (isAddingNewText.value) {
    // Pixel-Wert synchronisieren
    newTextPosition.value.xPixel = Math.round(newTextPosition.value.x * canvasWidth.value);
    updatePositionPreview();
  }
});

watch(() => newTextPosition.value.y, () => {
  if (isAddingNewText.value) {
    // Pixel-Wert synchronisieren
    newTextPosition.value.yPixel = Math.round(newTextPosition.value.y * canvasHeight.value);
    updatePositionPreview();
  }
});

// ✨ NEU: Vorschau löschen wenn isAddingNewText auf false wechselt
watch(isAddingNewText, (newValue) => {
  if (!newValue) {
    clearPositionPreview();
  }
});

// ✨ NEU: Handler für Tastatureingabe zum Öffnen des Texteditors
function handleOpenTextEditorWithChar(event) {
  const char = event.detail?.char;
  if (!char) return;

  // ✨ LÖSUNG: Sofort Text zum Canvas hinzufügen und Editor öffnen!
  if (!canvasManager.value) return;

  // Erstelle sofort einen neuen Text auf dem Canvas mit dem eingegebenen Zeichen
  const newTextObj = canvasManager.value.addText(char, {
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ff0000',
    opacity: 100,
    letterSpacing: 0,
    lineHeightMultiplier: 120,
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowBlur: 5,
    shadowOffsetX: 2,
    shadowOffsetY: 2
  });

  // Der Text wird automatisch als activeObject gesetzt (durch addText)
  // Das triggert handleSelectionChange, was selectedText setzt und den Editor öffnet
  if (newTextObj) {
    selectedText.value = newTextObj;
    isAddingNewText.value = false;

    // Fokussiere das Editor-Textarea, damit der Benutzer weiter tippen kann
    nextTick(() => {
      if (editTextInput.value) {
        editTextInput.value.focus();
        // Setze Cursor ans Ende des Textes
        editTextInput.value.selectionStart = editTextInput.value.selectionEnd = char.length;
      }
    });
  }
}

// Setup beim Mounting
onMounted(() => {
  // ✨ WICHTIG: Event-Listener für Tastatureingabe IMMER registrieren (unabhängig von canvasManager)
  window.addEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar);

  // Check if audio effects preset exists in localStorage
  checkAudioEffectsPreset();

  if (!canvasManager.value) return;

  // ✨ NEU: Canvas-Dimensionen initialisieren
  updateCanvasDimensions();

  // ✨ FIX: Registriere Event-Listener wenn verfügbar
  if (canvasManager.value.onSelectionChanged && !eventListenerRegistered) {
    canvasManager.value.onSelectionChanged(handleSelectionChange);
    eventListenerRegistered = true;
  }

  // Prüfe ob bereits ein Text ausgewählt ist
  if (canvasManager.value.activeObject?.type === 'text') {
    handleSelectionChange(canvasManager.value.activeObject);
  }

  // Befülle Font-Dropdown nach dem Mounting
  nextTick(() => {
    populateFontDropdown();
  });

  // Überwache FontManager und aktualisiere Dropdown wenn Fonts geladen werden
  if (fontManager?.value) {
    watch(
      () => fontManager.value?.isInitialized,
      (isInitialized) => {
        if (isInitialized) {
          nextTick(() => {
            populateFontDropdown();
          });
        }
      },
      { immediate: true }
    );
  }
});

// Cleanup beim Unmounting
onUnmounted(() => {
  eventListenerRegistered = false;
  // ✨ NEU: Event-Listener entfernen
  window.removeEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar);

  // ✨ NEU: Canvas-Auswahl-Modus beenden falls aktiv
  if (isSelectingOnCanvas.value && canvasManager.value) {
    canvasManager.value.cancelTextSelectionMode();
  }
});

// ✨ NEU: Watch für Position-Synchronisation (Relativ → Pixel)
watch(
  () => [newTextPosition.value.x, newTextPosition.value.y],
  ([newX, newY]) => {
    newTextPosition.value.xPixel = Math.round(newX * canvasWidth.value);
    newTextPosition.value.yPixel = Math.round(newY * canvasHeight.value);
  }
);

// ✨ NEU: Watch für Canvas-Dimensionen Updates
watch(
  () => canvasManager.value?.canvas,
  (canvas) => {
    if (canvas) {
      canvasWidth.value = canvas.width;
      canvasHeight.value = canvas.height;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* ===== MAIN PANEL ===== */
.panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #E9E9EB);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== HEADERS ===== */
h3 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #E9E9EB);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpath d='M4 7V4h16v3M9 20h6M12 4v16'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

h4 {
  margin: 8px 0 6px 0;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-muted, #7A8DA0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

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
  color: var(--text-muted, #7A8DA0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

/* ===== INPUTS ===== */
.text-input,
.select-input,
.color-text-input,
.text-area {
  width: 100%;
  padding: 5px 8px;
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
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
  color: var(--text-muted, #7A8DA0);
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

/* ===== MODERN SLIDERS ===== */
.slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--text-muted, #7A8DA0) 0%, var(--accent-primary, #c9984d) 100%);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

/* ===== SLIDER THUMBS ===== */
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
  background-color: var(--secondary-bg, #0E1C32);
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
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
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
.btn-secondary,
.btn-danger {
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
  background-color: var(--secondary-bg, #0E1C32);
  color: var(--text-muted, #7A8DA0);
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-secondary {
  background-color: var(--secondary-bg, #0E1C32);
  color: var(--text-primary, #E9E9EB);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-danger {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-danger:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.full-width {
  width: 100%;
}

/* ===== DIVIDER ===== */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #444 50%, transparent 100%);
  margin: 16px 0;
}

/* ===== INFO TEXT ===== */
.info-text {
  color: #777;
  font-size: 11px;
  line-height: 1.6;
  margin: 0;
  text-align: center;
}

/* ===== AUDIO-REACTIVE EFFECTS GRID ===== */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.effect-item {
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  padding: 6px 8px;
  transition: all 0.2s ease;
}

.effect-item:hover {
  border-color: var(--accent-primary, #c9984d);
  background-color: var(--btn-hover, #1a2a42);
}

.effect-header {
  display: flex;
  align-items: center;
}

.effect-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--text-primary, #E9E9EB);
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.effect-checkbox input[type="checkbox"] {
  width: 12px;
  height: 12px;
  cursor: pointer;
  accent-color: var(--accent-primary, #c9984d);
}

.effect-icon {
  font-size: 0.65rem;
  margin-right: 2px;
}

.effect-intensity {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.effect-details {
  margin-top: 6px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.effect-details .effect-intensity {
  margin-top: 4px;
  padding-top: 4px;
  border-top: none;
}

.effect-details .effect-intensity:first-child {
  margin-top: 0;
  padding-top: 0;
}

.effect-label {
  font-size: 0.5rem;
  color: var(--text-muted, #7A8DA0);
  min-width: 50px;
  text-transform: uppercase;
}

.effect-checkbox-small {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.5rem;
  color: var(--text-muted, #7A8DA0);
  margin-top: 6px;
  cursor: pointer;
  text-transform: uppercase;
}

.effect-checkbox-small input[type="checkbox"] {
  width: 10px;
  height: 10px;
  cursor: pointer;
}

.advanced-settings {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  padding: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
}

.advanced-settings summary {
  cursor: pointer;
  font-size: 0.55rem;
  color: var(--accent-primary, #c9984d);
  padding: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.advanced-settings summary:hover {
  color: var(--accent-tertiary, #f8e1a9);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.btn-preset {
  flex: 1;
  min-width: 60px;
  padding: 5px 6px;
  font-size: 0.5rem;
  background: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 4px;
  color: var(--text-primary, #E9E9EB);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.btn-preset:hover {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
  transform: translateY(-1px);
}

.btn-preset:active {
  transform: translateY(0);
}

.btn-reset {
  width: 100%;
  margin-top: 8px;
  padding: 5px 8px;
  font-size: 0.55rem;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  color: #ffaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-reset:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.5);
  color: #fff;
}

/* Reset All Effects Button */
.btn-reset-all-effects {
  width: 100%;
  margin-top: 12px;
  padding: 10px 14px;
  font-size: 0.65rem;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 100, 100, 0.15) 0%, rgba(255, 150, 100, 0.15) 100%);
  border: 1px solid rgba(255, 100, 100, 0.4);
  border-radius: 6px;
  color: #ffaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-reset-all-effects:hover {
  background: linear-gradient(135deg, rgba(255, 100, 100, 0.25) 0%, rgba(255, 150, 100, 0.25) 100%);
  border-color: rgba(255, 100, 100, 0.6);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 100, 100, 0.2);
}

.btn-reset-all-effects .reset-icon {
  font-size: 0.8rem;
}

/* Audio Effects Preset Actions */
.audio-preset-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-save-preset,
.btn-load-preset {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.6rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-save-preset {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.15) 100%);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #81c784;
}

.btn-save-preset:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(129, 199, 132, 0.25) 100%);
  border-color: rgba(76, 175, 80, 0.6);
  color: #a5d6a7;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.btn-load-preset {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(100, 181, 246, 0.15) 100%);
  border: 1px solid rgba(33, 150, 243, 0.4);
  color: #64b5f6;
}

.btn-load-preset:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.25) 0%, rgba(100, 181, 246, 0.25) 100%);
  border-color: rgba(33, 150, 243, 0.6);
  color: #90caf9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.btn-load-preset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-save-preset .preset-icon,
.btn-load-preset .preset-icon {
  font-size: 0.75rem;
}

.advanced-settings .control-group {
  margin-top: 6px;
}

.advanced-settings .control-group label {
  font-size: 0.55rem;
}

.advanced-settings .hint-text {
  font-size: 0.45rem;
  margin-top: 2px;
}

.slider-small {
  flex: 1;
  height: 3px;
  background: linear-gradient(90deg, var(--text-muted, #7A8DA0) 0%, var(--accent-primary, #c9984d) 100%);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}

.slider-small::-webkit-slider-thumb {
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

.slider-small::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-primary, #c9984d);
}

.slider-small::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider-small::-moz-range-thumb:hover {
  transform: scale(1.1);
  background: var(--accent-primary, #c9984d);
}

.intensity-value {
  font-size: 0.5rem;
  color: var(--text-muted, #7A8DA0);
  font-weight: 500;
  min-width: 30px;
  text-align: right;
  font-family: monospace;
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

/* ===== NEW TEXT STYLE SECTION ===== */
.new-text-style-section {
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}

.new-text-style-section h4 {
  margin: 0 0 12px 0;
  color: #6ea8fe;
}

.new-text-style-section .control-group {
  margin-bottom: 10px;
}

.new-text-style-section .control-group:last-child {
  margin-bottom: 0;
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

/* Disabled slider style */
.slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.slider:disabled::-webkit-slider-thumb {
  background: #666;
  cursor: not-allowed;
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

/* ✨ NEU: Position & Bereich Styles */
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
  0%, 100% { border-color: #8fdf8f; }
  50% { border-color: #4a7a4a; }
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

.control-group .slider + .number-input {
  margin-top: 0;
}

.control-group .number-input + .unit-label {
  display: inline;
}

/* ═══ Light Theme Overrides ═══ */

/* --- Header Icon --- */
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Cpath d='M4 7V4h16v3M9 20h6M12 4v16'/%3E%3C/svg%3E");
  filter: none;
}

/* --- Success Hint --- */
[data-theme='light'] .success-hint {
  color: #16a34a;
}

/* --- Slider Thumbs (lighter shadows) --- */
[data-theme='light'] .slider::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider:disabled::-webkit-slider-thumb {
  background: #bbb;
}

[data-theme='light'] .slider-small::-webkit-slider-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .slider-small::-moz-range-thumb {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

/* --- Active & Primary Buttons (gold bg → blue rgba) --- */
[data-theme='light'] .btn-small.active {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.08);
}

[data-theme='light'] .btn-primary:hover:not(:disabled) {
  background: rgba(1, 79, 153, 0.15);
}

/* --- Danger Buttons --- */
[data-theme='light'] .btn-danger {
  background: rgba(244, 67, 54, 0.08);
  color: #c62828;
}

[data-theme='light'] .btn-danger:hover {
  background: rgba(244, 67, 54, 0.12);
}

/* --- Divider --- */
[data-theme='light'] .divider {
  background: linear-gradient(90deg, transparent 0%, rgba(201, 152, 77, 0.4) 50%, transparent 100%);
}

/* --- Muted Text --- */
[data-theme='light'] .info-text {
  color: #4d6d8e;
}

/* --- Effect Details & Advanced Settings (dark overlays → light tints) --- */
[data-theme='light'] .effect-details {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .advanced-settings {
  background: rgba(1, 79, 153, 0.04);
}

/* --- Reset Buttons --- */
[data-theme='light'] .btn-reset {
  background: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #c62828;
}

[data-theme='light'] .btn-reset:hover {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.5);
  color: #b71c1c;
}

[data-theme='light'] .btn-reset-all-effects {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(255, 150, 100, 0.08) 100%);
  border: 1px solid rgba(244, 67, 54, 0.35);
  color: #c62828;
}

[data-theme='light'] .btn-reset-all-effects:hover {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(255, 150, 100, 0.15) 100%);
  border-color: rgba(244, 67, 54, 0.5);
  color: #b71c1c;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.1);
}

/* --- Save/Load Preset Buttons --- */
[data-theme='light'] .btn-save-preset {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(129, 199, 132, 0.08) 100%);
  border: 1px solid rgba(76, 175, 80, 0.35);
  color: #2e7d32;
}

[data-theme='light'] .btn-save-preset:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.15) 100%);
  border-color: rgba(76, 175, 80, 0.5);
  color: #1b5e20;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
}

[data-theme='light'] .btn-load-preset {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.08) 0%, rgba(1, 79, 153, 0.05) 100%);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-load-preset:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.15) 0%, rgba(1, 79, 153, 0.1) 100%);
  border-color: rgba(1, 79, 153, 0.5);
  color: #003971;
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.1);
}

/* --- Typewriter Settings --- */
[data-theme='light'] .typewriter-settings {
  background: rgba(1, 79, 153, 0.04);
}

/* --- New Text Style Section --- */
[data-theme='light'] .new-text-style-section {
  background: rgba(1, 79, 153, 0.04);
  border: 1px solid rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .new-text-style-section h4 {
  color: #014f99;
}

/* --- Settings Actions --- */
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

/* --- Auto-Fit Settings --- */
[data-theme='light'] .auto-fit-settings {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .auto-fit-settings label {
  color: #4d6d8e;
}

/* --- Collapsible Sections --- */
[data-theme='light'] .collapsible-section {
  background-color: #FFFFFF;
  border: 1px solid rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .collapsible-section:hover {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .collapsible-section[open] {
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .section-header {
  background: linear-gradient(135deg, #f9f2d5 0%, #FFFFFF 100%);
  color: #003971;
}

[data-theme='light'] .section-header:hover {
  background: linear-gradient(135deg, #FFFFFF 0%, #f9f2d5 100%);
  color: #014f99;
}

[data-theme='light'] .collapsible-section[open] .section-header {
  border-bottom: 1px solid rgba(1, 79, 153, 0.12);
  background: linear-gradient(135deg, #FFFFFF 0%, #f9f2d5 100%);
}

[data-theme='light'] .section-header::before {
  color: #014f99;
}

[data-theme='light'] .section-content {
  background-color: #FFFFFF;
}

/* --- Status Badge --- */
[data-theme='light'] .status-badge {
  background-color: #e8e0c4;
  color: #4d6d8e;
}

[data-theme='light'] .status-badge.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.08) 100%);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.35);
}

/* --- Selection Buttons --- */
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
  0%, 100% { border-color: #2e7d32; }
  50% { border-color: rgba(76, 175, 80, 0.3); }
}

/* --- Selection Info --- */
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

/* --- Number Input --- */
[data-theme='light'] .number-input {
  background-color: #FFFFFF;
  border: 1px solid rgba(1, 79, 153, 0.2);
  color: #003971;
}

[data-theme='light'] .number-input:focus {
  border-color: #014f99;
}

[data-theme='light'] .unit-label {
  color: #4d6d8e;
}

/* --- Position Buttons --- */
[data-theme='light'] .btn-pos {
  background: linear-gradient(135deg, #FFFFFF 0%, #f9f2d5 100%);
  border: 1px solid rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
}

[data-theme='light'] .btn-pos:hover {
  background: linear-gradient(135deg, #f9f2d5 0%, #FFFFFF 100%);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .btn-pos.active {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(1, 79, 153, 0.06) 100%);
  border-color: #014f99;
  color: #014f99;
}
</style>
