import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

// Vordefinierte Farboptionen für Bildabschnitte
const defaultColorOptions = [
  { id: 'blue', name: 'Blau', color: '#6ea8fe', gradient: 'linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%)' },
  { id: 'purple', name: 'Lila', color: '#9c7cf4', gradient: 'linear-gradient(135deg, #9c7cf4 0%, #7c5ce0 100%)' },
  { id: 'green', name: 'Grün', color: '#4ade80', gradient: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' },
  { id: 'orange', name: 'Orange', color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)' },
  { id: 'pink', name: 'Pink', color: '#f472b6', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
  { id: 'cyan', name: 'Cyan', color: '#22d3ee', gradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)' },
  { id: 'yellow', name: 'Gelb', color: '#facc15', gradient: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' },
  { id: 'red', name: 'Rot', color: '#f87171', gradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' },
];

const STORAGE_KEY = 'visualizer-panel-settings';

// Einstellungen aus localStorage laden
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Panel-Einstellungen:', e);
  }
  return null;
}

// Einstellungen in localStorage speichern
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Fehler beim Speichern der Panel-Einstellungen:', e);
  }
}

export const usePanelSettingsStore = defineStore('panelSettings', () => {
  // Gespeicherte Einstellungen laden
  const savedSettings = loadSettings();

  // Zustand (State)
  const colorOptions = ref(defaultColorOptions);
  const selectedImageSectionColorId = ref(savedSettings?.imageSectionColorId || 'blue');
  const customColor = ref(savedSettings?.customColor || '#6ea8fe');
  const useCustomColor = ref(savedSettings?.useCustomColor || false);

  // Berechnete Werte
  function getSelectedColor() {
    if (useCustomColor.value) {
      return {
        id: 'custom',
        name: 'Benutzerdefiniert',
        color: customColor.value,
        gradient: `linear-gradient(135deg, ${customColor.value} 0%, ${adjustColor(customColor.value, -20)} 100%)`
      };
    }
    return colorOptions.value.find(c => c.id === selectedImageSectionColorId.value) || colorOptions.value[0];
  }

  // Hilfsfunktion: Farbe anpassen (dunkler/heller)
  function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  // Aktionen
  function setImageSectionColor(colorId) {
    selectedImageSectionColorId.value = colorId;
    useCustomColor.value = false;
    persistSettings();
  }

  function setCustomColor(color) {
    customColor.value = color;
    useCustomColor.value = true;
    persistSettings();
  }

  function toggleCustomColor(enabled) {
    useCustomColor.value = enabled;
    persistSettings();
  }

  function persistSettings() {
    saveSettings({
      imageSectionColorId: selectedImageSectionColorId.value,
      customColor: customColor.value,
      useCustomColor: useCustomColor.value
    });
  }

  // CSS-Variablen auf dem Root-Element setzen
  function applyColorToCSS() {
    const selectedColor = getSelectedColor();
    document.documentElement.style.setProperty('--image-section-accent', selectedColor.color);
    document.documentElement.style.setProperty('--image-section-gradient', selectedColor.gradient);
    document.documentElement.style.setProperty('--image-section-accent-rgb', hexToRgb(selectedColor.color));
  }

  // Hilfsfunktion: Hex zu RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '110, 168, 254'; // Fallback
  }

  // Farbe initial anwenden
  applyColorToCSS();

  // Bei Änderungen automatisch CSS aktualisieren
  watch([selectedImageSectionColorId, customColor, useCustomColor], () => {
    applyColorToCSS();
  });

  return {
    colorOptions,
    selectedImageSectionColorId,
    customColor,
    useCustomColor,
    getSelectedColor,
    setImageSectionColor,
    setCustomColor,
    toggleCustomColor,
    applyColorToCSS,
  };
});
