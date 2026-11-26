<template>
  <div ref="pageEl" class="landing-page" :class="{ 'light-theme': !isDark }">
    <!-- Header with Controls -->
    <header class="landing-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <!-- Logo und Schriftzug „KodiniTools“ liefert die globale Navigation (SSI); hier bewusst nicht doppelt. -->
        <nav class="header-nav" :aria-label="t('blog.nav.home')">
          <router-link to="/" class="nav-link" @click="scrollToTop">{{
            t('blog.nav.home')
          }}</router-link>
          <a href="#features" class="nav-link">{{ t('blog.nav.features') }}</a>
          <a href="#faq" class="nav-link">{{ t('blog.nav.faq') }}</a>
          <a href="#blog" class="nav-link">{{ t('blog.nav.blog') }}</a>
        </nav>
        <router-link to="/app" class="landing-header-cta">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{{ content.hero.cta }}</span>
        </router-link>
      </div>
    </header>

    <!-- Hero, Funktionen, Vorteile: Aufbau und Maße nach dem Audio Normalizer (Kodini 23.11.2026) -->
    <section class="lp-hero">
      <div class="lp-container">
        <div class="lp-hero-content">
          <h1 class="lp-hero-title">
            <span class="lp-hero-title-gold">{{ heroTitle.first }}</span
            ><template v-if="heroTitle.rest"
              >{{ ' ' }}<span class="lp-hero-title-blue">{{ heroTitle.rest }}</span></template
            >
          </h1>
          <p class="lp-hero-subtitle">{{ t('hero.tagline') }}</p>
          <p class="lp-hero-description">{{ content.hero.subtitle }}</p>
          <router-link to="/app" class="lp-btn-hero"
            >{{ content.hero.cta }}<span aria-hidden="true">&nbsp;→</span></router-link
          >
        </div>
        <div class="lp-hero-media">
          <HeroVisualizerShowcase />
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="lp-features">
      <div class="lp-container">
        <h2 class="lp-section-title">{{ content.features.title }}</h2>
        <div class="lp-grid">
          <div v-for="(card, index) in featureCards" :key="index" class="lp-card lp-feature-card">
            <div class="lp-feature-icon">
              <component :is="card.icon" />
            </div>
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="lp-benefits">
      <div class="lp-container">
        <h2 class="lp-section-title">{{ t('benefits.title') }}</h2>
        <div class="lp-grid">
          <div
            v-for="(benefit, index) in benefitItems"
            :key="index"
            class="lp-card lp-benefit-card"
          >
            <h3>{{ benefit.title }}</h3>
            <p>{{ benefit.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Video Demo Section -->
    <section class="video-section">
      <div class="section-header">
        <h2 class="section-title">{{ content.video.title }}</h2>
        <p class="section-subtitle">{{ content.video.subtitle }}</p>
      </div>
      <div class="video-container">
        <img
          :src="`${baseUrl}gallery/videos/podcast.gif`"
          :alt="t('video.imageAlt')"
          class="demo-gif"
          loading="lazy"
        />
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="lp-faq">
      <div class="lp-container">
        <h2 class="lp-section-title">{{ content.faq.title }}</h2>
        <div class="lp-faq-list">
          <div
            v-for="(faq, index) in faqItems"
            :key="index"
            class="lp-faq-item"
            :class="{ 'lp-faq-open': activeFaq === index }"
          >
            <button
              type="button"
              class="lp-faq-question"
              :aria-expanded="activeFaq === index"
              @click="toggleFaq(index)"
            >
              <span>{{ faq.question }}</span>
              <span class="lp-faq-icon" aria-hidden="true">{{
                activeFaq === index ? '−' : '+'
              }}</span>
            </button>
            <div v-show="activeFaq === index" class="lp-faq-answer">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Blog Section: Beiträge zum Visualizer auf kodinitools.com/blog -->
    <section id="blog" class="blog-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('blogArticles.title') }}</h2>
        <p class="section-subtitle">{{ t('blogArticles.subtitle') }}</p>
      </div>
      <div class="blog-grid">
        <a
          v-for="article in blogCards"
          :key="article.id"
          :href="article.url"
          class="blog-card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="blog-card-media">
            <img :src="article.image" alt="" width="640" height="360" loading="lazy" />
          </div>
          <div class="blog-card-body">
            <div class="blog-card-header">
              <span class="blog-card-tag">{{ article.tag }}</span>
              <span class="blog-card-meta">{{ article.meta }}</span>
            </div>
            <h3 class="blog-card-title">{{ article.title }}</h3>
            <p class="blog-card-description">{{ article.description }}</p>
            <span class="blog-card-link">
              {{ t('blogArticles.readMore') }}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </span>
          </div>
        </a>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">{{ content.cta.title }}</h2>
        <p class="cta-subtitle">{{ content.cta.subtitle }}</p>
        <router-link to="/app" class="btn-primary btn-large">
          <span class="btn-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </span>
          {{ content.cta.button }}
        </router-link>
      </div>
    </section>

    <!-- Admin: Login-Modal -->
    <LoginModal v-if="showLogin" @close="showLogin = false" @success="showAdmin = true" />

    <!-- Admin: Bearbeitungs-Drawer (nur eingeloggt) -->
    <!-- Öffnen/Schließen per Tastenkürzel Ctrl+Alt+Shift+V (siehe handleAdminShortcut) -->
    <div v-if="authStore.isAuthenticated && showAdmin" class="admin-drawer">
      <div class="admin-drawer-bar">
        <UiIconButton label="Adminbereich schließen" size="sm" @click="showAdmin = false">
          ✕
        </UiIconButton>
      </div>
      <AdminPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { useAuthStore } from '../stores/auth'
import { useLandingContentStore } from '../stores/landingContent'
import AdminPanel from './admin/AdminPanel.vue'
import LoginModal from './admin/LoginModal.vue'
import { UiIconButton } from './ui'
import HeroVisualizerShowcase from './landing/HeroVisualizerShowcase.vue'
import { getBlogArticlesNewestFirst } from '../data/blogArticles'

const { t, locale } = useI18n()
// Base-aware (Produktion: /visualizer/), sonst 404 auf /kodini-logo.png.
const { isDark } = useTheme()

// Adminbereich: Login-Status + editierbare Landing-Texte (Overrides mit
// i18n-Fallback). Die angezeigten Texte kommen aus `content` (= merged).
const authStore = useAuthStore()
const contentStore = useLandingContentStore()
const { merged: content } = storeToRefs(contentStore)

const showLogin = ref(false)
const showAdmin = ref(false)

// Polling: nicht eingeloggte Besucher übernehmen Admin-Änderungen (Broadcast).
let contentPollInterval: ReturnType<typeof setInterval> | null = null
let lastContentUpdate: string | null = null
async function checkContentChanges() {
  if (authStore.isAuthenticated) return // Admin-Bearbeitung nicht überschreiben
  const updatedAt = await contentStore.fetchVersion()
  if (updatedAt && updatedAt !== lastContentUpdate) {
    lastContentUpdate = updatedAt
    await contentStore.fetchBroadcast()
  }
}

// Reference the demo GIF as a runtime public-URL (base-aware) instead of a
// build-time import, so Vite does not try to bundle the file. The asset lives
// in the deployed web root (/<base>/gallery/videos/podcast.gif), not in the repo.
const baseUrl = import.meta.env.BASE_URL

const activeFaq = ref<number | null>(null)

/** Die Landing scrollt in `.landing-page`, nicht im Fenster. */
const pageEl = ref<HTMLElement | null>(null)

/**
 * „Startseite“ auf der Startseite: Der Router navigiert nicht (gleiche
 * Route) bzw. scrollt nur das Fenster – deshalb hier selbst nach oben.
 */
function scrollToTop() {
  pageEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const isScrolled = ref(false)

/**
 * Versteckter Admin-Zugang: Ctrl+Alt+Shift+V öffnet den Login bzw. schaltet
 * den Bearbeitungs-Drawer um, wenn bereits eingeloggt. `code` statt `key`,
 * weil Alt/Option das Zeichen je nach Layout verändert (z. B. macOS).
 */
function handleAdminShortcut(e: KeyboardEvent) {
  if (e.repeat || e.code !== 'KeyV' || !e.ctrlKey || !e.altKey || !e.shiftKey || e.metaKey) return
  e.preventDefault()
  if (authStore.isAuthenticated) {
    showAdmin.value = !showAdmin.value
  } else {
    showLogin.value = true
  }
}

// Scroll listener for header styling
function handleScroll() {
  isScrolled.value = window.scrollY > 50
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('keydown', handleAdminShortcut)
  handleScroll() // Check initial state

  // Landing-Texte laden: zuerst lokaler Stand, dann Server-Broadcast (falls
  // erreichbar) als maßgebliche Quelle.
  contentStore.loadLocal()
  const initial = await contentStore.fetchBroadcast()
  if (initial) lastContentUpdate = initial.updatedAt

  // Für Besucher regelmäßig auf Admin-Änderungen prüfen (günstiger Versions-Check).
  contentPollInterval = setInterval(checkContentChanges, 15000)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleAdminShortcut)
  if (contentPollInterval) {
    clearInterval(contentPollInterval)
    contentPollInterval = null
  }
})

// Feature icons as render functions
const MusicIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 28,
      height: 28,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('path', { d: 'M9 18V5l12-2v13' }),
      h('circle', { cx: 6, cy: 18, r: 3 }),
      h('circle', { cx: 18, cy: 16, r: 3 }),
    ],
  )

const GridIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 28,
      height: 28,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('rect', { x: 2, y: 2, width: 20, height: 20, rx: 2.18, ry: 2.18 }),
      h('line', { x1: 7, y1: 2, x2: 7, y2: 22 }),
      h('line', { x1: 17, y1: 2, x2: 17, y2: 22 }),
      h('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
    ],
  )

const VideoIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 28,
      height: 28,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('polygon', { points: '23 7 16 12 23 17 23 7' }),
      h('rect', { x: 1, y: 5, width: 15, height: 14, rx: 2, ry: 2 }),
    ],
  )

const EditIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 28,
      height: 28,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('path', { d: 'M12 20h9' }),
      h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }),
    ],
  )

// Computed feature cards - Texte aus dem Landing-Content-Store (Admin-Overrides
// mit i18n-Fallback), Icons/Gradients bleiben fest.
/** Hero-Titel zweifarbig (Kodini 26.11.2026): erstes Wort Gold, der Rest Logo-Blau. */
const heroTitle = computed(() => {
  const [first = '', ...rest] = String(t('hero.badge')).trim().split(/\s+/)
  return { first, rest: rest.join(' ') }
})

const featureCards = computed(() => {
  const cards = content.value.features.cards
  const icons = [MusicIcon, GridIcon, VideoIcon, EditIcon]

  return cards.map((card, index) => ({
    ...card,
    icon: icons[index],
  }))
})

// Computed FAQ items - Texte aus dem Landing-Content-Store (Admin-Overrides
// mit i18n-Fallback).
const faqItems = computed(() => content.value.faq.items)

interface BenefitItem {
  title: string
  description: string
}

/** Vorteile-Karten (Kodini 23.11.2026, Muster Audio Normalizer); Texte aus i18n. */
const benefitItems = computed<BenefitItem[]>(() => {
  void locale.value
  const items = t('benefits.items') as unknown
  return Array.isArray(items) ? (items as BenefitItem[]) : []
})

// Blog-Karten: Beiträge aus src/data/blogArticles.js in der aktiven Sprache,
// neuester zuerst. Datum wird sprachabhängig formatiert (de: 21. September 2026,
// en: September 21, 2026); fehlt eine Übersetzung, fällt der Text auf Deutsch zurück.
const BLOG_DATE_LOCALES: Record<string, string> = { de: 'de-CH', en: 'en-US' }

function formatBlogDate(isoDate: string, lang: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(BLOG_DATE_LOCALES[lang] || BLOG_DATE_LOCALES.de, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const blogCards = computed(() => {
  const lang = locale.value
  const pick = (field: Partial<Record<string, string>> | undefined): string =>
    field?.[lang] ?? field?.de ?? ''
  return getBlogArticlesNewestFirst().map((article) => ({
    id: article.id,
    url: pick(article.url),
    image: pick(article.image),
    tag: pick(article.tag),
    title: pick(article.title),
    description: pick(article.description),
    meta: `${formatBlogDate(article.date, lang)} · ${article.minutes} ${t('blogArticles.minutes')}`,
  }))
})

function toggleFaq(index: number) {
  activeFaq.value = activeFaq.value === index ? null : index
}
</script>

<style scoped>
/* Landing Page - Dark Theme (default) */
.landing-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--primary-bg);
  color: var(--text-primary);
  font-family: var(--ds-font-sans);
  overflow-x: hidden;
}

/* Light Theme */

/* Header */
.landing-header {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 16px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  transition: top var(--ds-duration-slow) var(--ds-ease);
}

.landing-header.scrolled {
  top: 0;
  background: var(--card-bg);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: var(--ds-weight-medium);
  font-size: var(--ds-text-lg);
  transition: color var(--ds-duration) var(--ds-ease);
}

.nav-link:hover,
.nav-link.active {
  color: var(--text-primary);
}
/* Hero Section */

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: var(--accent-primary);
  color: var(--accent-text);
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-md);
  text-decoration: none;
  transition: background-color var(--ds-duration) var(--ds-ease);
}

.btn-primary:hover {
  background: var(--accent-tertiary);
}

.btn-large {
  padding: 20px 44px;
  font-size: var(--ds-text-xl);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Section Styling */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.section-subtitle {
  font-size: var(--ds-text-xl);
  color: var(--text-muted);
  margin: 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
/* Features Section */

/* Video Section */
.demo-gif {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-section {
  padding: 100px 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
}
/* FAQ Section */

/* Blog Section */
.blog-section {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
  scroll-margin-top: 140px; /* Anker #blog: Platz für globale + lokale Navigation */
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 28px;
}

.blog-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.blog-card:hover,
.blog-card:focus-visible {
  border-color: var(--ds-border-strong);
  outline: none;
}

.blog-card-media {
  aspect-ratio: 16 / 9;
  background: var(--primary-bg);
  overflow: hidden;
}

.blog-card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--ds-duration-slow) var(--ds-ease);
}

.blog-card:hover .blog-card-media img {
}

.blog-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 28px 28px;
  flex: 1;
}

.blog-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.blog-card-tag {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-text);
  background: var(--accent-tertiary);
  padding: 4px 10px;
  border-radius: var(--ds-radius-full);
}

.blog-card-meta {
  font-size: var(--ds-text-sm);
  color: var(--text-muted);
}

.blog-card-title {
  font-size: var(--ds-text-xl);
  font-weight: var(--ds-weight-semibold);
  line-height: 1.4;
  color: var(--text-primary);
  margin: 0;
}

.blog-card-description {
  font-size: var(--ds-text-lg);
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
  flex: 1;
}

.light-theme .blog-card-description {
  color: var(--text-muted);
}

.blog-card-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-secondary);
  margin-top: 4px;
}

.light-theme .blog-card-link {
  color: var(--accent-ink);
}

/* CTA Section */
.cta-section {
  padding: 120px 24px;
  text-align: center;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.cta-subtitle {
  font-size: var(--ds-text-xl);
  color: var(--text-muted);
  margin: 0 0 40px 0;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .header-nav {
    display: none;
  }
}

@media (max-width: 600px) {
  .landing-header {
    padding: 12px 16px;
    top: 50px; /* Smaller global nav on mobile */
  }

  .landing-header.scrolled {
    top: 0;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }

  .video-section,
  .blog-section {
    padding: 60px 20px;
  }

  .blog-card-body {
    padding: 20px 22px 24px;
  }
}
/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .blog-card-meta,
[data-theme='light'] .blog-card-description {
  color: var(--text-muted);
}

[data-theme='light'] .blog-card-link {
  color: var(--accent-ink);
}

/* ═══ Adminbereich (Drawer) ═══ */
.admin-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(92vw, 520px);
  z-index: var(--ds-z-backdrop);
  overflow-y: auto;
  padding: 24px 20px 96px;
  background: var(--primary-bg);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--ds-shadow-overlay);
  animation: drawerSlideIn 0.28s ease;
}

.admin-drawer-bar {
  display: flex;
  justify-content: flex-end;
  margin: -12px -8px 8px 0;
}

@keyframes drawerSlideIn {
  from {
    transform: translateX(40px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-drawer {
    animation: none;
  }
}

/* =============================================================
   KODINITOOLS LANDINGPAGE · ETAPPE 1
   Layout + original DS-v2 palette; no template/script changes.
   Scoped to .landing-page to avoid affecting the Visualizer app.
   ============================================================= */
.landing-page {
  background: var(--ds-surface-0, #0a1324);
  color: var(--ds-text, #f2eee2);
}
.landing-header,
.landing-header.scrolled {
  background: var(--ds-surface-0, #0a1324);
  border-bottom: 1px solid var(--ds-border, #223553);
  box-shadow: 0 5px 22px rgba(0, 0, 0, 0.12);
}
.header-content {
  max-width: 1220px;
  min-height: 44px;
  gap: 24px;
}
.nav-link {
  color: var(--ds-text-2, #a7b3c4);
}
.nav-link:hover,
.nav-link.active {
  color: var(--ds-accent, #d4a257);
}
.btn-primary {
  background: var(--ds-accent, #d4a257);
  color: var(--ds-on-accent, #0a1324);
  border: 1px solid var(--ds-accent, #d4a257);
  border-radius: var(--ds-radius-md, 10px);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.12);
}
.btn-primary:hover {
  background: var(--ds-accent-hover, #e0b06a);
  border-color: var(--ds-accent-hover, #e0b06a);
}
.section-title {
  color: var(--ds-text, #f2eee2);
  letter-spacing: -0.025em;
}
.section-subtitle {
  color: var(--ds-text-2, #a7b3c4);
}
/* Local light class is set by the existing Vue theme logic. */
.landing-page.light-theme {
  --ds-surface-0: #f6f5f1;
  --ds-surface-1: #ffffff;
  --ds-surface-2: #f0eee8;
  --ds-border: #e2dfd7;
  --ds-text: #14213a;
  --ds-text-2: #3f4a60;
  --ds-accent: #c9984d;
  --ds-accent-hover: #b8842f;
  --ds-on-accent: #14213a;
}

/* =============================================================
   KODINITOOLS LANDINGPAGE · ETAPPE 2 · Header & Navigation
   Header is deliberately below the global SSI navigation.
   Existing theme, router, admin and scroll logic remain untouched.
   ============================================================= */
.landing-header,
.landing-header.scrolled {
  padding: 11px clamp(16px, 3vw, 32px);
  background: var(--ds-surface-0, #0a1324);
  border-bottom: 1px solid var(--ds-border, #223553);
  backdrop-filter: none;
}
.header-content {
  max-width: 1220px;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: clamp(14px, 2.3vw, 32px);
}
.header-nav {
  margin-left: auto;
  gap: clamp(12px, 2vw, 26px);
}
.header-nav .nav-link {
  font-size: 14px;
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-2, #a7b3c4);
  white-space: nowrap;
}
.header-nav .nav-link:hover,
.header-nav .nav-link.router-link-exact-active {
  color: var(--ds-accent, #d4a257);
}
.landing-header-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid var(--ds-accent, #d4a257);
  border-radius: var(--ds-radius-md, 10px);
  background: var(--ds-accent, #d4a257);
  color: var(--ds-on-accent, #0a1324);
  font-size: 13px;
  font-weight: var(--ds-weight-bold);
  text-decoration: none;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}
.landing-header-cta:hover {
  background: var(--ds-accent-hover, #e0b06a);
  border-color: var(--ds-accent-hover, #e0b06a);
}
.header-nav .nav-link:focus-visible,
.landing-header-cta:focus-visible {
  outline: 2px solid var(--ds-accent, #d4a257);
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .header-nav {
    gap: 12px;
  }
  .landing-header-cta {
    padding-inline: 12px;
  }
}
@media (max-width: 760px) {
  .landing-header,
  .landing-header.scrolled {
    padding: 9px 16px;
  }
  .header-content {
    min-height: 46px;
    gap: 12px;
  }
  .header-nav {
    display: none;
  }
  .landing-header-cta {
    margin-left: auto;
    min-height: 38px;
    font-size: 12px;
  }
}
@media (max-width: 380px) {
  .landing-header-cta {
    padding-inline: 9px;
  }
  .landing-header-cta svg {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-header-cta {
    transition: none;
  }
}

/* ================================================================
   KODINITOOLS LANDINGPAGE · ETAPPE 3
   Funktionskarten, Video-Demo, FAQ, Blog und Inhaltsbereiche
   Nur CSS. Vorhandene Templates, Scripts, Stores und URLs bleiben erhalten.
   ================================================================ */
.landing-page .video-section,
.landing-page .blog-section {
  position: relative;
}
.landing-page .blog-section {
  max-width: 1240px;
  padding: clamp(64px, 7vw, 104px) 24px;
}
.landing-page .video-section {
  max-width: 1100px;
  padding: clamp(64px, 7vw, 104px) 24px;
}
.landing-page .section-header {
  margin-bottom: clamp(30px, 4vw, 50px);
}
.landing-page .section-title {
  color: var(--ds-text, #f2eee2);
  letter-spacing: -0.035em;
  line-height: 1.18;
}
.landing-page .section-subtitle {
  max-width: 660px;
  color: var(--ds-text-2, #a7b3c4);
  line-height: 1.65;
}
/* Cards: einheitliches Raster und ruhige, hochwertige Flächen */

/* Vorhandene GIF-Demo bleibt unverändert eingebunden. */
.landing-page .video-container {
  background: var(--ds-surface-1, #111d33);
  border: 1px solid var(--ds-border-strong, #2f4668);
  border-radius: 20px;
  padding: clamp(6px, 1vw, 12px);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  aspect-ratio: auto;
}
.landing-page .demo-gif {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 12px;
}
/* FAQ: Klickverhalten und Öffnungszustand bleiben Vue-gesteuert. */

/* Blog: bestehende dynamische Artikel, Bilder und Links. */
.landing-page .blog-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.landing-page .blog-card {
  min-width: 0;
  background: var(--ds-surface-1, #111d33);
  border: 1px solid var(--ds-border, #223553);
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.landing-page .blog-card:hover {
  border-color: var(--ds-accent, #d4a257);
  transform: translateY(-3px);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.15);
}
.landing-page .blog-card:focus-visible {
  outline: 2px solid var(--ds-accent, #d4a257);
  outline-offset: 3px;
}
.landing-page .blog-card-media {
  background: var(--ds-surface-2, #182741);
}
.landing-page .blog-card-media img {
  transition: transform 0.25s ease;
}
.landing-page .blog-card:hover .blog-card-media img {
  transform: scale(1.035);
}
.landing-page .blog-card-body {
  padding: 24px;
  gap: 13px;
}
.landing-page .blog-card-tag {
  background: var(--ds-accent-soft, rgba(212, 162, 87, 0.14));
  color: var(--ds-accent, #d4a257);
  border-radius: 6px;
  padding: 5px 9px;
}
.landing-page .blog-card-meta {
  color: var(--ds-text-3, #8593a8);
}
.landing-page .blog-card-title {
  color: var(--ds-text, #f2eee2);
  line-height: 1.35;
}
.landing-page .blog-card-description,
.landing-page.light-theme .blog-card-description {
  color: var(--ds-text-2, #a7b3c4);
  font-size: 15px;
  line-height: 1.7;
}
.landing-page .blog-card-link,
.landing-page.light-theme .blog-card-link {
  color: var(--ds-accent, #d4a257);
  margin-top: auto;
}

/* Abschließender CTA */
.landing-page .cta-section {
  padding: clamp(70px, 8vw, 112px) 24px;
}
.landing-page .cta-content {
  max-width: 760px;
  padding: clamp(32px, 5vw, 62px);
  border-radius: 22px;
  background: var(--ds-surface-1, #111d33);
  border: 1px solid var(--ds-border, #223553);
}
.landing-page .cta-title {
  color: var(--ds-text, #f2eee2);
  letter-spacing: -0.035em;
}
.landing-page .cta-subtitle {
  color: var(--ds-text-2, #a7b3c4);
}

/* Die Light-Theme-Tokens stammen aus dem bestehenden Designsystem. */
.landing-page.light-theme .blog-card,
.landing-page.light-theme .video-container,
.landing-page.light-theme .cta-content {
  box-shadow: 0 12px 30px rgba(20, 33, 58, 0.07);
}
@media (max-width: 960px) {
  .landing-page .blog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .landing-page .video-section,
  .landing-page .blog-section {
    padding-inline: 18px;
  }
  .landing-page .blog-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .landing-page .video-container {
    padding: 5px;
    border-radius: 14px;
  }
  .landing-page .demo-gif {
    border-radius: 9px;
  }
  .landing-page .cta-content {
    padding: 28px 20px;
  }
}
/* Ergänzung: Bei nur 1–2 Blogartikeln füllen die Karten die Breite, statt eine leere dritte Spalte zu lassen. */
@media (min-width: 961px) {
  .landing-page .blog-grid:not(:has(> :nth-child(3))) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-page .blog-card,
  .landing-page .blog-card-media img {
    transition: none;
  }
  .landing-page .blog-card:hover,
  .landing-page .blog-card:hover .blog-card-media img {
    transform: none;
  }
}
/* =====================================================================
   KODINITOOLS LANDINGPAGE · ETAPPE 4
   Hero-Visualizer und finaler Startbereich. Nur Darstellung.
   Original-Token-Palette, ohne Cyan- oder Neon-Verläufe.
   ===================================================================== */

.landing-page .cta-section .btn-primary {
  min-height: 50px;
  border: 1px solid var(--ds-accent, #d4a257);
  border-radius: var(--ds-radius-md, 10px);
  background: var(--ds-accent, #d4a257);
  color: var(--ds-on-accent, #0a1324);
  box-shadow: 0 10px 28px rgba(212, 162, 87, 0.13);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.landing-page .cta-section .btn-primary:hover {
  background: var(--ds-accent-hover, #e0b06a);
  border-color: var(--ds-accent-hover, #e0b06a);
  transform: translateY(-2px);
  box-shadow: 0 14px 34px rgba(212, 162, 87, 0.19);
}
.landing-page .cta-section a:focus-visible {
  outline: 2px solid var(--ds-accent, #d4a257);
  outline-offset: 4px;
}
.landing-page .cta-section {
  position: relative;
  isolation: isolate;
}
.landing-page .cta-content {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ds-border-strong, #2f4668);
  background: var(--ds-surface-1, #111d33);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.16);
}
.landing-page .cta-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22%;
  right: 22%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ds-accent, #d4a257), transparent);
  pointer-events: none;
}
.landing-page .cta-title {
  text-wrap: balance;
}
.landing-page .cta-subtitle {
  line-height: 1.7;
}
.landing-page.light-theme .cta-content {
  box-shadow: 0 16px 42px rgba(20, 33, 58, 0.1);
}
@media (max-width: 620px) {
  .landing-page .cta-content {
    border-radius: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-page .cta-section .btn-primary {
    transition: none;
  }
  .landing-page .cta-section .btn-primary:hover {
    transform: none;
  }
}

/* =====================================================================
   KODINITOOLS LANDINGPAGE · ETAPPE 5
   Responsive Feinschliff, Fokus und Lesbarkeit; ausschließlich CSS.
   ===================================================================== */
.landing-page {
  min-width: 0;
}
.landing-page .blog-card,
.landing-page .cta-content {
  min-width: 0;
}
.landing-page .section-title,
.landing-page .blog-card-title {
  overflow-wrap: break-word;
}
.landing-page .section-subtitle,
.landing-page .cta-subtitle {
  overflow-wrap: anywhere;
}
.landing-page .blog-grid {
  min-width: 0;
}
.landing-page .demo-gif {
  display: block;
  max-width: 100%;
  height: auto;
}
.landing-page a:focus-visible,
.landing-page button:focus-visible,
.landing-page [tabindex]:focus-visible {
  outline: 2px solid var(--ds-accent, #d4a257);
  outline-offset: 3px;
}
@media (max-width: 620px) {
  .landing-page .section-header {
    min-width: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    scroll-behavior: auto;
  }
}

/* Kodini 22.11.2026: Gefüllte Knöpfe im hellen Modus mit weisser Schrift,
   Muster aus dem Playlist Generator (#8f6320, Kontrast zu Weiss 5,1:1). */
.landing-page.light-theme {
  --landing-btn-bg: #8f6320;
  --landing-btn-bg-hover: #7a531a;
}
.landing-page.light-theme .landing-header-cta,
.landing-page.light-theme .btn-primary {
  background: var(--landing-btn-bg);
  border-color: var(--landing-btn-bg);
  color: #ffffff;
}
.landing-page.light-theme .landing-header-cta:hover,
.landing-page.light-theme .btn-primary:hover {
  background: var(--landing-btn-bg-hover);
  border-color: var(--landing-btn-bg-hover);
}

/* =====================================================================
   Landingpage nach Muster Audio Normalizer (Kodini 23.11.2026).
   Werte 1:1 aus dem Normalizer (LandingPage.vue + kodini-layout-stage1.css),
   gemessen bei 1440 / 900 / 390 px. Schrift durchgehend Supreme Regular.
   ===================================================================== */
.landing-page {
  --lp-layout-width: 1160px;
  --lp-gutter: clamp(var(--ds-space-3), 3vw, var(--ds-space-6));
  /* Unterkante der fixierten Kopfzeile (unter der globalen Navigation). */
  --lp-header-offset: 137px;
  --ds-weight-medium: 400;
  --ds-weight-semibold: 400;
  --ds-weight-bold: 400;

  font-weight: var(--ds-weight-regular);
  font-synthesis: none;
  font-size: var(--ds-text-md);
  line-height: var(--ds-leading);
  background-color: var(--ds-surface-0);
  background-image:
    radial-gradient(ellipse at 85% 0%, var(--ds-glow-cyan), transparent 68%),
    radial-gradient(ellipse at 12% 0%, var(--ds-glow-blue), transparent 62%);
  background-repeat: no-repeat;
  background-size: 100% 42rem;
}
.landing-page :is(h1, h2, h3, h4, strong, b, th, button) {
  font-weight: var(--ds-weight-regular);
}

.lp-container {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--lp-layout-width);
  margin: 0 auto;
  padding-inline: var(--lp-gutter);
}

/* Hero */
.lp-hero {
  flex-shrink: 0;
  padding-block: calc(var(--lp-header-offset) + clamp(var(--ds-space-8), 7vw, 6rem))
    clamp(var(--ds-space-8), 5vw, 4rem);
}
.lp-hero > .lp-container {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: clamp(var(--ds-space-6), 5vw, var(--ds-space-16));
}
.lp-hero-content {
  margin: 0;
  max-width: 680px;
  text-align: start;
}
.lp-hero-title {
  margin: 0 0 var(--ds-space-3);
  font-size: clamp(2.25rem, 5.25vw, 4.5rem);
  line-height: 1.05;
  letter-spacing: -0.045em;
  color: var(--ds-text);
  overflow-wrap: anywhere;
}
/* Titelfarben (Kodini 26.11.2026): Gold und Logo-Blau, im Dunkelmodus jeweils die hellere Stufe. */
.landing-page {
  --lp-title-gold: #e6bc76;
  --lp-title-blue: #48a0d8;
}
.landing-page.light-theme {
  --lp-title-gold: #775115;
  --lp-title-blue: #0058a0;
}
.lp-hero-title-gold {
  color: var(--lp-title-gold);
}
.lp-hero-title-blue {
  color: var(--lp-title-blue);
}
.lp-hero-subtitle {
  margin: 0 0 var(--ds-space-3);
  font-size: var(--ds-text-lg);
  line-height: var(--ds-leading);
  color: var(--ds-heading-accent);
}
.lp-hero-description {
  margin: 0 0 var(--ds-space-6);
  font-size: var(--ds-text-md);
  line-height: var(--ds-leading);
  color: var(--ds-text-2);
}
.lp-btn-hero {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--ds-control-lg);
  padding: 0 var(--ds-space-5);
  border-radius: var(--ds-radius-md);
  background: var(--ds-accent);
  color: var(--ds-on-accent);
  font-size: var(--ds-text-lg);
  line-height: var(--ds-leading);
  text-decoration: none;
  transition: background-color var(--ds-duration) var(--ds-ease);
}
.lp-btn-hero:hover {
  background: var(--ds-accent-hover);
  color: var(--ds-on-accent);
}
.lp-btn-hero:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}
.lp-hero-media {
  max-width: 800px;
  margin: 0;
  border: var(--ds-border-width) solid var(--ds-border-strong);
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  background: var(--ds-surface-2);
  box-shadow: var(--ds-shadow-overlay);
}
/* Live-Vorschau füllt den Bildrahmen wie das 1120 × 630-Bild des Normalizers. */
.lp-hero-media :deep(.hero-showcase) {
  aspect-ratio: 1120 / 630;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

/* Funktionen, Vorteile, FAQ */
.lp-features,
.lp-benefits,
.lp-faq {
  flex-shrink: 0;
  padding-block: clamp(var(--ds-space-8), 5vw, var(--ds-space-16));
}
.lp-features,
.lp-faq {
  background: var(--ds-surface-1);
  border-top: var(--ds-border-width) solid var(--ds-border);
  border-bottom: var(--ds-border-width) solid var(--ds-border);
  scroll-margin-top: var(--lp-header-offset);
}
.lp-section-title {
  margin: 0 0 var(--ds-space-8);
  text-align: center;
  font-size: var(--ds-text-2xl);
  line-height: var(--ds-leading-tight);
  letter-spacing: var(--ds-tracking-tight);
  color: var(--ds-text);
}
.lp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: var(--ds-gap);
}
.lp-card {
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-lg);
  padding: var(--ds-space-5);
  background: linear-gradient(150deg, var(--ds-surface-1), var(--ds-surface-0));
  transition: border-color var(--ds-duration) var(--ds-ease);
}
.lp-card:hover {
  border-color: var(--ds-border-strong);
}
.lp-feature-icon {
  font-size: var(--ds-text-xl);
  line-height: var(--ds-leading);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ds-control-lg);
  height: var(--ds-control-lg);
  margin-bottom: var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-2);
  color: var(--ds-text);
}
.lp-feature-icon :deep(svg) {
  width: 20px;
  height: 20px;
}
.lp-card h3 {
  margin: 0 0 var(--ds-space-2);
  font-size: var(--ds-text-lg);
  line-height: var(--ds-leading-tight);
  color: var(--ds-text);
}
.lp-card p {
  margin: 0;
  font-size: var(--ds-text-md);
  line-height: var(--ds-leading);
  color: var(--ds-text-2);
}
.lp-faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  max-width: 720px;
  margin: 0 auto;
}
.lp-faq-item {
  overflow: hidden;
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: linear-gradient(150deg, var(--ds-surface-1), var(--ds-surface-0));
  transition: border-color var(--ds-duration) var(--ds-ease);
}
.lp-faq-item:hover,
.lp-faq-open {
  border-color: var(--ds-border-strong);
}
.lp-faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-4);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--ds-row-height);
  padding: var(--ds-space-3) var(--ds-space-5);
  border: none;
  background: none;
  color: var(--ds-text);
  font: inherit;
  font-size: var(--ds-text-lg);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--ds-duration) var(--ds-ease);
}
.lp-faq-question:hover {
  background: var(--ds-surface-2);
}
.lp-faq-question:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--ds-accent);
}
.lp-faq-icon {
  flex-shrink: 0;
  font-size: var(--ds-text-xl);
  line-height: var(--ds-leading);
  color: var(--ds-text-2);
}
.lp-faq-answer {
  padding: 0 var(--ds-space-5) var(--ds-space-4);
  font-size: var(--ds-text-md);
  color: var(--ds-text-2);
}
.lp-faq-answer p {
  margin: 0;
}

/* Heller Modus: Knopf wie die übrigen gefüllten Knöpfe (PR #929). */
.landing-page.light-theme .lp-btn-hero {
  background: var(--landing-btn-bg);
  color: #ffffff;
}
.landing-page.light-theme .lp-btn-hero:hover {
  background: var(--landing-btn-bg-hover);
}

@media (max-width: 768px) {
  .lp-section-title {
    margin-bottom: var(--ds-space-6);
    font-size: var(--ds-text-xl);
  }
  .lp-grid {
    grid-template-columns: 1fr;
  }
  .lp-faq-question {
    padding: var(--ds-space-3) var(--ds-space-4);
    font-size: var(--ds-text-md);
  }
  .lp-faq-answer {
    padding: 0 var(--ds-space-4) var(--ds-space-3);
  }
}
@media (max-width: 760px) {
  .landing-page {
    --lp-header-offset: 125px;
  }
  .lp-hero > .lp-container {
    grid-template-columns: minmax(0, 1fr);
  }
  .lp-hero-media :deep(.hero-showcase-name) {
    font-size: var(--ds-text-xs);
  }
}
@media (max-width: 600px) {
  .landing-page {
    --lp-header-offset: 115px;
  }
}
@media (max-width: 480px) {
  .lp-hero-subtitle {
    font-size: var(--ds-text-md);
  }
  .lp-hero-media {
    border-radius: var(--ds-radius-md);
  }
  .lp-btn-hero {
    width: 100%;
    max-width: 320px;
    height: var(--ds-row-height);
  }
  .lp-card {
    padding: var(--ds-space-4);
  }
}
@media (prefers-reduced-motion: reduce) {
  .lp-btn-hero,
  .lp-card,
  .lp-faq-item,
  .lp-faq-question {
    transition: none;
  }
}
</style>
