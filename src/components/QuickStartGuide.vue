<template>
  <!-- Floating Help Button -->
  <div class="help-button-container">
    <button
      @click="toggleGuide"
      class="help-button"
      :class="{ active: isVisible }"
      :title="
        isVisible
          ? lang === 'de'
            ? 'Schließen'
            : 'Close'
          : lang === 'de'
            ? 'Schnellstart-Hilfe'
            : 'Quick-Start Guide'
      "
    >
      <svg v-if="!isVisible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>

  <!-- Quick Start Panel -->
  <Teleport to="body">
    <transition name="slide-panel">
      <div v-if="isVisible" class="quick-start-panel">
        <div class="panel-header">
          <h3>{{ lang === 'de' ? 'Schnellstart-Anleitung' : 'Quick-Start Guide' }}</h3>
          <div class="header-actions">
            <div class="lang-toggle">
              <button :class="{ active: lang === 'de' }" @click="lang = 'de'">DE</button>
              <button :class="{ active: lang === 'en' }" @click="lang = 'en'">EN</button>
            </div>
            <button @click="toggleGuide" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="panel-content">
          <!-- Tab Navigation -->
          <div class="tab-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ lang === 'de' ? tab.labelDe : tab.labelEn }}</span>
            </button>
          </div>

          <!-- Tab: Workflow -->
          <div v-if="activeTab === 'workflow'" class="tab-content">
            <div class="workflow-steps">
              <div class="workflow-step" v-for="(step, idx) in content[lang].workflow" :key="idx">
                <div class="step-number">{{ idx + 1 }}</div>
                <div class="step-info">
                  <span class="step-title">{{ step.title }}</span>
                  <span class="step-desc">{{ step.desc }}</span>
                </div>
                <span class="step-icon">{{ step.icon }}</span>
              </div>
            </div>
          </div>

          <!-- Tab: Features -->
          <div v-if="activeTab === 'features'" class="tab-content">
            <div class="feature-list">
              <div class="feature-item" v-for="(f, idx) in content[lang].features" :key="idx">
                <div class="feature-header">
                  <span class="feature-icon">{{ f.icon }}</span>
                  <span class="feature-title">{{ f.title }}</span>
                </div>
                <ul class="feature-bullets">
                  <li v-for="(b, bidx) in f.bullets" :key="bidx">{{ b }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Tab: Shortcuts -->
          <div v-if="activeTab === 'shortcuts'" class="tab-content">
            <div
              class="shortcut-group"
              v-for="(group, gidx) in content[lang].shortcuts"
              :key="gidx"
            >
              <div class="shortcut-group-title">{{ group.title }}</div>
              <div class="shortcuts-grid">
                <div class="shortcut-item" v-for="(sc, sidx) in group.items" :key="sidx">
                  <div class="shortcut-keys">
                    <kbd v-for="(k, kidx) in sc.keys" :key="kidx">{{ k }}</kbd>
                  </div>
                  <span class="shortcut-desc">{{ sc.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Tips -->
          <div v-if="activeTab === 'tips'" class="tab-content">
            <div class="tips-list">
              <div class="tip-item" v-for="(tip, idx) in content[lang].tips" :key="idx">
                <span class="tip-icon">{{ tip.icon }}</span>
                <div class="tip-body">
                  <span class="tip-title" v-if="tip.title">{{ tip.title }}</span>
                  <span class="tip-text">{{ tip.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)
const lang = ref(localStorage.getItem('locale') || 'de')
const activeTab = ref('workflow')

const tabs = [
  { id: 'workflow', icon: '▶', labelDe: 'Workflow', labelEn: 'Workflow' },
  { id: 'features', icon: '✦', labelDe: 'Funktionen', labelEn: 'Features' },
  { id: 'shortcuts', icon: '⌨', labelDe: 'Tasten', labelEn: 'Keys' },
  { id: 'tips', icon: '💡', labelDe: 'Tipps', labelEn: 'Tips' },
]

const content = {
  de: {
    workflow: [
      {
        title: 'Audio hochladen',
        desc: 'Dateien oder ganzen Ordner per Button oder Drag & Drop laden',
        icon: '🎵',
      },
      {
        title: 'Visualizer wählen',
        desc: '30+ Effekte in 7 Kategorien — live vorschaubar',
        icon: '🎨',
      },
      {
        title: 'Farbe & Intensität',
        desc: 'Farbwähler und Intensitäts-Schieberegler im Visualizer-Panel',
        icon: '🎛',
      },
      {
        title: 'Text hinzufügen',
        desc: 'Linkes Panel → Text-Manager: Stil, Größe, Animation wählen',
        icon: '✏️',
      },
      {
        title: 'Bilder einbinden',
        desc: 'Linkes Panel → Bilder: eigene Fotos oder Stock-Galerie',
        icon: '🖼',
      },
      {
        title: 'Beat-Marker setzen',
        desc: 'Taste M oder ✦-Button im Player — Visualizer/Farbe wechselt automatisch',
        icon: '🎯',
      },
      {
        title: 'Aufnahme vorbereiten',
        desc: 'Taste P oder „Prepare" drücken — Format & Qualität wählen',
        icon: '⚙️',
      },
      {
        title: 'Aufnehmen',
        desc: 'Taste R oder „Start" — Musik starten, am Ende „Stop" drücken',
        icon: '🎬',
      },
    ],
    features: [
      {
        icon: '🎵',
        title: 'Audio & Player',
        bullets: [
          'MP3, WAV, OGG, M4A – Einzeldateien oder ganzer Ordner',
          'Drag & Drop auf die Upload-Fläche',
          'Playlist mit Drag-Neuordnung',
          'Bass- und Höhen-EQ (±12 dB)',
          'Mikrofon als Audioquelle wählbar',
        ],
      },
      {
        icon: '🎨',
        title: 'Visualizer',
        bullets: [
          '30+ Effekte: Balken, Wellen, Kreise, Partikel, Retro, Geometrie, Tech',
          'Farbe frei wählbar, Intensität regelbar',
          'Mehrere Visualizer-Ebenen überlagern (Layer-Panel)',
          'Echtzeit-Vorschau während der Musikwiedergabe',
        ],
      },
      {
        icon: '🎯',
        title: 'Beat-Marker',
        bullets: [
          'Marker an beliebiger Position setzen (Taste M)',
          'Jeder Marker kann Visualizer und/oder Farbe wechseln',
          'Marker auf Fortschrittsbalken sichtbar, anklickbar',
          'Marker-Liste bearbeiten, löschen, deaktivieren',
        ],
      },
      {
        icon: '✏️',
        title: 'Text & Bilder',
        bullets: [
          'Text mit Schriftart, Größe, Farbe, Schatten & Animation',
          'Bilder: eigene Uploads oder integrierte Stock-Galerie',
          'Audio-reaktive Skalierung für Text und Bilder',
          'Slideshow-Modus für mehrere Bilder',
          'Platzierung & Deckkraft frei einstellbar',
        ],
      },
      {
        icon: '🖼',
        title: 'Hintergrund',
        bullets: [
          'Kachel-Hintergrund aus der Galerie wählen',
          'Eigenes Bild als Hintergrund hochladen',
          'Hintergrundfarbe oder Verlauf festlegen',
        ],
      },
      {
        icon: '🎬',
        title: 'Aufnahme & Export',
        bullets: [
          'WebM-Video-Export (VP8/VP9)',
          'Qualitätsstufen: Low / Medium / High / Ultra',
          'Screenshot (PNG) jederzeit möglich',
          'Workspace-Formate: 16:9, 9:16, 1:1, 4:3 u. a.',
        ],
      },
    ],
    shortcuts: [
      {
        title: '🎵 Player',
        items: [
          { keys: ['Space'], desc: 'Play / Pause' },
          { keys: ['M'], desc: 'Beat-Marker setzen' },
          { keys: ['Shift', 'M'], desc: 'Stumm schalten' },
          { keys: ['←', '→'], desc: 'Vorheriger / Nächster Track' },
        ],
      },
      {
        title: '🎬 Aufnahme',
        items: [
          { keys: ['P'], desc: 'Aufnahme vorbereiten' },
          { keys: ['R'], desc: 'Aufnahme Start / Stop' },
        ],
      },
      {
        title: '🎨 Objekte',
        items: [
          { keys: ['Entf'], desc: 'Auswahl löschen' },
          { keys: ['Strg', 'D'], desc: 'Duplizieren' },
          { keys: ['Strg', 'C'], desc: 'Kopieren' },
          { keys: ['Strg', 'V'], desc: 'Einfügen' },
          { keys: ['↑↓←→'], desc: 'Verschieben (5 px)' },
          { keys: ['Shift', '↑↓←→'], desc: 'Verschieben (20 px)' },
          { keys: ['Strg', '↑↓←→'], desc: 'Größe ändern (5 px)' },
        ],
      },
      {
        title: '👁 Ansicht',
        items: [
          { keys: ['G'], desc: 'Gitter ein/aus' },
          { keys: ['Esc'], desc: 'Auswahl aufheben' },
          { keys: ['?'], desc: 'Hilfe öffnen/schließen' },
        ],
      },
    ],
    tips: [
      {
        icon: '📐',
        title: 'Workspace zuerst wählen',
        text: 'Stelle das Format (z. B. 9:16 für TikTok) ganz zu Beginn ein – das beeinflusst Canvas-Größe und Positionierung aller Elemente.',
      },
      {
        icon: '🎯',
        title: 'Beat-Marker nutzen',
        text: 'Setze Marker an Drops und Übergängen, um Visualizer und Farbe automatisch zu wechseln – keine manuelle Eingriffe nötig.',
      },
      {
        icon: '🎛',
        title: 'Intensität moderat halten',
        text: 'Werte zwischen 0.6 – 0.9 sehen im Video besser aus als maximale Intensität, die leicht übersättigt wirkt.',
      },
      {
        icon: '🖼',
        title: 'Bilder audio-reaktiv machen',
        text: 'Im Bilder-Panel „Audio-reaktiv" aktivieren – das Bild pulst mit dem Bass und erzeugt einen professionellen Look.',
      },
      {
        icon: '🎬',
        title: 'Qualität vs. Dateigröße',
        text: '„High" reicht für Social Media aus. „Ultra" nur für Endproduktionen nötig – doppelte Dateigröße bei kaum sichtbarem Unterschied.',
      },
      {
        icon: '💡',
        title: 'Ordner hochladen',
        text: 'Ziehe einen ganzen Musik-Ordner auf die Upload-Fläche oder nutze den „Ordner"-Button – alle Audio-Dateien werden automatisch gefunden.',
      },
      {
        icon: '⚡',
        title: 'Layer für Tiefe',
        text: 'Kombiniere zwei Visualizer-Ebenen (z. B. Kreise + Partikel) für komplexere Looks ohne Performance-Verlust.',
      },
    ],
  },

  en: {
    workflow: [
      {
        title: 'Upload audio',
        desc: 'Load files or an entire folder via button or drag & drop',
        icon: '🎵',
      },
      {
        title: 'Choose a visualizer',
        desc: '30+ effects in 7 categories — live preview while playing',
        icon: '🎨',
      },
      {
        title: 'Set color & intensity',
        desc: 'Color picker and intensity slider in the Visualizer panel',
        icon: '🎛',
      },
      {
        title: 'Add text',
        desc: 'Left panel → Text Manager: choose style, size and animation',
        icon: '✏️',
      },
      {
        title: 'Add images',
        desc: 'Left panel → Images: upload your own or use the stock gallery',
        icon: '🖼',
      },
      {
        title: 'Set beat markers',
        desc: 'Press M or the ✦ button in the player — visualizer/color switches automatically',
        icon: '🎯',
      },
      {
        title: 'Prepare recording',
        desc: 'Press P or click "Prepare" — select format & quality',
        icon: '⚙️',
      },
      {
        title: 'Record',
        desc: 'Press R or click "Start" — start the music, then hit "Stop" at the end',
        icon: '🎬',
      },
    ],
    features: [
      {
        icon: '🎵',
        title: 'Audio & Player',
        bullets: [
          'MP3, WAV, OGG, M4A – single files or entire folders',
          'Drag & drop onto the upload area',
          'Playlist with drag-to-reorder',
          'Bass and treble EQ (±12 dB)',
          'Microphone as audio source',
        ],
      },
      {
        icon: '🎨',
        title: 'Visualizer',
        bullets: [
          '30+ effects: Bars, Waves, Circles, Particles, Retro, Geometry, Tech',
          'Freely choosable color, adjustable intensity',
          'Stack multiple visualizer layers (Layer panel)',
          'Real-time preview during playback',
        ],
      },
      {
        icon: '🎯',
        title: 'Beat Markers',
        bullets: [
          'Place a marker at any position (press M)',
          'Each marker can switch visualizer and/or color',
          'Markers visible & clickable on the progress bar',
          'Edit, delete or disable markers in the list',
        ],
      },
      {
        icon: '✏️',
        title: 'Text & Images',
        bullets: [
          'Text with font, size, color, shadow & animation',
          'Images: own uploads or built-in stock gallery',
          'Audio-reactive scaling for text and images',
          'Slideshow mode for multiple images',
          'Free placement and opacity control',
        ],
      },
      {
        icon: '🖼',
        title: 'Background',
        bullets: [
          'Tile background from the gallery',
          'Upload a custom image as background',
          'Set a solid color or gradient background',
        ],
      },
      {
        icon: '🎬',
        title: 'Recording & Export',
        bullets: [
          'WebM video export (VP8/VP9)',
          'Quality levels: Low / Medium / High / Ultra',
          'Screenshot (PNG) at any time',
          'Workspace formats: 16:9, 9:16, 1:1, 4:3 and more',
        ],
      },
    ],
    shortcuts: [
      {
        title: '🎵 Player',
        items: [
          { keys: ['Space'], desc: 'Play / Pause' },
          { keys: ['M'], desc: 'Add beat marker' },
          { keys: ['Shift', 'M'], desc: 'Mute / unmute' },
          { keys: ['←', '→'], desc: 'Previous / Next track' },
        ],
      },
      {
        title: '🎬 Recording',
        items: [
          { keys: ['P'], desc: 'Prepare recording' },
          { keys: ['R'], desc: 'Start / Stop recording' },
        ],
      },
      {
        title: '🎨 Objects',
        items: [
          { keys: ['Del'], desc: 'Delete selection' },
          { keys: ['Ctrl', 'D'], desc: 'Duplicate' },
          { keys: ['Ctrl', 'C'], desc: 'Copy' },
          { keys: ['Ctrl', 'V'], desc: 'Paste' },
          { keys: ['↑↓←→'], desc: 'Move (5 px)' },
          { keys: ['Shift', '↑↓←→'], desc: 'Move fast (20 px)' },
          { keys: ['Ctrl', '↑↓←→'], desc: 'Resize (5 px)' },
        ],
      },
      {
        title: '👁 View',
        items: [
          { keys: ['G'], desc: 'Toggle grid' },
          { keys: ['Esc'], desc: 'Deselect all' },
          { keys: ['?'], desc: 'Open/close help' },
        ],
      },
    ],
    tips: [
      {
        icon: '📐',
        title: 'Set workspace first',
        text: 'Choose the format (e.g. 9:16 for TikTok) at the very beginning — it affects canvas size and positioning of all elements.',
      },
      {
        icon: '🎯',
        title: 'Use beat markers',
        text: 'Place markers at drops and transitions to switch visualizer and color automatically — no manual interaction needed.',
      },
      {
        icon: '🎛',
        title: 'Keep intensity moderate',
        text: 'Values between 0.6–0.9 look better in video than maximum intensity, which can appear oversaturated.',
      },
      {
        icon: '🖼',
        title: 'Make images audio-reactive',
        text: 'Enable "Audio-reactive" in the Images panel — the image pulses with the bass for a professional look.',
      },
      {
        icon: '🎬',
        title: 'Quality vs. file size',
        text: '"High" is sufficient for social media. "Ultra" is only needed for final productions — double the file size with barely visible difference.',
      },
      {
        icon: '💡',
        title: 'Upload a folder',
        text: 'Drag a whole music folder onto the upload area or use the "Folder" button — all audio files will be found automatically.',
      },
      {
        icon: '⚡',
        title: 'Layers for depth',
        text: 'Combine two visualizer layers (e.g. Circles + Particles) for more complex looks without performance loss.',
      },
    ],
  },
}

function toggleGuide() {
  isVisible.value = !isVisible.value
}

function handleKeydown(e) {
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    if (!e.target.matches('input, textarea, select')) {
      e.preventDefault()
      toggleGuide()
    }
  }
  if (e.key === 'Escape' && isVisible.value) {
    isVisible.value = false
  }
}

function show() {
  isVisible.value = true
}
function hide() {
  isVisible.value = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // Sync language with app locale changes
  window.addEventListener('locale-changed', (e) => {
    if (e.detail?.locale) lang.value = e.detail.locale
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose({ show, hide, toggleGuide })
</script>

<style scoped>
/* Floating Help Button */
.help-button-container {
  position: fixed;
  bottom: calc(24px + var(--sticky-player-bar-height));
  right: 24px;
  z-index: calc(var(--ds-z-player) - 1);
}

.help-button {
  width: 52px;
  height: 52px;
  border-radius: var(--ds-radius-full);
  border: none;
  background: var(--ds-link);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration-slow) var(--ds-ease);
  animation: pulse-shadow 2s infinite;
}

.help-button.active {
  background: var(--ds-danger);
  animation: none;
}

.help-button svg {
  width: 24px;
  height: 24px;
}

@keyframes pulse-shadow {
}

/* Quick Start Panel */
.quick-start-panel {
  position: fixed;
  bottom: calc(90px + var(--sticky-player-bar-height));
  right: 24px;
  width: 380px;
  max-height: calc(100vh - 120px - var(--sticky-player-bar-height));
  background: var(--primary-bg);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-overlay);
  z-index: var(--ds-z-player);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ds-border);
  background: rgba(0, 0, 0, 0.2);
  gap: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Language Toggle */
.lang-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.07);
  border-radius: var(--ds-radius-sm);
  padding: 2px;
  gap: 2px;
}

.lang-toggle button {
  padding: 3px 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  border: none;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-text-3);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  letter-spacing: 0.5px;
}

.lang-toggle button.active {
  background: var(--ds-link);
  color: var(--ds-on-accent);
}

.close-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--ds-text-2);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
  flex-shrink: 0;
}

.close-btn:hover {
  background: color-mix(in srgb, var(--ds-danger) 25%, transparent);
  color: var(--ds-danger);
}

.close-btn svg {
  width: 13px;
  height: 13px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 4px;
  padding: 10px 14px 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  color: var(--ds-text-3);
}

.tab-btn:hover {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  color: var(--ds-text-2);
}

.tab-btn.active {
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 40%, transparent);
  color: var(--ds-link);
}

.tab-icon {
  font-size: var(--ds-text-sm);
}

.tab-label {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Scrollable content area */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 14px;
}

.tab-content {
  padding: 14px;
}

/* Workflow Steps */
.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--ds-radius-md);
  transition: all var(--ds-duration) var(--ds-ease);
}

.workflow-step:hover {
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
}

.step-number {
  width: 22px;
  height: 22px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  color: var(--ds-on-accent);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.step-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.step-desc {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  line-height: 1.35;
}

.step-icon {
  font-size: var(--ds-text-lg);
  flex-shrink: 0;
}

/* Features */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--ds-radius-md);
  padding: 10px 12px;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
}

.feature-icon {
  font-size: var(--ds-text-lg);
}

.feature-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-link);
}

.feature-bullets {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-bullets li {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  line-height: 1.4;
}

/* Shortcuts */
.shortcut-group {
  margin-bottom: 14px;
}

.shortcut-group:last-child {
  margin-bottom: 0;
}

.shortcut-group-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-link);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 7px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 9px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--ds-radius-sm);
}

.shortcut-keys {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.shortcut-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-family: inherit;
  color: var(--ds-text);
}

.shortcut-desc {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

/* Tips */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 11px;
  background: color-mix(in srgb, var(--ds-warning) 7%, transparent);
  border-radius: var(--ds-radius-md);
  border-left: 3px solid color-mix(in srgb, var(--ds-warning) 45%, transparent);
}

.tip-icon {
  font-size: var(--ds-text-lg);
  flex-shrink: 0;
  margin-top: 1px;
}

.tip-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-warning);
}

.tip-text {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  line-height: 1.45;
}

/* Scrollbar */
.panel-content::-webkit-scrollbar {
  width: 5px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--ds-radius-sm);
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Transitions */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all var(--ds-duration-slow) var(--ds-ease);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

/* Responsive */
@media (max-width: 420px) {
  .quick-start-panel {
    right: 10px;
    left: 10px;
    width: auto;
    bottom: calc(78px + var(--sticky-player-bar-height-mobile));
  }

  .help-button-container {
    right: 14px;
    bottom: calc(14px + var(--sticky-player-bar-height-mobile));
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .help-button {
  background: var(--accent-primary);
}

[data-theme='light'] .quick-start-panel {
  background: var(--card-bg);
  border-color: var(--ds-border);
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .panel-header {
  border-bottom-color: var(--ds-border);
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .panel-header h3 {
  color: var(--text-primary);
}

[data-theme='light'] .lang-toggle {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
}

[data-theme='light'] .lang-toggle button {
  color: var(--text-muted);
}

[data-theme='light'] .lang-toggle button.active {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .close-btn {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-muted);
}

[data-theme='light'] .close-btn:hover {
  background: color-mix(in srgb, var(--ds-danger) 12%, transparent);
}

[data-theme='light'] .tab-btn {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
  color: var(--text-muted);
}

[data-theme='light'] .tab-btn:hover {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  color: var(--text-primary);
}

[data-theme='light'] .tab-btn.active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

[data-theme='light'] .workflow-step {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .workflow-step:hover {
  background: color-mix(in srgb, var(--accent-primary) 9%, transparent);
}

[data-theme='light'] .step-number {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .step-title {
  color: var(--text-primary);
}
[data-theme='light'] .step-desc {
  color: var(--text-muted);
}

[data-theme='light'] .feature-item {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
}

[data-theme='light'] .feature-title {
  color: var(--accent-ink);
}

[data-theme='light'] .feature-bullets li {
  color: var(--text-muted);
}

[data-theme='light'] .shortcut-item {
  background: color-mix(in srgb, var(--accent-primary) 3%, transparent);
}

[data-theme='light'] .shortcut-group-title {
  color: var(--accent-ink);
}

[data-theme='light'] .shortcut-keys kbd {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme='light'] .shortcut-desc {
  color: var(--text-muted);
}

[data-theme='light'] .tip-item {
  background: color-mix(in srgb, var(--accent-primary) 9%, transparent);
  border-left-color: var(--accent-primary);
}

[data-theme='light'] .tip-title {
  color: var(--accent-ink);
}
[data-theme='light'] .tip-text {
  color: var(--text-muted);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-primary) 28%, transparent);
}
</style>
