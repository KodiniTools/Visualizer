<template>
  <div class="blog-page" :class="{ 'light-theme': !isDark }">
    <!-- Header with Controls -->
    <header class="landing-header" :class="{ 'scrolled': isScrolled }">
      <div class="header-content">
        <router-link to="/" class="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Visualizer</span>
        </router-link>
        <nav class="header-nav">
          <router-link to="/" class="nav-link">{{ t('blog.nav.home') }}</router-link>
          <router-link to="/blog" class="nav-link active">{{ t('blog.nav.features') }}</router-link>
        </nav>
        <div class="header-controls">
          <!-- Language Switcher -->
          <button class="control-btn" @click="toggleLocale" :title="locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'">
            <span class="lang-label">{{ locale === 'de' ? 'DE' : 'EN' }}</span>
          </button>
          <!-- Theme Switcher -->
          <button class="control-btn theme-btn" @click="toggleTheme" :title="isDark ? t('theme.light') : t('theme.dark')">
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Blog Hero -->
    <section class="blog-hero">
      <div class="blog-hero-content">
        <h1 class="blog-title">{{ t('blog.hero.title') }}</h1>
        <p class="blog-subtitle">{{ t('blog.hero.subtitle') }}</p>
      </div>
    </section>

    <!-- Blog Content -->
    <main class="blog-content">
      <article class="blog-article">

        <!-- Introduction -->
        <section class="blog-section">
          <p class="intro-text">{{ t('blog.intro') }}</p>
        </section>

        <!-- Section 1: Audio Control -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.audio.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.audio.player.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audio.player.items')" :key="'player-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.audio.microphone.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audio.microphone.items')" :key="'mic-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.audio.beatMarkers.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audio.beatMarkers.items')" :key="'beat-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.audio.frequency.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audio.frequency.items')" :key="'freq-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 2: Visualizers -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.visualizers.title') }}</h2>
          <p>{{ t('blog.sections.visualizers.intro') }}</p>

          <div class="category-grid">
            <div class="category-card" v-for="(category, index) in t('blog.sections.visualizers.categories')" :key="'cat-' + index">
              <h4 class="category-title">{{ category.name }}</h4>
              <ul class="category-list">
                <li v-for="(item, idx) in category.items" :key="'item-' + idx">{{ item }}</li>
              </ul>
            </div>
          </div>

          <h3 class="subsection-title">{{ t('blog.sections.visualizers.features.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.visualizers.features.items')" :key="'vizfeat-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 3: Text Features -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.text.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.text.editor.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.text.editor.items')" :key="'editor-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.text.effects.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.text.effects.items')" :key="'textfx-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.text.audioReactive.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.text.audioReactive.items')" :key="'textaudio-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 4: Image Features -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.images.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.images.management.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.images.management.items')" :key="'imgmgmt-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.images.filters.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.images.filters.items')" :key="'imgfilt-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.images.audioReactive.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.images.audioReactive.items')" :key="'imgaudio-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 5: Background & Canvas -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.background.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.background.canvas.title') }}</h3>
          <p>{{ t('blog.sections.background.canvas.intro') }}</p>
          <ul class="feature-list compact">
            <li v-for="(item, index) in t('blog.sections.background.canvas.presets')" :key="'preset-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.background.options.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.background.options.items')" :key="'bgopt-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.background.tiles.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.background.tiles.items')" :key="'tiles-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 6: Video Recording -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.recording.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.recording.controls.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.recording.controls.items')" :key="'rec-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.recording.quality.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.recording.quality.items')" :key="'qual-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.recording.export.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.recording.export.items')" :key="'exp-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 7: Screenshot -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.screenshot.title') }}</h2>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.screenshot.items')" :key="'screen-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 8: Keyboard Shortcuts -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.shortcuts.title') }}</h2>
          <div class="shortcuts-grid">
            <div class="shortcut-item" v-for="(shortcut, index) in t('blog.sections.shortcuts.items')" :key="'short-' + index">
              <span class="shortcut-key">{{ shortcut.key }}</span>
              <span class="shortcut-action">{{ shortcut.action }}</span>
            </div>
          </div>
        </section>

        <!-- Section 9: Undo/Redo -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.history.title') }}</h2>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.history.items')" :key="'hist-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 10: Audio Reactivity -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.audioReactivity.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.frequency.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audioReactivity.frequency.items')" :key="'freqf-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.parameters.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audioReactivity.parameters.items')" :key="'param-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.audioReactivity.presets.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.audioReactivity.presets.items')" :key="'prepre-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 11: Browser Support -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.browser.title') }}</h2>

          <h3 class="subsection-title">{{ t('blog.sections.browser.browsers.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.browser.browsers.items')" :key="'browser-' + index">{{ item }}</li>
          </ul>

          <h3 class="subsection-title">{{ t('blog.sections.browser.formats.title') }}</h3>
          <ul class="feature-list">
            <li v-for="(item, index) in t('blog.sections.browser.formats.items')" :key="'format-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Section 12: Unique Features -->
        <section class="blog-section">
          <h2 class="section-title">{{ t('blog.sections.unique.title') }}</h2>
          <ul class="feature-list highlight">
            <li v-for="(item, index) in t('blog.sections.unique.items')" :key="'unique-' + index">{{ item }}</li>
          </ul>
        </section>

        <!-- Summary -->
        <section class="blog-section summary">
          <h2 class="section-title">{{ t('blog.summary.title') }}</h2>
          <p>{{ t('blog.summary.text') }}</p>
          <ul class="summary-list">
            <li v-for="(item, index) in t('blog.summary.items')" :key="'sum-' + index">{{ item }}</li>
          </ul>
          <p class="summary-cta">{{ t('blog.summary.cta') }}</p>
        </section>

      </article>
    </main>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">{{ t('blog.cta.title') }}</h2>
        <p class="cta-subtitle">{{ t('blog.cta.subtitle') }}</p>
        <router-link to="/app" class="btn-primary btn-large">
          {{ t('blog.cta.button') }}
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useTheme } from '../lib/theme.js';

const { t, locale, toggleLocale } = useI18n();
const { isDark, toggleTheme } = useTheme();

// Force reactivity by using computed that depends on locale
const currentLocale = computed(() => locale.value);

const isScrolled = ref(false);

// Scroll listener for header styling
function handleScroll() {
  isScrolled.value = window.scrollY > 50;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Check initial state
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* Blog Page - Dark Theme (default) */
.blog-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #050c1e 0%, #091428 50%, #050c1e 100%);
  color: #E9E9EB;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow-x: hidden;
}

/* Light Theme */
.blog-page.light-theme {
  background: linear-gradient(180deg, #F5F4D6 0%, #f9f2d5 50%, #F5F4D6 100%);
  color: #003971;
}

/* Header */
.landing-header {
  position: fixed;
  top: 60px; /* Space for global navigation */
  left: 0;
  right: 0;
  z-index: 50; /* Lower than global nav dropdown */
  padding: 16px 24px;
  background: rgba(10, 16, 18, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(201, 152, 77, 0.1);
  transition: top 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}

.landing-header.scrolled {
  top: 0;
  background: rgba(10, 16, 18, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.light-theme .landing-header {
  background: rgba(249, 242, 213, 0.9);
  border-bottom: 1px solid rgba(201, 152, 77, 0.2);
}

.light-theme .landing-header.scrolled {
  background: rgba(249, 242, 213, 0.98);
  box-shadow: 0 4px 20px rgba(0, 57, 113, 0.08);
}

.header-content {
  max-width: 1200px;
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
  color: #014f99;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  color: #f8e1a9;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  color: #f8e1a9;
}

.light-theme .nav-link {
  color: #4d6d8e;
}

.light-theme .nav-link:hover,
.light-theme .nav-link.active {
  color: #014f99;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(201, 152, 77, 0.15);
  border: 1px solid rgba(201, 152, 77, 0.25);
  border-radius: 10px;
  color: #f8e1a9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(201, 152, 77, 0.25);
  border-color: rgba(201, 152, 77, 0.4);
}

.light-theme .control-btn {
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

.light-theme .control-btn:hover {
  background: rgba(1, 79, 153, 0.15);
}

.lang-label {
  font-weight: 700;
  font-size: 0.85rem;
}

/* Blog Hero */
.blog-hero {
  padding: 200px 24px 60px; /* Extra padding for global + local navigation */
  text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(201, 152, 77, 0.15) 0%, transparent 60%);
}

.light-theme .blog-hero {
  background: radial-gradient(ellipse at 50% 0%, rgba(201, 152, 77, 0.1) 0%, transparent 60%);
}

.blog-hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.blog-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 16px 0;
  line-height: 1.2;
}

.light-theme .blog-title {
  color: #003971;
}

.blog-subtitle {
  font-size: 1.15rem;
  color: #7A8DA0;
  margin: 0;
  line-height: 1.6;
}

.light-theme .blog-subtitle {
  color: #4d6d8e;
}

/* Blog Content */
.blog-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.blog-article {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.blog-section {
  background: rgba(20, 38, 64, 0.6);
  border: 1px solid rgba(201, 152, 77, 0.1);
  border-radius: 16px;
  padding: 32px;
}

.light-theme .blog-section {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(201, 152, 77, 0.2);
}

.blog-section.summary {
  background: linear-gradient(135deg, rgba(201, 152, 77, 0.15) 0%, rgba(248, 225, 169, 0.1) 100%);
  border-color: rgba(201, 152, 77, 0.3);
}

.light-theme .blog-section.summary {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.06) 0%, rgba(248, 225, 169, 0.2) 100%);
  border-color: rgba(201, 152, 77, 0.3);
}

.intro-text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #f8e1a9;
  margin: 0;
}

.light-theme .intro-text {
  color: #4d6d8e;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f8e1a9;
  margin: 0 0 24px 0;
}

.light-theme .section-title {
  color: #014f99;
}

.subsection-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #E9E9EB;
  margin: 24px 0 12px 0;
}

.subsection-title:first-of-type {
  margin-top: 0;
}

.light-theme .subsection-title {
  color: #003971;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-list li {
  position: relative;
  padding-left: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #f8e1a9;
}

.light-theme .feature-list li {
  color: #4d6d8e;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 6px;
  height: 6px;
  background: #c9984d;
  border-radius: 50%;
}

.feature-list.highlight li::before {
  background: #f8e1a9;
}

.feature-list.compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px 24px;
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.category-card {
  background: rgba(10, 16, 18, 0.6);
  border: 1px solid rgba(201, 152, 77, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.light-theme .category-card {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(201, 152, 77, 0.2);
}

.category-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f8e1a9;
  margin: 0 0 12px 0;
}

.light-theme .category-title {
  color: #014f99;
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
  font-size: 0.85rem;
  color: #f8e1a9;
}

.light-theme .category-list li {
  color: #4d6d8e;
}

/* Shortcuts Grid */
.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-key {
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid rgba(201, 152, 77, 0.3);
  border-radius: 6px;
  padding: 4px 10px;
  font-family: monospace;
  font-size: 0.85rem;
  color: #f8e1a9;
  white-space: nowrap;
}

.light-theme .shortcut-key {
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

.shortcut-action {
  font-size: 0.9rem;
  color: #f8e1a9;
}

.light-theme .shortcut-action {
  color: #4d6d8e;
}

/* Summary */
.summary-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.summary-list li {
  position: relative;
  padding-left: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #E9E9EB;
}

.light-theme .summary-list li {
  color: #003971;
}

.summary-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #c9984d, #f8e1a9);
  border-radius: 50%;
}

.summary-cta {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f8e1a9;
  margin: 24px 0 0 0;
  text-align: center;
}

.light-theme .summary-cta {
  color: #014f99;
}

/* CTA Section */
.cta-section {
  padding: 80px 24px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 100%, rgba(201, 152, 77, 0.12) 0%, transparent 60%);
}

.light-theme .cta-section {
  background: radial-gradient(ellipse at 50% 100%, rgba(201, 152, 77, 0.1) 0%, transparent 60%);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 16px 0;
}

.light-theme .cta-title {
  color: #003971;
}

.cta-subtitle {
  font-size: 1.1rem;
  color: #7A8DA0;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.light-theme .cta-subtitle {
  color: #4d6d8e;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #c9984d 0%, #f8e1a9 100%);
  color: #091428;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(201, 152, 77, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(201, 152, 77, 0.5);
}

.light-theme .btn-primary {
  background: linear-gradient(135deg, #014f99 0%, #3a7cc5 100%);
  color: #F5F4D6;
  box-shadow: 0 4px 20px rgba(1, 79, 153, 0.35);
}

.light-theme .btn-primary:hover {
  box-shadow: 0 8px 30px rgba(1, 79, 153, 0.45);
}

.btn-large {
  padding: 18px 40px;
  font-size: 1.05rem;
}

/* Responsive */
@media (max-width: 768px) {
  .header-nav {
    display: none;
  }

  .landing-header {
    top: 50px; /* Smaller global nav on mobile */
  }

  .landing-header.scrolled {
    top: 0;
  }

  .blog-hero {
    padding: 160px 20px 40px; /* Extra padding for global + local navigation */
  }

  .blog-content {
    padding: 24px 16px 60px;
  }

  .blog-section {
    padding: 24px 20px;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
  }

  .summary-list {
    grid-template-columns: 1fr;
  }
}
</style>
