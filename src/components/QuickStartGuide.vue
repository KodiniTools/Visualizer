<template>
  <!-- Floating Help Button -->
  <div class="help-button-container">
    <button @click="toggleGuide" class="help-button" :class="{ active: isVisible }" :title="isVisible ? (lang === 'de' ? 'Schließen' : 'Close') : (lang === 'de' ? 'Schnellstart-Hilfe' : 'Quick-Start Guide')">
      <svg v-if="!isVisible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
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
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
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
            <div class="shortcut-group" v-for="(group, gidx) in content[lang].shortcuts" :key="gidx">
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
import { ref, onMounted, onUnmounted } from 'vue';

const isVisible = ref(false);
const lang = ref(localStorage.getItem('locale') || 'de');
const activeTab = ref('workflow');

const tabs = [
  { id: 'workflow', icon: '▶', labelDe: 'Workflow',  labelEn: 'Workflow' },
  { id: 'features', icon: '✦',  labelDe: 'Funktionen', labelEn: 'Features' },
  { id: 'shortcuts', icon: '⌨', labelDe: 'Tasten',    labelEn: 'Keys' },
  { id: 'tips',      icon: '💡', labelDe: 'Tipps',     labelEn: 'Tips' },
];

const content = {
  de: {
    workflow: [
      { title: 'Audio hochladen', desc: 'Dateien oder ganzen Ordner per Button oder Drag & Drop laden', icon: '🎵' },
      { title: 'Visualizer wählen', desc: '30+ Effekte in 7 Kategorien — live vorschaubar', icon: '🎨' },
      { title: 'Farbe & Intensität', desc: 'Farbwähler und Intensitäts-Schieberegler im Visualizer-Panel', icon: '🎛' },
      { title: 'Text hinzufügen', desc: 'Linkes Panel → Text-Manager: Stil, Größe, Animation wählen', icon: '✏️' },
      { title: 'Bilder einbinden', desc: 'Linkes Panel → Bilder: eigene Fotos oder Stock-Galerie', icon: '🖼' },
      { title: 'Beat-Marker setzen', desc: 'Taste M oder ✦-Button im Player — Visualizer/Farbe wechselt automatisch', icon: '🎯' },
      { title: 'Aufnahme vorbereiten', desc: 'Taste P oder „Prepare" drücken — Format & Qualität wählen', icon: '⚙️' },
      { title: 'Aufnehmen', desc: 'Taste R oder „Start" — Musik starten, am Ende „Stop" drücken', icon: '🎬' },
    ],
    features: [
      {
        icon: '🎵', title: 'Audio & Player',
        bullets: [
          'MP3, WAV, OGG, M4A – Einzeldateien oder ganzer Ordner',
          'Drag & Drop auf die Upload-Fläche',
          'Playlist mit Drag-Neuordnung',
          'Bass- und Höhen-EQ (±12 dB)',
          'Mikrofon als Audioquelle wählbar',
        ]
      },
      {
        icon: '🎨', title: 'Visualizer',
        bullets: [
          '30+ Effekte: Balken, Wellen, Kreise, Partikel, Retro, Geometrie, Tech',
          'Farbe frei wählbar, Intensität regelbar',
          'Mehrere Visualizer-Ebenen überlagern (Layer-Panel)',
          'Echtzeit-Vorschau während der Musikwiedergabe',
        ]
      },
      {
        icon: '🎯', title: 'Beat-Marker',
        bullets: [
          'Marker an beliebiger Position setzen (Taste M)',
          'Jeder Marker kann Visualizer und/oder Farbe wechseln',
          'Marker auf Fortschrittsbalken sichtbar, anklickbar',
          'Marker-Liste bearbeiten, löschen, deaktivieren',
        ]
      },
      {
        icon: '✏️', title: 'Text & Bilder',
        bullets: [
          'Text mit Schriftart, Größe, Farbe, Schatten & Animation',
          'Bilder: eigene Uploads oder integrierte Stock-Galerie',
          'Audio-reaktive Skalierung für Text und Bilder',
          'Slideshow-Modus für mehrere Bilder',
          'Platzierung & Deckkraft frei einstellbar',
        ]
      },
      {
        icon: '🖼', title: 'Hintergrund',
        bullets: [
          'Kachel-Hintergrund aus der Galerie wählen',
          'Eigenes Bild als Hintergrund hochladen',
          'Hintergrundfarbe oder Verlauf festlegen',
        ]
      },
      {
        icon: '🎬', title: 'Aufnahme & Export',
        bullets: [
          'WebM-Video-Export (VP8/VP9)',
          'Qualitätsstufen: Low / Medium / High / Ultra',
          'Screenshot (PNG) jederzeit möglich',
          'Workspace-Formate: 16:9, 9:16, 1:1, 4:3 u. a.',
        ]
      },
    ],
    shortcuts: [
      {
        title: '🎵 Player',
        items: [
          { keys: ['Space'], desc: 'Play / Pause' },
          { keys: ['M'], desc: 'Beat-Marker setzen' },
          { keys: ['←', '→'], desc: 'Vorheriger / Nächster Track' },
        ]
      },
      {
        title: '🎬 Aufnahme',
        items: [
          { keys: ['P'], desc: 'Aufnahme vorbereiten' },
          { keys: ['R'], desc: 'Aufnahme Start / Stop' },
        ]
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
        ]
      },
      {
        title: '👁 Ansicht',
        items: [
          { keys: ['G'], desc: 'Gitter ein/aus' },
          { keys: ['Esc'], desc: 'Auswahl aufheben' },
          { keys: ['?'], desc: 'Hilfe öffnen/schließen' },
        ]
      },
    ],
    tips: [
      { icon: '📐', title: 'Workspace zuerst wählen', text: 'Stelle das Format (z. B. 9:16 für TikTok) ganz zu Beginn ein – das beeinflusst Canvas-Größe und Positionierung aller Elemente.' },
      { icon: '🎯', title: 'Beat-Marker nutzen', text: 'Setze Marker an Drops und Übergängen, um Visualizer und Farbe automatisch zu wechseln – keine manuelle Eingriffe nötig.' },
      { icon: '🎛', title: 'Intensität moderat halten', text: 'Werte zwischen 0.6 – 0.9 sehen im Video besser aus als maximale Intensität, die leicht übersättigt wirkt.' },
      { icon: '🖼', title: 'Bilder audio-reaktiv machen', text: 'Im Bilder-Panel „Audio-reaktiv" aktivieren – das Bild pulst mit dem Bass und erzeugt einen professionellen Look.' },
      { icon: '🎬', title: 'Qualität vs. Dateigröße', text: '„High" reicht für Social Media aus. „Ultra" nur für Endproduktionen nötig – doppelte Dateigröße bei kaum sichtbarem Unterschied.' },
      { icon: '💡', title: 'Ordner hochladen', text: 'Ziehe einen ganzen Musik-Ordner auf die Upload-Fläche oder nutze den „Ordner"-Button – alle Audio-Dateien werden automatisch gefunden.' },
      { icon: '⚡', title: 'Layer für Tiefe', text: 'Kombiniere zwei Visualizer-Ebenen (z. B. Kreise + Partikel) für komplexere Looks ohne Performance-Verlust.' },
    ]
  },

  en: {
    workflow: [
      { title: 'Upload audio', desc: 'Load files or an entire folder via button or drag & drop', icon: '🎵' },
      { title: 'Choose a visualizer', desc: '30+ effects in 7 categories — live preview while playing', icon: '🎨' },
      { title: 'Set color & intensity', desc: 'Color picker and intensity slider in the Visualizer panel', icon: '🎛' },
      { title: 'Add text', desc: 'Left panel → Text Manager: choose style, size and animation', icon: '✏️' },
      { title: 'Add images', desc: 'Left panel → Images: upload your own or use the stock gallery', icon: '🖼' },
      { title: 'Set beat markers', desc: 'Press M or the ✦ button in the player — visualizer/color switches automatically', icon: '🎯' },
      { title: 'Prepare recording', desc: 'Press P or click "Prepare" — select format & quality', icon: '⚙️' },
      { title: 'Record', desc: 'Press R or click "Start" — start the music, then hit "Stop" at the end', icon: '🎬' },
    ],
    features: [
      {
        icon: '🎵', title: 'Audio & Player',
        bullets: [
          'MP3, WAV, OGG, M4A – single files or entire folders',
          'Drag & drop onto the upload area',
          'Playlist with drag-to-reorder',
          'Bass and treble EQ (±12 dB)',
          'Microphone as audio source',
        ]
      },
      {
        icon: '🎨', title: 'Visualizer',
        bullets: [
          '30+ effects: Bars, Waves, Circles, Particles, Retro, Geometry, Tech',
          'Freely choosable color, adjustable intensity',
          'Stack multiple visualizer layers (Layer panel)',
          'Real-time preview during playback',
        ]
      },
      {
        icon: '🎯', title: 'Beat Markers',
        bullets: [
          'Place a marker at any position (press M)',
          'Each marker can switch visualizer and/or color',
          'Markers visible & clickable on the progress bar',
          'Edit, delete or disable markers in the list',
        ]
      },
      {
        icon: '✏️', title: 'Text & Images',
        bullets: [
          'Text with font, size, color, shadow & animation',
          'Images: own uploads or built-in stock gallery',
          'Audio-reactive scaling for text and images',
          'Slideshow mode for multiple images',
          'Free placement and opacity control',
        ]
      },
      {
        icon: '🖼', title: 'Background',
        bullets: [
          'Tile background from the gallery',
          'Upload a custom image as background',
          'Set a solid color or gradient background',
        ]
      },
      {
        icon: '🎬', title: 'Recording & Export',
        bullets: [
          'WebM video export (VP8/VP9)',
          'Quality levels: Low / Medium / High / Ultra',
          'Screenshot (PNG) at any time',
          'Workspace formats: 16:9, 9:16, 1:1, 4:3 and more',
        ]
      },
    ],
    shortcuts: [
      {
        title: '🎵 Player',
        items: [
          { keys: ['Space'], desc: 'Play / Pause' },
          { keys: ['M'], desc: 'Add beat marker' },
          { keys: ['←', '→'], desc: 'Previous / Next track' },
        ]
      },
      {
        title: '🎬 Recording',
        items: [
          { keys: ['P'], desc: 'Prepare recording' },
          { keys: ['R'], desc: 'Start / Stop recording' },
        ]
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
        ]
      },
      {
        title: '👁 View',
        items: [
          { keys: ['G'], desc: 'Toggle grid' },
          { keys: ['Esc'], desc: 'Deselect all' },
          { keys: ['?'], desc: 'Open/close help' },
        ]
      },
    ],
    tips: [
      { icon: '📐', title: 'Set workspace first', text: 'Choose the format (e.g. 9:16 for TikTok) at the very beginning — it affects canvas size and positioning of all elements.' },
      { icon: '🎯', title: 'Use beat markers', text: 'Place markers at drops and transitions to switch visualizer and color automatically — no manual interaction needed.' },
      { icon: '🎛', title: 'Keep intensity moderate', text: 'Values between 0.6–0.9 look better in video than maximum intensity, which can appear oversaturated.' },
      { icon: '🖼', title: 'Make images audio-reactive', text: 'Enable "Audio-reactive" in the Images panel — the image pulses with the bass for a professional look.' },
      { icon: '🎬', title: 'Quality vs. file size', text: '"High" is sufficient for social media. "Ultra" is only needed for final productions — double the file size with barely visible difference.' },
      { icon: '💡', title: 'Upload a folder', text: 'Drag a whole music folder onto the upload area or use the "Folder" button — all audio files will be found automatically.' },
      { icon: '⚡', title: 'Layers for depth', text: 'Combine two visualizer layers (e.g. Circles + Particles) for more complex looks without performance loss.' },
    ]
  }
};

function toggleGuide() {
  isVisible.value = !isVisible.value;
}

function handleKeydown(e) {
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
    if (!e.target.matches('input, textarea, select')) {
      e.preventDefault();
      toggleGuide();
    }
  }
  if (e.key === 'Escape' && isVisible.value) {
    isVisible.value = false;
  }
}

function show() { isVisible.value = true; }
function hide() { isVisible.value = false; }

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  // Sync language with app locale changes
  window.addEventListener('locale-changed', (e) => {
    if (e.detail?.locale) lang.value = e.detail.locale;
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

defineExpose({ show, hide, toggleGuide });
</script>

<style scoped>
/* Floating Help Button */
.help-button-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9998;
}

.help-button {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 20px rgba(110, 168, 254, 0.4),
    0 0 0 0 rgba(110, 168, 254, 0.4);
  transition: all 0.3s ease;
  animation: pulse-shadow 2s infinite;
}

.help-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(110, 168, 254, 0.5);
}

.help-button.active {
  background: linear-gradient(135deg, #F44336 0%, #E91E63 100%);
  animation: none;
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
}

.help-button svg {
  width: 24px;
  height: 24px;
}

@keyframes pulse-shadow {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(110, 168, 254, 0.4), 0 0 0 0 rgba(110, 168, 254, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(110, 168, 254, 0.4), 0 0 0 12px rgba(110, 168, 254, 0);
  }
}

/* Quick Start Panel */
.quick-start-panel {
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 380px;
  max-height: calc(100vh - 120px);
  background: linear-gradient(145deg, var(--primary-bg, #07111f) 0%, var(--secondary-bg, #0E1C32) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  gap: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
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
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.lang-toggle button {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.5px;
}

.lang-toggle button.active {
  background: #6ea8fe;
  color: #0a1628;
}

.close-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(244, 67, 54, 0.25);
  color: #F44336;
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
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.45);
}

.tab-btn:hover {
  background: rgba(110, 168, 254, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.tab-btn.active {
  background: rgba(110, 168, 254, 0.15);
  border-color: rgba(110, 168, 254, 0.4);
  color: #6ea8fe;
}

.tab-icon {
  font-size: 13px;
}

.tab-label {
  font-size: 9px;
  font-weight: 600;
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
  border-radius: 10px;
  transition: all 0.2s ease;
}

.workflow-step:hover {
  background: rgba(110, 168, 254, 0.1);
  transform: translateX(3px);
}

.step-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
  color: #0a1628;
  font-size: 11px;
  font-weight: 700;
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
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.step-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.35;
}

.step-icon {
  font-size: 16px;
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
  border-radius: 10px;
  padding: 10px 12px;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
}

.feature-icon {
  font-size: 15px;
}

.feature-title {
  font-size: 12px;
  font-weight: 700;
  color: #6ea8fe;
}

.feature-bullets {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-bullets li {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.65);
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
  font-size: 10px;
  font-weight: 700;
  color: #6ea8fe;
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
  border-radius: 7px;
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
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  font-size: 9px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
}

.shortcut-desc {
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.48);
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
  background: rgba(255, 193, 7, 0.07);
  border-radius: 9px;
  border-left: 3px solid rgba(255, 193, 7, 0.45);
}

.tip-icon {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}

.tip-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 193, 7, 0.9);
}

.tip-text {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.72);
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
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Transitions */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.28s ease;
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
    bottom: 78px;
  }

  .help-button-container {
    right: 14px;
    bottom: 14px;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}

/* ═══ Light Theme ═══ */
[data-theme='light'] .help-button {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  box-shadow: 0 4px 20px rgba(1, 79, 153, 0.4), 0 0 0 0 rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .help-button:hover {
  box-shadow: 0 6px 30px rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .help-button.active {
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
}

[data-theme='light'] .quick-start-panel {
  background: linear-gradient(145deg, #FFFFFF 0%, #f5f0e8 100%);
  border-color: #d4c8a8;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 57, 113, 0.08);
}

[data-theme='light'] .panel-header {
  border-bottom-color: #d4c8a8;
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .panel-header h3 {
  color: #003971;
}

[data-theme='light'] .lang-toggle {
  background: rgba(1, 79, 153, 0.08);
}

[data-theme='light'] .lang-toggle button {
  color: rgba(0, 57, 113, 0.45);
}

[data-theme='light'] .lang-toggle button.active {
  background: #014f99;
  color: #F5F4D6;
}

[data-theme='light'] .close-btn {
  background: rgba(0, 57, 113, 0.08);
  color: rgba(0, 57, 113, 0.5);
}

[data-theme='light'] .close-btn:hover {
  background: rgba(244, 67, 54, 0.12);
  color: #F44336;
}

[data-theme='light'] .tab-btn {
  background: rgba(1, 79, 153, 0.04);
  color: rgba(0, 57, 113, 0.45);
}

[data-theme='light'] .tab-btn:hover {
  background: rgba(1, 79, 153, 0.1);
  color: #003971;
}

[data-theme='light'] .tab-btn.active {
  background: rgba(1, 79, 153, 0.12);
  border-color: rgba(1, 79, 153, 0.35);
  color: #014f99;
}

[data-theme='light'] .workflow-step {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .workflow-step:hover {
  background: rgba(1, 79, 153, 0.09);
}

[data-theme='light'] .step-number {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #F5F4D6;
}

[data-theme='light'] .step-title { color: #003971; }
[data-theme='light'] .step-desc  { color: #4d6d8e; }

[data-theme='light'] .feature-item {
  background: rgba(1, 79, 153, 0.04);
}

[data-theme='light'] .feature-title { color: #014f99; }

[data-theme='light'] .feature-bullets li { color: #3a5570; }

[data-theme='light'] .shortcut-item {
  background: rgba(1, 79, 153, 0.03);
}

[data-theme='light'] .shortcut-group-title { color: #014f99; }

[data-theme='light'] .shortcut-keys kbd {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.2);
  color: #003971;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .shortcut-desc { color: #4d6d8e; }

[data-theme='light'] .tip-item {
  background: rgba(201, 152, 77, 0.09);
  border-left-color: rgba(201, 152, 77, 0.55);
}

[data-theme='light'] .tip-title  { color: #a07030; }
[data-theme='light'] .tip-text   { color: #3a5570; }

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(1, 79, 153, 0.28);
}
</style>
