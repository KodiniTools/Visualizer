import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import InternalLandingPage from '../components/InternalLandingPage.vue'
import BlogPage from '../components/BlogPage.vue'
import VisualizerApp from '../VisualizerApp.vue'

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
        'Alle Funktionen des Audio Visualizer Pro im Überblick: 30+ Visualizer, MP4-Export, Text-Overlay, Bildhintergrund, Audio-reaktive Effekte und mehr.',
      canonical: `${BASE}/blog`,
      robots: 'index, follow',
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
    return { top: 0 }
  },
})

// Update document.title, canonical, robots, og:url per route
router.afterEach((to) => {
  const { title, description, canonical, robots } = to.meta ?? {}

  if (title) document.title = title

  setMeta('name', 'description', description)
  setMeta('name', 'robots', robots ?? 'index, follow')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', canonical)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:url', canonical)

  setCanonical(canonical)
})

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  if (!href) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Redirect from landing to app when coming from audiokonverter
router.beforeEach((to, from, next) => {
  if (to.name === 'Landing' && to.query.source === 'audiokonverter') {
    next({ name: 'Visualizer', query: { source: 'audiokonverter' } })
  } else {
    next()
  }
})

export default router
