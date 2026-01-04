import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  // FÜR LOKALES TESTING: base: '/'
  // FÜR DEPLOYMENT: base: '/visualizer/'
  base: process.env.NODE_ENV === 'production' ? '/visualizer/' : '/',
  
  plugins: [vue()],
  
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
        manualChunks: {
          // Vue-Ecosystem in separaten Chunk
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // Lodash separat (oft groß)
          'lodash': ['lodash-es']
        },
        assetFileNames: (assetInfo) => {
          // Fonts in separaten fonts/ Ordner
          if (assetInfo.name && assetInfo.name.endsWith('.woff2')) {
            return 'fonts/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
