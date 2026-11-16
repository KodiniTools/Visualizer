import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
// Landing, Blog und Interner Bereich werden erst bei Bedarf geladen, damit
// /app weder deren JS noch deren CSS im kritischen Pfad hat. Die App selbst
// bleibt statisch (kein zusätzlicher Request-Wasserfall auf /app).
const LandingPage = () => import('../components/LandingPage.vue')
const InternalLandingPage = () => import('../components/InternalLandingPage.vue')
const BlogPage = () => import('../components/BlogPage.vue')
import VisualizerApp from '../VisualizerApp.vue'
import { watch } from 'vue'
import { applyRouteHead } from './seoHead'
import { appSeo, blogSeo, internalSeo, landingSeo } from './routeSeo'
import { localeRef } from '../lib/i18n'

export const routes = [
  { path: '/', name: 'Landing', component: LandingPage, meta: landingSeo },
  { path: '/internal', name: 'InternalLanding', component: InternalLandingPage, meta: internalSeo },
  { path: '/blog', name: 'Blog', component: BlogPage, meta: blogSeo },
  { path: '/app', name: 'Visualizer', component: VisualizerApp, meta: appSeo },
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
