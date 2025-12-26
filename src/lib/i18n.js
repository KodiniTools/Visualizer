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
      backToHome: 'Zur Startseite',
      deleteImage: 'Bild löschen',
      deleteAllImages: 'Alle löschen',
      confirmDeleteAll: 'Alle Bilder vom Canvas entfernen?',
      imagePreview: 'Bildvorschau',
      imageMetadata: 'Bildinformationen',
      dimensions: 'Abmessungen',
      position: 'Position',
      layer: 'Ebene',
      close: 'Schließen',
      dblClickPreview: 'Doppelklick für Vorschau'
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
      // Audio Source
      audioSource: 'Audio-Quelle',
      player: 'Player',
      microphone: 'Mikrofon',
      playerSource: 'Audio-Dateien abspielen',
      microphoneSource: 'Live-Mikrofon-Eingang',
      microphoneListening: 'Mikrofon aktiv - lauscht...',
      selectDevice: 'Gerät auswählen',
      microphonePermissionDenied: 'Mikrofon-Zugriff verweigert',
      microphoneNotFound: 'Kein Mikrofon gefunden',
      // Player controls
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
      downloadVideo: 'Video herunterladen',
      // Conversion Overlay
      convertingVideo: 'Dein Video wird konvertiert',
      uploadingToServer: 'Video wird hochgeladen...',
      processingOnServer: 'Server verarbeitet dein Video...',
      dontCloseWindow: 'Bitte das Fenster nicht schließen',
      audioSource: 'Audio'
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
      strobe: 'Blitz',
      contrastEffect: 'Kontrast',
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
      createNewText: 'Neuen Text erstellen',
      enterText: 'Text eingeben (Enter für neue Zeile)',
      textPlaceholder: 'Mehrzeiliger Text wird unterstützt!\nZeile 1\nZeile 2\nZeile 3...',
      browserTextTip: 'Tipp für Browser-Texte: Nach dem Einfügen drücken Sie Enter, um Zeilenumbrüche hinzuzufügen',
      notepadTip: 'Aus Notepad/Word: Zeilenumbrüche werden automatisch erkannt',
      linesDetected: '{n} Zeilen erkannt',
      textStyle: 'Text-Stil',
      font: 'Schriftart',
      fontSize: 'Größe',
      autoFit: 'Automatisch an Canvas anpassen',
      autoFitPadding: 'Rand-Abstand',
      textColor: 'Textfarbe',
      opacity: 'Deckkraft',
      style: 'Stil',
      bold: 'Fett',
      italic: 'Kursiv',
      alignment: 'Ausrichtung',
      left: 'Links',
      center: 'Mitte',
      right: 'Rechts',
      saveAsDefault: 'Als Standard speichern',
      resetToDefault: 'Zurücksetzen',
      // Typewriter effect
      typewriterEffect: 'Schreibmaschinen-Effekt',
      activated: 'Aktiviert',
      deactivated: 'Deaktiviert',
      speed: 'Geschwindigkeit',
      msPerChar: 'ms/Buchstabe',
      speedHint: 'Niedrig = schneller, Hoch = langsamer',
      startDelay: 'Start-Verzögerung',
      loop: 'Animation wiederholen (Loop)',
      loopDelay: 'Pause zwischen Wiederholungen',
      showCursor: 'Blinkender Cursor anzeigen',
      cursorChar: 'Cursor-Zeichen',
      cursorLine: '| (Strich)',
      cursorUnderscore: '_ (Unterstrich)',
      cursorBlock: '▌ (Block)',
      cursorFullBlock: '█ (Voller Block)',
      // Fade effect
      fadeEffect: 'Einblend-Effekt (Fade)',
      direction: 'Richtung',
      fadeIn: 'Einblenden (0% → 100%)',
      fadeOut: 'Ausblenden (100% → 0%)',
      fadeInOut: 'Ein- und Ausblenden',
      duration: 'Dauer',
      durationHint: 'Wie lange das Ein-/Ausblenden dauert',
      animation: 'Animation',
      linear: 'Linear (gleichmäßig)',
      ease: 'Ease (natürlich)',
      easeIn: 'Ease In (langsamer Start)',
      easeOut: 'Ease Out (langsames Ende)',
      // Scale effect
      scaleEffect: 'Skalierungs-Effekt (Scale)',
      zoomIn: 'Reinzoomen (klein → groß)',
      zoomOut: 'Rauszoomen (groß → klein)',
      zoomInOut: 'Rein und Raus',
      startSize: 'Start-Größe',
      endSize: 'End-Größe',
      sizeHint: '0% = unsichtbar, 100% = normal, 200% = doppelt',
      // Shadow
      shadow: 'Schatten',
      shadowColor: 'Schattenfarbe',
      shadowBlur: 'Schatten-Unschärfe',
      shadowX: 'Schatten X',
      shadowY: 'Schatten Y',
      // Outline
      outline: 'Kontur',
      outlineColor: 'Konturfarbe',
      outlineWidth: 'Konturstärke',
      // Action buttons
      placeText: 'Text platzieren',
      cancel: 'Abbrechen',
      noTexts: 'Keine Texte vorhanden',
      deleteText: 'Text löschen',
      duplicateText: 'Text duplizieren',
      // Active status
      active: 'Aktiv',
      // Info text
      clickToEdit: 'Klicken Sie auf einen Text im Canvas um ihn zu bearbeiten, oder fügen Sie einen neuen Text hinzu.',
      addNewText: 'Neuen Text hinzufügen',
      addWithArea: 'Mit Bereichsauswahl hinzufügen',
      addToCanvas: 'Zum Canvas hinzufügen',
      autoWrap: 'Auto-Umbruch',
      autoWrapTitle: 'Text automatisch in Zeilen umbrechen',
      editText: 'Text bearbeiten',
      textPosition: 'Textposition',
      textArea: 'Textbereich',
      // Audio-Reactive Effects
      audioReactiveEffects: 'Audio-Reaktive Effekte',
      audioSource: 'Audio-Quelle',
      smoothing: 'Glättung',
      smoothingHint: 'Niedrig = schnelle Reaktion, Hoch = sanfte Animation',
      advancedSettings: 'Erweiterte Einstellungen',
      threshold: 'Schwellenwert',
      thresholdHint: 'Ignoriert leise Audio-Signale',
      attack: 'Attack',
      attackHint: 'Wie schnell der Effekt anspricht',
      release: 'Release',
      releaseHint: 'Wie langsam der Effekt abklingt',
      reset: 'Zurücksetzen',
      selectEffects: 'Effekte auswählen',
      colorRotation: 'Farbrotation',
      brightness: 'Helligkeit',
      pulsate: 'Pulsieren',
      glow: 'Leuchten',
      shake: 'Wackeln',
      bounce: 'Hüpfen',
      swing: 'Pendeln',
      blink: 'Blinken',
      intensity: 'Intensität',
      minimum: 'Minimum',
      easeCurve: 'Ease-Kurve',
      spacing: 'Abstand',
      outline: 'Kontur',
      // ✨ NEU: Erweiterte Audio-Reaktive Effekte
      skew: 'Verzerrung',
      skewHint: 'Oszillierende Scheren-Transformation (X/Y-Achsen unabhängig)',
      strobe: 'Strobe',
      strobeHint: 'Blitz-Effekt bei Audio-Peaks (aktiviert >60% Audio)',
      rgbGlitch: 'RGB-Glitch',
      rgbGlitchHint: 'Chromatische Aberration (Rot/Grün/Blau Verschiebung)',
      perspective3d: '3D-Perspektive',
      perspective3dHint: 'Simulierter 3D-Kipp-Effekt (kombiniert Skalierung + Scherung)',
      wave: 'Welle',
      waveHint: 'Buchstaben bewegen sich wellenförmig (La-Ola-Effekt)',
      rotation: 'Rotation',
      rotationHint: 'Text dreht sich oszillierend basierend auf Audio',
      elastic: 'Elastic',
      elasticHint: 'Gummiartige Verformung (Stretch auf X/Y)',
      effectsTip: 'Tipp: Aktiviere mehrere Effekte gleichzeitig für komplexe Animationen!',
      // Audio source options
      bassKickDrums: 'Bass (Kick/Drums)',
      midVocalsMelody: 'Mid (Vocals/Melodie)',
      trebleHiHatsHighs: 'Treble (Hi-Hats/Höhen)',
      volumeOverall: 'Volume (Gesamt)',
      dynamicAutoBlend: 'Dynamisch (Auto-Blend)',
      dynamicHint: 'Kombiniert automatisch alle Frequenzen basierend auf ihrer aktuellen Energie',
      // Presets
      presetPunchy: 'Punchy',
      presetPunchyTitle: 'Schnelle, knackige Reaktion',
      presetSmooth: 'Smooth',
      presetSmoothTitle: 'Sanfte, fließende Animation',
      presetSubtle: 'Subtle',
      presetSubtleTitle: 'Dezente, subtile Effekte',
      presetExtreme: 'Extrem',
      presetExtremeTitle: 'Maximale Reaktion',
      // Reset All Effects
      resetAllEffects: 'Alle Effekte zurücksetzen',
      // Audio Effects Presets
      saveEffectsPreset: 'Effekte speichern',
      loadEffectsPreset: 'Effekte laden',
      noPresetSaved: 'Kein Preset gespeichert',
      noEffectsToSave: 'Keine Effekte zum Speichern',
      selectTextFirst: 'Bitte wähle zuerst einen Text aus',
      effectsPresetSaved: 'Audio-Effekte gespeichert',
      effectsPresetLoaded: 'Audio-Effekte geladen',
      effectsPresetSaveError: 'Fehler beim Speichern',
      effectsPresetLoadError: 'Fehler beim Laden'
    },

    // ========== FOTO PANEL ==========
    foto: {
      title: 'Bilder',
      uploadImage: 'Bild hochladen',
      addToCanvas: 'Zu Canvas hinzufügen',
      asBackground: 'Als Hintergrund',
      asWorkspaceBackground: 'Als Workspace-Hintergrund',
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
      hueRotate: 'Farbton',
      audioReactive: 'Audio-Reaktiv',
      deleteImage: 'Bild löschen',
      bringToFront: 'Nach vorne',
      sendToBack: 'Nach hinten',
      flipHorizontal: 'Horizontal spiegeln',
      flipVertical: 'Vertikal spiegeln',
      resetFilters: 'Filter zurücksetzen',
      // Gallery section
      sectionColor: 'Abschnittsfarbe',
      customColor: 'Eigene Farbe',
      gallery: 'Galerie',
      ownImages: 'Eigene Bilder',
      clickToUpload: 'Klicken zum Hochladen',
      multipleImagesHint: 'Mehrere Bilder möglich (JPG, PNG, GIF, WebP)',
      galleryCount: 'Galerie ({count})',
      deleteAll: 'Alle löschen',
      selectAll: 'Alle auswählen',
      deselectAll: 'Auswahl aufheben',
      selected: 'ausgewählt',
      multiselectHint: 'Tipp: Strg+Klick für Mehrfachauswahl, Shift+Klick für Bereich',
      placeOnCanvas: 'Auf Canvas platzieren',
      imagesOnCanvas: '{count} Bilder auf Canvas',
      noImagesUploaded: 'Keine Bilder hochgeladen',
      loadingGallery: 'Galerie wird geladen...',
      loadingCategory: 'Kategorie wird geladen...',
      galleryLoadError: 'Galerie konnte nicht geladen werden',
      retryLoad: 'Erneut versuchen',
      noImagesInCategory: 'Keine Bilder in dieser Kategorie',
      // Image editing
      editImage: 'Bild bearbeiten',
      layers: 'Ebenen',
      bringToFrontTop: 'Nach vorne',
      layerUp: 'Ebene hoch',
      layerDown: 'Ebene runter',
      sendToBackBottom: 'Nach hinten',
      filterPreset: 'Filter-Preset',
      noFilter: 'Kein Filter',
      shadowEffects: 'Schatten & Effekte',
      shadowColor: 'Farbe',
      shadowBlur: 'Unschärfe',
      shadowHorizontal: 'Horizontal',
      shadowVertical: 'Vertikal',
      rotationAngle: 'Drehwinkel',
      flip: 'Spiegeln',
      horizontal: 'Horizontal',
      vertical: 'Vertikal',
      imageBorder: 'Bildkontur',
      borderWidth: 'Stärke',
      borderRadius: 'Rundung',
      borderRadiusPercent: 'Rundung (%)',
      removeImage: 'Bild entfernen',
      // Presets
      presets: 'Bild-Presets',
      saveAsPreset: 'Als Preset speichern',
      noPresets: 'Keine Presets gespeichert',
      load: 'Laden',
      // Stock gallery categories
      stockCategories: {
        backgrounds: 'Hintergründe',
        elements: 'Elemente',
        patterns: 'Muster'
      }
    },

    // ========== BACKGROUND TILES PANEL ==========
    backgroundTiles: {
      title: 'Kachel-Hintergrund',
      enableTiles: 'Kachel-Modus aktivieren',
      tileCount: 'Anzahl Kacheln',
      gap: 'Abstand',
      selectTile: 'Kachel auswählen',
      image: 'Bild',
      editTile: 'Kachel {n} bearbeiten',
      backgroundColor: 'Hintergrundfarbe',
      opacity: 'Deckkraft',
      tileImage: 'Kachel-Bild',
      uploadImage: 'Bild hochladen',
      orDragDrop: 'oder per Drag & Drop',
      brightness: 'Helligkeit',
      contrast: 'Kontrast',
      saturation: 'Sättigung',
      blur: 'Weichzeichnen',
      hueRotate: 'Farbton',
      grayscale: 'Graustufen',
      sepia: 'Sepia',
      scale: 'Skalierung',
      offsetX: 'Verschieben X',
      offsetY: 'Verschieben Y',
      removeImage: 'Bild entfernen',
      audioReactive: 'Audio-Reaktiv',
      reactsTo: 'Reagiert auf',
      bassBass: 'Bass (Kick/Sub)',
      midVocals: 'Mitten (Vocals)',
      trebleHiHats: 'Höhen (Hi-Hats)',
      volumeTotal: 'Lautstärke (Gesamt)',
      dynamicAuto: 'Dynamisch (Auto-Blend)',
      smoothing: 'Glättung',
      hue: 'Farbton',
      glow: 'Leuchten',
      pulse: 'Pulsieren',
      strobe: 'Blitz',
      contrastEffect: 'Kontrast',
      resetTile: 'Kachel zurücksetzen',
      tilePresets: 'Kachel-Presets',
      saveTilePreset: 'Kacheln als Preset speichern',
      noTilePresets: 'Keine Kachel-Presets gespeichert',
      load: 'Laden',
      delete: 'Löschen',
      resetAllTiles: 'Alle Kacheln zurücksetzen'
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
    },

    // ========== SCREENSHOT PANEL ==========
    screenshot: {
      title: 'Screenshot',
      helpTitle: 'Canvas-Screenshot',
      helpText: 'Erstellen Sie einen Screenshot des aktuellen Canvas-Inhalts. Wählen Sie das gewünschte Format und die Qualität.',
      helpTip: 'PNG für verlustfreie Qualität, JPG/WebP für kleinere Dateien.',
      format: 'Format',
      quality: 'Qualität',
      lowQuality: 'Klein',
      highQuality: 'Beste',
      pngInfo: 'PNG bietet verlustfreie Komprimierung und unterstützt Transparenz. Ideal für Grafiken und Text.',
      capture: 'Screenshot aufnehmen',
      processing: 'Verarbeite...',
      preview: 'Vorschau',
      previewTitle: 'Screenshot-Vorschau',
      download: 'Herunterladen',
      captureSuccess: 'Screenshot erfolgreich erstellt',
      captureError: 'Fehler beim Erstellen des Screenshots',
      canvasNotFound: 'Canvas nicht gefunden',
      downloadStarted: 'Download gestartet',
      doubleClickHint: 'Doppelklick für Großansicht',
      fileName: 'Dateiname',
      dimensions: 'Abmessungen',
      fileSize: 'Dateigröße'
    },

    // ========== TOAST NOTIFICATIONS ==========
    toast: {
      // Titles
      successTitle: 'Erfolg',
      errorTitle: 'Fehler',
      warningTitle: 'Warnung',
      infoTitle: 'Information',
      // Common messages
      settingsSaved: 'Einstellungen gespeichert',
      settingsReset: 'Einstellungen zurückgesetzt',
      copySuccess: 'In die Zwischenablage kopiert',
      copyError: 'Kopieren fehlgeschlagen',
      // File operations
      fileUploadSuccess: 'Datei erfolgreich hochgeladen',
      fileUploadError: 'Fehler beim Hochladen der Datei',
      filesUploadSuccess: '{count} Dateien erfolgreich hochgeladen',
      fileDeleteSuccess: 'Datei gelöscht',
      fileDeleteError: 'Fehler beim Löschen der Datei',
      // Image operations
      imageLoadSuccess: 'Bild erfolgreich geladen',
      imageLoadError: 'Fehler beim Laden des Bildes',
      imagesLoadError: 'Ein oder mehrere Bilder konnten nicht geladen werden',
      imageAddedToCanvas: 'Bild zum Canvas hinzugefügt',
      imagesAddedToCanvas: '{count} Bilder zum Canvas hinzugefügt',
      selectWorkspaceFirst: 'Bitte wählen Sie zuerst einen Social Media Workspace aus',
      // Audio operations
      audioLoadSuccess: 'Audio erfolgreich geladen',
      audioLoadError: 'Fehler beim Laden der Audio-Datei',
      tracksAdded: '{count} Track(s) zur Playlist hinzugefügt',
      playlistCleared: 'Playlist geleert',
      // Recording operations
      recordingStarted: 'Aufnahme gestartet',
      recordingStopped: 'Aufnahme beendet',
      recordingError: 'Fehler bei der Aufnahme',
      conversionStarted: 'MP4-Konvertierung gestartet',
      conversionSuccess: 'Video erfolgreich konvertiert',
      conversionError: 'Konvertierung fehlgeschlagen',
      downloadStarted: 'Download gestartet',
      // Preset operations
      presetSaved: 'Preset gespeichert',
      presetLoaded: 'Preset geladen',
      presetDeleted: 'Preset gelöscht',
      // Text operations
      textAdded: 'Text hinzugefügt',
      textDeleted: 'Text gelöscht',
      textDuplicated: 'Text dupliziert',
      // Canvas operations
      canvasCleared: 'Canvas geleert',
      backgroundReset: 'Hintergrund zurückgesetzt',
      // General
      actionUndone: 'Aktion rückgängig gemacht',
      operationCancelled: 'Vorgang abgebrochen',
      networkError: 'Netzwerkfehler - bitte versuchen Sie es erneut',
      unexpectedError: 'Ein unerwarteter Fehler ist aufgetreten'
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
      backToHome: 'Back to Home',
      deleteImage: 'Delete image',
      deleteAllImages: 'Delete all',
      confirmDeleteAll: 'Remove all images from canvas?',
      imagePreview: 'Image Preview',
      imageMetadata: 'Image Information',
      dimensions: 'Dimensions',
      position: 'Position',
      layer: 'Layer',
      close: 'Close',
      dblClickPreview: 'Double-click for preview'
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
      // Audio Source
      audioSource: 'Audio Source',
      player: 'Player',
      microphone: 'Microphone',
      playerSource: 'Play audio files',
      microphoneSource: 'Live microphone input',
      microphoneListening: 'Microphone active - listening...',
      selectDevice: 'Select device',
      microphonePermissionDenied: 'Microphone access denied',
      microphoneNotFound: 'No microphone found',
      // Player controls
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
      downloadVideo: 'Download Video',
      // Conversion Overlay
      convertingVideo: 'Your video is being converted',
      uploadingToServer: 'Uploading video...',
      processingOnServer: 'Server is processing your video...',
      dontCloseWindow: 'Please don\'t close this window',
      audioSource: 'Audio'
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
      strobe: 'Strobe',
      contrastEffect: 'Contrast',
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
      createNewText: 'Create New Text',
      enterText: 'Enter text (Enter for new line)',
      textPlaceholder: 'Multi-line text supported!\nLine 1\nLine 2\nLine 3...',
      browserTextTip: 'Tip for browser texts: Press Enter after pasting to add line breaks',
      notepadTip: 'From Notepad/Word: Line breaks are automatically recognized',
      linesDetected: '{n} lines detected',
      textStyle: 'Text Style',
      font: 'Font',
      fontSize: 'Size',
      autoFit: 'Auto-fit to canvas',
      autoFitPadding: 'Edge padding',
      textColor: 'Text Color',
      opacity: 'Opacity',
      style: 'Style',
      bold: 'Bold',
      italic: 'Italic',
      alignment: 'Alignment',
      left: 'Left',
      center: 'Center',
      right: 'Right',
      saveAsDefault: 'Save as default',
      resetToDefault: 'Reset',
      // Typewriter effect
      typewriterEffect: 'Typewriter Effect',
      activated: 'Activated',
      deactivated: 'Deactivated',
      speed: 'Speed',
      msPerChar: 'ms/character',
      speedHint: 'Low = faster, High = slower',
      startDelay: 'Start Delay',
      loop: 'Repeat animation (Loop)',
      loopDelay: 'Pause between repetitions',
      showCursor: 'Show blinking cursor',
      cursorChar: 'Cursor character',
      cursorLine: '| (Line)',
      cursorUnderscore: '_ (Underscore)',
      cursorBlock: '▌ (Block)',
      cursorFullBlock: '█ (Full Block)',
      // Fade effect
      fadeEffect: 'Fade Effect',
      direction: 'Direction',
      fadeIn: 'Fade In (0% → 100%)',
      fadeOut: 'Fade Out (100% → 0%)',
      fadeInOut: 'Fade In and Out',
      duration: 'Duration',
      durationHint: 'How long the fade takes',
      animation: 'Animation',
      linear: 'Linear (uniform)',
      ease: 'Ease (natural)',
      easeIn: 'Ease In (slow start)',
      easeOut: 'Ease Out (slow end)',
      // Scale effect
      scaleEffect: 'Scale Effect',
      zoomIn: 'Zoom In (small → large)',
      zoomOut: 'Zoom Out (large → small)',
      zoomInOut: 'Zoom In and Out',
      startSize: 'Start Size',
      endSize: 'End Size',
      sizeHint: '0% = invisible, 100% = normal, 200% = double',
      // Shadow
      shadow: 'Shadow',
      shadowColor: 'Shadow Color',
      shadowBlur: 'Shadow Blur',
      shadowX: 'Shadow X',
      shadowY: 'Shadow Y',
      // Outline
      outline: 'Outline',
      outlineColor: 'Outline Color',
      outlineWidth: 'Outline Width',
      // Action buttons
      placeText: 'Place Text',
      cancel: 'Cancel',
      noTexts: 'No texts available',
      deleteText: 'Delete text',
      duplicateText: 'Duplicate text',
      // Active status
      active: 'Active',
      // Info text
      clickToEdit: 'Click on a text in the canvas to edit it, or add a new text.',
      addNewText: 'Add new text',
      addWithArea: 'Add with area selection',
      addToCanvas: 'Add to Canvas',
      autoWrap: 'Auto-wrap',
      autoWrapTitle: 'Automatically wrap text into lines',
      editText: 'Edit text',
      textPosition: 'Text position',
      textArea: 'Text area',
      // Audio-Reactive Effects
      audioReactiveEffects: 'Audio Reactive Effects',
      audioSource: 'Audio Source',
      smoothing: 'Smoothing',
      smoothingHint: 'Low = fast reaction, High = smooth animation',
      advancedSettings: 'Advanced Settings',
      threshold: 'Threshold',
      thresholdHint: 'Ignores quiet audio signals',
      attack: 'Attack',
      attackHint: 'How fast the effect responds',
      release: 'Release',
      releaseHint: 'How slowly the effect decays',
      reset: 'Reset',
      selectEffects: 'Select Effects',
      colorRotation: 'Color Rotation',
      brightness: 'Brightness',
      pulsate: 'Pulsate',
      glow: 'Glow',
      shake: 'Shake',
      bounce: 'Bounce',
      swing: 'Swing',
      blink: 'Blink',
      intensity: 'Intensity',
      minimum: 'Minimum',
      easeCurve: 'Ease Curve',
      spacing: 'Spacing',
      outline: 'Outline',
      // ✨ NEW: Extended Audio Reactive Effects
      skew: 'Distortion',
      skewHint: 'Oscillating shear transformation (X/Y axes independent)',
      strobe: 'Strobe',
      strobeHint: 'Flash effect on audio peaks (activates >60% audio)',
      rgbGlitch: 'RGB Glitch',
      rgbGlitchHint: 'Chromatic aberration (Red/Green/Blue shift)',
      perspective3d: '3D Perspective',
      perspective3dHint: 'Simulated 3D tilt effect (combines scaling + shearing)',
      wave: 'Wave',
      waveHint: 'Letters move in a wave pattern (La Ola effect)',
      rotation: 'Rotation',
      rotationHint: 'Text rotates oscillating based on audio',
      elastic: 'Elastic',
      elasticHint: 'Rubber-like deformation (stretch on X/Y)',
      effectsTip: 'Tip: Enable multiple effects for complex animations!',
      // Audio source options
      bassKickDrums: 'Bass (Kick/Drums)',
      midVocalsMelody: 'Mid (Vocals/Melody)',
      trebleHiHatsHighs: 'Treble (Hi-Hats/Highs)',
      volumeOverall: 'Volume (Overall)',
      dynamicAutoBlend: 'Dynamic (Auto-Blend)',
      dynamicHint: 'Automatically combines all frequencies based on their current energy',
      // Presets
      presetPunchy: 'Punchy',
      presetPunchyTitle: 'Fast, snappy reaction',
      presetSmooth: 'Smooth',
      presetSmoothTitle: 'Gentle, flowing animation',
      presetSubtle: 'Subtle',
      presetSubtleTitle: 'Subtle, restrained effects',
      presetExtreme: 'Extreme',
      presetExtremeTitle: 'Maximum reaction',
      // Reset All Effects
      resetAllEffects: 'Reset all effects',
      // Audio Effects Presets
      saveEffectsPreset: 'Save effects',
      loadEffectsPreset: 'Load effects',
      noPresetSaved: 'No preset saved',
      noEffectsToSave: 'No effects to save',
      selectTextFirst: 'Please select a text first',
      effectsPresetSaved: 'Audio effects saved',
      effectsPresetLoaded: 'Audio effects loaded',
      effectsPresetSaveError: 'Error saving preset',
      effectsPresetLoadError: 'Error loading preset'
    },

    // ========== FOTO PANEL ==========
    foto: {
      title: 'Images',
      uploadImage: 'Upload Image',
      addToCanvas: 'Add to Canvas',
      asBackground: 'As Background',
      asWorkspaceBackground: 'As Workspace Background',
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
      hueRotate: 'Hue',
      audioReactive: 'Audio-Reactive',
      deleteImage: 'Delete image',
      bringToFront: 'Bring to front',
      sendToBack: 'Send to back',
      flipHorizontal: 'Flip horizontal',
      flipVertical: 'Flip vertical',
      resetFilters: 'Reset filters',
      // Gallery section
      sectionColor: 'Section Color',
      customColor: 'Custom Color',
      gallery: 'Gallery',
      ownImages: 'My Images',
      clickToUpload: 'Click to upload',
      multipleImagesHint: 'Multiple images allowed (JPG, PNG, GIF, WebP)',
      galleryCount: 'Gallery ({count})',
      deleteAll: 'Delete all',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      selected: 'selected',
      multiselectHint: 'Tip: Ctrl+click for multi-select, Shift+click for range',
      placeOnCanvas: 'Place on Canvas',
      imagesOnCanvas: '{count} images on Canvas',
      noImagesUploaded: 'No images uploaded',
      loadingGallery: 'Loading gallery...',
      loadingCategory: 'Loading category...',
      galleryLoadError: 'Failed to load gallery',
      retryLoad: 'Retry',
      noImagesInCategory: 'No images in this category',
      // Image editing
      editImage: 'Edit Image',
      layers: 'Layers',
      bringToFrontTop: 'Bring to front',
      layerUp: 'Layer up',
      layerDown: 'Layer down',
      sendToBackBottom: 'Send to back',
      filterPreset: 'Filter Preset',
      noFilter: 'No Filter',
      shadowEffects: 'Shadow & Effects',
      shadowColor: 'Color',
      shadowBlur: 'Blur',
      shadowHorizontal: 'Horizontal',
      shadowVertical: 'Vertical',
      rotationAngle: 'Rotation angle',
      flip: 'Flip',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      imageBorder: 'Image Border',
      borderWidth: 'Width',
      borderRadius: 'Radius',
      borderRadiusPercent: 'Radius (%)',
      removeImage: 'Remove Image',
      // Presets
      presets: 'Image Presets',
      saveAsPreset: 'Save as Preset',
      noPresets: 'No presets saved',
      load: 'Load',
      // Stock gallery categories
      stockCategories: {
        backgrounds: 'Backgrounds',
        elements: 'Elements',
        patterns: 'Patterns'
      }
    },

    // ========== BACKGROUND TILES PANEL ==========
    backgroundTiles: {
      title: 'Tile Background',
      enableTiles: 'Enable tile mode',
      tileCount: 'Number of tiles',
      gap: 'Gap',
      selectTile: 'Select tile',
      image: 'Image',
      editTile: 'Edit tile {n}',
      backgroundColor: 'Background Color',
      opacity: 'Opacity',
      tileImage: 'Tile Image',
      uploadImage: 'Upload Image',
      orDragDrop: 'or drag & drop',
      brightness: 'Brightness',
      contrast: 'Contrast',
      saturation: 'Saturation',
      blur: 'Blur',
      hueRotate: 'Hue',
      grayscale: 'Grayscale',
      sepia: 'Sepia',
      scale: 'Scale',
      offsetX: 'Offset X',
      offsetY: 'Offset Y',
      removeImage: 'Remove Image',
      audioReactive: 'Audio-Reactive',
      reactsTo: 'Reacts to',
      bassBass: 'Bass (Kick/Sub)',
      midVocals: 'Mids (Vocals)',
      trebleHiHats: 'Treble (Hi-Hats)',
      volumeTotal: 'Volume (Total)',
      dynamicAuto: 'Dynamic (Auto-Blend)',
      smoothing: 'Smoothing',
      hue: 'Hue',
      glow: 'Glow',
      pulse: 'Pulse',
      strobe: 'Strobe',
      contrastEffect: 'Contrast',
      resetTile: 'Reset tile',
      tilePresets: 'Tile Presets',
      saveTilePreset: 'Save tiles as preset',
      noTilePresets: 'No tile presets saved',
      load: 'Load',
      delete: 'Delete',
      resetAllTiles: 'Reset all tiles'
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
    },

    // ========== SCREENSHOT PANEL ==========
    screenshot: {
      title: 'Screenshot',
      helpTitle: 'Canvas Screenshot',
      helpText: 'Create a screenshot of the current canvas content. Choose your desired format and quality.',
      helpTip: 'PNG for lossless quality, JPG/WebP for smaller files.',
      format: 'Format',
      quality: 'Quality',
      lowQuality: 'Small',
      highQuality: 'Best',
      pngInfo: 'PNG offers lossless compression and supports transparency. Ideal for graphics and text.',
      capture: 'Take Screenshot',
      processing: 'Processing...',
      preview: 'Preview',
      previewTitle: 'Screenshot Preview',
      download: 'Download',
      captureSuccess: 'Screenshot created successfully',
      captureError: 'Error creating screenshot',
      canvasNotFound: 'Canvas not found',
      downloadStarted: 'Download started',
      doubleClickHint: 'Double-click for fullscreen view',
      fileName: 'Filename',
      dimensions: 'Dimensions',
      fileSize: 'File Size'
    },

    // ========== TOAST NOTIFICATIONS ==========
    toast: {
      // Titles
      successTitle: 'Success',
      errorTitle: 'Error',
      warningTitle: 'Warning',
      infoTitle: 'Information',
      // Common messages
      settingsSaved: 'Settings saved',
      settingsReset: 'Settings reset',
      copySuccess: 'Copied to clipboard',
      copyError: 'Copy failed',
      // File operations
      fileUploadSuccess: 'File uploaded successfully',
      fileUploadError: 'Error uploading file',
      filesUploadSuccess: '{count} files uploaded successfully',
      fileDeleteSuccess: 'File deleted',
      fileDeleteError: 'Error deleting file',
      // Image operations
      imageLoadSuccess: 'Image loaded successfully',
      imageLoadError: 'Error loading image',
      imagesLoadError: 'One or more images could not be loaded',
      imageAddedToCanvas: 'Image added to canvas',
      imagesAddedToCanvas: '{count} images added to canvas',
      selectWorkspaceFirst: 'Please select a Social Media Workspace first',
      // Audio operations
      audioLoadSuccess: 'Audio loaded successfully',
      audioLoadError: 'Error loading audio file',
      tracksAdded: '{count} track(s) added to playlist',
      playlistCleared: 'Playlist cleared',
      // Recording operations
      recordingStarted: 'Recording started',
      recordingStopped: 'Recording stopped',
      recordingError: 'Recording error',
      conversionStarted: 'MP4 conversion started',
      conversionSuccess: 'Video converted successfully',
      conversionError: 'Conversion failed',
      downloadStarted: 'Download started',
      // Preset operations
      presetSaved: 'Preset saved',
      presetLoaded: 'Preset loaded',
      presetDeleted: 'Preset deleted',
      // Text operations
      textAdded: 'Text added',
      textDeleted: 'Text deleted',
      textDuplicated: 'Text duplicated',
      // Canvas operations
      canvasCleared: 'Canvas cleared',
      backgroundReset: 'Background reset',
      // General
      actionUndone: 'Action undone',
      operationCancelled: 'Operation cancelled',
      networkError: 'Network error - please try again',
      unexpectedError: 'An unexpected error occurred'
    }
  }
}

// Get nested translation by key path
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}

// Export the reactive locale ref for use in stores
export const localeRef = currentLocale

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
