import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // FÜR LOKALES TESTING: base: '/'
  // FÜR DEPLOYMENT: base: '/visualizer/'
  base: process.env.NODE_ENV === 'production' ? '/visualizer/' : '/',

  plugins: [vue()],

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
    include: ['src/**/*.spec.js'],
  },

  server: {
    mime: {
      // Setzt den korrekten MIME-Typ für .woff2 Dateien
      '.woff2': 'font/woff2',
    },
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
