// ==========================================================================
// Blog-Beiträge zum Audio Visualizer auf kodinitools.com/blog
//
// Wird auf der Landing-Page (LandingPage.vue, Abschnitt „Blog") als Karten
// angezeigt. Ein neuer Beitrag ist ein weiteres Objekt in `blogArticles`.
// Bilder und URLs zeigen auf die Kodinitools-Home-Seite, damit die Landing-
// Page keine eigenen Kopien der Vorschaubilder braucht.
// ==========================================================================

/**
 * @typedef {{ de: string, en: string }} LocalizedText
 *
 * @typedef {Object} BlogArticle
 * @property {string} id            Eindeutige Kennung (wird als Vue-Key genutzt)
 * @property {string} date          Veröffentlichungsdatum als ISO-Datum (YYYY-MM-DD)
 * @property {number} minutes       Lesezeit in Minuten
 * @property {LocalizedText} tag    Kategorie-Badge
 * @property {LocalizedText} url    Vollständige URL des Beitrags je Sprache
 * @property {LocalizedText} image  Vollständige URL des Vorschaubilds je Sprache
 * @property {LocalizedText} title
 * @property {LocalizedText} description
 */

/** @type {BlogArticle[]} */
export const blogArticles = [
  {
    id: 'visualizer-effekte',
    date: '2026-09-21',
    minutes: 7,
    tag: { de: 'Video', en: 'Video' },
    url: {
      de: 'https://kodinitools.com/blog/visualizer-effekte/',
      en: 'https://kodinitools.com/en/blog/visualizer-effects/',
    },
    image: {
      de: 'https://kodinitools.com/image/visualizer-blog-3.png',
      en: 'https://kodinitools.com/image/visualizer-blog-3.png',
    },
    title: {
      de: 'Visualizer-Effekte: Über 130 Audio-Visualisierungen, Multi-Layer & Beat-Reaktionen im Browser',
      en: 'Visualizer Effects: 130+ Audio Visualizations, Multi-Layer & Beat Reactions in Your Browser',
    },
    description: {
      de: 'GPU-Effekte von Balken über Lichtstrahlen bis Mandala, Portrait-Effekte für eigene Bilder, mehrere Ebenen mit Mischmodi, Beat-Punch und Onset-Reaktionen – kostenlos, ohne Upload.',
      en: 'GPU effects from bars to light rays to mandalas, portrait effects for your own images, multiple layers with blend modes, beat punch and onset reactions — free, no upload.',
    },
  },
  {
    id: 'musik-video-tiktok',
    date: '2026-06-11',
    minutes: 4,
    tag: { de: 'Video', en: 'Video' },
    url: {
      de: 'https://kodinitools.com/blog/musik-video-tiktok/',
      en: 'https://kodinitools.com/en/blog/music-video-tiktok-free/',
    },
    image: {
      de: 'https://kodinitools.com/image/visualizer-blog-de.png',
      en: 'https://kodinitools.com/image/visualizer-blog-en.png',
    },
    title: {
      de: 'Musik-Video für TikTok erstellen: Kostenlos & ohne App',
      en: 'How to Create a Music Video for TikTok Free (No App)',
    },
    description: {
      de: 'Audio Visualizer im Browser nutzen – MP4-Export im Hochformat 9:16 für TikTok und Reels.',
      en: 'Use the Audio Visualizer in your browser — MP4 export in vertical 9:16 format for TikTok and Reels.',
    },
  },
]

/**
 * Liefert die Beiträge nach Datum absteigend (neuester zuerst), unabhängig
 * von der Reihenfolge im Array.
 * @returns {BlogArticle[]}
 */
export function getBlogArticlesNewestFirst() {
  return [...blogArticles].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
