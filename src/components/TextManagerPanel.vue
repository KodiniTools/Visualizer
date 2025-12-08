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
      <h4>Text bearbeiten</h4>
      
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

      <div class="divider"></div>

      <h4>Abstände & Kontur</h4>

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

      <div class="divider"></div>

      <h4>Schatten</h4>

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

      <div class="divider"></div>

      <!-- Rotation -->
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

      <div class="divider"></div>

      <!-- ✨ AUDIO-REAKTIVE EFFEKTE -->
      <h4>Audio-Reaktiv</h4>

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
          </select>
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
            <div v-if="selectedText.audioReactive.effects.opacity.enabled" class="effect-intensity">
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

      <div class="divider"></div>

      <!-- Löschen Button -->
      <button @click="deleteSelectedText" class="btn-danger full-width">
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
  
  nextTick(() => {
    if (newTextInput.value) {
      newTextInput.value.focus();
    }
  });
  
}

// Erstelle den Text auf dem Canvas
function createNewText() {
  if (!canvasManager.value || !newTextContent.value.trim()) {
    return;
  }
  
  // ✨ Normalisiere Zeilenumbrüche bevor der Text erstellt wird
  const normalizedText = normalizeLineBreaks(newTextContent.value);
  const lineCount = normalizedText.split('\n').length;
  
  // Erstelle den Text mit dem normalisierten Inhalt
  const newTextObj = canvasManager.value.addText(normalizedText, {
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ffffff',
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
  
  // ✨ FIX: Setze den neuen Text direkt als selectedText
  if (newTextObj) {
    selectedText.value = newTextObj;
  }
  
  // Beende den Eingabemodus
  isAddingNewText.value = false;
  newTextContent.value = '';
  
}

// Abbrechen und Eingabemodus verlassen
function cancelNewText() {
  isAddingNewText.value = false;
  newTextContent.value = '';
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
        effects: {
          hue: { enabled: false, intensity: 80 },
          brightness: { enabled: false, intensity: 80 },
          scale: { enabled: false, intensity: 80 },
          glow: { enabled: false, intensity: 80 },
          shake: { enabled: false, intensity: 80 },
          bounce: { enabled: false, intensity: 80 },
          swing: { enabled: false, intensity: 80 },
          opacity: { enabled: false, intensity: 80 },
          letterSpacing: { enabled: false, intensity: 80 },
          strokeWidth: { enabled: false, intensity: 80 }
        }
      };
    }
    selectedText.value.audioReactive.enabled = !selectedText.value.audioReactive.enabled;
    updateText();
  }
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
        effects: {
          hue: { enabled: false, intensity: 80 },
          brightness: { enabled: false, intensity: 80 },
          scale: { enabled: false, intensity: 80 },
          glow: { enabled: false, intensity: 80 },
          shake: { enabled: false, intensity: 80 },
          bounce: { enabled: false, intensity: 80 },
          swing: { enabled: false, intensity: 80 },
          opacity: { enabled: false, intensity: 80 },
          letterSpacing: { enabled: false, intensity: 80 },
          strokeWidth: { enabled: false, intensity: 80 }
        }
      };
    }

    selectedText.value = obj;
    isAddingNewText.value = false;

    // ✨ FIX: Font-Dropdown befüllen nachdem ein Text ausgewählt wurde
    nextTick(() => {
      populateFontDropdown();
      // ✨ NEU: Editor-Textarea automatisch fokussieren bei Klick auf Text
      if (editTextInput.value) {
        editTextInput.value.focus();
      }
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
    color: '#ffffff',
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
</style>
