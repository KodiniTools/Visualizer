import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import InternalLandingPage from '../components/InternalLandingPage.vue'
import BlogPage from '../components/BlogPage.vue'
import VisualizerApp from '../VisualizerApp.vue'
import { watch } from 'vue'
import { applyRouteHead } from './seoHead.js'
import { localeRef } from '../lib/i18n.js'

const BASE = 'https://kodinitools.com/visualizer'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: {
      title: 'Audio Visualizer Pro – Online Musik-Visualizer & MP4-Export',
      description:
        'Audio Visualizer Pro – Erstelle beeindruckende Musik-Visualisierungen direkt im Browser. Tracks hochladen, Visualisierung wählen, Text/Bild hinzufügen und als MP4 exportieren.',
      canonical: `${BASE}/`,
      robots: 'index, follow',
      en: {
        title: 'Audio Visualizer Pro – Online Music Visualizer & MP4 Export',
        description:
          'Audio Visualizer Pro – Create stunning music visualizations right in your browser. Upload tracks, pick a visualizer, add text or images and export as MP4.',
      },
      // FAQ ist nur hier sichtbar → FAQ-JSON-LD nur hier (siehe seoHead.js)
      faq: true,
    },
  },
  {
    path: '/internal',
    name: 'InternalLanding',
    component: InternalLandingPage,
    meta: {
      title: 'Audio Visualizer Pro – Interner Bereich',
      description: 'Interner Bereich des Audio Visualizer Pro.',
      canonical: `${BASE}/internal`,
      robots: 'noindex, nofollow',
    },
  },
  {
    path: '/blog',
    name: 'Blog',
    component: BlogPage,
    meta: {
      title: 'Funktionen – Audio Visualizer Pro',
      description:
        'Alle Funktionen des Audio Visualizer Pro im Überblick: 169 Visualizer, Multi-Layer, Bild-Slideshow, Text- und Lauftext-Effekte, audio-reaktive Bilder und MP4-/GIF-Export.',
      canonical: `${BASE}/blog`,
      robots: 'index, follow',
      en: {
        title: 'Features – Audio Visualizer Pro',
        description:
          'All Audio Visualizer Pro features at a glance: 169 visualizers, multi-layer, image slideshow, text and ticker effects, audio-reactive images and MP4/GIF export.',
      },
    },
  },
  {
    path: '/app',
    name: 'Visualizer',
    component: VisualizerApp,
    meta: {
      title: 'App – Audio Visualizer Pro',
      description: 'Audio Visualizer Pro – Musik-Visualisierung direkt im Browser.',
      canonical: `${BASE}/app`,
      robots: 'noindex, follow',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    if (savedPosition) {
      return savedPosition
    }
    // Erste Navigation: die Seite steht ohnehin oben. window.scrollTo würde
    // direkt nach dem Mount ein synchrones Layout erzwingen (forced reflow).
    if (from === START_LOCATION) {
      return false
    }
    return { top: 0 }
  },
})

// Update document.title, canonical, robots, og:url, hreflang, FAQ-JSON-LD per route
// und Sprache (EN = ?lang=en); bei Sprachwechsel für die aktuelle Route erneut.
router.afterEach((to) => applyRouteHead(to.meta, localeRef.value))
watch(localeRef, (locale) => applyRouteHead(router.currentRoute.value.meta, locale))

// Redirect from landing to app when coming from audiokonverter
router.beforeEach((to, from, next) => {
  if (to.name === 'Landing' && to.query.source === 'audiokonverter') {
    next({ name: 'Visualizer', query: { source: 'audiokonverter' } })
  } else {
    next()
  }
})

export default router
