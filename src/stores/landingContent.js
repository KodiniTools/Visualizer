import { defineStore } from 'pinia'
import { reactive, computed, ref } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useAuthStore } from './auth'

// ==========================================================================
// Landing-Content Store
//
// Verwaltet die vom Admin bearbeitbaren Texte der Visualizer-Landing-Page
// (Hero, Funktionen, Video, FAQ, Call-to-Action). Leere Felder fallen auf die
// Standard-Übersetzungen (i18n) zurück. Änderungen werden in localStorage und
// – falls ein Backend erreichbar ist – serverseitig gespeichert und an ALLE
// Besucher ausgeliefert (Broadcast), analog zum "Modernen Musikplayer".
// ==========================================================================

const STORAGE_KEY = 'visualizerLandingContent'

// Baut ein leeres Overrides-Skelett anhand der aktuellen Standard-Struktur.
// So passt sich die Anzahl der Karten/FAQ-Einträge automatisch an die i18n an.
function emptyContent(defaults) {
  const cards = Array.isArray(defaults?.features?.cards) ? defaults.features.cards : []
  const items = Array.isArray(defaults?.faq?.items) ? defaults.faq.items : []
  return {
    hero: { title: '', titleHighlight: '', subtitle: '', cta: '', learnMore: '' },
    features: {
      title: '',
      subtitle: '',
      cards: cards.map(() => ({ title: '', description: '' })),
    },
    video: { title: '', subtitle: '' },
    faq: {
      title: '',
      subtitle: '',
      items: items.map(() => ({ question: '', answer: '' })),
    },
    cta: { title: '', subtitle: '', button: '' },
  }
}

// Übernimmt vorhandene Overrides in ein frisches Skelett (robust gegen
// fehlende/zusätzliche Felder aus älteren gespeicherten Ständen).
function normalizeInto(target, raw) {
  if (!raw || typeof raw !== 'object') return target
  const str = (v) => (typeof v === 'string' ? v : '')

  if (raw.hero) {
    target.hero.title = str(raw.hero.title)
    target.hero.titleHighlight = str(raw.hero.titleHighlight)
    target.hero.subtitle = str(raw.hero.subtitle)
    target.hero.cta = str(raw.hero.cta)
    target.hero.learnMore = str(raw.hero.learnMore)
  }
  if (raw.features) {
    target.features.title = str(raw.features.title)
    target.features.subtitle = str(raw.features.subtitle)
    if (Array.isArray(raw.features.cards)) {
      target.features.cards.forEach((card, i) => {
        const src = raw.features.cards[i]
        if (src) {
          card.title = str(src.title)
          card.description = str(src.description)
        }
      })
    }
  }
  if (raw.video) {
    target.video.title = str(raw.video.title)
    target.video.subtitle = str(raw.video.subtitle)
  }
  if (raw.faq) {
    target.faq.title = str(raw.faq.title)
    target.faq.subtitle = str(raw.faq.subtitle)
    if (Array.isArray(raw.faq.items)) {
      target.faq.items.forEach((item, i) => {
        const src = raw.faq.items[i]
        if (src) {
          item.question = str(src.question)
          item.answer = str(src.answer)
        }
      })
    }
  }
  if (raw.cta) {
    target.cta.title = str(raw.cta.title)
    target.cta.subtitle = str(raw.cta.subtitle)
    target.cta.button = str(raw.cta.button)
  }
  return target
}

// Override verwenden, wenn es ein nicht-leerer String ist, sonst Standard.
const pick = (override, fallback) =>
  typeof override === 'string' && override.trim() !== '' ? override : fallback

export const useLandingContentStore = defineStore('landingContent', () => {
  const { t, locale } = useI18n()

  // Standardwerte (aktuelle Sprache) – Grundlage für Platzhalter & Fallback.
  const defaults = computed(() => {
    const _ = locale.value // Reaktivität an Sprachwechsel koppeln
    return {
      hero: t('hero') || {},
      features: t('features') || {},
      video: t('video') || {},
      faq: t('faq') || {},
      cta: t('cta') || {},
    }
  })

  // Bearbeitbare Overrides (reaktiv). Start = leeres Skelett.
  const content = reactive(emptyContent(defaults.value))

  const updatedAt = ref(null)

  // Ersetzt den Inhalt an Ort und Stelle (behält Reaktivität der Referenz).
  const applyContent = (raw) => {
    const fresh = normalizeInto(emptyContent(defaults.value), raw)
    Object.assign(content, fresh)
  }

  // Effektive (angezeigte) Werte: Override oder i18n-Standard.
  const merged = computed(() => {
    const d = defaults.value
    return {
      hero: {
        title: pick(content.hero.title, d.hero.title),
        titleHighlight: pick(content.hero.titleHighlight, d.hero.titleHighlight),
        subtitle: pick(content.hero.subtitle, d.hero.subtitle),
        cta: pick(content.hero.cta, d.hero.cta),
        learnMore: pick(content.hero.learnMore, d.hero.learnMore),
      },
      features: {
        title: pick(content.features.title, d.features.title),
        subtitle: pick(content.features.subtitle, d.features.subtitle),
        cards: (d.features.cards || []).map((def, i) => ({
          title: pick(content.features.cards[i]?.title, def.title),
          description: pick(content.features.cards[i]?.description, def.description),
        })),
      },
      video: {
        title: pick(content.video.title, d.video.title),
        subtitle: pick(content.video.subtitle, d.video.subtitle),
      },
      faq: {
        title: pick(content.faq.title, d.faq.title),
        subtitle: pick(content.faq.subtitle, d.faq.subtitle),
        items: (d.faq.items || []).map((def, i) => ({
          question: pick(content.faq.items[i]?.question, def.question),
          answer: pick(content.faq.items[i]?.answer, def.answer),
        })),
      },
      cta: {
        title: pick(content.cta.title, d.cta.title),
        subtitle: pick(content.cta.subtitle, d.cta.subtitle),
        button: pick(content.cta.button, d.cta.button),
      },
    }
  })

  // Snapshot der Overrides (serialisierbar).
  const snapshot = () => JSON.parse(JSON.stringify(content))

  // ── Persistenz (localStorage) ─────────────────────────────────────
  const persistLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
    } catch (e) {
      console.error('[LandingContent] localStorage-Fehler:', e)
    }
  }

  const loadLocal = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) applyContent(JSON.parse(saved))
    } catch (e) {
      console.error('[LandingContent] Laden fehlgeschlagen:', e)
    }
  }

  // ── Backend-Synchronisation (Broadcast an alle Besucher) ──────────
  const saveToServer = async () => {
    const authStore = useAuthStore()
    if (!authStore.token) return
    try {
      const response = await fetch(`${authStore.getApiBase()}/landing-content`, {
        method: 'POST',
        headers: authStore.getAuthHeaders(),
        body: JSON.stringify({ content: snapshot() }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.updatedAt) updatedAt.value = data.updatedAt
      }
    } catch (e) {
      console.error('[LandingContent] Speichern auf dem Server fehlgeschlagen:', e)
    }
  }

  // Entprellter Server-Sync, damit schnelles Tippen den Server nicht flutet.
  let serverSyncTimer = null
  const scheduleServerSync = () => {
    const authStore = useAuthStore()
    if (!authStore.token) return
    if (serverSyncTimer) clearTimeout(serverSyncTimer)
    serverSyncTimer = setTimeout(() => saveToServer(), 500)
  }

  // Vom Admin aufgerufen bei jeder Änderung.
  const save = () => {
    persistLocal()
    scheduleServerSync()
  }

  // Alle Overlays zurücksetzen (zeigt wieder die i18n-Standardtexte).
  const resetAll = () => {
    Object.assign(content, emptyContent(defaults.value))
    save()
  }

  const applyServerState = (data) => {
    if (!data) return
    applyContent(data.content)
    updatedAt.value = data.updatedAt ?? null
    // Server-Stand ist maßgeblich → auch lokal spiegeln
    persistLocal()
  }

  const fetchBroadcast = async () => {
    const authStore = useAuthStore()
    try {
      const response = await fetch(`${authStore.getApiBase()}/landing-content`)
      if (response.ok) {
        const data = await response.json()
        applyServerState(data)
        return data
      }
    } catch (e) {
      // Kein Backend → localStorage bleibt maßgeblich
    }
    return null
  }

  const fetchVersion = async () => {
    const authStore = useAuthStore()
    try {
      const response = await fetch(`${authStore.getApiBase()}/landing-content/version`)
      if (response.ok) {
        const data = await response.json()
        return data.updatedAt ?? null
      }
    } catch (e) {
      // still ignorieren
    }
    return null
  }

  return {
    content,
    defaults,
    merged,
    updatedAt,
    loadLocal,
    save,
    resetAll,
    saveToServer,
    fetchBroadcast,
    fetchVersion,
    applyServerState,
  }
})
