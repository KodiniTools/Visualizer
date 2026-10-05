<template>
  <div class="internal-landing" :class="{ 'light-theme': !isDark }">
    <!-- Header -->
    <header class="landing-header" :class="{ scrolled: isScrolled }">
      <div class="header-content">
        <div class="header-logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
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
        </div>
      </div>
    </header>

    <!-- Hero Section with Feature Cards -->
    <section class="hero-section">
      <div class="hero-container">
        <!-- Hero Text -->
        <div class="hero-text">
          <h1 class="hero-title">
            {{ t('internalLanding.hero.title') }}
            <span class="gradient-text">{{ t('internalLanding.hero.highlight') }}</span>
          </h1>
          <p class="hero-subtitle">{{ t('internalLanding.hero.subtitle') }}</p>
        </div>

        <!-- Feature Cards Grid -->
        <div class="features-grid">
          <div
            v-for="(card, index) in featureCards"
            :key="index"
            class="feature-card"
            :style="{ '--card-delay': `${index * 0.1}s` }"
          >
            <div class="card-icon" :style="{ background: card.gradient }">
              <component :is="card.icon" />
            </div>
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-description">{{ card.description }}</p>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="hero-cta">
          <router-link to="/app" class="btn-primary">
            <span class="btn-icon">
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
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </span>
            {{ t('internalLanding.hero.cta') }}
          </router-link>
        </div>
      </div>

      <!-- Background Animation -->
      <div class="hero-background">
        <div class="wave-container">
          <div
            class="wave-bar"
            v-for="n in 24"
            :key="n"
            :style="{ animationDelay: `${n * 0.08}s` }"
          ></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, h, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useTheme } from '../lib/theme.js'

const { t, locale } = useI18n()
const { isDark } = useTheme()

const isScrolled = ref(false)

// Scroll listener for header styling
function handleScroll() {
  isScrolled.value = window.scrollY > 50
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Check initial state
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Feature Icons
const VisualizerIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 32,
      height: 32,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('rect', { x: 1, y: 6, width: 3, height: 12 }),
      h('rect', { x: 6, y: 3, width: 3, height: 18 }),
      h('rect', { x: 11, y: 8, width: 3, height: 8 }),
      h('rect', { x: 16, y: 4, width: 3, height: 16 }),
      h('rect', { x: 21, y: 9, width: 2, height: 6 }),
    ],
  )

const VideoIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 32,
      height: 32,
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

const CustomizeIcon = () =>
  h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 32,
      height: 32,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('circle', { cx: 12, cy: 12, r: 3 }),
      h('path', {
        d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
      }),
    ],
  )

// Feature cards with translations
const featureCards = computed(() => {
  const _ = locale.value // Reactivity dependency
  const cards = t('internalLanding.features.cards')
  const icons = [VisualizerIcon, VideoIcon, CustomizeIcon]
  const gradients = [
    'linear-gradient(135deg, #f8e1a9 0%, #c9984d 100%)',
    'linear-gradient(135deg, #C5DEB0 0%, #f8e1a9 100%)',
    'linear-gradient(135deg, #c9984d 0%, #7A8DA0 100%)',
  ]

  return cards.map((card, index) => ({
    ...card,
    icon: icons[index],
    gradient: gradients[index],
  }))
})
</script>

<style scoped>
/* Internal Landing Page - Dark Theme (default) */
.internal-landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    180deg,
    var(--primary-bg) 0%,
    var(--primary-bg) 50%,
    var(--primary-bg) 100%
  );
  color: var(--text-primary);
  font-family: 'Supreme', sans-serif;
  overflow-x: hidden;
}

/* Light Theme */
.internal-landing.light-theme {
  background: linear-gradient(
    180deg,
    var(--primary-bg) 0%,
    var(--secondary-bg) 50%,
    var(--primary-bg) 100%
  );
}

/* Header */
.landing-header {
  position: fixed;
  top: 60px;
  /* Space for global navigation */
  left: 0;
  right: 0;
  z-index: 50;
  /* Lower than global nav dropdown */
  padding: 16px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  transition: top 0.3s ease;
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

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
}

/* Hero Section */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 180px 24px 60px; /* Extra padding for global + local navigation */
  position: relative;
  min-height: 100vh;
}

.hero-container {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}

.hero-text {
  text-align: center;
  max-width: 700px;
}

.hero-title {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.gradient-text {
  display: block;
  color: var(--accent-ink);
}

.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}

.feature-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  padding: 32px 28px;
  text-align: center;
  transition: border-color var(--ds-duration) var(--ds-ease);
  animation: fadeInUp 0.6s ease-out backwards;
  animation-delay: var(--card-delay);
}

.feature-card:hover {
  border-color: var(--ds-border-strong);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: var(--accent-text);
}

.card-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.card-description {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
}

.light-theme .card-description {
  color: var(--text-muted);
}

/* CTA Button */
.hero-cta {
  margin-top: 16px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 40px;
  background: var(--accent-primary);
  color: var(--accent-text);
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: var(--ds-radius-md);
  text-decoration: none;
  transition: background-color var(--ds-duration) var(--ds-ease);
}

.btn-primary:hover {
  background: var(--accent-tertiary);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Background Animation */
.hero-background {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 180px;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.15;
}

.wave-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 100%;
  gap: 8px;
  padding: 0 20px;
}

.wave-bar {
  width: 12px;
  min-height: 20px;
  background: linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%);
  border-radius: 6px;
  animation: waveAnimation 1.4s ease-in-out infinite;
}

@keyframes waveAnimation {
  0%,
  100% {
    height: 20px;
  }
  50% {
    height: 120px;
  }
}

/* Responsive Design */
@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: 1fr;
    max-width: 450px;
    margin: 0 auto;
  }

  .hero-section {
    padding-top: 160px; /* Extra padding for global + local navigation */
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

  .header-logo span {
    display: none;
  }

  .hero-section {
    padding: 140px 20px 40px; /* Extra padding for global + local navigation */
  }

  .hero-title {
    font-size: 1.8rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .features-grid {
    gap: 16px;
  }

  .feature-card {
    padding: 24px 20px;
  }

  .card-icon {
    width: 60px;
    height: 60px;
  }

  .card-title {
    font-size: 1.15rem;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
    padding: 16px 32px;
  }
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .internal-landing {
  background: linear-gradient(
    180deg,
    var(--primary-bg) 0%,
    var(--secondary-bg) 50%,
    var(--primary-bg) 100%
  );
}

[data-theme='light'] .card-icon {
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .card-description {
  color: var(--text-muted);
}

[data-theme='light'] .hero-background {
  opacity: 0.1;
}
</style>
