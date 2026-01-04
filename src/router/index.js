import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import InternalLandingPage from '../components/InternalLandingPage.vue'
import BlogPage from '../components/BlogPage.vue'
import VisualizerApp from '../VisualizerApp.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage
  },
  {
    path: '/internal',
    name: 'InternalLanding',
    component: InternalLandingPage
  },
  {
    path: '/blog',
    name: 'Blog',
    component: BlogPage
  },
  {
    path: '/app',
    name: 'Visualizer',
    component: VisualizerApp
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

export default router
