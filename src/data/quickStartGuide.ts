// Inhalte der Schnellstart-Anleitung (QuickStartGuide.vue), je Sprache.
// Reine Daten: Beschriftungen, Reiter, Workflow-Schritte, Funktionen, Tastenkürzel, Tipps.
// Beide Sprachen müssen dieselbe Struktur haben (siehe QuickStartGuide.spec.js).

export const QUICK_START_TABS = ['workflow', 'features', 'shortcuts', 'tips']

export const QUICK_START_CONTENT = {
  de: {
    labels: {
      title: 'Schnellstart-Anleitung',
      open: 'Schnellstart-Hilfe',
      close: 'Schließen',
      language: 'Sprache der Anleitung',
      tabs: 'Bereiche der Anleitung',
      workflow: 'Workflow',
      features: 'Funktionen',
      shortcuts: 'Tasten',
      tips: 'Tipps',
    },
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
          { keys: ['Strg', 'Z'], desc: 'Rückgängig' },
          { keys: ['Strg', 'Y'], desc: 'Wiederholen' },
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
    labels: {
      title: 'Quick-Start Guide',
      open: 'Quick-Start Guide',
      close: 'Close',
      language: 'Guide language',
      tabs: 'Guide sections',
      workflow: 'Workflow',
      features: 'Features',
      shortcuts: 'Keys',
      tips: 'Tips',
    },
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
          { keys: ['Ctrl', 'Z'], desc: 'Undo' },
          { keys: ['Ctrl', 'Y'], desc: 'Redo' },
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
