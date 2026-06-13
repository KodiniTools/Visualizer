<template>
  <div class="blog-page" :class="{ 'light-theme': !isDark }">
    <!-- SEO structured data -->
    <teleport to="head">
      <title>Funktionen – Audio Visualizer Pro | Alle Features im Überblick</title>
      <meta
        name="description"
        content="30+ Visualizer, MP4-Export, Text-Overlay, Audio-reaktive Effekte, Social-Media-Presets – alle Funktionen des Audio Visualizer Pro im Überblick."
      />
      <meta
        name="keywords"
        content="Audio Visualizer, Funktionen, Visualizer, MP4 Export, Beat Reaktiv, Musik Visualisierung, Browser Tool"
      />
      <meta property="og:title" content="Funktionen – Audio Visualizer Pro" />
      <meta
        property="og:description"
        content="30+ Visualizer, MP4-Export, Text-Overlay, Audio-reaktive Effekte – alles kostenlos im Browser."
      />
      <link rel="canonical" href="/blog" />
    </teleport>

    <!-- Header -->
    <header class="landing-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <router-link to="/" class="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Visualizer</span>
        </router-link>
        <nav class="header-nav">
          <router-link to="/" class="nav-link">{{ t('blog.nav.home') }}</router-link>
          <router-link to="/blog" class="nav-link active">{{ t('blog.nav.features') }}</router-link>
          <router-link to="/app" class="nav-cta">Jetzt starten →</router-link>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="blog-hero">
      <div class="hero-badge">✦ Alle Funktionen im Überblick</div>
      <h1 class="blog-title">{{ t('blog.hero.title') }}</h1>
      <p class="blog-subtitle">{{ t('blog.hero.subtitle') }}</p>
      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-number">30+</span>
          <span class="stat-label">Visualizer</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">15+</span>
          <span class="stat-label">Text-Effekte</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">23+</span>
          <span class="stat-label">Bild-Effekte</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">10</span>
          <span class="stat-label">Social-Presets</span>
        </div>
      </div>
    </section>

    <!-- Quick Feature Overview Cards -->
    <section class="overview-section">
      <div class="overview-grid">
        <div class="overview-card" v-for="card in overviewCards" :key="card.id">
          <div class="overview-icon" v-html="card.icon"></div>
          <div class="overview-card-content">
            <h3 class="overview-card-title">{{ card.title }}</h3>
            <p class="overview-card-desc">{{ card.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="blog-content">
      <div class="content-layout">

        <!-- Sticky TOC -->
        <aside class="toc-sidebar">
          <div class="toc-inner">
            <h4 class="toc-title">Inhalt</h4>
            <nav class="toc-nav">
              <a
                v-for="section in tocSections"
                :key="section.id"
                :href="'#' + section.id"
                class="toc-link"
                :class="{ active: activeSection === section.id }"
                @click.prevent="scrollToSection(section.id)"
              >
                <span class="toc-icon" v-html="section.icon"></span>
                {{ section.label }}
              </a>
            </nav>
            <router-link to="/app" class="toc-cta">Jetzt starten →</router-link>
          </div>
        </aside>

        <!-- Article -->
        <article class="blog-article">

          <!-- Intro -->
          <section class="blog-section intro-section">
            <p class="intro-text">{{ t('blog.intro') }}</p>
          </section>

          <!-- 1: Audio -->
          <section id="audio" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.audio.title') }}</h2>
            </div>

            <div class="subsection-grid">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audio.player.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audio.player.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audio.microphone.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audio.microphone.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audio.beatMarkers.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audio.beatMarkers.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audio.frequency.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audio.frequency.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- 2: Visualizers -->
          <section id="visualizers" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.visualizers.title') }}</h2>
            </div>
            <p class="section-intro">{{ t('blog.sections.visualizers.intro') }}</p>

            <div class="category-grid">
              <div
                class="category-card"
                v-for="(category, i) in t('blog.sections.visualizers.categories')"
                :key="i"
              >
                <h4 class="category-title">{{ category.name }}</h4>
                <ul class="category-list">
                  <li v-for="(item, j) in category.items" :key="j">{{ item }}</li>
                </ul>
              </div>
            </div>

            <div class="feature-highlight-box">
              <h3 class="subsection-title">{{ t('blog.sections.visualizers.features.title') }}</h3>
              <ul class="feature-list feature-list--inline">
                <li v-for="(item, i) in t('blog.sections.visualizers.features.items')" :key="i">{{ item }}</li>
              </ul>
            </div>
          </section>

          <!-- 3: Text -->
          <section id="text" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.text.title') }}</h2>
            </div>
            <div class="subsection-grid">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.text.editor.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.text.editor.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.text.effects.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.text.effects.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
            <div class="audio-reactive-box">
              <div class="reactive-badge">Audio-reaktiv</div>
              <h3 class="subsection-title">{{ t('blog.sections.text.audioReactive.title') }}</h3>
              <ul class="feature-list feature-list--grid">
                <li v-for="(item, i) in t('blog.sections.text.audioReactive.items')" :key="i">{{ item }}</li>
              </ul>
            </div>
          </section>

          <!-- 4: Images -->
          <section id="images" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.images.title') }}</h2>
            </div>
            <div class="subsection-grid">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.images.management.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.images.management.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.images.filters.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.images.filters.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
            <div class="audio-reactive-box">
              <div class="reactive-badge">23+ Effekte</div>
              <h3 class="subsection-title">{{ t('blog.sections.images.audioReactive.title') }}</h3>
              <ul class="feature-list feature-list--grid">
                <li v-for="(item, i) in t('blog.sections.images.audioReactive.items')" :key="i">{{ item }}</li>
              </ul>
            </div>
          </section>

          <!-- 5: Background -->
          <section id="background" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.background.title') }}</h2>
            </div>

            <div class="canvas-presets">
              <h3 class="subsection-title">{{ t('blog.sections.background.canvas.title') }}</h3>
              <p class="section-intro">{{ t('blog.sections.background.canvas.intro') }}</p>
              <div class="presets-grid">
                <span
                  class="preset-pill"
                  v-for="(item, i) in t('blog.sections.background.canvas.presets')"
                  :key="i"
                >{{ item }}</span>
              </div>
            </div>

            <div class="subsection-grid" style="margin-top: 24px;">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.background.options.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.background.options.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.background.tiles.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.background.tiles.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- 6: Recording -->
          <section id="recording" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.recording.title') }}</h2>
            </div>
            <div class="subsection-grid subsection-grid--three">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.recording.controls.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.recording.controls.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.recording.quality.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.recording.quality.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.recording.export.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.recording.export.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- 7: Screenshot -->
          <section id="screenshot" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.screenshot.title') }}</h2>
            </div>
            <ul class="feature-list feature-list--grid">
              <li v-for="(item, i) in t('blog.sections.screenshot.items')" :key="i">{{ item }}</li>
            </ul>
          </section>

          <!-- 8: Shortcuts -->
          <section id="shortcuts" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.shortcuts.title') }}</h2>
            </div>
            <div class="shortcuts-grid">
              <div
                class="shortcut-item"
                v-for="(shortcut, i) in t('blog.sections.shortcuts.items')"
                :key="i"
              >
                <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                <span class="shortcut-action">{{ shortcut.action }}</span>
              </div>
            </div>
          </section>

          <!-- 9: History -->
          <section id="history" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.history.title') }}</h2>
            </div>
            <ul class="feature-list">
              <li v-for="(item, i) in t('blog.sections.history.items')" :key="i">{{ item }}</li>
            </ul>
          </section>

          <!-- 10: Audio Reactivity -->
          <section id="reactivity" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.audioReactivity.title') }}</h2>
            </div>
            <div class="subsection-grid subsection-grid--three">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.frequency.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audioReactivity.frequency.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.parameters.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audioReactivity.parameters.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.presets.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.audioReactivity.presets.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- 11: Browser Support -->
          <section id="browser" class="blog-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.browser.title') }}</h2>
            </div>
            <div class="subsection-grid">
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.browser.browsers.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.browser.browsers.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
              <div class="subsection-block">
                <h3 class="subsection-title">{{ t('blog.sections.browser.formats.title') }}</h3>
                <ul class="feature-list">
                  <li v-for="(item, i) in t('blog.sections.browser.formats.items')" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- 12: Unique -->
          <section id="unique" class="blog-section unique-section">
            <div class="section-header">
              <div class="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <h2 class="section-title">{{ t('blog.sections.unique.title') }}</h2>
            </div>
            <ul class="feature-list feature-list--highlight feature-list--grid">
              <li v-for="(item, i) in t('blog.sections.unique.items')" :key="i">{{ item }}</li>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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

const overviewCards = [
  {
    id: 'audio',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    title: 'Audio-Steuerung',
    desc: 'Vollwertiger Player, Mikrofon-Unterstützung, Beat-Marker & 1024-Punkt FFT-Analyse',
  },
  {
    id: 'visualizers',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    title: '30+ Visualizer',
    desc: 'Bars, Wellen, Partikel, Kosmische Effekte, Retro-Pixel und mehr – in 8 Kategorien',
  },
  {
    id: 'text',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    title: 'Text & Effekte',
    desc: '15+ professionelle Schriften, Schatten, Umrandung & 15 audio-reaktive Animationen',
  },
  {
    id: 'images',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    title: 'Bild-Ebenen',
    desc: 'Mehrere Bilder, 8 Filter, 23+ audio-reaktive Effekte, Rotation & Drag-and-Drop',
  },
  {
    id: 'background',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    title: 'Canvas & Hintergrund',
    desc: '10 Social-Media-Presets, Farbverläufe, Video-Hintergründe & Kachel-System',
  },
  {
    id: 'recording',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    title: 'Video-Export',
    desc: 'WebM & MP4, bis zu 4K 60 FPS, Screenshot in PNG/JPG/WebP, GIF-Export',
  },
  {
    id: 'reactivity',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    title: 'Audio-Reaktivität',
    desc: 'Bass/Mitten/Höhen-Analyse, Attack/Release, Easing-Kurven & Beat-Boost bis 3x',
  },
  {
    id: 'unique',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    title: '100% Kostenlos',
    desc: 'Browserbasiert, keine Installation, kein Konto, keine Wasserzeichen',
  },
]

const tocSections = [
  { id: 'audio', label: 'Audio-Steuerung', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
  { id: 'visualizers', label: '30+ Visualizer', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
  { id: 'text', label: 'Text & Effekte', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>' },
  { id: 'images', label: 'Bild-Ebenen', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
  { id: 'background', label: 'Canvas & Hintergrund', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' },
  { id: 'recording', label: 'Video-Export', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>' },
  { id: 'screenshot', label: 'Screenshot', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' },
  { id: 'shortcuts', label: 'Tastaturkürzel', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
  { id: 'history', label: 'Rückgängig', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>' },
  { id: 'reactivity', label: 'Audio-Reaktivität', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
  { id: 'browser', label: 'Browser-Support', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  { id: 'unique', label: 'Einzigartige Vorteile', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
]

function getScrollTop() {
  return window.scrollY ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0
}

function handleScroll() {
  const scrollTop = getScrollTop()
  isScrolled.value = scrollTop > 50

  // Update active TOC section using getBoundingClientRect for accuracy
  const sectionIds = tocSections.map(s => s.id)
  for (let i = sectionIds.length - 1; i >= 0; i--) {
    const el = document.getElementById(sectionIds[i])
    if (el) {
      const top = el.getBoundingClientRect().top + scrollTop
      if (scrollTop >= top - 130) {
        activeSection.value = sectionIds[i]
        break
      }
    }
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const rect = el.getBoundingClientRect()
  const scrollTop = getScrollTop()
  const target = scrollTop + rect.top - 110
  window.scrollTo({ top: target, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ═══ Base ═══ */
.blog-page {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #050c1e 0%, #091428 50%, #050c1e 100%);
  color: #e9e9eb;
  font-family: 'Supreme', sans-serif;
}

.blog-page.light-theme {
  background: linear-gradient(180deg, #f5f4d6 0%, #f9f2d5 50%, #f5f4d6 100%);
  color: #003971;
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
  transition: top 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}

.landing-header.scrolled {
  top: 0;
  background: rgba(5, 12, 30, 0.97);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.light-theme .landing-header {
  background: rgba(249, 242, 213, 0.92);
  border-bottom-color: rgba(201, 152, 77, 0.2);
}

.light-theme .landing-header.scrolled {
  background: rgba(249, 242, 213, 0.99);
  box-shadow: 0 4px 20px rgba(0, 57, 113, 0.1);
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

.light-theme .header-logo { color: #014f99; }

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

.light-theme .nav-link { color: #4d6d8e; }
.light-theme .nav-link:hover,
.light-theme .nav-link.active { color: #014f99; }

.nav-cta {
  padding: 8px 18px;
  background: linear-gradient(135deg, #c9984d, #f8e1a9);
  color: #091428;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: 8px;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s;
}

.nav-cta:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.light-theme .nav-cta {
  background: linear-gradient(135deg, #014f99, #3a7cc5);
  color: #f5f4d6;
}

/* ═══ Hero ═══ */
.blog-hero {
  padding: 200px 24px 70px;
  text-align: center;
  background: radial-gradient(ellipse 900px 400px at 50% 0%, rgba(201, 152, 77, 0.18) 0%, transparent 70%);
}

.light-theme .blog-hero {
  background: radial-gradient(ellipse 900px 400px at 50% 0%, rgba(201, 152, 77, 0.12) 0%, transparent 70%);
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
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
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

.light-theme .blog-title { color: #003971; }

.blog-subtitle {
  font-size: 1.1rem;
  color: #7a8da0;
  margin: 0 auto 40px;
  line-height: 1.7;
  max-width: 600px;
}

.light-theme .blog-subtitle { color: #4d6d8e; }

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(201, 152, 77, 0.15);
  border-radius: 16px;
  padding: 20px 32px;
}

.light-theme .hero-stats {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(201, 152, 77, 0.2);
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

.light-theme .stat-label { color: #4d6d8e; }

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
  transition: border-color 0.2s, transform 0.2s;
  cursor: default;
}

.overview-card:hover {
  border-color: rgba(201, 152, 77, 0.3);
  transform: translateY(-2px);
}

.light-theme .overview-card {
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(201, 152, 77, 0.15);
}

.overview-icon {
  flex-shrink: 0;
  color: #c9984d;
  margin-top: 2px;
}

.light-theme .overview-icon { color: #014f99; }

.overview-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f8e1a9;
  margin: 0 0 6px;
}

.light-theme .overview-card-title { color: #014f99; }

.overview-card-desc {
  font-size: 0.8rem;
  color: #7a8da0;
  margin: 0;
  line-height: 1.5;
}

.light-theme .overview-card-desc { color: #4d6d8e; }

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
  border-color: rgba(201, 152, 77, 0.2);
}

.toc-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8da0;
  margin: 0 0 14px;
}

.light-theme .toc-title { color: #4d6d8e; }

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
  transition: background 0.15s, color 0.15s;
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

.light-theme .toc-link { color: #4d6d8e; }
.light-theme .toc-link:hover { background: rgba(1, 79, 153, 0.06); color: #014f99; }
.light-theme .toc-link.active { background: rgba(1, 79, 153, 0.08); color: #014f99; }

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

.toc-cta:hover { opacity: 0.88; }

.light-theme .toc-cta {
  background: linear-gradient(135deg, #014f99, #3a7cc5);
  color: #f5f4d6;
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
  border-color: rgba(201, 152, 77, 0.18);
}

.intro-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.08), rgba(20, 38, 64, 0.4));
}

.light-theme .intro-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.06), rgba(255, 255, 255, 0.6));
}

.intro-text {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #c8b89a;
  margin: 0;
}

.light-theme .intro-text { color: #4d6d8e; }

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
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.15);
  color: #014f99;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f8e1a9;
  margin: 0;
}

.light-theme .section-title { color: #014f99; }

.section-intro {
  font-size: 0.95rem;
  color: #7a8da0;
  margin: 0 0 20px;
  line-height: 1.6;
}

.light-theme .section-intro { color: #4d6d8e; }

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
  border-color: rgba(201, 152, 77, 0.12);
}

.subsection-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e9e9eb;
  margin: 0 0 12px;
}

.light-theme .subsection-title { color: #003971; }

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

.light-theme .feature-list li { color: #4d6d8e; }

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

.light-theme .feature-list li::before { background: #014f99; }

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

.feature-list--highlight li { color: #e9e9eb; }
.feature-list--highlight li::before { background: #f8e1a9; width: 6px; height: 6px; }
.light-theme .feature-list--highlight li { color: #003971; }
.light-theme .feature-list--highlight li::before { background: #014f99; }

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
  background: rgba(1, 79, 153, 0.04);
  border-color: rgba(1, 79, 153, 0.12);
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
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
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
  border-color: rgba(201, 152, 77, 0.12);
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
  border-color: rgba(201, 152, 77, 0.15);
}

.category-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #c9984d;
  margin: 0 0 10px;
}

.light-theme .category-title { color: #014f99; }

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

.light-theme .category-list li { color: #4d6d8e; }
.light-theme .category-list li::before { color: rgba(1, 79, 153, 0.4); }

/* Canvas Presets */
.canvas-presets {
  background: rgba(10, 16, 30, 0.35);
  border: 1px solid rgba(201, 152, 77, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.light-theme .canvas-presets {
  background: rgba(245, 244, 214, 0.5);
  border-color: rgba(201, 152, 77, 0.12);
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
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
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
  border-color: rgba(201, 152, 77, 0.12);
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
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

.shortcut-action {
  font-size: 0.82rem;
  color: rgba(248, 225, 169, 0.8);
}

.light-theme .shortcut-action { color: #4d6d8e; }

/* Unique section */
.unique-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.1), rgba(14, 28, 50, 0.5));
  border-color: rgba(201, 152, 77, 0.2);
}

.light-theme .unique-section {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.05), rgba(255, 255, 255, 0.85));
}

/* Summary */
.summary-section {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.12), rgba(14, 28, 50, 0.6));
  border-color: rgba(201, 152, 77, 0.25);
}

.light-theme .summary-section {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.06), rgba(255, 255, 255, 0.9));
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

.light-theme .summary-list li { color: #003971; }

.summary-check {
  color: #c9984d;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.light-theme .summary-check { color: #014f99; }

.summary-cta-text {
  font-size: 1rem;
  font-weight: 600;
  color: #f8e1a9;
  margin: 0;
  text-align: center;
}

.light-theme .summary-cta-text { color: #014f99; }

/* ═══ CTA Section ═══ */
.cta-section {
  padding: 80px 24px 100px;
  text-align: center;
  background: radial-gradient(ellipse 900px 300px at 50% 100%, rgba(201, 152, 77, 0.1) 0%, transparent 70%);
}

.light-theme .cta-section {
  background: radial-gradient(ellipse 900px 300px at 50% 100%, rgba(1, 79, 153, 0.07) 0%, transparent 70%);
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

.light-theme .cta-title { color: #003971; }

.cta-subtitle {
  font-size: 1rem;
  color: #7a8da0;
  margin: 0 0 32px;
  line-height: 1.6;
}

.light-theme .cta-subtitle { color: #4d6d8e; }

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
  transition: transform 0.25s, box-shadow 0.25s;
  box-shadow: 0 4px 24px rgba(201, 152, 77, 0.4);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 36px rgba(201, 152, 77, 0.55);
}

.light-theme .btn-primary {
  background: linear-gradient(135deg, #014f99 0%, #3a7cc5 100%);
  color: #f5f4d6;
  box-shadow: 0 4px 24px rgba(1, 79, 153, 0.3);
}

.light-theme .btn-primary:hover {
  box-shadow: 0 10px 36px rgba(1, 79, 153, 0.45);
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
