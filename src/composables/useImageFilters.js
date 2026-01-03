/**
 * useImageFilters Composable
 * Verwaltet Bild-Filter: Helligkeit, Kontrast, Sättigung, Schatten, Rotation, Kontur
 */
import { ref, watch } from 'vue';

// Standard-Filter-Einstellungen
const DEFAULT_SETTINGS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  borderColor: '#ffffff',
  borderWidth: 0,
  borderOpacity: 100
};

export function useImageFilters(fotoManagerRef, currentActiveImage) {
  // Refs für UI-Elemente
  const brightnessInputRef = ref(null);
  const brightnessValueRef = ref(null);
  const contrastInputRef = ref(null);
  const contrastValueRef = ref(null);
  const saturationInputRef = ref(null);
  const saturationValueRef = ref(null);
  const opacityInputRef = ref(null);
  const opacityValueRef = ref(null);
  const blurInputRef = ref(null);
  const blurValueRef = ref(null);
  const hueRotateInputRef = ref(null);
  const hueRotateValueRef = ref(null);

  // Flip-Status
  const flipHRef = ref(false);
  const flipVRef = ref(false);

  // Schatten-Refs
  const shadowColorInputRef = ref(null);
  const shadowColorTextRef = ref(null);
  const shadowBlurInputRef = ref(null);
  const shadowBlurValueRef = ref(null);
  const shadowOffsetXInputRef = ref(null);
  const shadowOffsetXValueRef = ref(null);
  const shadowOffsetYInputRef = ref(null);
  const shadowOffsetYValueRef = ref(null);
  const rotationInputRef = ref(null);
  const rotationValueRef = ref(null);

  // Kontur-Refs
  const borderWidthInputRef = ref(null);
  const borderWidthValueRef = ref(null);
  const borderColorInputRef = ref(null);
  const borderColorTextRef = ref(null);
  const borderOpacityInputRef = ref(null);
  const borderOpacityValueRef = ref(null);

  // Preset-Ref
  const presetSelectRef = ref(null);
  const presets = ref([]);

  // Trigger einen Redraw
  function triggerRedraw() {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {});
    }
  }

  // Aktualisiert die Einstellungen des aktiven Bildes
  function updateActiveImageSetting(property, value) {
    if (!currentActiveImage.value) {
      console.warn('⚠️ Kein aktives Bild zum Anwenden der Filter');
      return;
    }

    const imgData = currentActiveImage.value;

    if (!imgData.fotoSettings) {
      imgData.fotoSettings = { ...DEFAULT_SETTINGS };
    }

    imgData.fotoSettings[property] = value;
    console.log(`✏️ Filter aktualisiert: ${property} = ${value}`);
    triggerRedraw();
  }

  // Filter-Handler
  function onBrightnessChange(event) {
    const value = parseInt(event.target.value);
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = value + '%';
    updateActiveImageSetting('brightness', value);
  }

  function onContrastChange(event) {
    const value = parseInt(event.target.value);
    if (contrastValueRef.value) contrastValueRef.value.textContent = value + '%';
    updateActiveImageSetting('contrast', value);
  }

  function onSaturationChange(event) {
    const value = parseInt(event.target.value);
    if (saturationValueRef.value) saturationValueRef.value.textContent = value + '%';
    updateActiveImageSetting('saturation', value);
  }

  function onOpacityChange(event) {
    const value = parseInt(event.target.value);
    if (opacityValueRef.value) opacityValueRef.value.textContent = value + '%';
    updateActiveImageSetting('opacity', value);
  }

  function onBlurChange(event) {
    const value = parseInt(event.target.value);
    if (blurValueRef.value) blurValueRef.value.textContent = value + 'px';
    updateActiveImageSetting('blur', value);
  }

  function onHueRotateChange(event) {
    const value = parseInt(event.target.value);
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = value + '°';
    updateActiveImageSetting('hueRotate', value);
  }

  // Flip-Handler
  function onFlipHorizontal() {
    if (!currentActiveImage.value) return;
    const currentValue = currentActiveImage.value.fotoSettings?.flipH || false;
    flipHRef.value = !currentValue;
    updateActiveImageSetting('flipH', !currentValue);
  }

  function onFlipVertical() {
    if (!currentActiveImage.value) return;
    const currentValue = currentActiveImage.value.fotoSettings?.flipV || false;
    flipVRef.value = !currentValue;
    updateActiveImageSetting('flipV', !currentValue);
  }

  // Schatten-Handler
  function onShadowColorChange(event) {
    const value = event.target.value;
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = value;
    updateActiveImageSetting('shadowColor', value);
  }

  function onShadowColorTextChange(event) {
    const value = event.target.value;
    if (shadowColorInputRef.value) shadowColorInputRef.value.value = value;
    updateActiveImageSetting('shadowColor', value);
  }

  function onShadowBlurChange(event) {
    const value = parseInt(event.target.value);
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = value + 'px';
    updateActiveImageSetting('shadowBlur', value);
  }

  function onShadowOffsetXChange(event) {
    const value = parseInt(event.target.value);
    if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = value + 'px';
    updateActiveImageSetting('shadowOffsetX', value);
  }

  function onShadowOffsetYChange(event) {
    const value = parseInt(event.target.value);
    if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = value + 'px';
    updateActiveImageSetting('shadowOffsetY', value);
  }

  function onRotationChange(event) {
    const sliderValue = parseInt(event.target.value);
    const actualRotation = (sliderValue - 50) * 3.6;
    if (rotationValueRef.value) rotationValueRef.value.textContent = Math.round(actualRotation) + '°';
    updateActiveImageSetting('rotation', actualRotation);
  }

  // Kontur-Handler
  function onBorderColorChange(event) {
    const value = event.target.value;
    if (borderColorTextRef.value) borderColorTextRef.value.value = value;
    updateActiveImageSetting('borderColor', value);
  }

  function onBorderColorTextChange(event) {
    const value = event.target.value;
    if (borderColorInputRef.value) borderColorInputRef.value.value = value;
    updateActiveImageSetting('borderColor', value);
  }

  function onBorderWidthChange(event) {
    const value = parseInt(event.target.value);
    if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = value + 'px';
    updateActiveImageSetting('borderWidth', value);
  }

  function onBorderOpacityChange(event) {
    const value = parseInt(event.target.value);
    if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = value + '%';
    updateActiveImageSetting('borderOpacity', value);
  }

  // Preset-Handler
  function onPresetChange(event) {
    const presetId = event.target.value;

    if (!currentActiveImage.value) {
      console.warn('⚠️ Kein aktives Bild für Preset');
      return;
    }

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) {
      console.warn('⚠️ FotoManager nicht verfügbar');
      return;
    }

    if (presetId === '') {
      fotoManager.applyPreset(currentActiveImage.value, 'normal');
    } else {
      fotoManager.applyPreset(currentActiveImage.value, presetId);
    }

    loadImageSettings(currentActiveImage.value);
    console.log('🎨 Preset angewendet:', presetId || 'normal');
  }

  // Alle Filter zurücksetzen
  function resetFilters() {
    if (brightnessInputRef.value) brightnessInputRef.value.value = 100;
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = '100%';
    if (contrastInputRef.value) contrastInputRef.value.value = 100;
    if (contrastValueRef.value) contrastValueRef.value.textContent = '100%';
    if (saturationInputRef.value) saturationInputRef.value.value = 100;
    if (saturationValueRef.value) saturationValueRef.value.textContent = '100%';
    if (opacityInputRef.value) opacityInputRef.value.value = 100;
    if (opacityValueRef.value) opacityValueRef.value.textContent = '100%';
    if (blurInputRef.value) blurInputRef.value.value = 0;
    if (blurValueRef.value) blurValueRef.value.textContent = '0px';
    if (hueRotateInputRef.value) hueRotateInputRef.value.value = 0;
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = '0°';

    if (shadowColorInputRef.value) shadowColorInputRef.value.value = '#000000';
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = '#000000';
    if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = 0;
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = '0px';
    if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = 0;
    if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = '0px';
    if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = 0;
    if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = '0px';
    if (rotationInputRef.value) rotationInputRef.value.value = 50;
    if (rotationValueRef.value) rotationValueRef.value.textContent = '0°';

    flipHRef.value = false;
    flipVRef.value = false;

    if (borderColorInputRef.value) borderColorInputRef.value.value = '#ffffff';
    if (borderColorTextRef.value) borderColorTextRef.value.value = '#ffffff';
    if (borderWidthInputRef.value) borderWidthInputRef.value.value = 0;
    if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = '0px';
    if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = 100;
    if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = '100%';

    if (presetSelectRef.value) presetSelectRef.value.value = '';

    if (currentActiveImage.value) {
      if (!currentActiveImage.value.fotoSettings) {
        currentActiveImage.value.fotoSettings = {};
      }

      Object.assign(currentActiveImage.value.fotoSettings, DEFAULT_SETTINGS);
      triggerRedraw();
    }
  }

  // Lädt die Einstellungen eines Bildes in die UI
  function loadImageSettings(imgData) {
    if (!imgData) {
      console.warn('⚠️ Keine Bilddaten zum Laden');
      return;
    }

    const s = imgData.fotoSettings || imgData.settings || {};

    if (brightnessInputRef.value) brightnessInputRef.value.value = s.brightness || 100;
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = (s.brightness || 100) + '%';

    if (contrastInputRef.value) contrastInputRef.value.value = s.contrast || 100;
    if (contrastValueRef.value) contrastValueRef.value.textContent = (s.contrast || 100) + '%';

    if (saturationInputRef.value) saturationInputRef.value.value = s.saturation || 100;
    if (saturationValueRef.value) saturationValueRef.value.textContent = (s.saturation || 100) + '%';

    if (opacityInputRef.value) opacityInputRef.value.value = s.opacity || 100;
    if (opacityValueRef.value) opacityValueRef.value.textContent = (s.opacity || 100) + '%';

    if (blurInputRef.value) blurInputRef.value.value = s.blur || 0;
    if (blurValueRef.value) blurValueRef.value.textContent = (s.blur || 0) + 'px';

    if (hueRotateInputRef.value) hueRotateInputRef.value.value = s.hueRotate || 0;
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = (s.hueRotate || 0) + '°';

    if (shadowColorInputRef.value) shadowColorInputRef.value.value = s.shadowColor || '#000000';
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = s.shadowColor || '#000000';
    if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = s.shadowBlur || 0;
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = (s.shadowBlur || 0) + 'px';
    if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = s.shadowOffsetX || 0;
    if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = (s.shadowOffsetX || 0) + 'px';
    if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = s.shadowOffsetY || 0;
    if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = (s.shadowOffsetY || 0) + 'px';

    const rotation = s.rotation || 0;
    const sliderValue = Math.round((rotation / 3.6) + 50);
    if (rotationInputRef.value) rotationInputRef.value.value = sliderValue;
    if (rotationValueRef.value) rotationValueRef.value.textContent = Math.round(rotation) + '°';

    flipHRef.value = s.flipH || false;
    flipVRef.value = s.flipV || false;

    if (borderColorInputRef.value) borderColorInputRef.value.value = s.borderColor || '#ffffff';
    if (borderColorTextRef.value) borderColorTextRef.value.value = s.borderColor || '#ffffff';
    if (borderWidthInputRef.value) borderWidthInputRef.value.value = s.borderWidth || 0;
    if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = (s.borderWidth || 0) + 'px';
    if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = s.borderOpacity ?? 100;
    if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = (s.borderOpacity ?? 100) + '%';

    if (presetSelectRef.value) presetSelectRef.value.value = s.preset || '';

    console.log('📥 Filter-Einstellungen geladen:', s);
  }

  // Presets laden
  function loadPresets() {
    const fotoManager = fotoManagerRef?.value;
    if (fotoManager) {
      presets.value = fotoManager.getAvailablePresets();
    }
  }

  return {
    // Refs
    brightnessInputRef,
    brightnessValueRef,
    contrastInputRef,
    contrastValueRef,
    saturationInputRef,
    saturationValueRef,
    opacityInputRef,
    opacityValueRef,
    blurInputRef,
    blurValueRef,
    hueRotateInputRef,
    hueRotateValueRef,
    flipHRef,
    flipVRef,
    shadowColorInputRef,
    shadowColorTextRef,
    shadowBlurInputRef,
    shadowBlurValueRef,
    shadowOffsetXInputRef,
    shadowOffsetXValueRef,
    shadowOffsetYInputRef,
    shadowOffsetYValueRef,
    rotationInputRef,
    rotationValueRef,
    borderWidthInputRef,
    borderWidthValueRef,
    borderColorInputRef,
    borderColorTextRef,
    borderOpacityInputRef,
    borderOpacityValueRef,
    presetSelectRef,
    presets,

    // Methods
    onBrightnessChange,
    onContrastChange,
    onSaturationChange,
    onOpacityChange,
    onBlurChange,
    onHueRotateChange,
    onFlipHorizontal,
    onFlipVertical,
    onShadowColorChange,
    onShadowColorTextChange,
    onShadowBlurChange,
    onShadowOffsetXChange,
    onShadowOffsetYChange,
    onRotationChange,
    onBorderColorChange,
    onBorderColorTextChange,
    onBorderWidthChange,
    onBorderOpacityChange,
    onPresetChange,
    resetFilters,
    loadImageSettings,
    loadPresets,
    updateActiveImageSetting,
    triggerRedraw
  };
}
