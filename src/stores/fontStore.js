// src/stores/fontStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { FontManager } from '../lib/fontManager.js';
import { CUSTOM_FONTS } from '../lib/fonts.js';

export const useFontStore = defineStore('fonts', () => {
  const fontManager = new FontManager();
  const availableFonts = ref([]);
  const isInitialized = ref(false);

  async function initialize() {
    if (isInitialized.value) return;
    await fontManager.initialize(CUSTOM_FONTS);
    availableFonts.value = fontManager.getAvailableFonts();
    isInitialized.value = true;
    console.log('FontStore initialisiert:', availableFonts.value.length, 'Schriftarten geladen.');
  }

  return { availableFonts, isInitialized, initialize, fontManager };
});
