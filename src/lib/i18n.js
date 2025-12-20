import { ref, computed } from 'vue'

// Reactive locale state
const currentLocale = ref(localStorage.getItem('locale') || 'de')

// Translations
const translations = {
  de: {
    // ========== LANDING PAGE ==========
    hero: {
      badge: 'Audio Visualizer',
      title: 'Verwandle deine Musik in',
      titleHighlight: 'visuelle Kunst',
      subtitle: 'Erstelle beeindruckende Audio-Visualisierungen für Social Media, Musikvideos und mehr. Kostenlos, direkt im Browser.',
      cta: 'Visualizer starten',
      learnMore: 'Mehr erfahren'
    },
    features: {
      title: 'Leistungsstarke Funktionen',
      subtitle: 'Alles was du brauchst, um professionelle Audio-Visualisierungen zu erstellen',
      cards: [
        {
          title: '100+ Visualizer',
          description: 'Wähle aus einer großen Sammlung von einzigartigen Audio-Visualisierungen - von klassischen Wellenformen bis zu spektakulären 3D-Effekten.'
        },
        {
          title: 'Social Media Formate',
          description: 'Vordefinierte Canvas-Größen für TikTok, Instagram Reels, YouTube Shorts und mehr - perfekt optimiert für jede Plattform.'
        },
        {
          title: 'HD Video Export',
          description: 'Exportiere deine Visualisierungen als hochauflösende MP4-Videos mit bis zu 60 FPS - direkt aus dem Browser, ohne zusätzliche Software.'
        },
        {
          title: 'Text & Bilder',
          description: 'Füge Texte, Logos und Bilder hinzu. Mit vollständiger Kontrolle über Position, Größe, Filter und audio-reaktive Effekte.'
        }
      ]
    },
    video: {
      title: 'So funktioniert es',
      subtitle: 'Schau dir an, wie einfach du atemberaubende Visualisierungen erstellen kannst',
      placeholder: 'Demo-Video kommt bald'
    },
    faq: {
      title: 'Häufig gestellte Fragen',
      subtitle: 'Antworten auf die wichtigsten Fragen',
      items: [
        {
          question: 'Ist der Audio Visualizer kostenlos?',
          answer: 'Ja, der Audio Visualizer ist komplett kostenlos nutzbar. Du kannst alle Visualizer, Formate und Export-Funktionen ohne Einschränkungen verwenden.'
        },
        {
          question: 'Welche Audioformate werden unterstützt?',
          answer: 'Der Visualizer unterstützt alle gängigen Audioformate wie MP3, WAV, OGG, FLAC und mehr. Du kannst deine Audiodateien einfach per Drag & Drop hochladen.'
        },
        {
          question: 'Kann ich die Videos für kommerzielle Zwecke nutzen?',
          answer: 'Ja, alle mit dem Visualizer erstellten Videos kannst du uneingeschränkt für private und kommerzielle Zwecke nutzen - auf YouTube, TikTok, Instagram oder anderen Plattformen.'
        },
        {
          question: 'Werden meine Audiodateien auf einen Server hochgeladen?',
          answer: 'Nein, alle Verarbeitung findet lokal in deinem Browser statt. Deine Audiodateien werden niemals auf unsere Server hochgeladen - deine Daten bleiben privat.'
        },
        {
          question: 'Welche Browser werden unterstützt?',
          answer: 'Der Visualizer funktioniert am besten mit aktuellen Versionen von Chrome, Firefox, Edge und Safari. Für die beste Performance empfehlen wir Chrome oder Edge.'
        },
        {
          question: 'Wie exportiere ich mein Video?',
          answer: 'Klicke einfach auf den "Aufnehmen"-Button, spiele deine Musik ab, und der Visualizer nimmt automatisch alles auf. Nach dem Stoppen wird das Video als MP4-Datei heruntergeladen.'
        }
      ]
    },
    cta: {
      title: 'Bereit zum Starten?',
      subtitle: 'Erstelle jetzt deine erste Audio-Visualisierung - kostenlos und ohne Anmeldung.',
      button: 'Visualizer starten'
    },
    footer: {
      privacy: 'Datenschutz',
      contact: 'Kontakt',
      cookies: 'Cookie-Einstellungen',
      copyright: '© 2025 Audio Visualizer. Alle Rechte vorbehalten.'
    },
    theme: {
      light: 'Hell',
      dark: 'Dunkel'
    },

    // ========== APP COMMON ==========
    common: {
      on: 'An',
      off: 'Aus',
      add: 'Hinzufügen',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      save: 'Speichern',
      reset: 'Zurücksetzen',
      close: 'Schließen',
      search: 'Suchen',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      warning: 'Warnung',
      confirm: 'Bestätigen',
      back: 'Zurück',
      next: 'Weiter',
      previous: 'Vorwärts',
      layer: 'Ebene',
      noResults: 'Keine Ergebnisse',
      enabled: 'Aktiviert',
      disabled: 'Deaktiviert'
    },

    // ========== VISUALIZER APP ==========
    app: {
      imagesOnCanvas: 'Bilder auf Canvas',
      clickToSelect: 'Klicken zum Auswählen',
      backToHome: 'Zur Startseite'
    },

    // ========== FILE UPLOAD PANEL ==========
    fileUpload: {
      title: 'Audiodateien',
      selectFiles: 'Audio-Dateien auswählen',
      tracksLoaded: '{count} Track(s) geladen',
      dragOrClick: 'Klicken oder Dateien hierher ziehen',
      supported: 'Unterstützt',
      filesReady: '{count} Datei(en) bereit'
    },

    // ========== PLAYER PANEL ==========
    player: {
      title: 'Player',
      prev: 'Zurück',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      next: 'Vorwärts',
      beatMarker: 'Beat-Drop Marker setzen (M)',
      beatMarkers: 'Beat-Drop Marker',
      enableMarkers: 'Marker aktivieren',
      disableMarkers: 'Marker deaktivieren',
      deleteAllMarkers: 'Alle Marker löschen',
      visualizer: 'Visualizer',
      noChange: '-- Kein Wechsel --',
      color: 'Farbe',
      change: 'Ändern',
      label: 'Label',
      volume: 'Lautstärke',
      bass: 'Bass',
      treble: 'Höhen',
      playlist: 'Wiedergabeliste',
      deleteAll: 'Alles löschen',
      playlistEmpty: 'Playlist ist leer',
      removeTrack: 'Track entfernen',
      confirmDeleteAll: 'Möchten Sie wirklich alle Tracks aus der Playlist entfernen?',
      confirmDeleteMarkers: 'Alle Beat-Drop Marker löschen?'
    },

    // ========== RECORDER PANEL ==========
    recorder: {
      title: 'Recorder',
      helpTitle: 'Video aufnehmen',
      helpText: 'Nehmen Sie Ihre Visualisierung als Video auf. Workflow: Prepare → Start → Stop. Das Video wird im WebM-Format erstellt.',
      helpTip: 'Wählen Sie \'High\' Qualität für die meisten Anwendungen.',
      status: {
        idle: 'BEREIT',
        ready: 'VORBEREITET',
        recording: 'AUFNAHME',
        paused: 'PAUSIERT',
        processing: 'Verarbeite...'
      },
      prepare: 'Vorbereiten',
      start: 'Start',
      pause: 'Pause',
      resume: 'Fortsetzen',
      stop: 'Stop',
      reset: 'Zurücksetzen',
      videoQuality: 'Video-Qualität',
      uploadMode: 'Upload-Modus',
      mp4Conversion: 'MP4 Konvertierung',
      serverAvailable: 'FFmpeg Server verfügbar',
      serverUnavailable: 'FFmpeg Server nicht erreichbar',
      autoConvert: 'Auto-Konvertierung nach Aufnahme',
      uploading: 'Hochladen...',
      converting: 'Konvertiere zu MP4...',
      completed: 'MP4 bereit!',
      conversionError: 'Konvertierung fehlgeschlagen!',
      processing: 'Verarbeite...',
      downloadMp4: 'MP4 Download',
      closeAndDelete: 'Schließen und Server-Datei löschen',
      unknownError: 'Unbekannter Fehler',
      retry: 'Erneut versuchen',
      convertToMp4: 'Zu MP4 konvertieren',
      recordingPreview: 'Aufnahme-Vorschau',
      downloadVideo: 'Video herunterladen'
    },

    // ========== VISUALIZER PANEL ==========
    visualizer: {
      title: 'Visualizer',
      helpTitle: 'Audio Visualizer',
      helpText: 'Wählen Sie einen von 30+ Visualizer-Effekten. Die Visualisierung reagiert auf die Audiowiedergabe in Echtzeit.',
      helpTip: 'Starten Sie die Musik, um die Effekte live zu sehen!',
      status: 'Status',
      disabled: 'Visualizer deaktiviert',
      color: 'Farbe',
      intensity: 'Intensität',
      colorTransparency: 'Farbtransparenz',
      positionSize: 'Position & Größe',
      resetToDefault: 'Auf Standard zurücksetzen',
      search: 'Suche',
      searchPlaceholder: 'Visualizer suchen...',
      visualizerType: 'Visualizer-Typ',
      effects: 'Effekte',
      noResultsFor: 'Keine Ergebnisse für',
      categories: {
        barsSpectrum: 'Balken & Spektrum',
        waves: 'Wellen',
        circlesSpheres: 'Kreise & Kugeln',
        particles: 'Partikel',
        geometry: 'Geometrie',
        organic: 'Organisch',
        crystalsNets: 'Kristalle & Netze',
        blossoms: 'Blüten',
        objects3d: '3D-Objekte'
      }
    },

    // ========== CONTROLS PANEL ==========
    controls: {
      title: 'Steuerung',
      grid: 'Raster',
      workspace: 'Arbeitsbereich',
      free: 'Frei'
    },

    // ========== CANVAS CONTROL PANEL ==========
    canvasControl: {
      title: 'Canvas-Steuerung',
      backgroundColor: 'Hintergrundfarbe',
      selectColor: 'Farbe wählen',
      backgroundOpacity: 'Hintergrund Deckkraft',
      gradient: 'Gradient',
      enableGradient: 'Gradient aktivieren',
      secondColor: 'Zweite Farbe',
      type: 'Typ',
      radial: 'Radial (vom Zentrum)',
      linear: 'Linear (mit Winkel)',
      angle: 'Winkel',
      audioReactive: 'Audio-Reaktiv',
      reactsTo: 'Reagiert auf',
      bass: 'Bass (Kick/Sub)',
      mid: 'Mitten (Vocals)',
      trebleHiHats: 'Höhen (Hi-Hats)',
      volumeTotal: 'Lautstärke (Gesamt)',
      dynamic: 'Dynamisch (Auto-Blend)',
      smoothing: 'Glättung',
      hue: 'Farbe (Hue)',
      brightness: 'Helligkeit',
      saturation: 'Sättigung',
      glow: 'Leuchten',
      gradientPulse: 'Gradient-Puls',
      gradientRotation: 'Gradient-Rotation',
      undo: 'Rückgängig',
      inHistory: 'im Verlauf',
      presets: 'Canvas-Hintergrund Presets',
      saveAsPreset: 'Hintergrund als Preset speichern',
      savedPresets: 'Gespeicherte Presets',
      noPresets: 'Keine Presets gespeichert',
      load: 'Laden',
      resetBackground: 'Hintergrund zurücksetzen',
      resetsToWhite: 'Setzt Hintergrund auf Weiß zurück',
      clearCanvas: 'Canvas löschen',
      removesAll: 'Entfernt alle Inhalte',
      deleteAll: 'Alles löschen',
      canvasEmpty: 'Canvas ist leer',
      confirmClear: 'Canvas wirklich löschen?',
      confirmClearText: 'Alle Inhalte werden gelöscht. Dies kann nicht rückgängig gemacht werden.'
    },

    // ========== TEXT MANAGER PANEL ==========
    textManager: {
      title: 'Text-Manager',
      addText: 'Text hinzufügen',
      editText: 'Text bearbeiten',
      textContent: 'Textinhalt',
      font: 'Schriftart',
      fontSize: 'Schriftgröße',
      fontWeight: 'Schriftstärke',
      textColor: 'Textfarbe',
      backgroundColor: 'Hintergrundfarbe',
      alignment: 'Ausrichtung',
      position: 'Position',
      rotation: 'Rotation',
      opacity: 'Deckkraft',
      shadow: 'Schatten',
      outline: 'Kontur',
      animation: 'Animation',
      audioReactive: 'Audio-Reaktiv',
      noTexts: 'Keine Texte vorhanden',
      deleteText: 'Text löschen',
      duplicateText: 'Text duplizieren'
    },

    // ========== FOTO PANEL ==========
    foto: {
      title: 'Bilder',
      uploadImage: 'Bild hochladen',
      addToCanvas: 'Zu Canvas hinzufügen',
      asBackground: 'Als Hintergrund',
      imageSettings: 'Bild-Einstellungen',
      position: 'Position',
      size: 'Größe',
      rotation: 'Rotation',
      opacity: 'Deckkraft',
      filters: 'Filter',
      brightness: 'Helligkeit',
      contrast: 'Kontrast',
      saturate: 'Sättigung',
      blur: 'Weichzeichner',
      audioReactive: 'Audio-Reaktiv',
      deleteImage: 'Bild löschen',
      bringToFront: 'Nach vorne',
      sendToBack: 'Nach hinten',
      flipHorizontal: 'Horizontal spiegeln',
      flipVertical: 'Vertikal spiegeln',
      resetFilters: 'Filter zurücksetzen'
    },

    // ========== BACKGROUND TILES PANEL ==========
    backgroundTiles: {
      title: 'Kachel-Hintergrund',
      enableTiles: 'Kacheln aktivieren',
      pattern: 'Muster',
      tileSize: 'Kachelgröße',
      gap: 'Abstand',
      color1: 'Farbe 1',
      color2: 'Farbe 2',
      audioReactive: 'Audio-Reaktiv'
    },

    // ========== ONBOARDING WIZARD ==========
    onboarding: {
      welcome: 'Willkommen beim Audio Visualizer!',
      welcomeText: 'In nur wenigen Schritten erstellen Sie beeindruckende Audio-Visualisierungen.',
      step1Title: 'Audio hochladen',
      step1Text: 'Ziehen Sie eine Audiodatei per Drag & Drop oder klicken Sie zum Auswählen.',
      step2Title: 'Visualizer wählen',
      step2Text: 'Wählen Sie aus über 100 verschiedenen Visualizer-Effekten.',
      step3Title: 'Anpassen',
      step3Text: 'Passen Sie Farben, Größe und Position nach Ihren Wünschen an.',
      step4Title: 'Aufnehmen',
      step4Text: 'Klicken Sie auf Aufnehmen, um Ihr Video zu erstellen.',
      skip: 'Überspringen',
      finish: 'Los geht\'s!',
      showAgain: 'Nicht mehr anzeigen'
    },

    // ========== KEYBOARD SHORTCUTS ==========
    shortcuts: {
      title: 'Tastaturkürzel',
      playPause: 'Play/Pause',
      stop: 'Stop',
      record: 'Aufnahme starten/stoppen',
      undo: 'Rückgängig',
      delete: 'Auswahl löschen',
      selectAll: 'Alles auswählen',
      deselect: 'Auswahl aufheben',
      moveUp: 'Nach oben',
      moveDown: 'Nach unten',
      moveLeft: 'Nach links',
      moveRight: 'Nach rechts',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      resetView: 'Ansicht zurücksetzen',
      toggleGrid: 'Raster ein/aus',
      addMarker: 'Marker hinzufügen'
    },

    // ========== QUICK START GUIDE ==========
    quickStart: {
      title: 'Schnellstart',
      step1: 'Audio-Datei hochladen',
      step2: 'Visualizer auswählen',
      step3: 'Video aufnehmen',
      showTutorial: 'Tutorial anzeigen'
    }
  },

  // ========== ENGLISH ==========
  en: {
    // ========== LANDING PAGE ==========
    hero: {
      badge: 'Audio Visualizer',
      title: 'Transform your music into',
      titleHighlight: 'visual art',
      subtitle: 'Create stunning audio visualizations for social media, music videos and more. Free, directly in your browser.',
      cta: 'Start Visualizer',
      learnMore: 'Learn more'
    },
    features: {
      title: 'Powerful Features',
      subtitle: 'Everything you need to create professional audio visualizations',
      cards: [
        {
          title: '100+ Visualizers',
          description: 'Choose from a large collection of unique audio visualizations - from classic waveforms to spectacular 3D effects.'
        },
        {
          title: 'Social Media Formats',
          description: 'Predefined canvas sizes for TikTok, Instagram Reels, YouTube Shorts and more - perfectly optimized for each platform.'
        },
        {
          title: 'HD Video Export',
          description: 'Export your visualizations as high-resolution MP4 videos with up to 60 FPS - directly from your browser, no additional software needed.'
        },
        {
          title: 'Text & Images',
          description: 'Add texts, logos and images. With full control over position, size, filters and audio-reactive effects.'
        }
      ]
    },
    video: {
      title: 'How it works',
      subtitle: 'See how easy it is to create stunning visualizations',
      placeholder: 'Demo video coming soon'
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Answers to the most important questions',
      items: [
        {
          question: 'Is the Audio Visualizer free?',
          answer: 'Yes, the Audio Visualizer is completely free to use. You can use all visualizers, formats and export features without any restrictions.'
        },
        {
          question: 'Which audio formats are supported?',
          answer: 'The Visualizer supports all common audio formats like MP3, WAV, OGG, FLAC and more. You can simply upload your audio files via drag & drop.'
        },
        {
          question: 'Can I use the videos for commercial purposes?',
          answer: 'Yes, you can use all videos created with the Visualizer without restrictions for private and commercial purposes - on YouTube, TikTok, Instagram or other platforms.'
        },
        {
          question: 'Are my audio files uploaded to a server?',
          answer: 'No, all processing takes place locally in your browser. Your audio files are never uploaded to our servers - your data remains private.'
        },
        {
          question: 'Which browsers are supported?',
          answer: 'The Visualizer works best with current versions of Chrome, Firefox, Edge and Safari. For the best performance, we recommend Chrome or Edge.'
        },
        {
          question: 'How do I export my video?',
          answer: 'Simply click the "Record" button, play your music, and the Visualizer will automatically record everything. After stopping, the video will be downloaded as an MP4 file.'
        }
      ]
    },
    cta: {
      title: 'Ready to start?',
      subtitle: 'Create your first audio visualization now - free and without registration.',
      button: 'Start Visualizer'
    },
    footer: {
      privacy: 'Privacy Policy',
      contact: 'Contact',
      cookies: 'Cookie Settings',
      copyright: '© 2025 Audio Visualizer. All rights reserved.'
    },
    theme: {
      light: 'Light',
      dark: 'Dark'
    },

    // ========== APP COMMON ==========
    common: {
      on: 'On',
      off: 'Off',
      add: 'Add',
      cancel: 'Cancel',
      delete: 'Delete',
      save: 'Save',
      reset: 'Reset',
      close: 'Close',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      layer: 'Layer',
      noResults: 'No results',
      enabled: 'Enabled',
      disabled: 'Disabled'
    },

    // ========== VISUALIZER APP ==========
    app: {
      imagesOnCanvas: 'Images on Canvas',
      clickToSelect: 'Click to select',
      backToHome: 'Back to Home'
    },

    // ========== FILE UPLOAD PANEL ==========
    fileUpload: {
      title: 'Audio Files',
      selectFiles: 'Select audio files',
      tracksLoaded: '{count} track(s) loaded',
      dragOrClick: 'Click or drag files here',
      supported: 'Supported',
      filesReady: '{count} file(s) ready'
    },

    // ========== PLAYER PANEL ==========
    player: {
      title: 'Player',
      prev: 'Previous',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      next: 'Next',
      beatMarker: 'Set beat-drop marker (M)',
      beatMarkers: 'Beat-Drop Markers',
      enableMarkers: 'Enable markers',
      disableMarkers: 'Disable markers',
      deleteAllMarkers: 'Delete all markers',
      visualizer: 'Visualizer',
      noChange: '-- No change --',
      color: 'Color',
      change: 'Change',
      label: 'Label',
      volume: 'Volume',
      bass: 'Bass',
      treble: 'Treble',
      playlist: 'Playlist',
      deleteAll: 'Delete all',
      playlistEmpty: 'Playlist is empty',
      removeTrack: 'Remove track',
      confirmDeleteAll: 'Are you sure you want to remove all tracks from the playlist?',
      confirmDeleteMarkers: 'Delete all beat-drop markers?'
    },

    // ========== RECORDER PANEL ==========
    recorder: {
      title: 'Recorder',
      helpTitle: 'Record video',
      helpText: 'Record your visualization as video. Workflow: Prepare → Start → Stop. The video will be created in WebM format.',
      helpTip: 'Choose \'High\' quality for most applications.',
      status: {
        idle: 'IDLE',
        ready: 'READY',
        recording: 'RECORDING',
        paused: 'PAUSED',
        processing: 'Processing...'
      },
      prepare: 'Prepare',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      reset: 'Reset',
      videoQuality: 'Video Quality',
      uploadMode: 'Upload Mode',
      mp4Conversion: 'MP4 Conversion',
      serverAvailable: 'FFmpeg Server available',
      serverUnavailable: 'FFmpeg Server unavailable',
      autoConvert: 'Auto-convert after recording',
      uploading: 'Uploading...',
      converting: 'Converting to MP4...',
      completed: 'MP4 ready!',
      conversionError: 'Conversion failed!',
      processing: 'Processing...',
      downloadMp4: 'MP4 Download',
      closeAndDelete: 'Close and delete server file',
      unknownError: 'Unknown error',
      retry: 'Retry',
      convertToMp4: 'Convert to MP4',
      recordingPreview: 'Recording Preview',
      downloadVideo: 'Download Video'
    },

    // ========== VISUALIZER PANEL ==========
    visualizer: {
      title: 'Visualizer',
      helpTitle: 'Audio Visualizer',
      helpText: 'Choose from 30+ visualizer effects. The visualization reacts to audio playback in real-time.',
      helpTip: 'Start the music to see the effects live!',
      status: 'Status',
      disabled: 'Visualizer disabled',
      color: 'Color',
      intensity: 'Intensity',
      colorTransparency: 'Color Transparency',
      positionSize: 'Position & Size',
      resetToDefault: 'Reset to default',
      search: 'Search',
      searchPlaceholder: 'Search visualizers...',
      visualizerType: 'Visualizer Type',
      effects: 'effects',
      noResultsFor: 'No results for',
      categories: {
        barsSpectrum: 'Bars & Spectrum',
        waves: 'Waves',
        circlesSpheres: 'Circles & Spheres',
        particles: 'Particles',
        geometry: 'Geometry',
        organic: 'Organic',
        crystalsNets: 'Crystals & Nets',
        blossoms: 'Blossoms',
        objects3d: '3D Objects'
      }
    },

    // ========== CONTROLS PANEL ==========
    controls: {
      title: 'Controls',
      grid: 'Grid',
      workspace: 'Workspace',
      free: 'Free'
    },

    // ========== CANVAS CONTROL PANEL ==========
    canvasControl: {
      title: 'Canvas Control',
      backgroundColor: 'Background Color',
      selectColor: 'Select color',
      backgroundOpacity: 'Background Opacity',
      gradient: 'Gradient',
      enableGradient: 'Enable gradient',
      secondColor: 'Second Color',
      type: 'Type',
      radial: 'Radial (from center)',
      linear: 'Linear (with angle)',
      angle: 'Angle',
      audioReactive: 'Audio-Reactive',
      reactsTo: 'Reacts to',
      bass: 'Bass (Kick/Sub)',
      mid: 'Mids (Vocals)',
      trebleHiHats: 'Treble (Hi-Hats)',
      volumeTotal: 'Volume (Total)',
      dynamic: 'Dynamic (Auto-Blend)',
      smoothing: 'Smoothing',
      hue: 'Color (Hue)',
      brightness: 'Brightness',
      saturation: 'Saturation',
      glow: 'Glow',
      gradientPulse: 'Gradient Pulse',
      gradientRotation: 'Gradient Rotation',
      undo: 'Undo',
      inHistory: 'in history',
      presets: 'Canvas Background Presets',
      saveAsPreset: 'Save background as preset',
      savedPresets: 'Saved Presets',
      noPresets: 'No presets saved',
      load: 'Load',
      resetBackground: 'Reset Background',
      resetsToWhite: 'Resets background to white',
      clearCanvas: 'Clear Canvas',
      removesAll: 'Removes all content',
      deleteAll: 'Delete All',
      canvasEmpty: 'Canvas is empty',
      confirmClear: 'Really clear canvas?',
      confirmClearText: 'All content will be deleted. This cannot be undone.'
    },

    // ========== TEXT MANAGER PANEL ==========
    textManager: {
      title: 'Text Manager',
      addText: 'Add Text',
      editText: 'Edit Text',
      textContent: 'Text Content',
      font: 'Font',
      fontSize: 'Font Size',
      fontWeight: 'Font Weight',
      textColor: 'Text Color',
      backgroundColor: 'Background Color',
      alignment: 'Alignment',
      position: 'Position',
      rotation: 'Rotation',
      opacity: 'Opacity',
      shadow: 'Shadow',
      outline: 'Outline',
      animation: 'Animation',
      audioReactive: 'Audio-Reactive',
      noTexts: 'No texts available',
      deleteText: 'Delete text',
      duplicateText: 'Duplicate text'
    },

    // ========== FOTO PANEL ==========
    foto: {
      title: 'Images',
      uploadImage: 'Upload Image',
      addToCanvas: 'Add to Canvas',
      asBackground: 'As Background',
      imageSettings: 'Image Settings',
      position: 'Position',
      size: 'Size',
      rotation: 'Rotation',
      opacity: 'Opacity',
      filters: 'Filters',
      brightness: 'Brightness',
      contrast: 'Contrast',
      saturate: 'Saturation',
      blur: 'Blur',
      audioReactive: 'Audio-Reactive',
      deleteImage: 'Delete image',
      bringToFront: 'Bring to front',
      sendToBack: 'Send to back',
      flipHorizontal: 'Flip horizontal',
      flipVertical: 'Flip vertical',
      resetFilters: 'Reset filters'
    },

    // ========== BACKGROUND TILES PANEL ==========
    backgroundTiles: {
      title: 'Tile Background',
      enableTiles: 'Enable tiles',
      pattern: 'Pattern',
      tileSize: 'Tile Size',
      gap: 'Gap',
      color1: 'Color 1',
      color2: 'Color 2',
      audioReactive: 'Audio-Reactive'
    },

    // ========== ONBOARDING WIZARD ==========
    onboarding: {
      welcome: 'Welcome to the Audio Visualizer!',
      welcomeText: 'Create stunning audio visualizations in just a few steps.',
      step1Title: 'Upload Audio',
      step1Text: 'Drag and drop an audio file or click to select.',
      step2Title: 'Choose Visualizer',
      step2Text: 'Choose from over 100 different visualizer effects.',
      step3Title: 'Customize',
      step3Text: 'Adjust colors, size and position to your liking.',
      step4Title: 'Record',
      step4Text: 'Click Record to create your video.',
      skip: 'Skip',
      finish: 'Let\'s go!',
      showAgain: 'Don\'t show again'
    },

    // ========== KEYBOARD SHORTCUTS ==========
    shortcuts: {
      title: 'Keyboard Shortcuts',
      playPause: 'Play/Pause',
      stop: 'Stop',
      record: 'Start/Stop recording',
      undo: 'Undo',
      delete: 'Delete selection',
      selectAll: 'Select all',
      deselect: 'Deselect',
      moveUp: 'Move up',
      moveDown: 'Move down',
      moveLeft: 'Move left',
      moveRight: 'Move right',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      resetView: 'Reset view',
      toggleGrid: 'Toggle grid',
      addMarker: 'Add marker'
    },

    // ========== QUICK START GUIDE ==========
    quickStart: {
      title: 'Quick Start',
      step1: 'Upload audio file',
      step2: 'Select visualizer',
      step3: 'Record video',
      showTutorial: 'Show tutorial'
    }
  }
}

// Get nested translation by key path
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}

// Get current locale
export function getLocale() {
  return currentLocale.value
}

// Set locale
export function setLocale(locale) {
  if (translations[locale]) {
    currentLocale.value = locale
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
  }
}

// Toggle between locales
export function toggleLocale() {
  const newLocale = currentLocale.value === 'de' ? 'en' : 'de'
  setLocale(newLocale)
}

// Available locales
export const availableLocales = ['de', 'en']

// Composable for Vue components with reactive translations
export function useI18n() {
  const locale = computed(() => currentLocale.value)

  // Reactive translation function that returns computed values
  const t = (key) => {
    // Access currentLocale.value inside to ensure reactivity
    const value = getNestedValue(translations[currentLocale.value], key)
    if (value === null) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
    return value
  }

  // Create a reactive translations object
  const messages = computed(() => translations[currentLocale.value])

  return {
    t,
    locale,
    messages,
    setLocale,
    toggleLocale,
    availableLocales
  }
}
