/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { renderStaticLocaleHtml, staticLocaleFileName } from './src/lib/staticLocaleHtml'
import { SITE_BASE, appSeo, blogSeo, internalSeo, landingSeo } from './src/router/routeSeo'

/**
 * Schreibt nach dem Build für jede indexierbare Seite mit englischen Texten eine
 * englische HTML-Variante neben index.html (index.en.html, blog.en.html,
 * app.en.html). nginx liefert sie bei ?lang=en aus (siehe docs/SEO-LANG-EN.md).
 * Dazu blog.de.html für die deutsche Unterseite /blog (eigener Kopf).
 * index.html selbst bleibt unverändert (Deutsch, Fallback für alle Routen).
 */
function staticLocalePages(): Plugin {
  return {
    name: 'visualizer:static-locale-pages',
    apply: 'build',
    async writeBundle(options) {
      const outDir = options.dir ?? 'dist'
      const html = await readFile(join(outDir, 'index.html'), 'utf8')
      for (const meta of [landingSeo, blogSeo, appSeo, internalSeo]) {
        if (!meta.en || !meta.canonical || /\bnoindex\b/i.test(meta.robots ?? '')) continue
        const file = staticLocaleFileName(meta.canonical, SITE_BASE, 'en')
        await writeFile(join(outDir, file), renderStaticLocaleHtml(html, meta, 'en'))
      }
      // Deutsche Unterseite /blog: eigener Kopf (Titel, Canonical auf /visualizer/blog)
      // statt der index.html der Startseite. /app bleibt bewusst bei index.html.
      for (const meta of [blogSeo]) {
        const file = staticLocaleFileName(meta.canonical!, SITE_BASE, 'de')
        await writeFile(join(outDir, file), renderStaticLocaleHtml(html, meta, 'de'))
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // FÜR LOKALES TESTING: base: '/'
  // FÜR DEPLOYMENT: base: '/visualizer/'
  base: process.env.NODE_ENV === 'production' ? '/visualizer/' : '/',

  plugins: [vue(), staticLocalePages()],

  // Font-Dateien aus public/fonts werden im Build auf den gemeinsamen
  // Font-Ordner der Domain (/fonts/, nicht /visualizer/fonts/) verwiesen –
  // betrifft url() in CSS und den Preload in index.html. JS nutzt fontUrl.js.
  experimental: {
    renderBuiltUrl(filename, { type }) {
      if (type === 'public' && filename.replace(/^\//, '').startsWith('fonts/')) {
        return '/' + filename.replace(/^\//, '')
      }
    },
  },

  // Vitest: Komponententests brauchen eine DOM-Umgebung; Playwright-Specs in
  // e2e/ dürfen nicht von Vitest eingesammelt werden.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{js,ts}', 'server/**/*.spec.js', 'electron/**/*.spec.js'],
  },

  build: {
    // Stelle sicher, dass Assets korrekt kopiert werden
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Code-Splitting: Große Dependencies in separate Chunks auslagern
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue-Ecosystem in separaten Chunk
            if (
              id.includes('/vue@') ||
              id.includes('/vue-router@') ||
              id.includes('/pinia@') ||
              id.includes('/@vue/')
            ) {
              return 'vue-vendor'
            }
            // Lodash separat
            if (id.includes('/lodash-es@') || id.includes('/lodash-es/')) {
              return 'lodash'
            }
          }
        },
        assetFileNames: (assetInfo) => {
          // Fonts in separaten fonts/ Ordner
          if (assetInfo.name && assetInfo.name.endsWith('.woff2')) {
            return 'fonts/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
