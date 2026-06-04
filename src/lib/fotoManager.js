// fotoManager.js

/**
 * Verwaltet Bildbearbeitung: Filter, Helligkeit, Kontrast, Transparenz, Schatten, Rotation
 * Unterstützt normale Bilder, Hintergründe und Workspace-Hintergründe
 */
export class FotoManager {
  constructor(redrawCallback) {
    this.redrawCallback = redrawCallback

    // Standardwerte für Bildbearbeitung
    this.defaultSettings = {
      brightness: 100, // 0-200%
      contrast: 100, // 0-200%
      saturation: 100, // 0-200%
      opacity: 100, // 0-100%
      blur: 0, // 0-20px
      hueRotate: 0, // 0-360°
      grayscale: 0, // 0-100%
      sepia: 0, // 0-100%
      invert: 0, // 0-100%

      // ✨ NEUE SCHATTEN-EINSTELLUNGEN
      shadowColor: '#000000', // Schattenfarbe
      shadowBlur: 0, // 0-50px Unschärfe
      shadowOffsetX: 0, // -50 bis +50px
      shadowOffsetY: 0, // -50 bis +50px

      // ✨ ROTATION
      rotation: 0, // 0-360° Bildrotation

      // ✨ SPIEGELN (Flip)
      flipH: false, // Horizontal spiegeln
      flipV: false, // Vertikal spiegeln

      // ✨ BILDKONTUR (Border/Outline)
      borderWidth: 0, // 0-50px Konturbreite
      borderColor: '#ffffff', // Konturfarbe
      borderOpacity: 100, // 0-100% Konturtransparenz

      // ✨ VISUALIZER-LAYER
      renderBehindVisualizer: false, // true = Bild wird hinter dem Visualizer gerendert

      // ✨ AUDIO-REAKTIV (Musik-Synchronisierung) - MEHRERE EFFEKTE GLEICHZEITIG
      audioReactive: {
        enabled: false, // Audio-Reaktivität aktiviert
        // Individuelle Effekte mit eigenem Toggle, Intensität und optionaler Quelle
        // source: null = globale Quelle verwenden, sonst individuelle Quelle
        effects: {
          hue: { enabled: false, intensity: 80, source: null },
          brightness: { enabled: false, intensity: 80, source: null },
          saturation: { enabled: false, intensity: 80, source: null },
          scale: { enabled: false, intensity: 80, source: null },
          glow: { enabled: false, intensity: 80, source: null },
          border: { enabled: false, intensity: 80, source: null },
          blur: { enabled: false, intensity: 50, source: null },
          rotation: { enabled: false, intensity: 50, source: null },
          shake: { enabled: false, intensity: 50, source: null },
          bounce: { enabled: false, intensity: 50, source: null },
          swing: { enabled: false, intensity: 50, source: null },
          orbit: { enabled: false, intensity: 50, source: null },
          // ✨ NEUE BEWEGUNGSPFADE
          figure8: { enabled: false, intensity: 50, source: null },
          wave: { enabled: false, intensity: 50, source: null },
          spiral: { enabled: false, intensity: 50, source: null },
          float: { enabled: false, intensity: 50, source: null },
          // ✨ NEUE EFFEKTE
          contrast: { enabled: false, intensity: 60, source: null },
          grayscale: { enabled: false, intensity: 80, source: null },
          sepia: { enabled: false, intensity: 70, source: null },
          invert: { enabled: false, intensity: 50, source: null },
          skew: { enabled: false, intensity: 40, source: null },
          strobe: { enabled: false, intensity: 70, source: null },
          chromatic: { enabled: false, intensity: 60, source: null },
          perspective: { enabled: false, intensity: 50, source: null },
        },
        source: 'bass', // 'bass', 'mid', 'treble', 'volume', 'dynamic' (globale Standard-Quelle)
        smoothing: 50, // 0-100% Glättung (verhindert Flackern)
        // ✨ NEU: Erweiterte Steuerung
        easing: 'linear', // 'linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic', 'punch'
        phase: 0, // 0-360° Phasenversatz für Kaskaden-Effekte
        beatBoost: 1.0, // 1.0-3.0 Beat-Verstärkung (1.0 = aus)
      },
    }
  }

  /**
   * NEU: Prüft ob ein Objekt ein Bild oder Video ist
   * ✨ ERWEITERT: Unterstützt Bilder, Videos und Video-Hintergründe
   */
  _isImageObject(obj) {
    if (!obj) return false
    return (
      obj.type === 'image' ||
      obj.type === 'background' ||
      obj.type === 'workspace-background' ||
      obj.type === 'video' ||
      obj.type === 'video-background' ||
      obj.type === 'workspace-video-background'
    )
  }

  /**
   * Erstellt eine tiefe Kopie der audioReactive-Einstellungen
   */
  _deepCopyAudioReactive() {
    const defaultAR = this.defaultSettings.audioReactive
    return {
      enabled: defaultAR.enabled,
      effects: {
        hue: { ...defaultAR.effects.hue },
        brightness: { ...defaultAR.effects.brightness },
        saturation: { ...defaultAR.effects.saturation },
        scale: { ...defaultAR.effects.scale },
        glow: { ...defaultAR.effects.glow },
        border: { ...defaultAR.effects.border },
        blur: { ...defaultAR.effects.blur },
        rotation: { ...defaultAR.effects.rotation },
        shake: { ...defaultAR.effects.shake },
        bounce: { ...defaultAR.effects.bounce },
        swing: { ...defaultAR.effects.swing },
        orbit: { ...defaultAR.effects.orbit },
        // ✨ BEWEGUNGSPFADE
        figure8: { ...defaultAR.effects.figure8 },
        wave: { ...defaultAR.effects.wave },
        spiral: { ...defaultAR.effects.spiral },
        float: { ...defaultAR.effects.float },
        // ✨ NEUE EFFEKTE
        contrast: { ...defaultAR.effects.contrast },
        grayscale: { ...defaultAR.effects.grayscale },
        sepia: { ...defaultAR.effects.sepia },
        invert: { ...defaultAR.effects.invert },
        skew: { ...defaultAR.effects.skew },
        strobe: { ...defaultAR.effects.strobe },
        chromatic: { ...defaultAR.effects.chromatic },
        perspective: { ...defaultAR.effects.perspective },
      },
      source: defaultAR.source,
      smoothing: defaultAR.smoothing,
      // ✨ NEU: Erweiterte Steuerung
      easing: defaultAR.easing,
      phase: defaultAR.phase,
      beatBoost: defaultAR.beatBoost,
    }
  }

  /**
   * Migriert alte audioReactive-Struktur (einzelner Effekt) zur neuen (mehrere Effekte)
   * ✨ NEU: Unterstützt individuelle Quellen pro Effekt
   */
  _migrateAudioReactiveSettings(oldSettings) {
    if (!oldSettings) return this._deepCopyAudioReactive()

    // Helper: Migriert einen einzelnen Effekt mit source-Unterstützung
    const migrateEffect = (oldEffect, defaultIntensity = 80) => {
      if (!oldEffect) return { enabled: false, intensity: defaultIntensity, source: null }
      return {
        enabled: oldEffect.enabled ?? false,
        intensity: oldEffect.intensity ?? defaultIntensity,
        source: oldEffect.source ?? null, // null = globale Quelle verwenden
      }
    }

    // Falls bereits neue Struktur vorhanden
    if (oldSettings.effects) {
      // Deep copy der existierenden Struktur mit source-Migration
      return {
        enabled: oldSettings.enabled ?? false,
        effects: {
          hue: migrateEffect(oldSettings.effects.hue, 80),
          brightness: migrateEffect(oldSettings.effects.brightness, 80),
          saturation: migrateEffect(oldSettings.effects.saturation, 80),
          scale: migrateEffect(oldSettings.effects.scale, 80),
          glow: migrateEffect(oldSettings.effects.glow, 80),
          border: migrateEffect(oldSettings.effects.border, 80),
          blur: migrateEffect(oldSettings.effects.blur, 50),
          rotation: migrateEffect(oldSettings.effects.rotation, 50),
          shake: migrateEffect(oldSettings.effects.shake, 50),
          bounce: migrateEffect(oldSettings.effects.bounce, 50),
          swing: migrateEffect(oldSettings.effects.swing, 50),
          orbit: migrateEffect(oldSettings.effects.orbit, 50),
          // ✨ NEUE BEWEGUNGSPFADE (mit Migration)
          figure8: migrateEffect(oldSettings.effects.figure8, 50),
          wave: migrateEffect(oldSettings.effects.wave, 50),
          spiral: migrateEffect(oldSettings.effects.spiral, 50),
          float: migrateEffect(oldSettings.effects.float, 50),
          // ✨ NEUE EFFEKTE (mit Migration)
          contrast: migrateEffect(oldSettings.effects.contrast, 60),
          grayscale: migrateEffect(oldSettings.effects.grayscale, 80),
          sepia: migrateEffect(oldSettings.effects.sepia, 70),
          invert: migrateEffect(oldSettings.effects.invert, 50),
          skew: migrateEffect(oldSettings.effects.skew, 40),
          strobe: migrateEffect(oldSettings.effects.strobe, 70),
          chromatic: migrateEffect(oldSettings.effects.chromatic, 60),
          perspective: migrateEffect(oldSettings.effects.perspective, 50),
        },
        source: oldSettings.source || 'bass',
        smoothing: oldSettings.smoothing ?? 50,
        // ✨ NEU: Erweiterte Steuerung (mit Migration)
        easing: oldSettings.easing || 'linear',
        phase: oldSettings.phase ?? 0,
        beatBoost: oldSettings.beatBoost ?? 1.0,
      }
    }

    // Migration von alter Struktur (einzelner Effekt)
    const newSettings = this._deepCopyAudioReactive()
    newSettings.enabled = oldSettings.enabled ?? false
    newSettings.source = oldSettings.source || 'bass'
    newSettings.smoothing = oldSettings.smoothing ?? 50
    newSettings.easing = oldSettings.easing || 'linear'
    newSettings.phase = oldSettings.phase ?? 0
    newSettings.beatBoost = oldSettings.beatBoost ?? 1.0

    // Alten einzelnen Effekt in neuer Struktur aktivieren
    if (oldSettings.effect && oldSettings.enabled) {
      const effectName = oldSettings.effect
      if (newSettings.effects[effectName]) {
        newSettings.effects[effectName].enabled = true
        newSettings.effects[effectName].intensity = oldSettings.intensity ?? 80
      }
    }

    return newSettings
  }

  /**
   * Initialisiert die Bildbearbeitungs-Einstellungen für ein Bild
   * ✅ FIX: Deep copy für audioReactive um geteilte Referenzen zu vermeiden
   * ✅ NEU: Unterstützt Migration von alter zu neuer Struktur
   * ✅ FIX: Fügt fehlende Effekte zu existierenden Einstellungen hinzu
   */
  initializeImageSettings(imageObject) {
    if (!imageObject.fotoSettings) {
      imageObject.fotoSettings = {
        ...this.defaultSettings,
        // Deep copy für audioReactive - jedes Bild bekommt eigene Einstellungen
        audioReactive: this._deepCopyAudioReactive(),
      }
    } else if (!imageObject.fotoSettings.audioReactive) {
      // Falls fotoSettings existiert aber audioReactive fehlt
      imageObject.fotoSettings.audioReactive = this._deepCopyAudioReactive()
    } else if (!imageObject.fotoSettings.audioReactive.effects) {
      // Migration: Alte Struktur zu neuer Struktur
      imageObject.fotoSettings.audioReactive = this._migrateAudioReactiveSettings(
        imageObject.fotoSettings.audioReactive,
      )
    } else {
      // ✅ FIX: Füge fehlende Effekte hinzu (für neue Effekte die später hinzugefügt wurden)
      const defaultEffects = this._deepCopyAudioReactive().effects
      const existingEffects = imageObject.fotoSettings.audioReactive.effects

      for (const [effectName, defaultConfig] of Object.entries(defaultEffects)) {
        if (!existingEffects[effectName]) {
          existingEffects[effectName] = { ...defaultConfig }
        } else if (existingEffects[effectName].source === undefined) {
          // Füge source hinzu wenn es fehlt
          existingEffects[effectName].source = null
        }
      }
    }
  }

  /**
   * Aktualisiert eine Einstellung für ein bestimmtes Bild
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   */
  updateSetting(imageObject, property, value) {
    if (!this._isImageObject(imageObject)) return

    this.initializeImageSettings(imageObject)
    imageObject.fotoSettings[property] = value

    this.redrawCallback?.()
  }

  /**
   * Setzt alle Einstellungen eines Bildes zurück
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   * ✅ FIX: Deep copy für audioReactive
   */
  resetSettings(imageObject) {
    if (!this._isImageObject(imageObject)) return

    imageObject.fotoSettings = {
      ...this.defaultSettings,
      audioReactive: this._deepCopyAudioReactive(),
    }
    this.redrawCallback?.()
  }

  /**
   * Wendet alle Filter + Schatten auf das Canvas-Context an, bevor ein Bild gezeichnet wird
   * ✨ ERWEITERT: Unterstützt jetzt auch Schatten und Rotation
   */
  applyFilters(ctx, imageObject) {
    if (!imageObject || !imageObject.fotoSettings) {
      this.initializeImageSettings(imageObject)
    }

    const settings = imageObject.fotoSettings

    // Erstelle CSS-Filter-String
    const filters = [
      `brightness(${settings.brightness}%)`,
      `contrast(${settings.contrast}%)`,
      `saturate(${settings.saturation}%)`,
      `blur(${settings.blur}px)`,
      `hue-rotate(${settings.hueRotate}deg)`,
      `grayscale(${settings.grayscale}%)`,
      `sepia(${settings.sepia}%)`,
      `invert(${settings.invert}%)`,
    ]

    ctx.filter = filters.join(' ')
    ctx.globalAlpha = settings.opacity / 100

    // ✨ SCHATTEN anwenden
    if (settings.shadowBlur > 0 || settings.shadowOffsetX !== 0 || settings.shadowOffsetY !== 0) {
      ctx.shadowColor = settings.shadowColor || '#000000'
      ctx.shadowBlur = settings.shadowBlur || 0
      ctx.shadowOffsetX = settings.shadowOffsetX || 0
      ctx.shadowOffsetY = settings.shadowOffsetY || 0
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
  }

  /**
   * Setzt Filter + Schatten nach dem Zeichnen zurück
   */
  resetFilters(ctx) {
    ctx.filter = 'none'
    ctx.globalAlpha = 1

    // Schatten zurücksetzen
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  /**
   * Gibt die aktuellen Einstellungen eines Bildes zurück
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   */
  getSettings(imageObject) {
    if (!this._isImageObject(imageObject)) return null

    this.initializeImageSettings(imageObject)
    return { ...imageObject.fotoSettings }
  }

  /**
   * Wendet einen vordefinierten Filter-Preset an
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   * ✨ VERBESSERT: Behält Bildkontur-Einstellungen bei
   */
  applyPreset(imageObject, presetName) {
    if (!this._isImageObject(imageObject)) return

    // ✨ Stelle sicher, dass fotoSettings existiert
    this.initializeImageSettings(imageObject)

    // ✨ Aktuelle Bildkontur- und Flip-Einstellungen speichern (NACH Initialisierung)
    const currentBorderSettings = {
      borderWidth: imageObject.fotoSettings.borderWidth ?? 0,
      borderColor: imageObject.fotoSettings.borderColor ?? '#ffffff',
      borderOpacity: imageObject.fotoSettings.borderOpacity ?? 100,
    }

    const currentFlipSettings = {
      flipH: imageObject.fotoSettings.flipH ?? false,
      flipV: imageObject.fotoSettings.flipV ?? false,
    }

    console.log(
      '🎨 Preset anwenden, Kontur und Flip beibehalten:',
      currentBorderSettings,
      currentFlipSettings,
    )

    const presets = {
      normal: { ...this.defaultSettings },
      vintage: {
        ...this.defaultSettings,
        contrast: 90,
        saturation: 80,
        sepia: 30,
        brightness: 110,
      },
      blackwhite: {
        ...this.defaultSettings,
        grayscale: 100,
        contrast: 110,
      },
      warm: {
        ...this.defaultSettings,
        hueRotate: 340,
        saturation: 110,
        brightness: 105,
      },
      cool: {
        ...this.defaultSettings,
        hueRotate: 190,
        saturation: 90,
      },
      dramatic: {
        ...this.defaultSettings,
        contrast: 140,
        brightness: 90,
        saturation: 120,
      },
      soft: {
        ...this.defaultSettings,
        blur: 2,
        contrast: 90,
        brightness: 110,
      },
      vivid: {
        ...this.defaultSettings,
        saturation: 150,
        contrast: 120,
      },
    }

    if (presets[presetName]) {
      // ✨ Preset anwenden, aber Bildkontur- und Flip-Einstellungen beibehalten
      imageObject.fotoSettings = {
        ...presets[presetName],
        ...currentBorderSettings,
        ...currentFlipSettings,
        preset: presetName === 'normal' ? '' : presetName, // Preset-Name speichern
      }
      this.redrawCallback?.()
    }
  }

  /**
   * Hilfsfunktion: Gibt alle verfügbaren Presets zurück
   */
  getAvailablePresets() {
    return [
      { id: 'vintage', name_de: 'Vintage', name_en: 'Vintage' },
      { id: 'blackwhite', name_de: 'Schwarz/Weiß', name_en: 'Black/White' },
      { id: 'warm', name_de: 'Warm', name_en: 'Warm' },
      { id: 'cool', name_de: 'Kühl', name_en: 'Cool' },
      { id: 'dramatic', name_de: 'Dramatisch', name_en: 'Dramatic' },
      { id: 'soft', name_de: 'Weich', name_en: 'Soft' },
      { id: 'vivid', name_de: 'Lebendig', name_en: 'Vivid' },
    ]
  }

  /**
   * Setup UI-Handler für die Bildbearbeitungs-Steuerelemente
   */
  setupUIHandlers(controls) {
    if (!controls) return

    // Helligkeit
    if (controls.brightnessInput) {
      controls.brightnessInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'brightness', parseInt(e.target.value))
          if (controls.brightnessValue) {
            controls.brightnessValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Kontrast
    if (controls.contrastInput) {
      controls.contrastInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'contrast', parseInt(e.target.value))
          if (controls.contrastValue) {
            controls.contrastValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Sättigung
    if (controls.saturationInput) {
      controls.saturationInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'saturation', parseInt(e.target.value))
          if (controls.saturationValue) {
            controls.saturationValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Deckkraft
    if (controls.opacityInput) {
      controls.opacityInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'opacity', parseInt(e.target.value))
          if (controls.opacityValue) {
            controls.opacityValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Unschärfe
    if (controls.blurInput) {
      controls.blurInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'blur', parseInt(e.target.value))
          if (controls.blurValue) {
            controls.blurValue.textContent = e.target.value + 'px'
          }
        }
      })
    }

    // Farbton-Rotation
    if (controls.hueRotateInput) {
      controls.hueRotateInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'hueRotate', parseInt(e.target.value))
          if (controls.hueRotateValue) {
            controls.hueRotateValue.textContent = e.target.value + '°'
          }
        }
      })
    }

    // Graustufen
    if (controls.grayscaleInput) {
      controls.grayscaleInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'grayscale', parseInt(e.target.value))
          if (controls.grayscaleValue) {
            controls.grayscaleValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Sepia
    if (controls.sepiaInput) {
      controls.sepiaInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'sepia', parseInt(e.target.value))
          if (controls.sepiaValue) {
            controls.sepiaValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Invertieren
    if (controls.invertInput) {
      controls.invertInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'invert', parseInt(e.target.value))
          if (controls.invertValue) {
            controls.invertValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // ✨ NEU: Schatten-Unschärfe
    if (controls.shadowBlurInput) {
      controls.shadowBlurInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'shadowBlur', parseInt(e.target.value))
          if (controls.shadowBlurValue) {
            controls.shadowBlurValue.textContent = e.target.value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schatten X-Offset
    if (controls.shadowOffsetXInput) {
      controls.shadowOffsetXInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'shadowOffsetX', parseInt(e.target.value))
          if (controls.shadowOffsetXValue) {
            controls.shadowOffsetXValue.textContent = e.target.value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schatten Y-Offset
    if (controls.shadowOffsetYInput) {
      controls.shadowOffsetYInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'shadowOffsetY', parseInt(e.target.value))
          if (controls.shadowOffsetYValue) {
            controls.shadowOffsetYValue.textContent = e.target.value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schattenfarbe
    if (controls.shadowColorInput) {
      controls.shadowColorInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'shadowColor', e.target.value)
        }
      })
    }

    // ✨ NEU: Rotation
    if (controls.rotationInput) {
      controls.rotationInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'rotation', parseInt(e.target.value))
          if (controls.rotationValue) {
            controls.rotationValue.textContent = e.target.value + '°'
          }
        }
      })
    }

    // ✨ NEU: Bildkontur-Breite
    if (controls.borderWidthInput) {
      controls.borderWidthInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'borderWidth', parseInt(e.target.value))
          if (controls.borderWidthValue) {
            controls.borderWidthValue.textContent = e.target.value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Bildkontur-Farbe
    if (controls.borderColorInput) {
      controls.borderColorInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'borderColor', e.target.value)
        }
      })
    }

    // ✨ NEU: Bildkontur-Transparenz
    if (controls.borderOpacityInput) {
      controls.borderOpacityInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'borderOpacity', parseInt(e.target.value))
          if (controls.borderOpacityValue) {
            controls.borderOpacityValue.textContent = e.target.value + '%'
          }
        }
      })
    }

    // Preset-Auswahl
    if (controls.presetSelect) {
      controls.presetSelect.addEventListener('change', (e) => {
        const activeImage = this.getActiveImage?.()
        if (!activeImage) return

        // Wenn leerer Wert = "Kein Filter" = Reset
        if (e.target.value === '') {
          this.resetSettings(activeImage)
          this.updateUIFromSettings(controls, activeImage)
        } else {
          // Ansonsten Preset anwenden
          this.applyPreset(activeImage, e.target.value)
          this.updateUIFromSettings(controls, activeImage)
        }
      })
    }

    // Reset-Button
    if (controls.resetButton) {
      controls.resetButton.addEventListener('click', () => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.resetSettings(activeImage)
          this.updateUIFromSettings(controls, activeImage)
        }
      })
    }
  }

  /**
   * Aktualisiert UI-Elemente basierend auf den Einstellungen des aktiven Bildes
   */
  updateUIFromSettings(controls, imageObject) {
    if (!controls || !imageObject) return

    const settings = this.getSettings(imageObject)
    if (!settings) return

    const updateControl = (input, valueDisplay, value, unit = '') => {
      if (input) input.value = value
      if (valueDisplay) valueDisplay.textContent = value + unit
    }

    updateControl(controls.brightnessInput, controls.brightnessValue, settings.brightness, '%')
    updateControl(controls.contrastInput, controls.contrastValue, settings.contrast, '%')
    updateControl(controls.saturationInput, controls.saturationValue, settings.saturation, '%')
    updateControl(controls.opacityInput, controls.opacityValue, settings.opacity, '%')
    updateControl(controls.blurInput, controls.blurValue, settings.blur, 'px')
    updateControl(controls.hueRotateInput, controls.hueRotateValue, settings.hueRotate, '°')
    updateControl(controls.grayscaleInput, controls.grayscaleValue, settings.grayscale, '%')
    updateControl(controls.sepiaInput, controls.sepiaValue, settings.sepia, '%')
    updateControl(controls.invertInput, controls.invertValue, settings.invert, '%')

    // ✨ NEU: Schatten und Rotation
    updateControl(controls.shadowBlurInput, controls.shadowBlurValue, settings.shadowBlur, 'px')
    updateControl(
      controls.shadowOffsetXInput,
      controls.shadowOffsetXValue,
      settings.shadowOffsetX,
      'px',
    )
    updateControl(
      controls.shadowOffsetYInput,
      controls.shadowOffsetYValue,
      settings.shadowOffsetY,
      'px',
    )
    updateControl(controls.rotationInput, controls.rotationValue, settings.rotation, '°')

    if (controls.shadowColorInput) {
      controls.shadowColorInput.value = settings.shadowColor
    }

    // ✨ NEU: Bildkontur
    updateControl(controls.borderWidthInput, controls.borderWidthValue, settings.borderWidth, 'px')
    updateControl(
      controls.borderOpacityInput,
      controls.borderOpacityValue,
      settings.borderOpacity,
      '%',
    )

    if (controls.borderColorInput) {
      controls.borderColorInput.value = settings.borderColor
    }
  }

  /**
   * Zeigt/versteckt die Bildbearbeitungs-UI basierend auf der Auswahl
   */
  updateUIVisibility(controls, isImageSelected) {
    if (!controls || !controls.container) return

    controls.container.style.display = isImageSelected ? 'block' : 'none'
  }
}
