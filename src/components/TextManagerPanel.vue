<template>
  <div class="panel">
    <h3>Text-Manager</h3>
    
    <!-- Neuer Text Eingabemodus -->
    <div v-if="isAddingNewText" class="panel-section">
      <h4>Neuen Text erstellen</h4>
      
      <div class="control-group">
        <label>Text eingeben (Enter für neue Zeile):</label>
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
          <strong>Tipp für Browser-Texte:</strong> Nach dem Einfügen drücken Sie Enter, um Zeilenumbrüche hinzuzufügen
        </div>
        <div class="hint-text" style="margin-top: 4px;">
          <strong>Aus Notepad/Word:</strong> Zeilenumbrüche werden automatisch erkannt
        </div>
        <div v-if="newTextContent.includes('\n')" class="success-hint">
          {{ newTextContent.split('\n').length }} Zeilen erkannt
        </div>
      </div>

      <!-- ✨ Text-Stil Einstellungen (klappbar) -->
      <details class="collapsible-section" open>
        <summary class="section-header">
          <span class="section-icon">🎨</span>
          <span>Text-Stil</span>
        </summary>
        <div class="section-content">
          <!-- Schriftart -->
          <div class="control-group">
            <label>Schriftart:</label>
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
            <label>Größe: {{ newTextStyle.fontSize }}px</label>
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
              📐 Automatisch an Canvas anpassen
            </label>
            <div v-if="newTextStyle.autoFit" class="auto-fit-settings">
              <label>Rand-Abstand: {{ newTextStyle.autoFitPadding }}%</label>
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
            <label>Textfarbe:</label>
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
            <label>Deckkraft: {{ newTextStyle.opacity }}%</label>
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
            <label>Stil:</label>
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
            <label>Ausrichtung:</label>
            <div class="button-group">
              <button
                @click="newTextStyle.textAlign = 'left'"
                :class="['btn-small', { active: newTextStyle.textAlign === 'left' }]"
              >
                Links
              </button>
              <button
                @click="newTextStyle.textAlign = 'center'"
                :class="['btn-small', { active: newTextStyle.textAlign === 'center' }]"
              >
                Mitte
              </button>
              <button
                @click="newTextStyle.textAlign = 'right'"
                :class="['btn-small', { active: newTextStyle.textAlign === 'right' }]"
              >
                Rechts
              </button>
            </div>
          </div>

          <!-- Einstellungen speichern/laden -->
          <div class="settings-actions">
            <button @click="saveCurrentSettings" class="btn-save" title="Aktuelle Einstellungen als Standard speichern">
              💾 Als Standard speichern
            </button>
            <button @click="clearSavedSettings" class="btn-reset-small" title="Auf Werkseinstellungen zurücksetzen">
              🔄 Zurücksetzen
            </button>
          </div>
        </div>
      </details>

      <!-- ✨ Typewriter-Einstellungen (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">⌨️</span>
          <span>Schreibmaschinen-Effekt</span>
          <span v-if="newTextTypewriter.enabled" class="status-badge active">Aktiv</span>
        </summary>
        <div class="section-content">
          <!-- Typewriter aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextTypewriter.enabled = !newTextTypewriter.enabled"
                :class="['btn-small', 'full-width', { active: newTextTypewriter.enabled }]"
              >
                {{ newTextTypewriter.enabled ? '✓ Aktiviert' : 'Deaktiviert' }}
              </button>
            </div>
          </div>

          <!-- Typewriter-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextTypewriter.enabled">
            <!-- Geschwindigkeit -->
            <div class="control-group">
              <label>Geschwindigkeit: {{ newTextTypewriter.speed }}ms/Buchstabe</label>
              <input
                type="range"
                v-model.number="newTextTypewriter.speed"
                min="10"
                max="200"
                class="slider"
              />
              <div class="hint-text">Niedrig = schneller, Hoch = langsamer</div>
            </div>

            <!-- Start-Verzögerung -->
            <div class="control-group">
              <label>Start-Verzögerung: {{ newTextTypewriter.startDelay }}ms</label>
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
                Animation wiederholen (Loop)
              </label>
            </div>

            <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
            <div v-if="newTextTypewriter.loop" class="control-group">
              <label>Pause zwischen Wiederholungen: {{ newTextTypewriter.loopDelay }}ms</label>
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
                Blinkender Cursor anzeigen
              </label>
            </div>

            <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
            <div v-if="newTextTypewriter.showCursor" class="control-group">
              <label>Cursor-Zeichen:</label>
              <select
                v-model="newTextTypewriter.cursorChar"
                class="select-input"
              >
                <option value="|">| (Strich)</option>
                <option value="_">_ (Unterstrich)</option>
                <option value="▌">▌ (Block)</option>
                <option value="█">█ (Voller Block)</option>
              </select>
            </div>
          </div>
        </div>
      </details>

      <!-- ✨ Fade-Einstellungen (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">🌫️</span>
          <span>Einblend-Effekt (Fade)</span>
          <span v-if="newTextFade.enabled" class="status-badge active">Aktiv</span>
        </summary>
        <div class="section-content">
          <!-- Fade aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextFade.enabled = !newTextFade.enabled"
                :class="['btn-small', 'full-width', { active: newTextFade.enabled }]"
              >
                {{ newTextFade.enabled ? '✓ Aktiviert' : 'Deaktiviert' }}
              </button>
            </div>
          </div>

          <!-- Fade-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextFade.enabled">
            <!-- Richtung -->
            <div class="control-group">
              <label>Richtung:</label>
              <select
                v-model="newTextFade.direction"
                class="select-input"
              >
                <option value="in">Einblenden (0% → 100%)</option>
                <option value="out">Ausblenden (100% → 0%)</option>
                <option value="inOut">Ein- und Ausblenden</option>
              </select>
            </div>

            <!-- Dauer -->
            <div class="control-group">
              <label>Dauer: {{ newTextFade.duration }}ms</label>
              <input
                type="range"
                v-model.number="newTextFade.duration"
                min="100"
                max="20000"
                step="100"
                class="slider"
              />
              <div class="hint-text">Wie lange das Ein-/Ausblenden dauert</div>
            </div>

            <!-- Start-Verzögerung -->
            <div class="control-group">
              <label>Start-Verzögerung: {{ newTextFade.startDelay }}ms</label>
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
              <label>Animation:</label>
              <select
                v-model="newTextFade.easing"
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
                  v-model="newTextFade.loop"
                />
                Animation wiederholen (Loop)
              </label>
            </div>

            <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
            <div v-if="newTextFade.loop" class="control-group">
              <label>Pause zwischen Wiederholungen: {{ newTextFade.loopDelay }}ms</label>
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
          <span>Skalierungs-Effekt (Scale)</span>
          <span v-if="newTextScale.enabled" class="status-badge active">Aktiv</span>
        </summary>
        <div class="section-content">
          <!-- Scale aktivieren -->
          <div class="control-group">
            <div class="button-group">
              <button
                @click="newTextScale.enabled = !newTextScale.enabled"
                :class="['btn-small', 'full-width', { active: newTextScale.enabled }]"
              >
                {{ newTextScale.enabled ? '✓ Aktiviert' : 'Deaktiviert' }}
              </button>
            </div>
          </div>

          <!-- Scale-Einstellungen (nur wenn aktiviert) -->
          <div v-if="newTextScale.enabled">
            <!-- Richtung -->
            <div class="control-group">
              <label>Richtung:</label>
              <select
                v-model="newTextScale.direction"
                class="select-input"
              >
                <option value="in">Reinzoomen (klein → groß)</option>
                <option value="out">Rauszoomen (groß → klein)</option>
                <option value="inOut">Rein und Raus</option>
              </select>
            </div>

            <!-- Start-Skalierung -->
            <div class="control-group">
              <label>Start-Größe: {{ Math.round(newTextScale.startScale * 100) }}%</label>
              <input
                type="range"
                v-model.number="newTextScale.startScale"
                min="0"
                max="3"
                step="0.1"
                class="slider"
              />
              <div class="hint-text">0% = unsichtbar, 100% = normal, 200% = doppelt</div>
            </div>

            <!-- End-Skalierung -->
            <div class="control-group">
              <label>End-Größe: {{ Math.round(newTextScale.endScale * 100) }}%</label>
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
              <label>Dauer: {{ newTextScale.duration }}ms</label>
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
              <label>Start-Verzögerung: {{ newTextScale.startDelay }}ms</label>
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
              <label>Animation:</label>
              <select
                v-model="newTextScale.easing"
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
                  v-model="newTextScale.loop"
                />
                Animation wiederholen (Loop)
              </label>
            </div>

            <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
            <div v-if="newTextScale.loop" class="control-group">
              <label>Pause zwischen Wiederholungen: {{ newTextScale.loopDelay }}ms</label>
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

      <div class="button-row">
        <button @click="createNewText" class="btn-primary" :disabled="!newTextContent.trim()">
          Zum Canvas hinzufügen
        </button>
        <button
          v-if="newTextContent && !newTextContent.includes('\n') && newTextContent.length > 60"
          @click="autoWrapText"
          class="btn-secondary"
          title="Text automatisch in Zeilen umbrechen"
        >
          Auto-Umbruch
        </button>
        <button @click="cancelNewText" class="btn-secondary">
          Abbrechen
        </button>
      </div>
    </div>

    <!-- Normal: Button zum Hinzufügen -->
    <div v-else class="panel-section">
      <button @click="startAddingText" class="btn-primary full-width">
        Neuen Text hinzufügen
      </button>
    </div>

    <!-- Text-Einstellungen (nur wenn Text ausgewählt) -->
    <div v-if="selectedText" class="panel-section">

      <!-- ✨ Text bearbeiten (klappbar) -->
      <details class="collapsible-section" open>
        <summary class="section-header">
          <span class="section-icon">✏️</span>
          <span>Text bearbeiten</span>
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
            <label>Schriftart:</label>
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
            <label>Textfarbe:</label>
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
            <label>Stil:</label>
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
            <label>Ausrichtung:</label>
            <div class="button-group">
              <button
                @click="setTextAlign('left')"
                :class="['btn-small', { active: selectedText.textAlign === 'left' }]"
              >
                Links
              </button>
              <button
                @click="setTextAlign('center')"
                :class="['btn-small', { active: selectedText.textAlign === 'center' }]"
              >
                Mitte
              </button>
              <button
                @click="setTextAlign('right')"
                :class="['btn-small', { active: selectedText.textAlign === 'right' }]"
              >
                Rechts
              </button>
            </div>
          </div>
        </div>
      </details>

      <!-- ✨ Abstände & Kontur (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">↔️</span>
          <span>Abstände & Kontur</span>
          <span v-if="selectedText.stroke.enabled" class="status-badge active">Kontur</span>
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
                {{ selectedText.stroke.enabled ? 'Aktiviert' : 'Deaktiviert' }}
              </button>
            </div>
          </div>

          <!-- Kontur-Einstellungen (nur wenn aktiviert) -->
          <div v-if="selectedText.stroke.enabled">
            <!-- Konturfarbe -->
            <div class="control-group">
              <label>Konturfarbe:</label>
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
              <label>Konturdicke: {{ selectedText.stroke.width }}px</label>
              <input
                type="range"
                v-model.number="selectedText.stroke.width"
                @input="updateText"
                min="1"
                max="10"
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
          <span>Schatten</span>
          <span v-if="selectedText.shadow.blur > 0 || selectedText.shadow.offsetX !== 0 || selectedText.shadow.offsetY !== 0" class="status-badge active">Aktiv</span>
        </summary>
        <div class="section-content">
          <!-- Schattenfarbe -->
          <div class="control-group">
            <label>Schattenfarbe:</label>
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
            <label>Schatten-Unschärfe: {{ selectedText.shadow.blur }}px</label>
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
            <label>Schatten X-Offset: {{ selectedText.shadow.offsetX }}px</label>
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
            <label>Schatten Y-Offset: {{ selectedText.shadow.offsetY }}px</label>
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

      <!-- ✨ AUDIO-REAKTIVE EFFEKTE (klappbar) -->
      <details class="collapsible-section">
        <summary class="section-header">
          <span class="section-icon">🎵</span>
          <span>Audio-Reaktiv</span>
          <span v-if="selectedText.audioReactive?.enabled" class="status-badge active">Aktiv</span>
        </summary>
        <div class="section-content">

      <!-- Aktivieren/Deaktivieren -->
      <div class="control-group">
        <label>Audio-Reaktive Effekte:</label>
        <div class="button-group">
          <button
            @click="toggleAudioReactive"
            :class="['btn-small', { active: selectedText.audioReactive?.enabled }]"
          >
            {{ selectedText.audioReactive?.enabled ? 'Aktiviert' : 'Deaktiviert' }}
          </button>
        </div>
      </div>

      <!-- Audio-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.audioReactive?.enabled">
        <!-- Audio-Quelle -->
        <div class="control-group">
          <label>Audio-Quelle:</label>
          <select
            v-model="selectedText.audioReactive.source"
            @change="updateText"
            class="select-input"
          >
            <option value="bass">Bass (Kick/Drums)</option>
            <option value="mid">Mid (Vocals/Melodie)</option>
            <option value="treble">Treble (Hi-Hats/Höhen)</option>
            <option value="volume">Volume (Gesamt)</option>
            <option value="dynamic">✨ Dynamisch (Auto-Blend)</option>
          </select>
          <div v-if="selectedText.audioReactive.source === 'dynamic'" class="hint-text" style="color: #6ea8fe;">
            Kombiniert automatisch alle Frequenzen basierend auf ihrer aktuellen Energie
          </div>
        </div>

        <!-- Smoothing -->
        <div class="control-group">
          <label>Glättung: {{ selectedText.audioReactive.smoothing }}%</label>
          <input
            type="range"
            v-model.number="selectedText.audioReactive.smoothing"
            @input="updateText"
            min="0"
            max="100"
            class="slider"
          />
          <div class="hint-text">
            Niedrig = schnelle Reaktion, Hoch = sanfte Animation
          </div>
        </div>

        <!-- ✨ Erweiterte Audio-Einstellungen -->
        <details class="advanced-settings">
          <summary>⚙️ Erweiterte Einstellungen</summary>

          <!-- Presets -->
          <div class="control-group">
            <label>Presets:</label>
            <div class="preset-buttons">
              <button @click="applyAudioPreset('punchy')" class="btn-preset" title="Schnelle, knackige Reaktion">
                ⚡ Punchy
              </button>
              <button @click="applyAudioPreset('smooth')" class="btn-preset" title="Sanfte, fließende Animation">
                🌊 Smooth
              </button>
              <button @click="applyAudioPreset('subtle')" class="btn-preset" title="Dezente, subtile Effekte">
                🎭 Subtle
              </button>
              <button @click="applyAudioPreset('extreme')" class="btn-preset" title="Maximale Reaktion">
                🔥 Extrem
              </button>
            </div>
          </div>

          <!-- Threshold -->
          <div class="control-group">
            <label>Schwellenwert: {{ selectedText.audioReactive.threshold || 0 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.threshold"
              @input="updateText"
              min="0"
              max="50"
              class="slider"
            />
            <div class="hint-text">Ignoriert leise Audio-Signale</div>
          </div>

          <!-- Attack -->
          <div class="control-group">
            <label>Attack: {{ selectedText.audioReactive.attack || 90 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.attack"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">Wie schnell der Effekt anspricht</div>
          </div>

          <!-- Release -->
          <div class="control-group">
            <label>Release: {{ selectedText.audioReactive.release || 50 }}%</label>
            <input
              type="range"
              v-model.number="selectedText.audioReactive.release"
              @input="updateText"
              min="10"
              max="100"
              class="slider"
            />
            <div class="hint-text">Wie langsam der Effekt abklingt</div>
          </div>

          <!-- Reset Button -->
          <button @click="resetAudioSettings" class="btn-reset">
            🔄 Zurücksetzen
          </button>
        </details>

        <div class="divider"></div>

        <h4>Effekte auswählen</h4>

        <!-- Effekt-Liste -->
        <div class="effects-grid">
          <!-- Hue (Farbrotation) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.hue.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🎨</span> Farbrotation
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

          <!-- Brightness (Helligkeit) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.brightness.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">☀️</span> Helligkeit
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

          <!-- Scale (Pulsieren) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.scale.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">📐</span> Pulsieren
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

          <!-- Glow (Leuchten) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.glow.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">✨</span> Leuchten
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

          <!-- Shake (Wackeln) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.shake.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🫨</span> Wackeln
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

          <!-- Bounce (Hüpfen) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.bounce.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">⬆️</span> Hüpfen
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

          <!-- Swing (Pendeln) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.swing.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">➡️</span> Pendeln
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

          <!-- Opacity (Blinken) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.opacity.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">👁️</span> Blinken
              </label>
            </div>
            <div v-if="selectedText.audioReactive.effects.opacity.enabled" class="effect-details">
              <div class="effect-intensity">
                <span class="effect-label">Intensität:</span>
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
                <span class="effect-label">Minimum:</span>
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
                Ease-Kurve
              </label>
            </div>
          </div>

          <!-- Letter Spacing (Buchstabenabstand) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.letterSpacing.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">↔️</span> Abstand
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

          <!-- Stroke Width (Kontur) -->
          <div class="effect-item">
            <div class="effect-header">
              <label class="effect-checkbox">
                <input
                  type="checkbox"
                  v-model="selectedText.audioReactive.effects.strokeWidth.enabled"
                  @change="updateText"
                />
                <span class="effect-icon">🖼️</span> Kontur
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
        </div>

        <div class="hint-text" style="margin-top: 10px;">
          Tipp: Aktiviere mehrere Effekte gleichzeitig für komplexe Animationen!
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
                {{ selectedText.animation?.typewriter?.enabled ? 'Aktiviert' : 'Deaktiviert' }}
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
                {{ selectedText.animation?.fade?.enabled ? 'Aktiviert' : 'Deaktiviert' }}
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
                {{ selectedText.animation?.scale?.enabled ? 'Aktiviert' : 'Deaktiviert' }}
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
        </div>
      </details>

      <!-- Löschen Button -->
      <button @click="deleteSelectedText" class="btn-danger full-width" style="margin-top: 16px;">
        Text löschen
      </button>
    </div>

    <!-- Info wenn kein Text ausgewählt und nicht im Eingabemodus -->
    <div v-else-if="!isAddingNewText" class="panel-section">
      <p class="info-text">
        Klicken Sie auf einen Text im Canvas um ihn zu bearbeiten, oder fügen Sie einen neuen Text hinzu.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, nextTick, watch } from 'vue';

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

  nextTick(() => {
    if (newTextInput.value) {
      newTextInput.value.focus();
    }
    // ✨ Font-Dropdown im Eingabemodus befüllen
    populateNewTextFontDropdown();
  });

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

  // ✨ Erstelle den Text mit den benutzerdefinierten Stil-Einstellungen
  const newTextObj = canvasManager.value.addText(normalizedText, {
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

    // ✨ Animations-Einstellungen übernehmen (Typewriter, Fade und/oder Scale)
    const hasTypewriter = newTextTypewriter.value.enabled;
    const hasFade = newTextFade.value.enabled;
    const hasScale = newTextScale.value.enabled;

    if (hasTypewriter || hasFade || hasScale) {
      // Bestimme den Animations-Typ (für Logging)
      const types = [];
      if (hasTypewriter) types.push('typewriter');
      if (hasFade) types.push('fade');
      if (hasScale) types.push('scale');
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
        _state: {
          startTime: null,
          isPlaying: false,
          currentIndex: 0
        }
      };

      if (hasTypewriter) console.log('⌨️ Text mit Typewriter-Effekt erstellt');
      if (hasFade) console.log('🌫️ Text mit Fade-Effekt erstellt');
      if (hasScale) console.log('🔍 Text mit Scale-Effekt erstellt');
    }

    selectedText.value = newTextObj;
    console.log('✅ Text erstellt mit Stil:', newTextStyle.value);
  }

  // Beende den Eingabemodus und setze alle Einstellungen zurück
  isAddingNewText.value = false;
  newTextContent.value = '';
  resetNewTextSettings();

}

// Abbrechen und Eingabemodus verlassen
function cancelNewText() {
  isAddingNewText.value = false;
  newTextContent.value = '';
  resetNewTextSettings();
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
      _state: {
        startTime: null,
        isPlaying: false,
        currentIndex: 0
      }
    };
  }

  // Toggle enabled
  selectedText.value.animation.typewriter.enabled = !selectedText.value.animation.typewriter.enabled;

  // Animation-Typ aktualisieren (berücksichtigt Fade und Scale)
  const hasTypewriter = selectedText.value.animation.typewriter.enabled;
  const hasFade = selectedText.value.animation.fade?.enabled;
  const hasScale = selectedText.value.animation.scale?.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
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

  // Animation-Typ aktualisieren (berücksichtigt Scale)
  const hasTypewriter = selectedText.value.animation.typewriter?.enabled;
  const hasFade = selectedText.value.animation.fade.enabled;
  const hasScale = selectedText.value.animation.scale?.enabled;

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
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

  const types = [];
  if (hasTypewriter) types.push('typewriter');
  if (hasFade) types.push('fade');
  if (hasScale) types.push('scale');
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
    currentOption.style.backgroundColor = '#3a3a3a';
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

  if (!canvasManager.value) return;

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
});
</script>

<style scoped>
/* ===== MAIN PANEL ===== */
.panel {
  background-color: #1e1e1e;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  padding: 14px;
  color: #e0e0e0;
}

/* ===== HEADERS ===== */
h3 {
  margin: 0 0 14px 0;
  font-size: 16px;
  font-weight: 600;
  color: #6ea8fe;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

h4 {
  margin: 14px 0 10px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ===== SECTIONS ===== */
.panel-section {
  margin-bottom: 14px;
}

/* ===== CONTROL GROUPS ===== */
.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ===== INPUTS ===== */
.text-input,
.select-input,
.color-text-input,
.text-area {
  width: 100%;
  padding: 8px 10px;
  background-color: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
}

.font-select {
  max-height: 400px;
}

.font-select option {
  padding: 8px;
}

.text-area {
  min-height: 60px;
  line-height: 1.5;
  font-family: 'Courier New', monospace;
}

.text-input:focus,
.select-input:focus,
.color-text-input:focus,
.text-area:focus {
  outline: none;
  border-color: #6ea8fe;
  background-color: #2a2a2a;
  box-shadow: 0 0 0 3px rgba(110, 168, 254, 0.1);
}

/* ===== HINT TEXT ===== */
.hint-text {
  font-size: 10px;
  color: #777;
  margin-top: 4px;
  line-height: 1.4;
}

.success-hint {
  font-size: 10px;
  color: #4ade80;
  margin-top: 4px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ===== MODERN SLIDERS ===== */
.slider {
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #2a2a2a 0%, #3a3a3a 100%);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #333;
}

.slider:hover {
  border-color: #444;
}

/* ===== SLIDER THUMBS ===== */
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(110, 168, 254, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider::-webkit-slider-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2),
    0 0 20px rgba(110, 168, 254, 0.4);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider::-moz-range-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2);
}

/* ===== COLOR PICKER ===== */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 45px;
  height: 45px;
  border: 2px solid #3a3a3a;
  border-radius: 8px;
  cursor: pointer;
  background-color: #252525;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-input:hover {
  border-color: #6ea8fe;
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(110, 168, 254, 0.3);
}

.color-text-input {
  flex: 1;
  font-family: 'Courier New', monospace;
}

/* ===== BUTTONS ===== */
.button-group {
  display: flex;
  gap: 6px;
}

.button-row {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.button-row button {
  flex: 1;
}

.btn-small {
  flex: 1;
  padding: 7px 10px;
  background-color: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-small:hover {
  background-color: #2d2d2d;
  border-color: #4a4a4a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-small.active {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  border-color: #6ea8fe;
  color: #121212;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.3);
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 9px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  color: #121212;
  box-shadow: 0 2px 4px rgba(110, 168, 254, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(110, 168, 254, 0.3);
}

.btn-primary:disabled {
  background: #3a3a3a;
  color: #666;
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.btn-secondary {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #3a3a3a;
}

.btn-secondary:hover {
  background-color: #333;
  border-color: #4a4a4a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-danger {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(220, 53, 69, 0.9) 100%);
  color: #fff;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.2);
}

.btn-danger:hover {
  background: linear-gradient(135deg, rgba(220, 53, 69, 1) 0%, rgba(200, 35, 51, 1) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
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

/* ===== AUDIO-REAKTIV EFFEKTE GRID ===== */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  background-color: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 8px 10px;
  transition: all 0.2s ease;
}

.effect-item:hover {
  border-color: #4a4a4a;
  background-color: #2a2a2a;
}

.effect-header {
  display: flex;
  align-items: center;
}

.effect-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0e0;
  user-select: none;
}

.effect-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6ea8fe;
}

.effect-icon {
  font-size: 14px;
  margin-right: 2px;
}

.effect-intensity {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #3a3a3a;
}

.effect-details {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border-top: 1px solid #3a3a3a;
}

.effect-details .effect-intensity {
  margin-top: 6px;
  padding-top: 6px;
  border-top: none;
}

.effect-details .effect-intensity:first-child {
  margin-top: 0;
  padding-top: 0;
}

.effect-label {
  font-size: 11px;
  color: #888;
  min-width: 65px;
}

.effect-checkbox-small {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
  margin-top: 8px;
  cursor: pointer;
}

.effect-checkbox-small input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.advanced-settings {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px;
}

.advanced-settings summary {
  cursor: pointer;
  font-size: 13px;
  color: #6ea8fe;
  padding: 4px;
}

.advanced-settings summary:hover {
  color: #8ec5ff;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.btn-preset {
  flex: 1;
  min-width: 70px;
  padding: 6px 8px;
  font-size: 11px;
  background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
  border: 1px solid #444;
  border-radius: 6px;
  color: #ddd;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-preset:hover {
  background: linear-gradient(135deg, #3a3a3a 0%, #4a4a4a 100%);
  border-color: #6ea8fe;
  color: #fff;
  transform: translateY(-1px);
}

.btn-preset:active {
  transform: translateY(0);
}

.btn-reset {
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #3a2a2a 0%, #4a3a3a 100%);
  border: 1px solid #664444;
  border-radius: 6px;
  color: #ffaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: linear-gradient(135deg, #4a3a3a 0%, #5a4a4a 100%);
  border-color: #ff6666;
  color: #fff;
}

.advanced-settings .control-group {
  margin-top: 10px;
}

.advanced-settings .control-group label {
  font-size: 12px;
}

.advanced-settings .hint-text {
  font-size: 10px;
  margin-top: 2px;
}

.slider-small {
  flex: 1;
  height: 4px;
  background: linear-gradient(90deg, #2a2a2a 0%, #3a3a3a 100%);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #333;
}

.slider-small::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.slider-small::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.4);
}

.slider-small::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-value {
  font-size: 11px;
  color: #6ea8fe;
  font-weight: 600;
  min-width: 35px;
  text-align: right;
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
  background: linear-gradient(135deg, #3a3a3a 0%, #4a4a4a 100%);
  border: 1px solid #555;
  border-radius: 6px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-small:hover {
  background: linear-gradient(135deg, #4a4a4a 0%, #5a5a5a 100%);
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
  color: #999;
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
  background-color: #252525;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.collapsible-section:hover {
  border-color: #4a4a4a;
}

.collapsible-section[open] {
  border-color: #4a4a4a;
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
  background: linear-gradient(135deg, #2a2a2a 0%, #252525 100%);
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  user-select: none;
}

.section-header:hover {
  background: linear-gradient(135deg, #333 0%, #2a2a2a 100%);
  color: #fff;
}

.collapsible-section[open] .section-header {
  border-bottom: 1px solid #3a3a3a;
  background: linear-gradient(135deg, #333 0%, #2d2d2d 100%);
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
  background-color: #1e1e1e;
}

.status-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 10px;
  background-color: #3a3a3a;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-badge.active {
  background: linear-gradient(135deg, #2a5a2a 0%, #3a6a3a 100%);
  color: #8fdf8f;
  border: 1px solid #4a7a4a;
}
</style>
