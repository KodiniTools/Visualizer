import { ref, computed } from 'vue'

// Reactive locale state
const currentLocale = ref(localStorage.getItem('locale') || 'de')

// Translations
const translations = {
  de: {
    // Hero Section
    hero: {
      badge: 'Audio Visualizer',
      title: 'Verwandle deine Musik in',
      titleHighlight: 'visuelle Kunst',
      subtitle: 'Erstelle beeindruckende Audio-Visualisierungen für Social Media, Musikvideos und mehr. Kostenlos, direkt im Browser.',
      cta: 'Visualizer starten',
      learnMore: 'Mehr erfahren'
    },
    // Features Section
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
    // Video Section
    video: {
      title: 'So funktioniert es',
      subtitle: 'Schau dir an, wie einfach du atemberaubende Visualisierungen erstellen kannst',
      placeholder: 'Demo-Video kommt bald'
    },
    // FAQ Section
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
    // CTA Section
    cta: {
      title: 'Bereit zum Starten?',
      subtitle: 'Erstelle jetzt deine erste Audio-Visualisierung - kostenlos und ohne Anmeldung.',
      button: 'Visualizer starten'
    },
    // Footer
    footer: {
      copyright: '© 2025 Audio Visualizer. Alle Rechte vorbehalten.'
    },
    // Theme
    theme: {
      light: 'Hell',
      dark: 'Dunkel'
    }
  },
  en: {
    // Hero Section
    hero: {
      badge: 'Audio Visualizer',
      title: 'Transform your music into',
      titleHighlight: 'visual art',
      subtitle: 'Create stunning audio visualizations for social media, music videos and more. Free, directly in your browser.',
      cta: 'Start Visualizer',
      learnMore: 'Learn more'
    },
    // Features Section
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
    // Video Section
    video: {
      title: 'How it works',
      subtitle: 'See how easy it is to create stunning visualizations',
      placeholder: 'Demo video coming soon'
    },
    // FAQ Section
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
    // CTA Section
    cta: {
      title: 'Ready to start?',
      subtitle: 'Create your first audio visualization now - free and without registration.',
      button: 'Start Visualizer'
    },
    // Footer
    footer: {
      copyright: '© 2025 Audio Visualizer. All rights reserved.'
    },
    // Theme
    theme: {
      light: 'Light',
      dark: 'Dark'
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
