// SEO-Texte der Routen. Eigenes Modul ohne Vue-Importe, damit neben dem Router
// auch der Build (vite.config.ts → englische HTML-Varianten) dieselben Texte nutzt.
import type { RouteHeadMeta } from './seoHead'

export const SITE_BASE = 'https://kodinitools.com/visualizer'

export const landingSeo: RouteHeadMeta = {
  title: 'Audio Visualizer online – Musikvideo für TikTok erstellen',
  description:
    'Audio Visualizer online: Musikvideo für TikTok, Reels und YouTube erstellen. Track laden, Visualisierung wählen, Text oder Bild ergänzen, als MP4 exportieren.',
  canonical: `${SITE_BASE}/`,
  robots: 'index, follow',
  en: {
    title: 'Music Visualizer Video Maker – Audio Visualizer Online',
    description:
      'Online music visualizer video maker: turn a song into a video for TikTok, Reels and YouTube. Load a track, pick a visualizer, add text or images, export as MP4.',
  },
  // FAQ ist nur hier sichtbar → FAQ-JSON-LD nur hier (siehe seoHead.ts)
  faq: true,
}

export const internalSeo: RouteHeadMeta = {
  title: 'Audio Visualizer Pro – Interner Bereich',
  description: 'Interner Bereich des Audio Visualizer Pro.',
  canonical: `${SITE_BASE}/internal`,
  robots: 'noindex, nofollow',
}

export const blogSeo: RouteHeadMeta = {
  title: 'Funktionen – Audio Visualizer Pro',
  description:
    'Alle Funktionen des Audio Visualizer Pro im Überblick: 169 Visualizer, Multi-Layer, Bild-Slideshow, Text- und Lauftext-Effekte, audio-reaktive Bilder und MP4-/GIF-Export.',
  canonical: `${SITE_BASE}/blog`,
  robots: 'index, follow',
  en: {
    title: 'Features – Audio Visualizer Pro',
    description:
      'All Audio Visualizer Pro features at a glance: 169 visualizers, multi-layer, image slideshow, text and ticker effects, audio-reactive images and MP4/GIF export.',
  },
}

export const appSeo: RouteHeadMeta = {
  title: 'Audio Visualizer Pro – App: Musik visualisieren & als MP4 exportieren',
  description:
    'Audio Visualizer Pro direkt im Browser starten: Audio hochladen, aus 169 Visualizern wählen, Text und Bilder platzieren und das Ergebnis als MP4 exportieren – ohne Installation.',
  canonical: `${SITE_BASE}/app`,
  robots: 'index, follow',
  en: {
    title: 'Audio Visualizer Pro – App: Visualize Music & Export as MP4',
    description:
      'Launch Audio Visualizer Pro in your browser: upload audio, pick from 169 visualizers, place text and images and export the result as MP4 – no installation needed.',
  },
}
