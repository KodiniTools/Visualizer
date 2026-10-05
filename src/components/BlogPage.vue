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
  background: linear-gradient(180deg, #050c1e 0%, #091428 50%, #050c1e 100%);
  color: #e9e9eb;
  font-family: 'Supreme', sans-serif;
}

.blog-page.light-theme {
  background: linear-gradient(
    180deg,
    var(--primary-bg) 0%,
    var(--secondary-bg) 50%,
    var(--primary-bg) 100%
  );
  color: var(--text-primary);
}

/* ═══ Header ═══ */
.landing-header {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 14px 24px;
  background: rgba(5, 12, 30, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(201, 152, 77, 0.12);
  transition:
    top 0.3s ease,
    background 0.3s ease,
    box-shadow 0.3s ease;
}

.landing-header.scrolled {
  top: 0;
  background: rgba(5, 12, 30, 0.97);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.light-theme .landing-header {
  background: rgba(249, 242, 213, 0.92);
  border-bottom-color: var(--border-color);
}

.light-theme .landing-header.scrolled {
  background: rgba(249, 242, 213, 0.99);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--text-primary) 10%, transparent);
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
  font-weight: 700;
  font-size: 1.1rem;
  color: #f8e1a9;
  text-decoration: none;
}

.light-theme .header-logo {
  color: var(--accent-ink);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  color: rgba(248, 225, 169, 0.7);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.active {
  color: #f8e1a9;
}

.light-theme .nav-link {
  color: var(--text-muted);
}
.light-theme .nav-link:hover,
.light-theme .nav-link.active {
  color: var(--accent-ink);
}

.nav-cta {
  padding: 8px 18px;
  background: linear-gradient(135deg, #c9984d, #f8e1a9);
  color: #091428;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: 8px;
  text-decoration: none;
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.nav-cta:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.light-theme .nav-cta {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-tertiary));
  color: var(--accent-text);
}

/* ═══ Hero ═══ */
.blog-hero {
  padding: 200px 24px 70px;
  text-align: center;
  background: radial-gradient(
    ellipse 900px 400px at 50% 0%,
    rgba(201, 152, 77, 0.18) 0%,
    transparent 70%
  );
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
  background: rgba(201, 152, 77, 0.15);
  border: 1px solid rgba(201, 152, 77, 0.3);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c9984d;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.light-theme .hero-badge {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

.blog-title {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 700;
  color: #e9e9eb;
  margin: 0 0 16px;
  line-height: 1.15;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.light-theme .blog-title {
  color: var(--text-primary);
}

.blog-subtitle {
  font-size: 1.1rem;
  color: #7a8da0;
  margin: 0 auto 40px;
  line-height: 1.7;
  max-width: 600px;
}

.light-theme .blog-subtitle {
  color: var(--text-muted);
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
  border: 1px solid rgba(201, 152, 77, 0.15);
  border-radius: 16px;
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
  font-size: 1.8rem;
  font-weight: 700;
  color: #c9984d;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #7a8da0;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.light-theme .stat-label {
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(201, 152, 77, 0.2);
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
  background: rgba(20, 38, 64, 0.5);
  border: 1px solid rgba(201, 152, 77, 0.12);
  border-radius: 14px;
  padding: 20px;
  transition:
    border-color 0.2s,
    transform 0.2s;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}

.overview-card:hover {
  border-color: rgba(201, 152, 77, 0.3);
  transform: translateY(-2px);
}

.light-theme .overview-card {
  background: rgba(255, 255, 255, 0.75);
  border-color: var(--border-color);
}

.overview-icon {
  flex-shrink: 0;
  color: #c9984d;
  margin-top: 2px;
}

.light-theme .overview-icon {
  color: var(--accent-ink);
}

.overview-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f8e1a9;
  margin: 0 0 6px;
}

.light-theme .overview-card-title {
  color: var(--accent-ink);
}

.overview-card-desc {
  font-size: 0.8rem;
  color: #7a8da0;
  margin: 0;
  line-height: 1.5;
}

.light-theme .overview-card-desc {
  color: var(--text-muted);
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
  background: rgba(20, 38, 64, 0.5);
  border: 1px solid rgba(201, 152, 77, 0.12);
  border-radius: 14px;
  padding: 20px;
}

.light-theme .toc-inner {
  background: rgba(255, 255, 255, 0.75);
  border-color: var(--border-color);
}

.toc-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8da0;
  margin: 0 0 14px;
}

.light-theme .toc-title {
  color: var(--text-muted);
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
  border-radius: 8px;
  font-size: 0.8rem;
  color: #7a8da0;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
  cursor: pointer;
}

.toc-link:hover {
  background: rgba(201, 152, 77, 0.1);
  color: #f8e1a9;
}

.toc-link.active {
  background: rgba(201, 152, 77, 0.12);
  color: #c9984d;
  font-weight: 600;
}

.light-theme .toc-link {
  color: var(--text-muted);
}
.light-theme .toc-link:hover {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  color: var(--accent-ink);
}
.light-theme .toc-link.active {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  color: var(--accent-ink);
}

.toc-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.toc-cta {
  display: block;
  margin-top: 16px;
  padding: 10px;
  background: linear-gradient(135deg, #c9984d, #f8e1a9);
  color: #091428;
  font-weight: 600;
  font-size: 0.82rem;
  border-radius: 8px;
  text-decoration: none;
  text-align: center;
  transition: opacity 0.2s;
}

.toc-cta:hover {
  opacity: 0.88;
}

.light-theme .toc-cta {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-tertiary));
  color: var(--accent-text);
}

/* ═══ Article ═══ */
.blog-article {
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
}

.blog-section {
  background: rgba(14, 28, 50, 0.6);
  border: 1px solid rgba(201, 152, 77, 0.1);
  border-radius: 18px;
  padding: 32px;
}

.light-theme .blog-section {
  background: rgba(255, 255, 255, 0.82);
  border-color: var(--border-color);
}

.intro-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.08), rgba(20, 38, 64, 0.4));
}

.light-theme .intro-section {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-primary) 6%, transparent),
    rgba(255, 255, 255, 0.6)
  );
}

.intro-text {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #c8b89a;
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
  background: rgba(201, 152, 77, 0.12);
  border: 1px solid rgba(201, 152, 77, 0.2);
  border-radius: 10px;
  color: #c9984d;
  flex-shrink: 0;
}

.light-theme .section-icon {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f8e1a9;
  margin: 0;
}

.light-theme .section-title {
  color: var(--accent-ink);
}

.section-intro {
  font-size: 0.95rem;
  color: #7a8da0;
  margin: 0 0 20px;
  line-height: 1.6;
}

.light-theme .section-intro {
  color: var(--text-muted);
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
  background: rgba(10, 16, 30, 0.4);
  border: 1px solid rgba(201, 152, 77, 0.07);
  border-radius: 12px;
  padding: 20px;
}

.light-theme .subsection-block {
  background: rgba(245, 244, 214, 0.5);
  border-color: var(--border-color);
}

.subsection-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e9e9eb;
  margin: 0 0 12px;
}

.light-theme .subsection-title {
  color: var(--text-primary);
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
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(248, 225, 169, 0.85);
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
  background: #c9984d;
  border-radius: 50%;
}

.light-theme .feature-list li::before {
  background: var(--accent-primary);
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
  color: #e9e9eb;
}
.feature-list--highlight li::before {
  background: #f8e1a9;
  width: 6px;
  height: 6px;
}
.light-theme .feature-list--highlight li {
  color: var(--text-primary);
}
.light-theme .feature-list--highlight li::before {
  background: var(--accent-primary);
}

/* Audio reactive box */
.audio-reactive-box {
  position: relative;
  margin-top: 20px;
  background: rgba(201, 152, 77, 0.06);
  border: 1px solid rgba(201, 152, 77, 0.18);
  border-radius: 12px;
  padding: 20px 20px 20px 20px;
}

.light-theme .audio-reactive-box {
  background: color-mix(in srgb, var(--accent-primary) 4%, transparent);
  border-color: var(--border-color);
}

.new-badge {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(46, 204, 113, 0.18);
  border: 1px solid rgba(46, 204, 113, 0.4);
  color: #2ecc71;
}
.light-theme .new-badge {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 101, 52, 0.35);
  color: #166534;
}

.reactive-badge {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid rgba(201, 152, 77, 0.35);
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #c9984d;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.light-theme .reactive-badge {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

/* Feature highlight box */
.feature-highlight-box {
  margin-top: 24px;
  background: rgba(10, 16, 30, 0.35);
  border: 1px solid rgba(201, 152, 77, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.light-theme .feature-highlight-box {
  background: rgba(245, 244, 214, 0.5);
  border-color: var(--border-color);
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.category-card {
  background: rgba(10, 16, 30, 0.5);
  border: 1px solid rgba(201, 152, 77, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.light-theme .category-card {
  background: rgba(245, 244, 214, 0.5);
  border-color: var(--border-color);
}

.category-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #c9984d;
  margin: 0 0 10px;
}

.light-theme .category-title {
  color: var(--accent-ink);
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
  font-size: 0.8rem;
  color: rgba(248, 225, 169, 0.75);
  padding-left: 14px;
  position: relative;
}

.category-list li::before {
  content: '–';
  position: absolute;
  left: 0;
  color: rgba(201, 152, 77, 0.5);
}

.light-theme .category-list li {
  color: var(--text-muted);
}
.light-theme .category-list li::before {
  color: var(--text-muted);
}

/* Canvas Presets */
.canvas-presets {
  background: rgba(10, 16, 30, 0.35);
  border: 1px solid rgba(201, 152, 77, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.light-theme .canvas-presets {
  background: rgba(245, 244, 214, 0.5);
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
  background: rgba(201, 152, 77, 0.1);
  border: 1px solid rgba(201, 152, 77, 0.2);
  border-radius: 20px;
  font-size: 0.78rem;
  color: rgba(248, 225, 169, 0.85);
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
  background: rgba(10, 16, 30, 0.4);
  border: 1px solid rgba(201, 152, 77, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
}

.light-theme .shortcut-item {
  background: rgba(245, 244, 214, 0.5);
  border-color: var(--border-color);
}

kbd.shortcut-key {
  background: rgba(201, 152, 77, 0.15);
  border: 1px solid rgba(201, 152, 77, 0.3);
  border-radius: 6px;
  padding: 3px 8px;
  font-family: monospace;
  font-size: 0.8rem;
  color: #f8e1a9;
  white-space: nowrap;
  flex-shrink: 0;
}

.light-theme kbd.shortcut-key {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

.shortcut-action {
  font-size: 0.82rem;
  color: rgba(248, 225, 169, 0.8);
}

.light-theme .shortcut-action {
  color: var(--text-muted);
}

/* Unique section */
.unique-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.1), rgba(14, 28, 50, 0.5));
  border-color: rgba(201, 152, 77, 0.2);
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
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.12), rgba(14, 28, 50, 0.6));
  border-color: rgba(201, 152, 77, 0.25);
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
  font-size: 0.9rem;
  line-height: 1.5;
  color: #e9e9eb;
}

.light-theme .summary-list li {
  color: var(--text-primary);
}

.summary-check {
  color: #c9984d;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.light-theme .summary-check {
  color: var(--accent-ink);
}

.summary-cta-text {
  font-size: 1rem;
  font-weight: 600;
  color: #f8e1a9;
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
  background: radial-gradient(
    ellipse 900px 300px at 50% 100%,
    rgba(201, 152, 77, 0.1) 0%,
    transparent 70%
  );
}

.light-theme .cta-section {
  background: radial-gradient(
    ellipse 900px 300px at 50% 100%,
    color-mix(in srgb, var(--accent-primary) 7%, transparent) 0%,
    transparent 70%
  );
}

.cta-content {
  max-width: 540px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  color: #e9e9eb;
  margin: 0 0 14px;
}

.light-theme .cta-title {
  color: var(--text-primary);
}

.cta-subtitle {
  font-size: 1rem;
  color: #7a8da0;
  margin: 0 0 32px;
  line-height: 1.6;
}

.light-theme .cta-subtitle {
  color: var(--text-muted);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  background: linear-gradient(135deg, #c9984d 0%, #f8e1a9 100%);
  color: #091428;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  transition:
    transform 0.25s,
    box-shadow 0.25s;
  box-shadow: 0 4px 24px rgba(201, 152, 77, 0.4);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 36px rgba(201, 152, 77, 0.55);
}

.light-theme .btn-primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%);
  color: var(--accent-text);
  box-shadow: 0 4px 24px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

.light-theme .btn-primary:hover {
  box-shadow: 0 10px 36px color-mix(in srgb, var(--accent-primary) 45%, transparent);
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
