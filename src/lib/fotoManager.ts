import {
  createAudioReactiveConfig,
  ensureAudioReactiveConfig,
  type AudioReactiveConfig,
} from './audio/audioReactiveConfig'

/** Bildbearbeitungs-Einstellungen eines Bildes/Videos */
export interface FotoSettings {
  brightness: number
  contrast: number
  saturation: number
  opacity: number
  blur: number
  hueRotate: number
  grayscale: number
  sepia: number
  invert: number
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  rotation: number
  flipH: boolean
  flipV: boolean
  borderWidth: number
  borderColor: string
  borderOpacity: number
  /** fehlt bei Videos (VideoManager.initializeVideoSettings) */
  renderBehindVisualizer?: boolean
  audioReactive: AudioReactiveConfig
  /** Name des angewendeten Presets ('' = keins) */
  preset?: string
  _cachedFilterKey?: string
  _cachedFilterString?: string
  [key: string]: unknown
}

/** Objekt mit Bildbearbeitung (Bild, Hintergrund, Video …) */
export interface FotoImageObject {
  type?: string
  fotoSettings?: FotoSettings
  [key: string]: unknown
}

type FotoInput = HTMLInputElement | HTMLSelectElement | null | undefined
type FotoValueDisplay = HTMLElement | null | undefined

/** DOM-Steuerelemente für setupUIHandlers/updateUIFromSettings */
export interface FotoControls {
  container?: HTMLElement | null
  brightnessInput?: FotoInput
  brightnessValue?: FotoValueDisplay
  contrastInput?: FotoInput
  contrastValue?: FotoValueDisplay
  saturationInput?: FotoInput
  saturationValue?: FotoValueDisplay
  opacityInput?: FotoInput
  opacityValue?: FotoValueDisplay
  blurInput?: FotoInput
  blurValue?: FotoValueDisplay
  hueRotateInput?: FotoInput
  hueRotateValue?: FotoValueDisplay
  grayscaleInput?: FotoInput
  grayscaleValue?: FotoValueDisplay
  sepiaInput?: FotoInput
  sepiaValue?: FotoValueDisplay
  invertInput?: FotoInput
  invertValue?: FotoValueDisplay
  shadowBlurInput?: FotoInput
  shadowBlurValue?: FotoValueDisplay
  shadowOffsetXInput?: FotoInput
  shadowOffsetXValue?: FotoValueDisplay
  shadowOffsetYInput?: FotoInput
  shadowOffsetYValue?: FotoValueDisplay
  shadowColorInput?: FotoInput
  rotationInput?: FotoInput
  rotationValue?: FotoValueDisplay
  borderWidthInput?: FotoInput
  borderWidthValue?: FotoValueDisplay
  borderColorInput?: FotoInput
  borderOpacityInput?: FotoInput
  borderOpacityValue?: FotoValueDisplay
  presetSelect?: FotoInput
  resetButton?: HTMLElement | null
}

export interface FotoPresetInfo {
  id: string
  name_de: string
  name_en: string
}

/**
 * Verwaltet Bildbearbeitung: Filter, Helligkeit, Kontrast, Transparenz, Schatten, Rotation
 * Unterstützt normale Bilder, Hintergründe und Workspace-Hintergründe
 */
export class FotoManager {
  redrawCallback: (() => void) | null | undefined
  defaultSettings: FotoSettings
  /** optional von außen gesetzt (nur für setupUIHandlers) */
  getActiveImage?: () => FotoImageObject | null | undefined

  constructor(redrawCallback?: (() => void) | null) {
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

      // ✨ AUDIO-REAKTIV – gemeinsame Struktur mit Hintergrund/Kacheln/Text/Video/Ticker
      // (Master inkl. Easing/Beat-Boost/Phase/Gain, alle Effekte mit eigener Quelle)
      audioReactive: createAudioReactiveConfig(),
    }
  }

  /**
   * NEU: Prüft ob ein Objekt ein Bild oder Video ist
   * ✨ ERWEITERT: Unterstützt Bilder, Videos und Video-Hintergründe
   */
  _isImageObject(obj: FotoImageObject | null | undefined): obj is FotoImageObject {
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
   * Frische Audio-Reaktiv-Konfiguration (jedes Bild bekommt eigene Einstellungen)
   */
  _deepCopyAudioReactive(): AudioReactiveConfig {
    return createAudioReactiveConfig()
  }

  /**
   * Vervollständigt eine alte/unvollständige Konfiguration (fehlende Master-
   * Felder, fehlende Effekte, fehlende `source`) – vorhandene Werte bleiben.
   */
  _migrateAudioReactiveSettings(oldSettings: unknown): AudioReactiveConfig {
    return ensureAudioReactiveConfig(oldSettings)
  }

  /**
   * Initialisiert die Bildbearbeitungs-Einstellungen für ein Bild
   * ✅ FIX: Deep copy für audioReactive um geteilte Referenzen zu vermeiden
   * ✅ NEU: Unterstützt Migration von alter zu neuer Struktur
   * ✅ FIX: Fügt fehlende Effekte zu existierenden Einstellungen hinzu
   */
  initializeImageSettings(imageObject: FotoImageObject): void {
    if (!imageObject.fotoSettings) {
      imageObject.fotoSettings = {
        ...this.defaultSettings,
        // Deep copy für audioReactive - jedes Bild bekommt eigene Einstellungen
        audioReactive: this._deepCopyAudioReactive(),
      }
      return
    }
    // Vorhandene (evtl. alte) Konfiguration vervollständigen – in-place, damit
    // Referenzen (Panel, Renderer) erhalten bleiben
    imageObject.fotoSettings.audioReactive = ensureAudioReactiveConfig(
      imageObject.fotoSettings.audioReactive,
    )
  }

  /**
   * Aktualisiert eine Einstellung für ein bestimmtes Bild
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   */
  updateSetting(
    imageObject: FotoImageObject | null | undefined,
    property: string,
    value: unknown,
  ): void {
    if (!this._isImageObject(imageObject)) return

    this.initializeImageSettings(imageObject)
    ;(imageObject.fotoSettings as FotoSettings)[property] = value

    this.redrawCallback?.()
  }

  /**
   * Setzt alle Einstellungen eines Bildes zurück
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   * ✅ FIX: Deep copy für audioReactive
   */
  resetSettings(imageObject: FotoImageObject | null | undefined): void {
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
  applyFilters(ctx: CanvasRenderingContext2D, imageObject: FotoImageObject): void {
    if (!imageObject || !imageObject.fotoSettings) {
      this.initializeImageSettings(imageObject)
    }

    // nach initializeImageSettings immer gesetzt
    const settings = imageObject.fotoSettings as FotoSettings

    // Memoize CSS filter string — rebuild only when values change
    const filterKey = `${settings.brightness},${settings.contrast},${settings.saturation},${settings.blur},${settings.hueRotate},${settings.grayscale},${settings.sepia},${settings.invert}`
    if (settings._cachedFilterKey !== filterKey) {
      settings._cachedFilterString = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) blur(${settings.blur}px) hue-rotate(${settings.hueRotate}deg) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%)`
      settings._cachedFilterKey = filterKey
    }

    ctx.filter = settings._cachedFilterString as string
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
  resetFilters(ctx: CanvasRenderingContext2D): void {
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
  getSettings(imageObject: FotoImageObject | null | undefined): FotoSettings | null {
    if (!this._isImageObject(imageObject)) return null

    this.initializeImageSettings(imageObject)
    return { ...(imageObject.fotoSettings as FotoSettings) }
  }

  /**
   * Wendet einen vordefinierten Filter-Preset an
   * KORRIGIERT: Akzeptiert jetzt auch Hintergrundbilder
   * ✨ VERBESSERT: Behält Bildkontur-Einstellungen bei
   */
  applyPreset(imageObject: FotoImageObject | null | undefined, presetName: string): void {
    if (!this._isImageObject(imageObject)) return

    // ✨ Stelle sicher, dass fotoSettings existiert
    this.initializeImageSettings(imageObject)

    // ✨ Aktuelle Bildkontur- und Flip-Einstellungen speichern (NACH Initialisierung)
    const fs = imageObject.fotoSettings as FotoSettings
    const currentBorderSettings = {
      borderWidth: fs.borderWidth ?? 0,
      borderColor: fs.borderColor ?? '#ffffff',
      borderOpacity: fs.borderOpacity ?? 100,
    }

    const currentFlipSettings = {
      flipH: fs.flipH ?? false,
      flipV: fs.flipV ?? false,
    }

    console.log(
      '🎨 Preset anwenden, Kontur und Flip beibehalten:',
      currentBorderSettings,
      currentFlipSettings,
    )

    const presets: Record<string, FotoSettings> = {
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

    const preset = presets[presetName]
    if (preset) {
      // ✨ Preset anwenden, aber Bildkontur- und Flip-Einstellungen beibehalten
      imageObject.fotoSettings = {
        ...preset,
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
  getAvailablePresets(): FotoPresetInfo[] {
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
  setupUIHandlers(controls: FotoControls | null | undefined): void {
    if (!controls) return

    // Helligkeit
    if (controls.brightnessInput) {
      controls.brightnessInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'brightness',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.brightnessValue) {
            controls.brightnessValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Kontrast
    if (controls.contrastInput) {
      controls.contrastInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'contrast',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.contrastValue) {
            controls.contrastValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Sättigung
    if (controls.saturationInput) {
      controls.saturationInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'saturation',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.saturationValue) {
            controls.saturationValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Deckkraft
    if (controls.opacityInput) {
      controls.opacityInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'opacity', parseInt((e.target as HTMLInputElement).value))
          if (controls.opacityValue) {
            controls.opacityValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Unschärfe
    if (controls.blurInput) {
      controls.blurInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'blur', parseInt((e.target as HTMLInputElement).value))
          if (controls.blurValue) {
            controls.blurValue.textContent = (e.target as HTMLInputElement).value + 'px'
          }
        }
      })
    }

    // Farbton-Rotation
    if (controls.hueRotateInput) {
      controls.hueRotateInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'hueRotate',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.hueRotateValue) {
            controls.hueRotateValue.textContent = (e.target as HTMLInputElement).value + '°'
          }
        }
      })
    }

    // Graustufen
    if (controls.grayscaleInput) {
      controls.grayscaleInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'grayscale',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.grayscaleValue) {
            controls.grayscaleValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Sepia
    if (controls.sepiaInput) {
      controls.sepiaInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'sepia', parseInt((e.target as HTMLInputElement).value))
          if (controls.sepiaValue) {
            controls.sepiaValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // Invertieren
    if (controls.invertInput) {
      controls.invertInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'invert', parseInt((e.target as HTMLInputElement).value))
          if (controls.invertValue) {
            controls.invertValue.textContent = (e.target as HTMLInputElement).value + '%'
          }
        }
      })
    }

    // ✨ NEU: Schatten-Unschärfe
    if (controls.shadowBlurInput) {
      controls.shadowBlurInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'shadowBlur',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.shadowBlurValue) {
            controls.shadowBlurValue.textContent = (e.target as HTMLInputElement).value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schatten X-Offset
    if (controls.shadowOffsetXInput) {
      controls.shadowOffsetXInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'shadowOffsetX',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.shadowOffsetXValue) {
            controls.shadowOffsetXValue.textContent = (e.target as HTMLInputElement).value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schatten Y-Offset
    if (controls.shadowOffsetYInput) {
      controls.shadowOffsetYInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'shadowOffsetY',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.shadowOffsetYValue) {
            controls.shadowOffsetYValue.textContent = (e.target as HTMLInputElement).value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Schattenfarbe
    if (controls.shadowColorInput) {
      controls.shadowColorInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'shadowColor', (e.target as HTMLInputElement).value)
        }
      })
    }

    // ✨ NEU: Rotation
    if (controls.rotationInput) {
      controls.rotationInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'rotation',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.rotationValue) {
            controls.rotationValue.textContent = (e.target as HTMLInputElement).value + '°'
          }
        }
      })
    }

    // ✨ NEU: Bildkontur-Breite
    if (controls.borderWidthInput) {
      controls.borderWidthInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'borderWidth',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.borderWidthValue) {
            controls.borderWidthValue.textContent = (e.target as HTMLInputElement).value + 'px'
          }
        }
      })
    }

    // ✨ NEU: Bildkontur-Farbe
    if (controls.borderColorInput) {
      controls.borderColorInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(activeImage, 'borderColor', (e.target as HTMLInputElement).value)
        }
      })
    }

    // ✨ NEU: Bildkontur-Transparenz
    if (controls.borderOpacityInput) {
      controls.borderOpacityInput.addEventListener('input', (e) => {
        const activeImage = this.getActiveImage?.()
        if (activeImage) {
          this.updateSetting(
            activeImage,
            'borderOpacity',
            parseInt((e.target as HTMLInputElement).value),
          )
          if (controls.borderOpacityValue) {
            controls.borderOpacityValue.textContent = (e.target as HTMLInputElement).value + '%'
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
        if ((e.target as HTMLInputElement).value === '') {
          this.resetSettings(activeImage)
          this.updateUIFromSettings(controls, activeImage)
        } else {
          // Ansonsten Preset anwenden
          this.applyPreset(activeImage, (e.target as HTMLInputElement).value)
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
  updateUIFromSettings(
    controls: FotoControls | null | undefined,
    imageObject: FotoImageObject | null | undefined,
  ): void {
    if (!controls || !imageObject) return

    const settings = this.getSettings(imageObject)
    if (!settings) return

    const updateControl = (
      input: FotoInput,
      valueDisplay: FotoValueDisplay,
      value: number,
      unit = '',
    ) => {
      if (input) input.value = value as unknown as string
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
  updateUIVisibility(controls: FotoControls | null | undefined, isImageSelected: boolean): void {
    if (!controls || !controls.container) return

    controls.container.style.display = isImageSelected ? 'block' : 'none'
  }
}
