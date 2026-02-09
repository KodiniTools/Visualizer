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

    // ========== BLOG PAGE ==========
    blog: {
      nav: {
        home: 'Startseite',
        features: 'Funktionen'
      },
      hero: {
        title: 'Audio Visualizer: Alle Funktionen im Uberblick',
        subtitle: 'Verwandle deine Musik in visuelle Kunst - direkt im Browser, ohne Installation, komplett kostenlos.'
      },
      intro: 'Musik ist mehr als nur Klang - sie ist Emotion, Energie und Ausdruck. Der Audio Visualizer bringt diese unsichtbare Kraft auf den Bildschirm und verwandelt jeden Beat, jede Frequenz und jede Melodie in faszinierende visuelle Erlebnisse. Ob fur Social Media Content, Musikvideos, Live-Streams oder kunstlerische Projekte - dieses Tool bietet alles, was du brauchst.',
      sections: {
        audio: {
          title: 'Audio-Steuerung und -Analyse',
          player: {
            title: 'Der vollwertige Audio-Player',
            items: [
              'Vollstandige Wiedergabesteuerung: Play, Pause, Stop, Vor- und Zuruckspulen',
              'Lautstarke-Regler mit visuellem Feedback',
              'Equalizer fur Bass und Hohen - passe den Sound perfekt an',
              'Playlist-Verwaltung fur mehrere Tracks mit Drag-and-Drop Sortierung'
            ]
          },
          microphone: {
            title: 'Live-Mikrofon-Unterstutzung',
            items: [
              'Gerateauswahl fur verschiedene Audio-Eingange',
              'Echo-Unterdruckung fur saubere Aufnahmen',
              'Rauschunterdruckung fur professionelle Qualitat',
              'Auto-Gain-Control fur konsistente Pegel'
            ]
          },
          beatMarkers: {
            title: 'Beat-Marker System',
            items: [
              'Benutzerdefinierte Beat-Marker an beliebigen Zeitpunkten',
              'Farbcodierung und Beschriftungen fur jeden Marker',
              'Visuelle Vorschau der Marker in der Wellenform'
            ]
          },
          frequency: {
            title: 'Professionelle Frequenzanalyse',
            items: [
              'Echtzeit-Analyse mit 1024-Punkt FFT (Fast Fourier Transform)',
              'Bass-Erkennung fur Kick-Drums und tiefe Frequenzen',
              'Mitten-Analyse fur Vocals und Melodien',
              'Hohen-Tracking fur Hi-Hats und Cymbals',
              'Dynamische Frequenzmischung fur optimale Reaktivitat'
            ]
          }
        },
        visualizers: {
          title: 'Uber 30 professionelle Visualizer',
          intro: 'Der Audio Visualizer bietet eine beeindruckende Sammlung von uber 30 verschiedenen Visualisierungen, organisiert in zehn Kategorien:',
          categories: [
            { name: 'Bars und Spektrum', items: ['Ultra-dynamische Frequenz-Bars', 'Gespiegelte Multi-Band Bars', 'Radiale Bars', 'Wellenform-Visualisierung'] },
            { name: 'Wellen und Organische Formen', items: ['Fluid Waves', 'Ripple-Effekt', 'Wellenform-Horizont'] },
            { name: 'Kreise und Geometrie', items: ['Dynamische konzentrische Kreise', 'Audio-reaktive Kreismuster', 'Geometrisches Kaleidoskop'] },
            { name: 'Partikel und Weltraum', items: ['Partikel-Sturm', 'Orbitierende Lichter', 'Pulsierende Kugeln'] },
            { name: 'Tech und Digital', items: ['Matrix Rain', 'Netzwerk-Plexus', 'Digital Rain', 'Neon Grid'] },
            { name: 'Kosmische Effekte', items: ['Kosmischer Nebel', 'Elektrisches Netz', 'Vortex-Portal', 'Spiralgalaxie'] },
            { name: 'Organische Visualisierungen', items: ['Bluhende Mandala', 'Frequenz-Bluten', 'Fraktaler Baum', 'Zellwachstum'] },
            { name: 'Retro und Pixel', items: ['8-Bit Pixel-Spektrum', 'Retro-Oszilloskop', 'Arcade-Blocke', 'Chiptune-Puls'] }
          ],
          features: {
            title: 'Visualizer-Funktionen',
            items: [
              'Multi-Layer-Unterstutzung: Staple mehrere Visualizer ubereinander',
              'Mischmodi: Bestimme, wie Layer miteinander interagieren',
              'Volle Farbkontrolle mit Transparenz',
              'Intensitatsregelung von 0% bis 200%',
              'Position und Grosse frei einstellbar',
              'Glattungsoptionen fur flussige Animationen',
              'Suchfilter zum schnellen Finden des perfekten Visualizers'
            ]
          }
        },
        text: {
          title: 'Professionelle Text-Funktionen',
          editor: {
            title: 'Text-Editor',
            items: [
              'Mehrzeilige Texte mit voller Absatzunterstutzung',
              '15+ professionelle Schriften: Satoshi, Switzer, Author, Alpino und mehr',
              'Schriftstile: Fett, Kursiv, verschiedene Schriftgewichte',
              'Dynamische Textgrosse mit automatischer Canvas-Anpassung',
              'Volle Farbauswahl mit Transparenz',
              'Textausrichtung: Links, Mitte, Rechts',
              'Zeichenabstand und Zeilenhohe individuell einstellbar'
            ]
          },
          effects: {
            title: 'Text-Effekte',
            items: [
              'Anpassbare Schatten mit Unscharfe, Versatz und Farbe',
              'Text-Umrandung mit Farb- und Breitenkontrolle',
              'Schreibmaschinen-Effekt mit einstellbarer Geschwindigkeit',
              'Uberblend-Effekt mit verschiedenen Richtungen',
              'Skalierungs-Effekt mit Start- und Endgrosse'
            ]
          },
          audioReactive: {
            title: 'Audio-reaktive Text-Effekte (15+ Effekte)',
            items: [
              'Farbeffekte: Farbton-Rotation, RGB-Glitch, Farbwechsel',
              'Helligkeit: Dynamische Helligkeitsanderungen',
              'Sattigung: Animierte Farbsattigung',
              'Skalierung/Zoom: Grossenanderung basierend auf Audio',
              'Gluhen: Leuchtender Effekt mit variabler Intensitat',
              'Schutteln, Hupfen, Schwingen, Rotation',
              'Stroboskop: Blitz-Effekt bei Audio-Peaks',
              'Welle: Zeichen bewegen sich wellenformig',
              'Elastisch: Gummiartige Verformung',
              '3D-Perspektive: Simulierter 3D-Kippeffekt'
            ]
          }
        },
        images: {
          title: 'Umfangreiche Bild-Funktionen',
          management: {
            title: 'Bildverwaltung',
            items: [
              'Mehrere Bilder gleichzeitig auf dem Canvas',
              'Bildgalerie mit eigenen Uploads',
              'Format-Unterstutzung: JPG, PNG, GIF, WebP',
              'Ebenen-Management: Ordne Bilder in Z-Reihenfolge',
              'Position: Drag-and-Drop Platzierung',
              'Skalierung: Grossenanderung mit Seitenverhaltnis-Kontrolle',
              'Rotation: 0-360 Grad Drehung'
            ]
          },
          filters: {
            title: 'Bildfilter und Effekte',
            items: [
              'Helligkeit: -100% bis +200%',
              'Kontrast: 0-200%',
              'Sattigung: 0-200%',
              'Unscharfe: 0-20px Gausssche Unscharfe',
              'Farbton-Rotation: 0-360 Grad Farbverschiebung',
              'Graustufen: 0-100% Entsattigung',
              'Sepia: 0-100% Vintage-Ton',
              'Invertieren: 0-100% Farbumkehrung'
            ]
          },
          audioReactive: {
            title: 'Audio-reaktive Bild-Effekte (23+ Effekte)',
            items: [
              'Farbeffekte: Farbton, Helligkeit, Sattigung, Kontrast',
              'Transformationen: Skalierung, Rotation, Verzerrung, Perspektive',
              'Bewegungseffekte: Schutteln, Hupfen, Schwingen, Orbit, Welle, Spirale',
              'Spezialeffekte: Gluhen, Rahmen, Unscharfe, Stroboskop, Chromatische Aberration',
              'Beat-Boost: Verstarke Effekte bei Beat-Hits (1.0-3.0x)',
              'Phasenversatz: Kaskadiere Effekte uber mehrere Bilder'
            ]
          }
        },
        background: {
          title: 'Hintergrund und Canvas',
          canvas: {
            title: 'Canvas-Kontrolle',
            intro: 'Social Media Presets - optimierte Grossen fur alle Plattformen:',
            presets: [
              'TikTok (1080x1920)',
              'Instagram Story (1080x1920)',
              'Instagram Post (1080x1080)',
              'Instagram Reel (1080x1920)',
              'YouTube Shorts (1080x1920)',
              'YouTube Video (1920x1080)',
              'Facebook Post (1200x630)',
              'X/Twitter Video (1280x720)',
              'LinkedIn Video (1920x1080)',
              'Freie Canvas-Grosse fur individuelle Dimensionen'
            ]
          },
          options: {
            title: 'Hintergrund-Optionen',
            items: [
              'Vollfarben-Hintergrund mit Farbwahler',
              'Transparenz-Kontrolle',
              'Lineare Farbverlaufe mit Winkelkontrolle',
              'Radiale Farbverlaufe mit Zentrumsausrichtung',
              'Animierte Farbverlaufe mit Audio-Reaktion',
              'Bilder als Hintergrund verwenden',
              'Video-Hintergrunde mit Wiedergabekontrolle'
            ]
          },
          tiles: {
            title: 'Gekachelter Hintergrund',
            items: [
              'Kachel-Modi: 3, 6, 9 oder 12 Kacheln',
              'Abstandskontrolle zwischen Kacheln',
              'Individuelle Einstellungen pro Kachel',
              'Eigene Hintergrundfarbe, Bild oder Video pro Kachel',
              'Eigene Filter und Audio-Reaktivitat pro Kachel',
              'Kachel-Presets speichern und laden'
            ]
          }
        },
        recording: {
          title: 'Video-Aufnahme und Export',
          controls: {
            title: 'Aufnahme-Steuerung',
            items: [
              'Vorbereiten: Canvas-Stream einrichten',
              'Start/Stop: Volle Aufnahmekontrolle',
              'Pause/Fortsetzen: Aufnahme unterbrechen ohne zu stoppen',
              'Zurucksetzen: Fur neue Aufnahme vorbereiten',
              'Status-Anzeige: IDLE, READY, RECORDING, PAUSED'
            ]
          },
          quality: {
            title: 'Qualitatsoptionen',
            items: [
              'Qualitatsstufen: Niedrig, Mittel, Hoch',
              'Auflosung: 720p, 1080p, 4K',
              'Bildrate: 30-60 FPS konfigurierbar',
              'Bitrate-Kontrolle: Adaptive Steuerung'
            ]
          },
          export: {
            title: 'Export-Formate',
            items: [
              'WebM: Standard Browser-Format',
              'MP4-Konvertierung: Via integriertem Server',
              'Automatische Konvertierung: Optional nach Aufnahme',
              'Direkter Download: Video auf Computer speichern',
              'Audio einbinden: Optional in Aufnahme'
            ]
          }
        },
        screenshot: {
          title: 'Screenshot-Funktion',
          items: [
            'Format-Optionen: PNG, JPG, WebP',
            'Qualitatsstufen: Klein bis Hochste Qualitat',
            'Vorschau vor dem Download',
            'Verlustfreies PNG mit Transparenz-Unterstutzung',
            'Komprimiertes JPG fur kleinere Dateigrosse',
            'Modernes WebP fur optimale Kompression'
          ]
        },
        shortcuts: {
          title: 'Tastaturkurzel',
          items: [
            { key: 'Leertaste', action: 'Play/Pause' },
            { key: 'S', action: 'Stop' },
            { key: 'R', action: 'Aufnahme' },
            { key: 'Strg+Z', action: 'Ruckgangig' },
            { key: 'Entf', action: 'Loschen' },
            { key: 'Strg+A', action: 'Alles auswahlen' },
            { key: 'Pfeiltasten', action: 'Objekt bewegen' },
            { key: '+/-', action: 'Zoom' },
            { key: 'G', action: 'Raster ein/aus' },
            { key: 'M', action: 'Beat-Marker setzen' }
          ]
        },
        history: {
          title: 'Ruckgangig/Wiederholen',
          items: [
            '50 Schritte Verlauf',
            'Ruckgangig mit visueller Ruckmeldung',
            'Wiederholen fur versehentlich ruckgangig gemachte Aktionen',
            'Command-Pattern: Jede Aktion ist reversibel'
          ]
        },
        audioReactivity: {
          title: 'Erweiterte Audio-Reaktivitat',
          frequency: {
            title: 'Frequenzfilterung',
            items: [
              'Bass-Analyse: Kick-Drum-Erkennung',
              'Mitten-Analyse: Vocals/Melodie',
              'Hohen-Analyse: Hi-Hats/Cymbals',
              'Gesamtlautstarke: Vollstandiger Audio-Level',
              'Dynamische Mischung: Automatische Frequenzkombination'
            ]
          },
          parameters: {
            title: 'Audio-Effekt-Parameter',
            items: [
              'Glattung: Flussige Animationen (0-100%)',
              'Schwellenwert: Minimaler Audio-Level fur Trigger',
              'Attack: Reaktionsgeschwindigkeit (10-100%)',
              'Release: Abklinggeschwindigkeit (10-100%)',
              'Easing-Kurven: Linear, Ease, Bounce, Elastic, Punch',
              'Phasenversatz: Verzogerte Effekte fur Kaskaden (0-360 Grad)',
              'Beat-Boost: Verstarkung bei Beats (1.0-3.0x)'
            ]
          },
          presets: {
            title: 'Effekt-Presets',
            items: [
              'Punchy: Schnell und prazise',
              'Smooth: Sanft und fliessend',
              'Subtle: Zuruckhaltend und dezent',
              'Extreme: Maximale Audio-Reaktion'
            ]
          }
        },
        browser: {
          title: 'Browser und Format-Unterstutzung',
          browsers: {
            title: 'Unterstutzte Browser',
            items: [
              'Chrome/Chromium: Vollstandig (empfohlen)',
              'Firefox: Vollstandig',
              'Edge: Vollstandig',
              'Safari: Unterstutzt (mit MediaRecorder-Einschrankungen)'
            ]
          },
          formats: {
            title: 'Unterstutzte Formate',
            items: [
              'Audio: MP3, WAV, OGG, FLAC, AAC und mehr',
              'Bilder: JPG, PNG, GIF, WebP',
              'Video: MP4, WebM, MOV (browserabhangig)'
            ]
          }
        },
        unique: {
          title: 'Einzigartige Vorteile',
          items: [
            '100% browserbasiert: Keine Installation erforderlich',
            'Datenschutz-fokussiert: Audio-Dateien werden nie hochgeladen',
            'Echtzeit-Verarbeitung: Live-Visualisierung wahrend der Wiedergabe',
            'Hardware-beschleunigt: Canvas-basierte 2D-Grafik',
            'Modulare Architektur: Separate Manager fur jede Funktion',
            'Professionelle Qualitat: Geeignet fur echte Musikvideos',
            'Komplett kostenlos: Keine Wasserzeichen, keine Einschrankungen'
          ]
        }
      },
      summary: {
        title: 'Zusammenfassung',
        text: 'Der Audio Visualizer ist ein umfassendes, funktionsreiches browserbasiertes Tool mit:',
        items: [
          '30+ professionelle Visualizer in uber 10 Kategorien',
          'Mehrere Content-Ebenen: Visualizer, Bilder, Text, Hintergrunde',
          'Audio-reaktive Effekte: 15+ Text-Effekte, 23+ Bild-Effekte',
          'Professioneller Export: WebM-Videoaufnahme + MP4-Konvertierung',
          'Reichhaltige Textbearbeitung: Animationseffekte, Schatten, Umrisse',
          'Fortgeschrittene Bildverarbeitung: Filter, Transformationen, Effekte',
          'Social Media Optimierung: Fertige Presets fur alle Plattformen',
          'Komplette Audio-Steuerung: EQ, Beat-Marker, Mikrofon',
          '50-Schritte Ruckgangig-System',
          'Zweisprachige Oberflache: Deutsch und Englisch'
        ],
        cta: 'Probiere es jetzt aus und verwandle deine Musik in visuelle Kunst!'
      },
      cta: {
        title: 'Bereit zum Starten?',
        subtitle: 'Erstelle jetzt deine erste Audio-Visualisierung - kostenlos und ohne Anmeldung.',
        button: 'Visualizer starten'
      }
    },

    // ========== INTERNAL LANDING PAGE ==========
    internalLanding: {
      lightMode: 'Hell',
      darkMode: 'Dunkel',
      hero: {
        title: 'Dein Audio.',
        highlight: 'Visuell erlebbar.',
        subtitle: 'Erstelle beeindruckende Musikvisualisierungen in Sekunden. Kostenlos, direkt im Browser, ohne Installation.',
        cta: 'Jetzt starten'
      },
      features: {
        cards: [
          {
            title: '100+ Visualizer',
            description: 'Von klassischen Waveforms bis zu spektakulären 3D-Effekten. Wähle aus einer riesigen Sammlung einzigartiger Audio-Visualisierungen.'
          },
          {
            title: 'HD Video-Export',
            description: 'Exportiere deine Kreationen als hochauflösende MP4-Videos mit bis zu 60 FPS. Direkt aus dem Browser, ohne zusätzliche Software.'
          },
          {
            title: 'Volle Kontrolle',
            description: 'Füge Texte, Bilder und Logos hinzu. Nutze audio-reaktive Effekte und passe jeden Aspekt deiner Visualisierung individuell an.'
          }
        ]
      }
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
      dblClickPreview: 'Doppelklick für Vorschau',
      dragToReorder: 'Ziehen um Ebenenreihenfolge zu ändern',
      replaceImage: 'Bild ersetzen',
      replaceWith: 'Ersetzen mit',
      uploadImage: 'Bild hochladen',
      fromGallery: 'Aus Galerie',
      selectFromGallery: 'Aus Galerie wählen',
      newImagePreview: 'Neues Bild Vorschau',
      confirmReplace: 'Ersetzen bestätigen'
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
      time: 'Zeit',
      volume: 'Lautstärke',
      bass: 'Bass',
      treble: 'Höhen',
      playlist: 'Wiedergabeliste',
      deleteAll: 'Alles löschen',
      playlistEmpty: 'Playlist ist leer',
      removeTrack: 'Track entfernen',
      dragToReorder: 'Ziehen um Reihenfolge zu ändern',
      confirmDeleteAll: 'Möchten Sie wirklich alle Tracks aus der Playlist entfernen?',
      confirmDeleteMarkers: 'Alle Beat-Drop Marker löschen?',
      editMarker: 'Marker bearbeiten',
      editMarkerTitle: 'Marker bearbeiten',
      addMarkerTitle: 'Neuer Marker'
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
        objects3d: '3D-Objekte',
        retroPixel: 'Retro & Pixel'
      },
      // Multi-Layer
      multiLayer: 'Multi-Layer',
      addLayer: 'Layer hinzufügen',
      noLayers: 'Keine Layer vorhanden',
      hideLayer: 'Layer ausblenden',
      showLayer: 'Layer einblenden',
      blendMode: 'Mischmodus'
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
      confirmClearText: 'Alle Inhalte werden gelöscht. Dies kann nicht rückgängig gemacht werden.',
      flipBackground: 'Hintergrund-Bild spiegeln',
      flipWorkspaceBackground: 'Workspace-Hintergrund spiegeln',
      flipHorizontal: 'Horizontal spiegeln',
      flipVertical: 'Vertikal spiegeln',
      horizontal: 'Horizontal',
      vertical: 'Vertikal',
      backgroundImage: 'Hintergrundbild',
      workspaceBackgroundImage: 'Workspace-Hintergrundbild',
      dblClickToReplace: 'Doppelklick zum Ersetzen',
      replaceBackground: 'Hintergrund ersetzen',
      replaceWorkspaceBackground: 'Workspace-Hintergrund ersetzen',
      audioReactiveKept: 'Audio-Reactive Einstellungen werden übernommen',
      selectWhatToReset: 'Wählen Sie, was zurückgesetzt werden soll',
      normalBackground: 'Hintergrund',
      workspaceBackground: 'Workspace',
      resetNormalBg: 'Normaler Hintergrund zurücksetzen',
      resetWorkspaceBg: 'Workspace-Hintergrund zurücksetzen',
      resetAll: 'Alle zurücksetzen'
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
      saturation: 'Sättigung',
      blur: 'Weichzeichner',
      hueRotate: 'Farbton',
      hue: 'Farbton',
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
      renderBehindVisualizer: 'Hinter Visualizer rendern',
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
      shadowOffsetX: 'Horizontal',
      shadowOffsetY: 'Vertikal',
      rotationAngle: 'Drehwinkel',
      moveUp: 'Nach oben',
      moveDown: 'Nach unten',
      shadow: 'Schatten',
      flip: 'Spiegeln',
      flipH: 'Horizontal spiegeln',
      flipV: 'Vertikal',
      horizontal: 'Horizontal',
      vertical: 'Vertikal',
      imageBorder: 'Bildkontur',
      border: 'Rahmen',
      borderWidth: 'Stärke',
      borderColor: 'Rahmenfarbe',
      borderOpacity: 'Deckkraft',
      borderRadius: 'Rundung',
      borderRadiusPercent: 'Rundung (%)',
      removeImage: 'Bild entfernen',
      // Presets
      presets: 'Bild-Presets',
      saveAsPreset: 'Als Preset speichern',
      noPresets: 'Keine Presets gespeichert',
      load: 'Laden',
      save: 'Speichern',
      apply: 'Anwenden',
      // Audio-Reactive
      audioLevel: 'Audio-Pegel',
      audioSource: 'Audio-Quelle',
      bass: 'Bass',
      mid: 'Mitten',
      treble: 'Höhen',
      volume: 'Lautstärke',
      global: 'Global',
      smoothing: 'Glättung',
      easing: 'Übergang',
      beatBoost: 'Beat-Verstärkung',
      beatBoostOff: 'Aus',
      phase: 'Phase',
      effects: 'Effekte',
      colorEffects: 'Farb-Effekte',
      transformEffects: 'Transform-Effekte',
      movementEffects: 'Bewegungs-Effekte',
      specialEffects: 'Spezial-Effekte',
      // Audio-reactive effect names
      effectNames: {
        hue: 'Farbton',
        brightness: 'Helligkeit',
        saturation: 'Sättigung',
        contrast: 'Kontrast',
        grayscale: 'Graustufen',
        sepia: 'Sepia',
        invert: 'Invertieren',
        scale: 'Skalierung',
        rotation: 'Rotation',
        skew: 'Verzerrung',
        perspective: 'Perspektive',
        shake: 'Schütteln',
        bounce: 'Hüpfen',
        swing: 'Schwingen',
        orbit: 'Orbit',
        figure8: 'Acht',
        wave: 'Welle',
        spiral: 'Spirale',
        float: 'Schweben',
        glow: 'Leuchten',
        border: 'Rahmen',
        blur: 'Unschärfe',
        strobe: 'Strobe',
        chromatic: 'Chromatisch'
      },
      // Stock gallery categories
      stockCategories: {
        backgrounds: 'Hintergründe',
        elements: 'Elemente',
        patterns: 'Muster',
        text: 'Text'
      }
    },

    // ========== SLIDESHOW ==========
    slideshow: {
      title: 'Bild-Slideshow',
      order: 'Reihenfolge (Drag & Drop)',
      timing: 'Timing-Einstellungen',
      fadeIn: 'Einblenden',
      display: 'Anzeigedauer',
      fadeOut: 'Ausblenden',
      applyAudioReactive: 'Audio-Reaktive Effekte anwenden',
      audioReactiveHint: 'Gespeicherte Audio-Einstellungen werden auf alle Bilder angewendet',
      noSavedSettings: 'Keine Audio-Einstellungen gespeichert. Speichere zuerst Einstellungen im Audio-Reaktiv Panel.',
      loop: 'Endlos wiederholen',
      start: 'Slideshow starten',
      pause: 'Pause',
      resume: 'Fortsetzen',
      stop: 'Stoppen',
      running: 'Läuft',
      paused: 'Pausiert',
      ready: 'Bereit',
      image: 'Bild',
      renderBehind: 'Hinter Visualizer rendern',
      positionSize: 'Position & Größe',
      positionX: 'X-Position',
      positionY: 'Y-Position',
      width: 'Breite',
      height: 'Höhe',
      resetPosition: 'Position zurücksetzen',
      dragHint: 'Die Slideshow kann auch mit der Maus auf dem Canvas verschoben und skaliert werden.'
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
      fromGallery: 'Aus Galerie',
      selectFromGallery: 'Aus Galerie wählen',
      galleryTitle: 'Bild aus Galerie wählen',
      galleryCategories: 'Kategorien',
      gallerySelect: 'Auswählen',
      galleryCancel: 'Abbrechen',
      uploadVideo: 'Video hochladen',
      removeVideo: 'Video entfernen',
      replaceImage: 'Bild ersetzen',
      replaceVideo: 'Video ersetzen',
      replaceWith: 'Ersetzen mit',
      videoMuted: 'Stumm',
      videoLoop: 'Endlosschleife',
      videoSpeed: 'Geschwindigkeit',
      videoPlaying: 'Video läuft',
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

    // ========== BLOG PAGE ==========
    blog: {
      nav: {
        home: 'Home',
        features: 'Features'
      },
      hero: {
        title: 'Audio Visualizer: Complete Feature Overview',
        subtitle: 'Transform your music into visual art - directly in your browser, no installation required, completely free.'
      },
      intro: 'Music is more than just sound - it is emotion, energy and expression. The Audio Visualizer brings this invisible force to the screen and transforms every beat, every frequency and every melody into fascinating visual experiences. Whether for social media content, music videos, live streams or artistic projects - this tool offers everything you need.',
      sections: {
        audio: {
          title: 'Audio Control and Analysis',
          player: {
            title: 'Full-Featured Audio Player',
            items: [
              'Complete playback control: Play, Pause, Stop, Forward and Rewind',
              'Volume control with visual feedback',
              'Equalizer for bass and treble - adjust the sound perfectly',
              'Playlist management for multiple tracks with drag-and-drop sorting'
            ]
          },
          microphone: {
            title: 'Live Microphone Support',
            items: [
              'Device selection for various audio inputs',
              'Echo cancellation for clean recordings',
              'Noise suppression for professional quality',
              'Auto-gain control for consistent levels'
            ]
          },
          beatMarkers: {
            title: 'Beat Marker System',
            items: [
              'Custom beat markers at any timestamp',
              'Color coding and labels for each marker',
              'Visual preview of markers in the waveform'
            ]
          },
          frequency: {
            title: 'Professional Frequency Analysis',
            items: [
              'Real-time analysis with 1024-point FFT (Fast Fourier Transform)',
              'Bass detection for kick drums and low frequencies',
              'Mid-range analysis for vocals and melodies',
              'Treble tracking for hi-hats and cymbals',
              'Dynamic frequency mixing for optimal reactivity'
            ]
          }
        },
        visualizers: {
          title: 'Over 30 Professional Visualizers',
          intro: 'The Audio Visualizer offers an impressive collection of over 30 different visualizations, organized into ten categories:',
          categories: [
            { name: 'Bars and Spectrum', items: ['Ultra-dynamic frequency bars', 'Mirrored multi-band bars', 'Radial bars', 'Waveform visualization'] },
            { name: 'Waves and Organic Forms', items: ['Fluid Waves', 'Ripple Effect', 'Waveform Horizon'] },
            { name: 'Circles and Geometry', items: ['Dynamic concentric circles', 'Audio-reactive circle patterns', 'Geometric kaleidoscope'] },
            { name: 'Particles and Space', items: ['Particle Storm', 'Orbiting Lights', 'Pulsating Orbs'] },
            { name: 'Tech and Digital', items: ['Matrix Rain', 'Network Plexus', 'Digital Rain', 'Neon Grid'] },
            { name: 'Cosmic Effects', items: ['Cosmic Nebula', 'Electric Web', 'Vortex Portal', 'Spiral Galaxy'] },
            { name: 'Organic Visualizations', items: ['Blooming Mandala', 'Frequency Blossoms', 'Fractal Tree', 'Cell Growth'] },
            { name: 'Retro and Pixel', items: ['8-Bit Pixel Spectrum', 'Retro Oscilloscope', 'Arcade Blocks', 'Chiptune Pulse'] }
          ],
          features: {
            title: 'Visualizer Features',
            items: [
              'Multi-layer support: Stack multiple visualizers on top of each other',
              'Blend modes: Determine how layers interact with each other',
              'Full color control with transparency',
              'Intensity control from 0% to 200%',
              'Position and size freely adjustable',
              'Smoothing options for fluid animations',
              'Search filter to quickly find the perfect visualizer'
            ]
          }
        },
        text: {
          title: 'Professional Text Features',
          editor: {
            title: 'Text Editor',
            items: [
              'Multi-line texts with full paragraph support',
              '15+ professional fonts: Satoshi, Switzer, Author, Alpino and more',
              'Font styles: Bold, Italic, various font weights',
              'Dynamic text size with automatic canvas adjustment',
              'Full color selection with transparency',
              'Text alignment: Left, Center, Right',
              'Letter spacing and line height individually adjustable'
            ]
          },
          effects: {
            title: 'Text Effects',
            items: [
              'Customizable shadows with blur, offset and color',
              'Text outline with color and width control',
              'Typewriter effect with adjustable speed',
              'Fade effect with various directions',
              'Scale effect with start and end size'
            ]
          },
          audioReactive: {
            title: 'Audio-Reactive Text Effects (15+ Effects)',
            items: [
              'Color effects: Hue rotation, RGB glitch, color change',
              'Brightness: Dynamic brightness changes',
              'Saturation: Animated color saturation',
              'Scale/Zoom: Size changes based on audio',
              'Glow: Luminous effect with variable intensity',
              'Shake, Bounce, Swing, Rotation',
              'Strobe: Flash effect on audio peaks',
              'Wave: Characters move in wave pattern',
              'Elastic: Rubber-like deformation',
              '3D Perspective: Simulated 3D tilt effect'
            ]
          }
        },
        images: {
          title: 'Comprehensive Image Features',
          management: {
            title: 'Image Management',
            items: [
              'Multiple images simultaneously on the canvas',
              'Image gallery with your own uploads',
              'Format support: JPG, PNG, GIF, WebP',
              'Layer management: Arrange images in Z-order',
              'Position: Drag-and-drop placement',
              'Scaling: Resize with aspect ratio control',
              'Rotation: 0-360 degree rotation'
            ]
          },
          filters: {
            title: 'Image Filters and Effects',
            items: [
              'Brightness: -100% to +200%',
              'Contrast: 0-200%',
              'Saturation: 0-200%',
              'Blur: 0-20px Gaussian blur',
              'Hue Rotation: 0-360 degree color shift',
              'Grayscale: 0-100% desaturation',
              'Sepia: 0-100% vintage tone',
              'Invert: 0-100% color inversion'
            ]
          },
          audioReactive: {
            title: 'Audio-Reactive Image Effects (23+ Effects)',
            items: [
              'Color effects: Hue, brightness, saturation, contrast',
              'Transformations: Scale, rotation, skew, perspective',
              'Movement effects: Shake, bounce, swing, orbit, wave, spiral',
              'Special effects: Glow, border, blur, strobe, chromatic aberration',
              'Beat Boost: Amplify effects on beat hits (1.0-3.0x)',
              'Phase offset: Cascade effects across multiple images'
            ]
          }
        },
        background: {
          title: 'Background and Canvas',
          canvas: {
            title: 'Canvas Control',
            intro: 'Social Media Presets - optimized sizes for all platforms:',
            presets: [
              'TikTok (1080x1920)',
              'Instagram Story (1080x1920)',
              'Instagram Post (1080x1080)',
              'Instagram Reel (1080x1920)',
              'YouTube Shorts (1080x1920)',
              'YouTube Video (1920x1080)',
              'Facebook Post (1200x630)',
              'X/Twitter Video (1280x720)',
              'LinkedIn Video (1920x1080)',
              'Free canvas size for custom dimensions'
            ]
          },
          options: {
            title: 'Background Options',
            items: [
              'Solid color background with color picker',
              'Transparency control',
              'Linear gradients with angle control',
              'Radial gradients with center alignment',
              'Animated gradients with audio reaction',
              'Use images as background',
              'Video backgrounds with playback control'
            ]
          },
          tiles: {
            title: 'Tiled Background',
            items: [
              'Tile modes: 3, 6, 9 or 12 tiles',
              'Gap control between tiles',
              'Individual settings per tile',
              'Custom background color, image or video per tile',
              'Custom filters and audio reactivity per tile',
              'Save and load tile presets'
            ]
          }
        },
        recording: {
          title: 'Video Recording and Export',
          controls: {
            title: 'Recording Controls',
            items: [
              'Prepare: Set up canvas stream',
              'Start/Stop: Full recording control',
              'Pause/Resume: Pause recording without stopping',
              'Reset: Prepare for new recording',
              'Status display: IDLE, READY, RECORDING, PAUSED'
            ]
          },
          quality: {
            title: 'Quality Options',
            items: [
              'Quality levels: Low, Medium, High',
              'Resolution: 720p, 1080p, 4K',
              'Frame rate: 30-60 FPS configurable',
              'Bitrate control: Adaptive management'
            ]
          },
          export: {
            title: 'Export Formats',
            items: [
              'WebM: Standard browser format',
              'MP4 conversion: Via integrated server',
              'Automatic conversion: Optional after recording',
              'Direct download: Save video to computer',
              'Include audio: Optional in recording'
            ]
          }
        },
        screenshot: {
          title: 'Screenshot Feature',
          items: [
            'Format options: PNG, JPG, WebP',
            'Quality levels: Small to highest quality',
            'Preview before download',
            'Lossless PNG with transparency support',
            'Compressed JPG for smaller file size',
            'Modern WebP for optimal compression'
          ]
        },
        shortcuts: {
          title: 'Keyboard Shortcuts',
          items: [
            { key: 'Space', action: 'Play/Pause' },
            { key: 'S', action: 'Stop' },
            { key: 'R', action: 'Record' },
            { key: 'Ctrl+Z', action: 'Undo' },
            { key: 'Del', action: 'Delete' },
            { key: 'Ctrl+A', action: 'Select all' },
            { key: 'Arrow keys', action: 'Move object' },
            { key: '+/-', action: 'Zoom' },
            { key: 'G', action: 'Toggle grid' },
            { key: 'M', action: 'Set beat marker' }
          ]
        },
        history: {
          title: 'Undo/Redo',
          items: [
            '50 steps history',
            'Undo with visual feedback',
            'Redo for accidentally undone actions',
            'Command pattern: Every action is reversible'
          ]
        },
        audioReactivity: {
          title: 'Advanced Audio Reactivity',
          frequency: {
            title: 'Frequency Filtering',
            items: [
              'Bass analysis: Kick drum detection',
              'Mid-range analysis: Vocals/melody',
              'Treble analysis: Hi-hats/cymbals',
              'Overall volume: Complete audio level',
              'Dynamic mixing: Automatic frequency combination'
            ]
          },
          parameters: {
            title: 'Audio Effect Parameters',
            items: [
              'Smoothing: Fluid animations (0-100%)',
              'Threshold: Minimum audio level for trigger',
              'Attack: Response speed (10-100%)',
              'Release: Decay speed (10-100%)',
              'Easing curves: Linear, Ease, Bounce, Elastic, Punch',
              'Phase offset: Delayed effects for cascades (0-360 degrees)',
              'Beat Boost: Amplification on beats (1.0-3.0x)'
            ]
          },
          presets: {
            title: 'Effect Presets',
            items: [
              'Punchy: Fast and precise',
              'Smooth: Gentle and flowing',
              'Subtle: Restrained and delicate',
              'Extreme: Maximum audio reaction'
            ]
          }
        },
        browser: {
          title: 'Browser and Format Support',
          browsers: {
            title: 'Supported Browsers',
            items: [
              'Chrome/Chromium: Full support (recommended)',
              'Firefox: Full support',
              'Edge: Full support',
              'Safari: Supported (with MediaRecorder limitations)'
            ]
          },
          formats: {
            title: 'Supported Formats',
            items: [
              'Audio: MP3, WAV, OGG, FLAC, AAC and more',
              'Images: JPG, PNG, GIF, WebP',
              'Video: MP4, WebM, MOV (browser dependent)'
            ]
          }
        },
        unique: {
          title: 'Unique Advantages',
          items: [
            '100% browser-based: No installation required',
            'Privacy-focused: Audio files are never uploaded',
            'Real-time processing: Live visualization during playback',
            'Hardware-accelerated: Canvas-based 2D graphics',
            'Modular architecture: Separate managers for each function',
            'Professional quality: Suitable for real music videos',
            'Completely free: No watermarks, no restrictions'
          ]
        }
      },
      summary: {
        title: 'Summary',
        text: 'The Audio Visualizer is a comprehensive, feature-rich browser-based tool with:',
        items: [
          '30+ professional visualizers in over 10 categories',
          'Multiple content layers: Visualizers, images, text, backgrounds',
          'Audio-reactive effects: 15+ text effects, 23+ image effects',
          'Professional export: WebM video recording + MP4 conversion',
          'Rich text editing: Animation effects, shadows, outlines',
          'Advanced image processing: Filters, transformations, effects',
          'Social media optimization: Ready-made presets for all platforms',
          'Complete audio control: EQ, beat markers, microphone',
          '50-step undo system',
          'Bilingual interface: German and English'
        ],
        cta: 'Try it now and transform your music into visual art!'
      },
      cta: {
        title: 'Ready to Start?',
        subtitle: 'Create your first audio visualization now - free and without registration.',
        button: 'Start Visualizer'
      }
    },

    // ========== INTERNAL LANDING PAGE ==========
    internalLanding: {
      lightMode: 'Light',
      darkMode: 'Dark',
      hero: {
        title: 'Your Audio.',
        highlight: 'Visually alive.',
        subtitle: 'Create stunning music visualizations in seconds. Free, directly in your browser, no installation required.',
        cta: 'Get Started'
      },
      features: {
        cards: [
          {
            title: '100+ Visualizers',
            description: 'From classic waveforms to spectacular 3D effects. Choose from a huge collection of unique audio visualizations.'
          },
          {
            title: 'HD Video Export',
            description: 'Export your creations as high-resolution MP4 videos with up to 60 FPS. Directly from your browser, no additional software needed.'
          },
          {
            title: 'Full Control',
            description: 'Add texts, images and logos. Use audio-reactive effects and customize every aspect of your visualization individually.'
          }
        ]
      }
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
      dblClickPreview: 'Double-click for preview',
      dragToReorder: 'Drag to change layer order',
      replaceImage: 'Replace Image',
      replaceWith: 'Replace with',
      uploadImage: 'Upload Image',
      fromGallery: 'From Gallery',
      selectFromGallery: 'Select from Gallery',
      newImagePreview: 'New Image Preview',
      confirmReplace: 'Confirm Replace'
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
      time: 'Time',
      volume: 'Volume',
      bass: 'Bass',
      treble: 'Treble',
      playlist: 'Playlist',
      deleteAll: 'Delete all',
      playlistEmpty: 'Playlist is empty',
      removeTrack: 'Remove track',
      dragToReorder: 'Drag to reorder',
      confirmDeleteAll: 'Are you sure you want to remove all tracks from the playlist?',
      confirmDeleteMarkers: 'Delete all beat-drop markers?',
      editMarker: 'Edit marker',
      editMarkerTitle: 'Edit Marker',
      addMarkerTitle: 'New Marker'
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
        objects3d: '3D Objects',
        retroPixel: 'Retro & Pixel'
      },
      // Multi-Layer
      multiLayer: 'Multi-Layer',
      addLayer: 'Add Layer',
      noLayers: 'No layers',
      hideLayer: 'Hide layer',
      showLayer: 'Show layer',
      blendMode: 'Blend Mode'
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
      confirmClearText: 'All content will be deleted. This cannot be undone.',
      flipBackground: 'Flip Background Image',
      flipWorkspaceBackground: 'Flip Workspace Background',
      flipHorizontal: 'Flip horizontally',
      flipVertical: 'Flip vertically',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      backgroundImage: 'Background Image',
      workspaceBackgroundImage: 'Workspace Background Image',
      dblClickToReplace: 'Double-click to replace',
      replaceBackground: 'Replace Background',
      replaceWorkspaceBackground: 'Replace Workspace Background',
      audioReactiveKept: 'Audio-Reactive settings will be preserved',
      selectWhatToReset: 'Select what to reset',
      normalBackground: 'Background',
      workspaceBackground: 'Workspace',
      resetNormalBg: 'Reset normal background',
      resetWorkspaceBg: 'Reset workspace background',
      resetAll: 'Reset all'
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
      saturation: 'Saturation',
      blur: 'Blur',
      hueRotate: 'Hue',
      hue: 'Hue',
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
      renderBehindVisualizer: 'Render behind visualizer',
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
      shadowOffsetX: 'Horizontal',
      shadowOffsetY: 'Vertical',
      rotationAngle: 'Rotation angle',
      moveUp: 'Move up',
      moveDown: 'Move down',
      shadow: 'Shadow',
      flip: 'Flip',
      flipH: 'Flip horizontal',
      flipV: 'Vertical',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      imageBorder: 'Image Border',
      border: 'Border',
      borderWidth: 'Width',
      borderColor: 'Border Color',
      borderOpacity: 'Opacity',
      borderRadius: 'Radius',
      borderRadiusPercent: 'Radius (%)',
      removeImage: 'Remove Image',
      // Presets
      presets: 'Image Presets',
      saveAsPreset: 'Save as Preset',
      noPresets: 'No presets saved',
      load: 'Load',
      save: 'Save',
      apply: 'Apply',
      // Audio-Reactive
      audioLevel: 'Audio Level',
      audioSource: 'Audio Source',
      bass: 'Bass',
      mid: 'Mid',
      treble: 'Treble',
      volume: 'Volume',
      global: 'Global',
      smoothing: 'Smoothing',
      easing: 'Easing',
      beatBoost: 'Beat Boost',
      beatBoostOff: 'Off',
      phase: 'Phase',
      effects: 'Effects',
      colorEffects: 'Color Effects',
      transformEffects: 'Transform Effects',
      movementEffects: 'Movement Effects',
      specialEffects: 'Special Effects',
      // Audio-reactive effect names
      effectNames: {
        hue: 'Hue',
        brightness: 'Brightness',
        saturation: 'Saturation',
        contrast: 'Contrast',
        grayscale: 'Grayscale',
        sepia: 'Sepia',
        invert: 'Invert',
        scale: 'Scale',
        rotation: 'Rotation',
        skew: 'Skew',
        perspective: 'Perspective',
        shake: 'Shake',
        bounce: 'Bounce',
        swing: 'Swing',
        orbit: 'Orbit',
        figure8: 'Figure 8',
        wave: 'Wave',
        spiral: 'Spiral',
        float: 'Float',
        glow: 'Glow',
        border: 'Border',
        blur: 'Blur',
        strobe: 'Strobe',
        chromatic: 'Chromatic'
      },
      // Stock gallery categories
      stockCategories: {
        backgrounds: 'Backgrounds',
        elements: 'Elements',
        patterns: 'Patterns',
        text: 'Text'
      }
    },

    // ========== SLIDESHOW ==========
    slideshow: {
      title: 'Image Slideshow',
      order: 'Order (Drag & Drop)',
      timing: 'Timing Settings',
      fadeIn: 'Fade In',
      display: 'Display Duration',
      fadeOut: 'Fade Out',
      applyAudioReactive: 'Apply Audio-Reactive Effects',
      audioReactiveHint: 'Saved audio settings will be applied to all images',
      noSavedSettings: 'No audio settings saved. Save settings in the Audio-Reactive panel first.',
      loop: 'Loop Forever',
      start: 'Start Slideshow',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      running: 'Running',
      paused: 'Paused',
      ready: 'Ready',
      image: 'Image',
      renderBehind: 'Render behind visualizer',
      positionSize: 'Position & Size',
      positionX: 'X Position',
      positionY: 'Y Position',
      width: 'Width',
      height: 'Height',
      resetPosition: 'Reset position',
      dragHint: 'The slideshow can also be moved and scaled with the mouse on the canvas.'
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
      fromGallery: 'From Gallery',
      selectFromGallery: 'Select from Gallery',
      galleryTitle: 'Select Image from Gallery',
      galleryCategories: 'Categories',
      gallerySelect: 'Select',
      galleryCancel: 'Cancel',
      uploadVideo: 'Upload Video',
      removeVideo: 'Remove Video',
      replaceImage: 'Replace Image',
      replaceVideo: 'Replace Video',
      replaceWith: 'Replace with',
      videoMuted: 'Muted',
      videoLoop: 'Loop',
      videoSpeed: 'Speed',
      videoPlaying: 'Video playing',
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

// Listen for SSI navigation language-changed events to keep Vue reactive state in sync
if (typeof window !== 'undefined') {
  window.addEventListener('language-changed', (e) => {
    const lang = e.detail && e.detail.lang
    if (lang) setLocale(lang)
  })
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
