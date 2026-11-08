import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'

// Bestehende SFCs sind JavaScript, neue und migrierte Dateien TypeScript (lang="ts").
// Muster wie im Modernen Musikplayer.
configureVueProject({ scriptLangs: ['ts', 'js'] })

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  // Browser globals for Vue/frontend source files
  {
    files: ['src/**/*.{js,mjs,jsx,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Node.js globals for server, scripts, config and root-level test files
  {
    files: [
      'server/**/*.{js,mjs}',
      'scripts/**/*.{js,mjs}',
      '*.config.{js,mjs,cjs,ts}',
      '*.config.cjs',
      'test-*.mjs',
      'src/workers/**/*.{js,mjs,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    // Relax attribute-order to warning only (still useful but not blocking)
    rules: {
      'vue/attributes-order': 'warn',
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },

  ...pluginOxlint.configs['flat/recommended'],
  skipFormatting,
)
