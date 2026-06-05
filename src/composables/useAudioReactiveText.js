import { ref } from 'vue'

const AUDIO_EFFECTS_PRESET_KEY = 'visualizer_audio_effects_preset'

export function useAudioReactiveText(selectedText, canvasManager, toastStore) {
  const hasAudioEffectsPreset = ref(false)

  function updateText() {
    if (canvasManager.value && canvasManager.value.redrawCallback) {
      canvasManager.value.redrawCallback()
    }
  }

  // ✨ Audio-Reaktive Effekte aktivieren/deaktivieren
  function toggleAudioReactive() {
    if (selectedText.value) {
      // Initialisiere audioReactive wenn nicht vorhanden
      if (!selectedText.value.audioReactive) {
        selectedText.value.audioReactive = {
          enabled: false,
          source: 'bass',
          smoothing: 50,
          threshold: 0,
          attack: 90,
          release: 50,
          effects: {
            hue: { enabled: false, intensity: 80 },
            brightness: { enabled: false, intensity: 80 },
            scale: { enabled: false, intensity: 80 },
            glow: { enabled: false, intensity: 80 },
            shake: { enabled: false, intensity: 80 },
            bounce: { enabled: false, intensity: 80 },
            swing: { enabled: false, intensity: 80 },
            opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
            letterSpacing: { enabled: false, intensity: 80 },
            strokeWidth: { enabled: false, intensity: 80 },
          },
        }
      }
      selectedText.value.audioReactive.enabled = !selectedText.value.audioReactive.enabled
      updateText()
    }
  }

  // ✨ Audio-Presets anwenden
  function applyAudioPreset(presetName) {
    if (!selectedText.value?.audioReactive) return

    const presets = {
      punchy: {
        threshold: 10,
        attack: 95,
        release: 70,
        smoothing: 20,
      },
      smooth: {
        threshold: 5,
        attack: 50,
        release: 30,
        smoothing: 70,
      },
      subtle: {
        threshold: 15,
        attack: 60,
        release: 40,
        smoothing: 60,
      },
      extreme: {
        threshold: 0,
        attack: 100,
        release: 85,
        smoothing: 10,
      },
    }

    const preset = presets[presetName]
    if (preset) {
      selectedText.value.audioReactive.threshold = preset.threshold
      selectedText.value.audioReactive.attack = preset.attack
      selectedText.value.audioReactive.release = preset.release
      selectedText.value.audioReactive.smoothing = preset.smoothing
      updateText()
      console.log(`🎛️ Audio-Preset "${presetName}" angewendet`)
    }
  }

  // ✨ Audio-Einstellungen zurücksetzen
  function resetAudioSettings() {
    if (!selectedText.value?.audioReactive) return

    selectedText.value.audioReactive.threshold = 0
    selectedText.value.audioReactive.attack = 90
    selectedText.value.audioReactive.release = 50
    selectedText.value.audioReactive.smoothing = 50

    // Auch Opacity-spezifische Einstellungen zurücksetzen
    if (selectedText.value.audioReactive.effects?.opacity) {
      selectedText.value.audioReactive.effects.opacity.minimum = 0
      selectedText.value.audioReactive.effects.opacity.ease = false
    }

    updateText()
    console.log('🔄 Audio-Einstellungen zurückgesetzt')
  }

  // ✨ Alle Audio-Effekte zurücksetzen
  function resetAllAudioEffects() {
    if (!selectedText.value?.audioReactive?.effects) return

    const effects = selectedText.value.audioReactive.effects

    // Alle Effekte deaktivieren und Intensität zurücksetzen
    const effectKeys = [
      'hue',
      'brightness',
      'scale',
      'glow',
      'shake',
      'bounce',
      'swing',
      'opacity',
      'letterSpacing',
      'strokeWidth',
      'skew',
      'strobe',
      'rgbGlitch',
      'perspective3d',
      'wave',
      'rotation',
      'elastic',
    ]

    effectKeys.forEach((key) => {
      if (effects[key]) {
        effects[key].enabled = false
        effects[key].intensity = 50
        // Reset special properties
        if (key === 'opacity') {
          effects[key].minimum = 0
          effects[key].ease = false
        }
      }
    })

    updateText()
    console.log('🔄 Alle Audio-Effekte zurückgesetzt')
  }

  // Check on mount if preset exists
  function checkAudioEffectsPreset() {
    try {
      const saved = localStorage.getItem(AUDIO_EFFECTS_PRESET_KEY)
      hasAudioEffectsPreset.value = !!saved
    } catch (e) {
      hasAudioEffectsPreset.value = false
    }
  }

  function saveAudioEffectsPreset() {
    if (!selectedText.value?.audioReactive) {
      toastStore.warning('Keine Effekte zum Speichern')
      return
    }

    try {
      const preset = {
        source: selectedText.value.audioReactive.source,
        smoothing: selectedText.value.audioReactive.smoothing,
        threshold: selectedText.value.audioReactive.threshold,
        attack: selectedText.value.audioReactive.attack,
        release: selectedText.value.audioReactive.release,
        effects: JSON.parse(JSON.stringify(selectedText.value.audioReactive.effects)),
      }

      localStorage.setItem(AUDIO_EFFECTS_PRESET_KEY, JSON.stringify(preset))
      hasAudioEffectsPreset.value = true
      toastStore.success('Audio-Effekte gespeichert')
      console.log('💾 Audio-Effekte Preset gespeichert')
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Presets:', error)
      toastStore.error('Fehler beim Speichern')
    }
  }

  function loadAudioEffectsPreset() {
    if (!selectedText.value?.audioReactive) {
      toastStore.warning('Bitte wähle zuerst einen Text aus')
      return
    }

    try {
      const saved = localStorage.getItem(AUDIO_EFFECTS_PRESET_KEY)
      if (!saved) {
        toastStore.warning('Kein Preset gespeichert')
        return
      }

      const preset = JSON.parse(saved)

      // Apply preset to current text
      selectedText.value.audioReactive.enabled = true
      selectedText.value.audioReactive.source = preset.source || 'bass'
      selectedText.value.audioReactive.smoothing = preset.smoothing || 50
      selectedText.value.audioReactive.threshold = preset.threshold || 0
      selectedText.value.audioReactive.attack = preset.attack || 90
      selectedText.value.audioReactive.release = preset.release || 50

      // Deep copy effects
      if (preset.effects) {
        Object.keys(preset.effects).forEach((key) => {
          if (selectedText.value.audioReactive.effects[key]) {
            Object.assign(selectedText.value.audioReactive.effects[key], preset.effects[key])
          }
        })
      }

      updateText()
      toastStore.success('Audio-Effekte geladen')
      console.log('📂 Audio-Effekte Preset geladen')
    } catch (error) {
      console.error('❌ Fehler beim Laden des Presets:', error)
      toastStore.error('Fehler beim Laden')
    }
  }

  return {
    hasAudioEffectsPreset,
    toggleAudioReactive,
    applyAudioPreset,
    resetAudioSettings,
    resetAllAudioEffects,
    checkAudioEffectsPreset,
    saveAudioEffectsPreset,
    loadAudioEffectsPreset,
  }
}
