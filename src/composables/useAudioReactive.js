/**
 * useAudioReactive Composable
 * Verwaltet Audio-reaktive Effekte: Presets, Effekte, Level-Anzeige
 */
import { ref, computed } from 'vue';

// Audio-Preset-Definitionen
const AUDIO_PRESETS = {
  pulse: {
    effects: { scale: { enabled: true, intensity: 70 }, glow: { enabled: true, intensity: 80 } },
    source: 'bass',
    easing: 'easeOut',
    beatBoost: 1.5,
    smoothing: 60
  },
  dance: {
    effects: { bounce: { enabled: true, intensity: 60 }, swing: { enabled: true, intensity: 50 }, rotation: { enabled: true, intensity: 30 } },
    source: 'mid',
    easing: 'bounce',
    beatBoost: 1.3,
    smoothing: 40
  },
  shake: {
    effects: { shake: { enabled: true, intensity: 80 }, scale: { enabled: true, intensity: 40 } },
    source: 'bass',
    easing: 'punch',
    beatBoost: 2.0,
    smoothing: 20
  },
  glow: {
    effects: { glow: { enabled: true, intensity: 90 }, brightness: { enabled: true, intensity: 50 }, hue: { enabled: true, intensity: 30 } },
    source: 'volume',
    easing: 'easeInOut',
    beatBoost: 1.0,
    smoothing: 70
  },
  strobe: {
    effects: { strobe: { enabled: true, intensity: 85 }, invert: { enabled: true, intensity: 60 } },
    source: 'bass',
    easing: 'linear',
    beatBoost: 2.5,
    smoothing: 10
  },
  glitch: {
    effects: { chromatic: { enabled: true, intensity: 75 }, skew: { enabled: true, intensity: 50 }, shake: { enabled: true, intensity: 40 } },
    source: 'bass',
    easing: 'elastic',
    beatBoost: 2.0,
    smoothing: 25
  }
};

// Liste aller Effektnamen
const EFFECT_NAMES = [
  'hue', 'brightness', 'saturation', 'scale', 'glow', 'border', 'blur', 'rotation',
  'shake', 'bounce', 'swing', 'orbit',
  'figure8', 'wave', 'spiral', 'float',
  'contrast', 'grayscale', 'sepia', 'invert', 'skew', 'strobe', 'chromatic', 'perspective'
];

export function useAudioReactive(fotoManagerRef, currentActiveImage) {
  // Master-Einstellungen Refs
  const audioReactiveEnabledRef = ref(null);
  const audioReactiveSourceRef = ref(null);
  const audioReactiveSmoothingRef = ref(null);
  const audioReactiveSmoothingValueRef = ref(null);
  const audioReactiveEasingRef = ref(null);
  const audioReactiveBeatBoostRef = ref(null);
  const audioReactiveBeatBoostValueRef = ref(null);
  const audioReactivePhaseRef = ref(null);
  const audioReactivePhaseValueRef = ref(null);
  const activeAudioPreset = ref(null);
  const audioLevelBarRef = ref(null);

  let audioLevelAnimationId = null;

  // Gespeicherte Einstellungen
  const savedAudioReactiveSettings = ref(null);
  const hasSavedAudioSettings = computed(() => savedAudioReactiveSettings.value !== null);

  // Effekt-Refs (dynamisch erstellt)
  const effectRefs = {};
  EFFECT_NAMES.forEach(name => {
    effectRefs[`effect${capitalize(name)}EnabledRef`] = ref(null);
    effectRefs[`effect${capitalize(name)}IntensityRef`] = ref(null);
    effectRefs[`effect${capitalize(name)}ValueRef`] = ref(null);
    effectRefs[`effect${capitalize(name)}SourceRef`] = ref(null);
  });

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Master-Toggle für Audio-Reaktiv
  function onAudioReactiveToggle(event) {
    const enabled = event.target.checked;
    updateAudioReactiveSetting('enabled', enabled);

    if (enabled) {
      startAudioLevelIndicator();
    } else {
      stopAudioLevelIndicator();
      activeAudioPreset.value = null;
    }
  }

  // Audio-Quelle ändern
  function onAudioReactiveSourceChange(event) {
    updateAudioReactiveSetting('source', event.target.value);
  }

  // Glättung ändern
  function onAudioReactiveSmoothingChange(event) {
    const value = parseInt(event.target.value);
    if (audioReactiveSmoothingValueRef.value) {
      audioReactiveSmoothingValueRef.value.textContent = value + '%';
    }
    updateAudioReactiveSetting('smoothing', value);
  }

  // Easing-Funktion ändern
  function onAudioReactiveEasingChange(event) {
    updateAudioReactiveSetting('easing', event.target.value);
  }

  // Beat-Boost ändern
  function onAudioReactiveBeatBoostChange(event) {
    const value = parseFloat(event.target.value);
    const displayValue = value <= 1.0 ? 'Aus' : `${Math.round((value - 1) * 100)}%`;
    if (audioReactiveBeatBoostValueRef.value) {
      audioReactiveBeatBoostValueRef.value.textContent = displayValue;
    }
    updateAudioReactiveSetting('beatBoost', value);
  }

  // Phasenversatz ändern
  function onAudioReactivePhaseChange(event) {
    const value = parseInt(event.target.value);
    if (audioReactivePhaseValueRef.value) {
      audioReactivePhaseValueRef.value.textContent = value + '°';
    }
    updateAudioReactiveSetting('phase', value);
  }

  // Preset Toggle
  function toggleAudioPreset(presetName) {
    if (activeAudioPreset.value === presetName) {
      deactivateAudioPreset();
    } else {
      applyAudioPreset(presetName);
    }
  }

  // Preset deaktivieren
  function deactivateAudioPreset() {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const ar = currentActiveImage.value.fotoSettings.audioReactive;

    for (const effectName of Object.keys(ar.effects)) {
      ar.effects[effectName].enabled = false;
    }

    ar.enabled = false;
    activeAudioPreset.value = null;
    console.log('🎵 Audio-Preset deaktiviert');
    loadAudioReactiveSettingsToUI();
  }

  // Preset anwenden
  function applyAudioPreset(presetName) {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);

    const ar = currentActiveImage.value.fotoSettings.audioReactive;
    for (const effectName of Object.keys(ar.effects)) {
      ar.effects[effectName].enabled = false;
    }

    const preset = AUDIO_PRESETS[presetName];
    if (!preset) return;

    ar.enabled = true;
    ar.source = preset.source;
    ar.easing = preset.easing;
    ar.beatBoost = preset.beatBoost;
    ar.smoothing = preset.smoothing;

    for (const [effectName, config] of Object.entries(preset.effects)) {
      if (ar.effects[effectName]) {
        ar.effects[effectName].enabled = config.enabled;
        ar.effects[effectName].intensity = config.intensity;
      }
    }

    activeAudioPreset.value = presetName;
    console.log('🎵 Audio-Preset angewendet:', presetName, preset);
    loadAudioReactiveSettingsToUI();
  }

  // Effekt ein-/ausschalten
  function onEffectToggle(effectName, enabled) {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

    if (audioReactive.effects && audioReactive.effects[effectName]) {
      audioReactive.effects[effectName].enabled = enabled;
      console.log('🎵 Effekt:', effectName, '=', enabled);
    }
  }

  // Effekt-Intensität ändern
  function onEffectIntensityChange(effectName, value) {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

    if (audioReactive.effects && audioReactive.effects[effectName]) {
      audioReactive.effects[effectName].intensity = parseInt(value);
    }

    const valueRef = effectRefs[`effect${capitalize(effectName)}ValueRef`];
    if (valueRef && valueRef.value) {
      valueRef.value.textContent = value + '%';
    }
  }

  // Effekt-Quelle ändern
  function onEffectSourceChange(effectName, value) {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

    if (audioReactive.effects && audioReactive.effects[effectName]) {
      audioReactive.effects[effectName].source = value === '' ? null : value;
    }

    console.log('🎵 Effekt-Quelle geändert:', effectName, '=', value || 'Global');
  }

  // Audio-Reaktiv Master-Einstellung aktualisieren
  function updateAudioReactiveSetting(property, value) {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    currentActiveImage.value.fotoSettings.audioReactive[property] = value;
    console.log('🎵 Audio-Reaktiv:', property, '=', value);
  }

  // Einstellungen speichern
  function saveAudioReactiveSettings() {
    if (!currentActiveImage.value) {
      console.warn('⚠️ Kein aktives Bild zum Speichern');
      return;
    }

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

    savedAudioReactiveSettings.value = JSON.parse(JSON.stringify(audioReactive));

    try {
      localStorage.setItem('visualizer_audioReactivePreset', JSON.stringify(audioReactive));
      console.log('💾 Audio-Reaktiv Einstellungen gespeichert:', savedAudioReactiveSettings.value);
    } catch (e) {
      console.warn('⚠️ Konnte nicht in localStorage speichern:', e);
    }
  }

  // Gespeicherte Einstellungen anwenden
  function applyAudioReactiveSettings() {
    if (!currentActiveImage.value) {
      console.warn('⚠️ Kein aktives Bild zum Anwenden');
      return;
    }

    if (!savedAudioReactiveSettings.value) {
      console.warn('⚠️ Keine gespeicherten Einstellungen vorhanden');
      return;
    }

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const settings = JSON.parse(JSON.stringify(savedAudioReactiveSettings.value));
    currentActiveImage.value.fotoSettings.audioReactive = settings;

    console.log('📋 Audio-Reaktiv Einstellungen angewendet:', settings);
    loadAudioReactiveSettingsToUI();
  }

  // Lädt Audio-Reaktiv Einstellungen in die UI
  function loadAudioReactiveSettingsToUI() {
    if (!currentActiveImage.value) return;

    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) return;

    fotoManager.initializeImageSettings(currentActiveImage.value);
    const audioReactive = currentActiveImage.value.fotoSettings.audioReactive;

    if (audioReactiveEnabledRef.value) {
      audioReactiveEnabledRef.value.checked = audioReactive.enabled || false;
      if (audioReactive.enabled) {
        startAudioLevelIndicator();
      } else {
        stopAudioLevelIndicator();
        activeAudioPreset.value = null;
      }
    }

    if (audioReactiveSourceRef.value) {
      audioReactiveSourceRef.value.value = audioReactive.source || 'bass';
    }

    if (audioReactiveSmoothingRef.value) {
      const smoothing = audioReactive.smoothing ?? 50;
      audioReactiveSmoothingRef.value.value = smoothing;
      if (audioReactiveSmoothingValueRef.value) {
        audioReactiveSmoothingValueRef.value.textContent = smoothing + '%';
      }
    }

    if (audioReactiveEasingRef.value) {
      audioReactiveEasingRef.value.value = audioReactive.easing || 'linear';
    }

    if (audioReactiveBeatBoostRef.value) {
      const beatBoost = audioReactive.beatBoost ?? 1.0;
      audioReactiveBeatBoostRef.value.value = beatBoost;
      if (audioReactiveBeatBoostValueRef.value) {
        const displayValue = beatBoost <= 1.0 ? 'Aus' : `${Math.round((beatBoost - 1) * 100)}%`;
        audioReactiveBeatBoostValueRef.value.textContent = displayValue;
      }
    }

    if (audioReactivePhaseRef.value) {
      const phase = audioReactive.phase ?? 0;
      audioReactivePhaseRef.value.value = phase;
      if (audioReactivePhaseValueRef.value) {
        audioReactivePhaseValueRef.value.textContent = phase + '°';
      }
    }

    const effects = audioReactive.effects || {};
    EFFECT_NAMES.forEach(effectName => {
      const effect = effects[effectName] || { enabled: false, intensity: 80, source: null };
      const enabledRef = effectRefs[`effect${capitalize(effectName)}EnabledRef`];
      const intensityRef = effectRefs[`effect${capitalize(effectName)}IntensityRef`];
      const valueRef = effectRefs[`effect${capitalize(effectName)}ValueRef`];
      const sourceRef = effectRefs[`effect${capitalize(effectName)}SourceRef`];

      if (enabledRef?.value) enabledRef.value.checked = effect.enabled || false;
      if (intensityRef?.value) intensityRef.value.value = effect.intensity ?? 80;
      if (valueRef?.value) valueRef.value.textContent = (effect.intensity ?? 80) + '%';
      if (sourceRef?.value) sourceRef.value.value = effect.source || '';
    });
  }

  // Lädt Audio-Reaktiv Einstellungen
  function loadAudioReactiveSettings(imageData) {
    const loadEffect = (effectName, defaultIntensity = 80) => {
      const effectData = imageData?.fotoSettings?.audioReactive?.effects?.[effectName];
      const enabled = effectData?.enabled || false;
      const intensity = effectData?.intensity ?? defaultIntensity;

      const enabledRef = effectRefs[`effect${capitalize(effectName)}EnabledRef`];
      const intensityRef = effectRefs[`effect${capitalize(effectName)}IntensityRef`];
      const valueRef = effectRefs[`effect${capitalize(effectName)}ValueRef`];

      if (enabledRef?.value) enabledRef.value.checked = enabled;
      if (intensityRef?.value) intensityRef.value.value = intensity;
      if (valueRef?.value) valueRef.value.textContent = intensity + '%';
    };

    if (!imageData?.fotoSettings?.audioReactive) {
      if (audioReactiveEnabledRef.value) audioReactiveEnabledRef.value.checked = false;
      if (audioReactiveSourceRef.value) audioReactiveSourceRef.value.value = 'bass';
      if (audioReactiveSmoothingRef.value) audioReactiveSmoothingRef.value.value = 50;
      if (audioReactiveSmoothingValueRef.value) audioReactiveSmoothingValueRef.value.textContent = '50%';
      if (audioReactiveEasingRef.value) audioReactiveEasingRef.value.value = 'linear';
      if (audioReactiveBeatBoostRef.value) audioReactiveBeatBoostRef.value.value = 1.0;
      if (audioReactiveBeatBoostValueRef.value) audioReactiveBeatBoostValueRef.value.textContent = 'Aus';
      if (audioReactivePhaseRef.value) audioReactivePhaseRef.value.value = 0;
      if (audioReactivePhaseValueRef.value) audioReactivePhaseValueRef.value.textContent = '0°';

      EFFECT_NAMES.forEach(effectName => loadEffect(effectName, 80));
      stopAudioLevelIndicator();
      activeAudioPreset.value = null;
      return;
    }

    const ar = imageData.fotoSettings.audioReactive;

    if (audioReactiveEnabledRef.value) audioReactiveEnabledRef.value.checked = ar.enabled || false;
    if (audioReactiveSourceRef.value) audioReactiveSourceRef.value.value = ar.source || 'bass';
    if (audioReactiveSmoothingRef.value) audioReactiveSmoothingRef.value.value = ar.smoothing || 50;
    if (audioReactiveSmoothingValueRef.value) audioReactiveSmoothingValueRef.value.textContent = (ar.smoothing || 50) + '%';

    if (audioReactiveEasingRef.value) audioReactiveEasingRef.value.value = ar.easing || 'linear';
    if (audioReactiveBeatBoostRef.value) {
      const beatBoost = ar.beatBoost ?? 1.0;
      audioReactiveBeatBoostRef.value.value = beatBoost;
      if (audioReactiveBeatBoostValueRef.value) {
        audioReactiveBeatBoostValueRef.value.textContent = beatBoost <= 1.0 ? 'Aus' : `${Math.round((beatBoost - 1) * 100)}%`;
      }
    }
    if (audioReactivePhaseRef.value) {
      const phase = ar.phase ?? 0;
      audioReactivePhaseRef.value.value = phase;
      if (audioReactivePhaseValueRef.value) {
        audioReactivePhaseValueRef.value.textContent = phase + '°';
      }
    }

    EFFECT_NAMES.forEach(effectName => loadEffect(effectName, 80));

    if (ar.enabled) {
      startAudioLevelIndicator();
    } else {
      stopAudioLevelIndicator();
    }

    activeAudioPreset.value = null;
  }

  // Audio-Level Anzeige starten
  function startAudioLevelIndicator() {
    if (audioLevelAnimationId) return;

    function updateLevel() {
      if (!audioLevelBarRef.value) {
        audioLevelAnimationId = null;
        return;
      }

      const audioData = window.audioAnalysisData;
      if (!audioData) {
        audioLevelAnimationId = requestAnimationFrame(updateLevel);
        return;
      }

      const source = audioReactiveSourceRef.value?.value || 'bass';
      let level = 0;

      switch (source) {
        case 'bass': level = audioData.smoothBass; break;
        case 'mid': level = audioData.smoothMid; break;
        case 'treble': level = audioData.smoothTreble; break;
        case 'volume': level = audioData.smoothVolume; break;
      }

      const percent = Math.min(100, (level / 255) * 100);
      audioLevelBarRef.value.style.width = percent + '%';

      if (percent > 70) {
        audioLevelBarRef.value.style.background = 'linear-gradient(90deg, #4ade80, #fbbf24, #ef4444)';
      } else if (percent > 40) {
        audioLevelBarRef.value.style.background = 'linear-gradient(90deg, #4ade80, #fbbf24)';
      } else {
        audioLevelBarRef.value.style.background = '#4ade80';
      }

      audioLevelAnimationId = requestAnimationFrame(updateLevel);
    }

    updateLevel();
  }

  // Audio-Level Anzeige stoppen
  function stopAudioLevelIndicator() {
    if (audioLevelAnimationId) {
      cancelAnimationFrame(audioLevelAnimationId);
      audioLevelAnimationId = null;
    }
    if (audioLevelBarRef.value) {
      audioLevelBarRef.value.style.width = '0%';
    }
  }

  // Aus localStorage laden
  function loadSavedSettingsFromStorage() {
    try {
      const savedPreset = localStorage.getItem('visualizer_audioReactivePreset');
      if (savedPreset) {
        savedAudioReactiveSettings.value = JSON.parse(savedPreset);
        console.log('📂 Audio-Reaktiv Preset aus localStorage geladen');
      }
    } catch (e) {
      console.warn('⚠️ Konnte Audio-Reaktiv Preset nicht laden:', e);
    }
  }

  return {
    // Master-Refs
    audioReactiveEnabledRef,
    audioReactiveSourceRef,
    audioReactiveSmoothingRef,
    audioReactiveSmoothingValueRef,
    audioReactiveEasingRef,
    audioReactiveBeatBoostRef,
    audioReactiveBeatBoostValueRef,
    audioReactivePhaseRef,
    audioReactivePhaseValueRef,
    activeAudioPreset,
    audioLevelBarRef,

    // State
    savedAudioReactiveSettings,
    hasSavedAudioSettings,

    // Effekt-Refs
    effectRefs,
    EFFECT_NAMES,

    // Methods
    onAudioReactiveToggle,
    onAudioReactiveSourceChange,
    onAudioReactiveSmoothingChange,
    onAudioReactiveEasingChange,
    onAudioReactiveBeatBoostChange,
    onAudioReactivePhaseChange,
    toggleAudioPreset,
    deactivateAudioPreset,
    applyAudioPreset,
    onEffectToggle,
    onEffectIntensityChange,
    onEffectSourceChange,
    saveAudioReactiveSettings,
    applyAudioReactiveSettings,
    loadAudioReactiveSettingsToUI,
    loadAudioReactiveSettings,
    startAudioLevelIndicator,
    stopAudioLevelIndicator,
    loadSavedSettingsFromStorage
  };
}
