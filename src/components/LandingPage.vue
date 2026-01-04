<template>
  <div class="landing-page" :class="{ 'light-theme': !isDark }">
    <!-- Header with Controls -->
    <header class="landing-header">
      <div class="header-content">
        <div class="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Visualizer</span>
        </div>
        <nav class="header-nav">
          <router-link to="/" class="nav-link active">{{ t('blog.nav.home') }}</router-link>
          <router-link to="/blog" class="nav-link">{{ t('blog.nav.features') }}</router-link>
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

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">{{ t('hero.badge') }}</div>
        <h1 class="hero-title">
          {{ t('hero.title') }}
          <span class="gradient-text">{{ t('hero.titleHighlight') }}</span>
        </h1>
        <p class="hero-subtitle">{{ t('hero.subtitle') }}</p>
        <div class="hero-actions">
          <router-link to="/app" class="btn-primary">
            <span class="btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </span>
            {{ t('hero.cta') }}
          </router-link>
          <a href="#features" class="btn-secondary">
            {{ t('hero.learnMore') }}
          </a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visualizer-preview">
          <div class="wave-bar" v-for="n in 20" :key="n" :style="{ animationDelay: `${n * 0.05}s` }"></div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="section-header">
        <h2 class="section-title">{{ t('features.title') }}</h2>
        <p class="section-subtitle">{{ t('features.subtitle') }}</p>
      </div>
      <div class="features-grid">
        <div class="feature-card" v-for="(card, index) in featureCards" :key="index">
          <div class="feature-icon" :style="{ background: card.gradient }">
            <component :is="card.icon" />
          </div>
          <h3 class="feature-title">{{ card.title }}</h3>
          <p class="feature-description">{{ card.description }}</p>
        </div>
      </div>
    </section>

    <!-- Video Demo Section -->
    <section class="video-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('video.title') }}</h2>
        <p class="section-subtitle">{{ t('video.subtitle') }}</p>
      </div>
      <div class="video-container">
        <div class="video-placeholder">
          <div class="video-placeholder-content">
            <div class="play-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <p class="video-placeholder-text">{{ t('video.placeholder') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('faq.title') }}</h2>
        <p class="section-subtitle">{{ t('faq.subtitle') }}</p>
      </div>
      <div class="faq-list">
        <div
          class="faq-item"
          v-for="(faq, index) in faqItems"
          :key="index"
          :class="{ 'active': activeFaq === index }"
          @click="toggleFaq(index)"
        >
          <div class="faq-question">
            <span>{{ faq.question }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="faq-icon"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="faq-answer">
            <p>{{ faq.answer }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">{{ t('cta.title') }}</h2>
        <p class="cta-subtitle">{{ t('cta.subtitle') }}</p>
        <router-link to="/app" class="btn-primary btn-large">
          <span class="btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </span>
          {{ t('cta.button') }}
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useTheme } from '../lib/theme.js';

const { t, locale, toggleLocale, messages } = useI18n();
const { isDark, toggleTheme } = useTheme();

const activeFaq = ref(null);

// Force reactivity by using computed that depends on locale
const currentLocale = computed(() => locale.value);

// Feature icons as render functions
const MusicIcon = () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M9 18V5l12-2v13' }),
  h('circle', { cx: 6, cy: 18, r: 3 }),
  h('circle', { cx: 18, cy: 16, r: 3 })
]);

const GridIcon = () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('rect', { x: 2, y: 2, width: 20, height: 20, rx: 2.18, ry: 2.18 }),
  h('line', { x1: 7, y1: 2, x2: 7, y2: 22 }),
  h('line', { x1: 17, y1: 2, x2: 17, y2: 22 }),
  h('line', { x1: 2, y1: 12, x2: 22, y2: 12 })
]);

const VideoIcon = () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('polygon', { points: '23 7 16 12 23 17 23 7' }),
  h('rect', { x: 1, y: 5, width: 15, height: 14, rx: 2, ry: 2 })
]);

const EditIcon = () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M12 20h9' }),
  h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' })
]);

// Computed feature cards with translations - depends on locale for reactivity
const featureCards = computed(() => {
  // Access locale.value to ensure reactivity
  const _ = locale.value;
  const cards = t('features.cards');
  const icons = [MusicIcon, GridIcon, VideoIcon, EditIcon];
  const gradients = [
    'linear-gradient(135deg, #BCE5E5, #9EBEC1)',
    'linear-gradient(135deg, #C5DEB0, #9EBEC1)',
    'linear-gradient(135deg, #609198, #BCE5E5)',
    'linear-gradient(135deg, #A8A992, #C5DEB0)'
  ];

  return cards.map((card, index) => ({
    ...card,
    icon: icons[index],
    gradient: gradients[index]
  }));
});

// Computed FAQ items with translations - depends on locale for reactivity
const faqItems = computed(() => {
  // Access locale.value to ensure reactivity
  const _ = locale.value;
  return t('faq.items');
});

function toggleFaq(index) {
  activeFaq.value = activeFaq.value === index ? null : index;
}
</script>

<style scoped>
/* Landing Page - Dark Theme (default) */
.landing-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0a1012 0%, #0f1416 50%, #0a1012 100%);
  color: #E9E9EB;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow-x: hidden;
}

/* Light Theme */
.landing-page.light-theme {
  background: linear-gradient(180deg, #f5f7f8 0%, #E9E9EB 50%, #f5f7f8 100%);
  color: #1a1f22;
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px;
  background: rgba(10, 16, 18, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(158, 190, 193, 0.1);
}

.light-theme .landing-header {
  background: rgba(233, 233, 235, 0.9);
  border-bottom: 1px solid rgba(96, 145, 152, 0.15);
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
  color: #BCE5E5;
}

.light-theme .header-logo {
  color: #609198;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  color: #9EBEC1;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  color: #BCE5E5;
}

.light-theme .nav-link {
  color: #6b7280;
}

.light-theme .nav-link:hover,
.light-theme .nav-link.active {
  color: #609198;
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
  background: rgba(96, 145, 152, 0.15);
  border: 1px solid rgba(96, 145, 152, 0.25);
  border-radius: 10px;
  color: #BCE5E5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(96, 145, 152, 0.25);
  border-color: rgba(96, 145, 152, 0.4);
}

.light-theme .control-btn {
  background: rgba(96, 145, 152, 0.1);
  border-color: rgba(96, 145, 152, 0.2);
  color: #609198;
}

.light-theme .control-btn:hover {
  background: rgba(96, 145, 152, 0.2);
}

.lang-label {
  font-weight: 700;
  font-size: 0.85rem;
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 24px 60px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(96, 145, 152, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, rgba(188, 229, 229, 0.08) 0%, transparent 40%),
              radial-gradient(ellipse at 20% 60%, rgba(197, 222, 176, 0.08) 0%, transparent 40%);
  pointer-events: none;
}

.light-theme .hero::before {
  background: radial-gradient(ellipse at 50% 0%, rgba(96, 145, 152, 0.1) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, rgba(188, 229, 229, 0.15) 0%, transparent 40%),
              radial-gradient(ellipse at 20% 60%, rgba(197, 222, 176, 0.15) 0%, transparent 40%);
}

.hero-content {
  max-width: 700px;
  text-align: center;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(96, 145, 152, 0.15);
  border: 1px solid rgba(96, 145, 152, 0.3);
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #BCE5E5;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 28px;
}

.light-theme .hero-badge {
  background: rgba(96, 145, 152, 0.1);
  border-color: rgba(96, 145, 152, 0.25);
  color: #609198;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 24px 0;
  color: #E9E9EB;
}

.light-theme .hero-title {
  color: #1a1f22;
}

.gradient-text {
  background: linear-gradient(135deg, #BCE5E5 0%, #609198 50%, #C5DEB0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.7;
  color: #A8A992;
  margin: 0 0 40px 0;
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
}

.light-theme .hero-subtitle {
  color: #6b7280;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #609198 0%, #9EBEC1 100%);
  color: #0f1416;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(96, 145, 152, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(96, 145, 152, 0.5);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: transparent;
  color: #BCE5E5;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid rgba(188, 229, 229, 0.3);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: #BCE5E5;
  background: rgba(188, 229, 229, 0.1);
}

.light-theme .btn-secondary {
  color: #609198;
  border-color: rgba(96, 145, 152, 0.3);
}

.light-theme .btn-secondary:hover {
  border-color: #609198;
  background: rgba(96, 145, 152, 0.1);
}

.btn-large {
  padding: 20px 44px;
  font-size: 1.1rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-visual {
  display: none;
}

.visualizer-preview {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 200px;
  gap: 4px;
  padding: 20px;
}

.wave-bar {
  width: 8px;
  background: linear-gradient(180deg, #609198 0%, #BCE5E5 100%);
  border-radius: 4px;
  animation: wave 1.2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { height: 20px; }
  50% { height: 100px; }
}

/* Section Styling */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 16px 0;
}

.light-theme .section-title {
  color: #1a1f22;
}

.section-subtitle {
  font-size: 1.1rem;
  color: #A8A992;
  margin: 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.light-theme .section-subtitle {
  color: #6b7280;
}

/* Features Section */
.features {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.feature-card {
  background: linear-gradient(180deg, rgba(21, 27, 29, 0.9) 0%, rgba(21, 27, 29, 0.6) 100%);
  border: 1px solid rgba(158, 190, 193, 0.15);
  border-radius: 20px;
  padding: 36px 28px;
  transition: all 0.3s ease;
}

.light-theme .feature-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  border-color: rgba(96, 145, 152, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(96, 145, 152, 0.4);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.light-theme .feature-card:hover {
  box-shadow: 0 20px 40px rgba(96, 145, 152, 0.15);
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #0f1416;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #E9E9EB;
  margin: 0 0 12px 0;
}

.light-theme .feature-title {
  color: #1a1f22;
}

.feature-description {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #9EBEC1;
  margin: 0;
}

.light-theme .feature-description {
  color: #6b7280;
}

/* Video Section */
.video-section {
  padding: 100px 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 20px;
  overflow: hidden;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(21, 27, 29, 0.95) 0%, rgba(10, 16, 18, 0.95) 100%);
  border: 2px dashed rgba(96, 145, 152, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.light-theme .video-placeholder {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(233, 233, 235, 0.95) 100%);
}

.video-placeholder-content {
  text-align: center;
}

.play-button {
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #609198 0%, #9EBEC1 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #0f1416;
  transition: all 0.3s ease;
  cursor: pointer;
}

.play-button:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(96, 145, 152, 0.5);
}

.play-button svg {
  margin-left: 6px;
}

.video-placeholder-text {
  color: #A8A992;
  font-size: 1rem;
  margin: 0;
}

.light-theme .video-placeholder-text {
  color: #6b7280;
}

/* FAQ Section */
.faq-section {
  padding: 100px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-item {
  background: rgba(21, 27, 29, 0.8);
  border: 1px solid rgba(158, 190, 193, 0.15);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.light-theme .faq-item {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(96, 145, 152, 0.15);
}

.faq-item:hover {
  border-color: rgba(96, 145, 152, 0.3);
}

.faq-item.active {
  border-color: rgba(96, 145, 152, 0.4);
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #E9E9EB;
}

.light-theme .faq-question {
  color: #1a1f22;
}

.faq-icon {
  color: #609198;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 16px;
}

.faq-item.active .faq-icon {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.faq-item.active .faq-answer {
  max-height: 300px;
}

.faq-answer p {
  padding: 0 28px 24px;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #9EBEC1;
}

.light-theme .faq-answer p {
  color: #6b7280;
}

/* CTA Section */
.cta-section {
  padding: 120px 24px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 100%, rgba(96, 145, 152, 0.12) 0%, transparent 60%);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 20px 0;
}

.light-theme .cta-title {
  color: #1a1f22;
}

.cta-subtitle {
  font-size: 1.15rem;
  color: #A8A992;
  margin: 0 0 40px 0;
  line-height: 1.7;
}

.light-theme .cta-subtitle {
  color: #6b7280;
}

/* Responsive */
@media (min-width: 768px) {
  .hero {
    flex-direction: row;
    gap: 60px;
    padding: 120px 48px 80px;
  }

  .hero-content {
    text-align: left;
    flex: 1;
  }

  .hero-subtitle {
    margin-left: 0;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .hero-visual {
    display: block;
    flex: 1;
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .header-nav {
    display: none;
  }
}

@media (max-width: 600px) {
  .landing-header {
    padding: 12px 16px;
  }

  .header-logo span {
    display: none;
  }

  .hero {
    padding-top: 80px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .features,
  .video-section,
  .faq-section {
    padding: 60px 20px;
  }

  .feature-card {
    padding: 28px 24px;
  }

  .faq-question {
    padding: 20px 22px;
    font-size: 0.95rem;
  }

  .faq-answer p {
    padding: 0 22px 20px;
    font-size: 0.9rem;
  }
}
</style>
