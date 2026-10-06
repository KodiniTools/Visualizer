<template>
  <div
    class="blog-page"
    ref="pageRef"
    :class="{ 'light-theme': !isDark }"
    :data-locale="currentLocale"
  >
    <!-- SEO structured data -->
    <teleport to="head">
      <title>{{ t('blog.meta.title') }}</title>
      <meta name="description" :content="t('blog.meta.description')" />
      <meta name="keywords" :content="t('blog.meta.keywords')" />
      <meta property="og:title" :content="t('blog.meta.ogTitle')" />
      <meta property="og:description" :content="t('blog.meta.ogDescription')" />
    </teleport>

    <!-- Header -->
    <header class="landing-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <router-link to="/" class="header-logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Visualizer</span>
        </router-link>
        <nav class="header-nav">
          <router-link to="/" class="nav-link">{{ t('blog.nav.home') }}</router-link>
          <router-link to="/blog" class="nav-link active">{{ t('blog.nav.features') }}</router-link>
          <router-link to="/app" class="nav-cta">{{ t('blog.nav.start') }} →</router-link>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="blog-hero">
      <div class="hero-badge">✦ {{ t('blog.hero.badge') }}</div>
      <h1 class="blog-title">{{ t('blog.hero.title') }}</h1>
      <p class="blog-subtitle">{{ t('blog.hero.subtitle') }}</p>
      <div class="hero-stats">
        <template v-for="(stat, i) in t('blog.stats')" :key="stat.label">
          <div v-if="i > 0" class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- Quick Feature Overview Cards -->
    <section class="overview-section">
      <div class="overview-grid">
        <a
          v-for="card in overviewCards"
          :key="card.id"
          :href="'#' + card.id"
          class="overview-card"
          @click.prevent="scrollToSection(card.id)"
        >
          <div class="overview-icon" v-html="icon(card.id, 28)"></div>
          <div class="overview-card-content">
            <h3 class="overview-card-title">{{ card.title }}</h3>
            <p class="overview-card-desc">{{ card.desc }}</p>
          </div>
        </a>
      </div>
    </section>

    <!-- Main Content -->
    <main class="blog-content">
      <div class="content-layout">
        <!-- Sticky TOC -->
        <aside class="toc-sidebar">
          <div class="toc-inner">
            <h4 class="toc-title">{{ t('blog.toc') }}</h4>
            <nav class="toc-nav">
              <a
                v-for="section in tocSections"
                :key="section.id"
                :href="'#' + section.id"
                class="toc-link"
                :class="{ active: activeSection === section.id }"
                @click.prevent="scrollToSection(section.id)"
              >
                <span class="toc-icon" v-html="icon(section.id, 14)"></span>
                {{ section.nav }}
              </a>
            </nav>
            <router-link to="/app" class="toc-cta">{{ t('blog.nav.start') }} →</router-link>
          </div>
        </aside>

        <!-- Article -->
        <article class="blog-article">
          <!-- Intro -->
          <section class="blog-section intro-section">
            <p class="intro-text">{{ t('blog.intro') }}</p>
          </section>

          <!-- Funktions-Abschnitte (Inhalt in i18n: blog.sections) -->
          <section
            v-for="section in tocSections"
            :id="section.id"
            :key="section.id"
            class="blog-section"
            :class="{ 'unique-section': section.variant === 'unique' }"
          >
            <div class="section-header">
              <div class="section-icon" v-html="icon(section.id, 22)"></div>
              <h2 class="section-title">{{ section.title }}</h2>
              <span v-if="section.isNew" class="new-badge">{{ t('blog.newBadge') }}</span>
            </div>
            <p v-if="section.intro" class="section-intro">{{ section.intro }}</p>

            <div v-if="section.tags" class="canvas-presets">
              <h3 class="subsection-title">{{ section.tags.title }}</h3>
              <p v-if="section.tags.intro" class="section-intro">{{ section.tags.intro }}</p>
              <div class="presets-grid">
                <span v-for="(item, i) in section.tags.items" :key="i" class="preset-pill">{{
                  item
                }}</span>
              </div>
            </div>

            <div v-if="section.categories" class="category-grid">
              <div v-for="(category, i) in section.categories" :key="i" class="category-card">
                <h4 class="category-title">{{ category.name }}</h4>
                <ul class="category-list">
                  <li v-for="(item, j) in category.items" :key="j">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div
              v-if="section.groups"
              class="subsection-grid"
              :class="{ 'subsection-grid--three': section.columns === 3 }"
              :style="section.tags ? { marginTop: '24px' } : null"
            >
              <div v-for="(group, i) in section.groups" :key="i" class="subsection-block">
                <h3 class="subsection-title">{{ group.title }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, j) in group.items" :key="j">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div v-if="section.highlight" class="feature-highlight-box">
              <h3 class="subsection-title">{{ section.highlight.title }}</h3>
              <ul class="feature-list feature-list--inline">
                <li v-for="(item, i) in section.highlight.items" :key="i">{{ item }}</li>
              </ul>
            </div>

            <div v-if="section.reactive" class="audio-reactive-box">
              <div class="reactive-badge">{{ t('blog.reactiveBadge') }}</div>
              <h3 class="subsection-title">{{ section.reactive.title }}</h3>
              <ul class="feature-list feature-list--grid">
                <li v-for="(item, i) in section.reactive.items" :key="i">{{ item }}</li>
              </ul>
            </div>

            <div v-if="section.shortcuts" class="shortcuts-grid">
              <div v-for="(shortcut, i) in section.shortcuts" :key="i" class="shortcut-item">
                <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                <span class="shortcut-action">{{ shortcut.action }}</span>
              </div>
            </div>

            <ul
              v-if="section.items"
              class="feature-list"
              :class="{
                'feature-list--highlight feature-list--grid': section.variant === 'unique',
                'feature-list--grid': section.variant === 'grid',
              }"
            >
              <li v-for="(item, i) in section.items" :key="i">{{ item }}</li>
            </ul>
          </section>

          <!-- Summary -->
          <section class="blog-section summary-section">
            <h2 class="section-title">{{ t('blog.summary.title') }}</h2>
            <p class="section-intro">{{ t('blog.summary.text') }}</p>
            <ul class="summary-list">
              <li v-for="(item, i) in t('blog.summary.items')" :key="i">
                <span class="summary-check">✓</span>{{ item }}
              </li>
            </ul>
            <p class="summary-cta-text">{{ t('blog.summary.cta') }}</p>
          </section>
        </article>
      </div>
    </main>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">{{ t('blog.cta.title') }}</h2>
        <p class="cta-subtitle">{{ t('blog.cta.subtitle') }}</p>
        <router-link to="/app" class="btn-primary">
          {{ t('blog.cta.button') }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useTheme } from '../lib/theme.js'

const { t, locale } = useI18n()
const { isDark } = useTheme()

const currentLocale = computed(() => locale.value)
const isScrolled = ref(false)
const activeSection = ref('')
const pageRef = ref(null)

// Icon-Pfade pro Abschnitt (Lucide-Stil); Größe je nach Einsatz (Karte, TOC, Abschnitt)
const ICON_PATHS = {
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  visualizers: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  images:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  background: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  recording: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  screenshot:
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  shortcuts:
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  history: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>',
  reactivity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  browser:
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  unique:
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ticker:
    '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h8"/><polyline points="14 9 17 12 14 15"/>',
  slideshow:
    '<rect x="2" y="5" width="16" height="12" rx="2"/><path d="M22 7v12a2 2 0 0 1-2 2H6"/><polygon points="8 8 13 11 8 14 8 8" fill="currentColor"/>',
  layers:
    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  video:
    '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  presets: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  workflow:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
}

/** SVG-Markup des Abschnitts-Icons (nur feste, eigene Pfade – kein Nutzerinhalt). */
function icon(id, size) {
  const paths = ICON_PATHS[id] ?? ICON_PATHS.unique
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

// Inhalte kommen vollständig aus i18n (blog.sections / blog.overview), damit DE und EN gleich aufgebaut sind
const tocSections = computed(() => {
  const sections = t('blog.sections')
  return Array.isArray(sections) ? sections : []
})
const overviewCards = computed(() => {
  const cards = t('blog.overview')
  return Array.isArray(cards) ? cards : []
})

/**
 * Scroll-Container der Seite: Im App-Layout scrollt `.blog-page` selbst
 * (overflow-x: hidden), als eigenständige Seite das Fenster.
 * @returns {HTMLElement|null} null = Fenster
 */
function scrollContainer() {
  const el = pageRef.value
  return el && el.scrollHeight > el.clientHeight + 1 ? el : null
}

function currentScrollTop() {
  const el = scrollContainer()
  return el ? el.scrollTop : window.scrollY || document.documentElement.scrollTop || 0
}

function handleScroll() {
  isScrolled.value = currentScrollTop() > 50

  // Aktiven Abschnitt im Inhaltsverzeichnis bestimmen
  const sectionIds = tocSections.value.map((s) => s.id)
  for (let i = sectionIds.length - 1; i >= 0; i--) {
    const el = document.getElementById(sectionIds[i])
    if (el && el.getBoundingClientRect().top <= 140) {
      activeSection.value = sectionIds[i]
      return
    }
  }
  activeSection.value = ''
}

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const top = currentScrollTop() + el.getBoundingClientRect().top - 110
  ;(scrollContainer() ?? window).scrollTo({ top, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  pageRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  pageRef.value?.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ═══ Base ═══ */
.blog-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background: var(--primary-bg);
  color: var(--text-primary);
  font-family: var(--ds-font-sans);
}

/* ═══ Header ═══ */
.landing-header {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 14px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  transition: top var(--ds-duration-slow) var(--ds-ease);
}

.landing-header.scrolled {
  top: 0;
  background: var(--card-bg);
}

.header-content {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: var(--ds-weight-bold);
  font-size: var(--ds-text-xl);
  color: var(--text-primary);
  text-decoration: none;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: var(--ds-weight-medium);
  font-size: var(--ds-text-md);
  transition: color var(--ds-duration) var(--ds-ease);
}

.nav-link:hover,
.nav-link.active {
  color: var(--text-primary);
}

.nav-cta {
  padding: 8px 18px;
  background: var(--accent-primary);
  color: var(--accent-text);
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-md);
  border-radius: var(--ds-radius-md);
  text-decoration: none;
  transition:
    opacity var(--ds-duration) var(--ds-ease),
    transform var(--ds-duration) var(--ds-ease);
}

.nav-cta:hover {
  opacity: 0.9;
}

/* ═══ Hero ═══ */
.blog-hero {
  padding: 200px 24px 70px;
  text-align: center;
}

.light-theme .blog-hero {
  background: radial-gradient(
    ellipse 900px 400px at 50% 0%,
    color-mix(in srgb, var(--accent-primary) 12%, transparent) 0%,
    transparent 70%
  );
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background: var(--ds-accent-soft);
  border: 1px solid var(--accent-primary);
  border-radius: var(--ds-radius-full);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-title {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  margin: 0 0 16px;
  line-height: 1.15;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.blog-subtitle {
  font-size: var(--ds-text-xl);
  color: var(--text-muted);
  margin: 0 auto 40px;
  line-height: 1.7;
  max-width: 600px;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: nowrap;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px 32px;
}

.light-theme .hero-stats {
  background: rgba(255, 255, 255, 0.7);
  border-color: var(--border-color);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 28px;
}

.stat-number {
  font-size: var(--ds-text-3xl);
  font-weight: var(--ds-weight-bold);
  color: var(--accent-ink);
  line-height: 1;
}

.stat-label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

/* ═══ Overview Grid ═══ */
.overview-section {
  padding: 0 24px 60px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px;
  transition:
    border-color var(--ds-duration) var(--ds-ease),
    transform var(--ds-duration) var(--ds-ease);
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}

.overview-card:hover {
  border-color: var(--border-color);
}

.light-theme .overview-card {
  background: rgba(255, 255, 255, 0.75);
  border-color: var(--border-color);
}

.overview-icon {
  flex-shrink: 0;
  color: var(--accent-ink);
  margin-top: 2px;
}

.overview-card-title {
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-secondary);
  margin: 0 0 6px;
}

.light-theme .overview-card-title {
  color: var(--accent-ink);
}

.overview-card-desc {
  font-size: var(--ds-text-sm);
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

/* ═══ Main Content Layout ═══ */
.blog-content {
  flex: 1;
  padding: 0 24px 80px;
}

.content-layout {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 40px;
  align-items: start;
}

/* ═══ TOC Sidebar ═══ */
.toc-sidebar {
  position: sticky;
  top: 120px;
}

.toc-inner {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px;
}

.light-theme .toc-inner {
  background: rgba(255, 255, 255, 0.75);
  border-color: var(--border-color);
}

.toc-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 14px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--ds-radius-md);
  font-size: var(--ds-text-sm);
  color: var(--text-muted);
  text-decoration: none;
  transition:
    background var(--ds-duration) var(--ds-ease),
    color var(--ds-duration) var(--ds-ease);
  cursor: pointer;
}

.toc-link:hover {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  color: var(--text-secondary);
}

.toc-link.active {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  color: var(--accent-ink);
  font-weight: var(--ds-weight-semibold);
}

.light-theme .toc-link:hover {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  color: var(--accent-ink);
}
.light-theme .toc-link.active {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
}

.toc-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.toc-cta {
  display: block;
  margin-top: 16px;
  padding: 10px;
  background: var(--accent-primary);
  color: var(--accent-text);
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-sm);
  border-radius: var(--ds-radius-md);
  text-decoration: none;
  text-align: center;
  transition: opacity var(--ds-duration) var(--ds-ease);
}

.toc-cta:hover {
  opacity: 0.88;
}

/* ═══ Article ═══ */
.blog-article {
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
}

.blog-section {
  background: var(--primary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 32px;
}

.light-theme .blog-section {
  background: rgba(255, 255, 255, 0.82);
  border-color: var(--border-color);
}

.intro-section {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
}

.light-theme .intro-section {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-primary) 6%, transparent),
    rgba(255, 255, 255, 0.6)
  );
}

.intro-text {
  font-size: var(--ds-text-xl);
  line-height: 1.8;
  color: var(--ds-text-2);
  margin: 0;
}

.light-theme .intro-text {
  color: var(--text-muted);
}

/* Section header */
.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
  color: var(--accent-ink);
  flex-shrink: 0;
}

.light-theme .section-icon {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
}

.section-title {
  font-size: var(--ds-text-2xl);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  margin: 0;
}

.section-intro {
  font-size: var(--ds-text-lg);
  color: var(--text-muted);
  margin: 0 0 20px;
  line-height: 1.6;
}

/* Subsection grids */
.subsection-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.subsection-grid--three {
  grid-template-columns: repeat(3, 1fr);
}

.subsection-block {
  background: color-mix(in srgb, var(--ds-surface-0) 40%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px;
}

.light-theme .subsection-block {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

.subsection-title {
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 12px;
}

/* Feature lists */
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.feature-list li {
  position: relative;
  padding-left: 18px;
  font-size: var(--ds-text-md);
  line-height: 1.55;
  color: var(--text-secondary);
}

.light-theme .feature-list li {
  color: var(--text-muted);
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  background: var(--accent-primary);
  border-radius: var(--ds-radius-full);
}

.feature-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px 20px;
}

.feature-list--inline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 6px 20px;
}

.feature-list--highlight li {
  color: var(--text-primary);
}
.feature-list--highlight li::before {
  background: var(--accent-tertiary);
  width: 6px;
  height: 6px;
}
.light-theme .feature-list--highlight li::before {
  background: var(--accent-primary);
}

/* Audio reactive box */
.audio-reactive-box {
  position: relative;
  margin-top: 20px;
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px 20px 20px 20px;
}

.light-theme .audio-reactive-box {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
  border-color: var(--border-color);
}

.new-badge {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: var(--ds-radius-lg);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, var(--ds-success) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 40%, transparent);
  color: var(--ds-success);
}
.light-theme .new-badge {
  background: color-mix(in srgb, var(--ds-success) 12%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 35%, transparent);
}

.reactive-badge {
  display: inline-block;
  padding: 3px 10px;
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
  border: 1px solid var(--accent-primary);
  border-radius: var(--ds-radius-lg);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-ink);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.light-theme .reactive-badge {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
}

/* Feature highlight box */
.feature-highlight-box {
  margin-top: 24px;
  background: color-mix(in srgb, var(--ds-surface-0) 35%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px;
}

.light-theme .feature-highlight-box {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.category-card {
  background: color-mix(in srgb, var(--ds-surface-0) 50%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 16px;
}

.light-theme .category-card {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

.category-title {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-ink);
  margin: 0 0 10px;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-list li {
  font-size: var(--ds-text-sm);
  color: var(--text-secondary);
  padding-left: 14px;
  position: relative;
}

.category-list li::before {
  content: '–';
  position: absolute;
  left: 0;
  color: var(--accent-ink);
}

.light-theme .category-list li {
  color: var(--text-muted);
}
.light-theme .category-list li::before {
  color: var(--text-muted);
}

/* Canvas Presets */
.canvas-presets {
  background: color-mix(in srgb, var(--ds-surface-0) 35%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 20px;
}

.light-theme .canvas-presets {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

.presets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.preset-pill {
  padding: 5px 12px;
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  font-size: var(--ds-text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.light-theme .preset-pill {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
  color: var(--text-muted);
}

/* Shortcuts */
.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: color-mix(in srgb, var(--ds-surface-0) 40%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
  padding: 10px 12px;
}

.light-theme .shortcut-item {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

kbd.shortcut-key {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  padding: 3px 8px;
  font-family: var(--ds-font-mono);
  font-size: var(--ds-text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.light-theme kbd.shortcut-key {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

.shortcut-action {
  font-size: var(--ds-text-sm);
  color: var(--text-secondary);
}

.light-theme .shortcut-action {
  color: var(--text-muted);
}

/* Unique section */
.unique-section {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--border-color);
}

.light-theme .unique-section {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-primary) 5%, transparent),
    rgba(255, 255, 255, 0.85)
  );
}

/* Summary */
.summary-section {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  border-color: var(--border-color);
}

.light-theme .summary-section {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-primary) 6%, transparent),
    rgba(255, 255, 255, 0.9)
  );
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.summary-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: var(--ds-text-md);
  line-height: 1.5;
  color: var(--text-primary);
}

.summary-check {
  color: var(--accent-ink);
  font-weight: var(--ds-weight-bold);
  flex-shrink: 0;
  margin-top: 1px;
}

.summary-cta-text {
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.light-theme .summary-cta-text {
  color: var(--accent-ink);
}

/* ═══ CTA Section ═══ */
.cta-section {
  padding: 80px 24px 100px;
  text-align: center;
}

.cta-content {
  max-width: 540px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: var(--ds-weight-bold);
  color: var(--text-primary);
  margin: 0 0 14px;
}

.cta-subtitle {
  font-size: var(--ds-text-lg);
  color: var(--text-muted);
  margin: 0 0 32px;
  line-height: 1.6;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  background: var(--accent-primary);
  color: var(--accent-text);
  font-size: var(--ds-text-lg);
  font-weight: var(--ds-weight-bold);
  border-radius: var(--ds-radius-md);
  text-decoration: none;
  transition: background-color var(--ds-duration) var(--ds-ease);
}

.btn-primary:hover {
  background: var(--accent-tertiary);
}

/* ═══ Responsive ═══ */
@media (max-width: 1100px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .toc-sidebar {
    display: none;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .landing-header {
    top: 50px;
  }

  .landing-header.scrolled {
    top: 0;
  }

  .header-nav {
    gap: 16px;
  }

  .nav-link {
    display: none;
  }

  .blog-hero {
    padding: 150px 20px 50px;
  }

  .hero-stats {
    flex-wrap: wrap;
    row-gap: 16px;
    padding: 16px;
  }

  .stat-item {
    padding: 0 16px;
  }

  .overview-section {
    padding: 0 16px 40px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .blog-content {
    padding: 0 16px 60px;
  }

  .blog-section {
    padding: 24px 18px;
  }

  .subsection-grid,
  .subsection-grid--three {
    grid-template-columns: 1fr;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcuts-grid {
    grid-template-columns: 1fr 1fr;
  }

  .summary-list {
    grid-template-columns: 1fr;
  }

  .feature-list--grid,
  .feature-list--inline {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .category-grid {
    grid-template-columns: 1fr;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-divider {
    display: none;
  }
}
</style>
