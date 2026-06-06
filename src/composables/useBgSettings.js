import { ref, computed, watch, onMounted, onUnmounted, nextTick, inject } from 'vue'

export function useBgSettings() {
  const canvasManager = inject('canvasManager')

  const backgroundColor = ref('#ffffff')
  const backgroundOpacity = ref(1.0)
  const colorDisplay = ref('rgba(255, 255, 255, 1)')

  // Undo system
  const undoHistory = ref([])
  const MAX_HISTORY = 10

  // Audio-reactive
  const bgAudioEnabled = ref(false)
  const bgAudioSource = ref('bass')
  const bgAudioSmoothing = ref(50)
  const bgEffectHue = ref(false)
  const bgEffectHueIntensity = ref(80)
  const bgEffectBrightness = ref(false)
  const bgEffectBrightnessIntensity = ref(80)
  const bgEffectSaturation = ref(false)
  const bgEffectSaturationIntensity = ref(80)
  const bgEffectGlow = ref(false)
  const bgEffectGlowIntensity = ref(80)
  const bgEffectStrobe = ref(false)
  const bgEffectStrobeIntensity = ref(80)
  const bgEffectContrast = ref(false)
  const bgEffectContrastIntensity = ref(70)
  const bgEffectGradientPulse = ref(false)
  const bgEffectGradientPulseIntensity = ref(80)
  const bgEffectGradientRotation = ref(false)
  const bgEffectGradientRotationIntensity = ref(80)

  // Gradient
  const gradientEnabled = ref(false)
  const gradientColor2 = ref('#0066ff')
  const gradientType = ref('radial')
  const gradientAngle = ref(45)

  // Flip
  const bgFlipH = ref(false)
  const bgFlipV = ref(false)
  const wsBgFlipH = ref(false)
  const wsBgFlipV = ref(false)

  // Modal/gallery
  const showBackgroundReplaceModal = ref(false)
  const replaceType = ref('background')
  const pendingBackgroundReplaceImage = ref(null)
  const pendingBackgroundReplaceSrc = ref(null)

  const showBgReplaceGallery = ref(false)
  const bgGalleryCategories = ref([])
  const bgGalleryImages = ref([])
  const selectedBgCategory = ref(null)
  const selectedBgGalleryImage = ref(null)
  const bgGalleryLoading = ref(false)
  const bgGalleryCategoryCache = ref(new Map())

  // Presets
  const PRESETS_STORAGE_KEY = 'visualizer-canvas-presets'
  const savedPresets = ref([])

  // ===== COMPUTED =====

  const hasImageBackground = computed(() => {
    if (!canvasManager.value) return false
    return canvasManager.value.background && typeof canvasManager.value.background === 'object'
  })

  const hasWorkspaceBackground = computed(() => {
    if (!canvasManager.value) return false
    return !!canvasManager.value.workspaceBackground
  })

  const hasVideoBackground = computed(() => {
    if (!canvasManager.value) return false
    return !!canvasManager.value.videoBackground
  })

  const hasWorkspaceVideoBackground = computed(() => {
    if (!canvasManager.value) return false
    return !!canvasManager.value.workspaceVideoBackground
  })

  const backgroundImageSrc = computed(() => {
    if (!canvasManager.value) return null
    const bg = canvasManager.value.background
    if (bg && typeof bg === 'object' && bg.imageObject) {
      return bg.imageObject.src
    }
    return null
  })

  const workspaceBackgroundImageSrc = computed(() => {
    if (!canvasManager.value) return null
    const wsBg = canvasManager.value.workspaceBackground
    if (wsBg && wsBg.imageObject) {
      return wsBg.imageObject.src
    }
    return null
  })

  const currentBackgroundForReplace = computed(() => {
    if (replaceType.value === 'workspace') {
      return workspaceBackgroundImageSrc.value
    }
    return backgroundImageSrc.value
  })

  const canUndo = computed(() => undoHistory.value.length > 0)

  const isCanvasEmpty = computed(() => {
    if (!canvasManager.value) return true
    return canvasManager.value.isCanvasEmpty()
  })

  // ===== COLOR HELPERS =====

  function hexToRGBA(hex, alpha) {
    hex = hex.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function rgbToHex(r, g, b) {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    )
  }

  function parseRGBA(rgbaString) {
    const match = rgbaString.match(
      /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
    )
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
      }
    }
    return null
  }

  // ===== UPDATE FUNCTIONS =====

  function updateColorDisplay() {
    colorDisplay.value = hexToRGBA(backgroundColor.value, backgroundOpacity.value)
  }

  function updateFromColorPicker() {
    updateColorDisplay()
    applyBackgroundColor()
  }

  function updateFromOpacitySlider() {
    updateColorDisplay()
    applyBackgroundColor()
  }

  function updateFromTextInput() {
    const input = colorDisplay.value.trim()

    const rgba = parseRGBA(input)
    if (rgba) {
      backgroundColor.value = rgbToHex(rgba.r, rgba.g, rgba.b)
      backgroundOpacity.value = rgba.a
      applyBackgroundColor()
      return
    }

    if (input.match(/^#[0-9A-Fa-f]{6}$/)) {
      backgroundColor.value = input
      applyBackgroundColor()
      return
    }
  }

  function formatColorDisplay() {
    updateColorDisplay()
  }

  function applyBackgroundColor() {
    if (!canvasManager.value) {
      console.warn('⚠️ CanvasManager nicht verfügbar')
      return
    }

    saveCanvasState()

    const rgbaColor = hexToRGBA(backgroundColor.value, backgroundOpacity.value)
    console.log('🎨 Setze Hintergrundfarbe:', rgbaColor)
    canvasManager.value.setBackground(rgbaColor)
  }

  function updateBgAudioReactive() {
    if (!canvasManager.value) return

    const settings = {
      enabled: bgAudioEnabled.value,
      source: bgAudioSource.value,
      smoothing: bgAudioSmoothing.value,
      effects: {
        hue: { enabled: bgEffectHue.value, intensity: bgEffectHueIntensity.value },
        brightness: {
          enabled: bgEffectBrightness.value,
          intensity: bgEffectBrightnessIntensity.value,
        },
        saturation: {
          enabled: bgEffectSaturation.value,
          intensity: bgEffectSaturationIntensity.value,
        },
        glow: { enabled: bgEffectGlow.value, intensity: bgEffectGlowIntensity.value },
        strobe: { enabled: bgEffectStrobe.value, intensity: bgEffectStrobeIntensity.value },
        contrast: { enabled: bgEffectContrast.value, intensity: bgEffectContrastIntensity.value },
        gradientPulse: {
          enabled: bgEffectGradientPulse.value,
          intensity: bgEffectGradientPulseIntensity.value,
        },
        gradientRotation: {
          enabled: bgEffectGradientRotation.value,
          intensity: bgEffectGradientRotationIntensity.value,
        },
      },
    }

    canvasManager.value.setBackgroundColorAudioReactive(settings)
    console.log('🎵 Hintergrund Audio-Reaktiv:', settings)
  }

  function updateGradientSettings() {
    if (!canvasManager.value) return

    canvasManager.value.setGradientSettings({
      enabled: gradientEnabled.value,
      color2: gradientColor2.value,
      type: gradientType.value,
      angle: gradientAngle.value,
    })

    console.log('🌈 Gradient:', {
      enabled: gradientEnabled.value,
      color2: gradientColor2.value,
      type: gradientType.value,
      angle: gradientAngle.value,
    })
  }

  // ===== FLIP FUNCTIONS =====

  function toggleBgFlipH() {
    if (!canvasManager.value || !hasImageBackground.value) return
    bgFlipH.value = !bgFlipH.value
    canvasManager.value.updateBackgroundFlip(bgFlipH.value, bgFlipV.value)
    console.log('🔄 Hintergrund Flip H:', bgFlipH.value)
  }

  function toggleBgFlipV() {
    if (!canvasManager.value || !hasImageBackground.value) return
    bgFlipV.value = !bgFlipV.value
    canvasManager.value.updateBackgroundFlip(bgFlipH.value, bgFlipV.value)
    console.log('🔄 Hintergrund Flip V:', bgFlipV.value)
  }

  function toggleWsBgFlipH() {
    if (!canvasManager.value || !hasWorkspaceBackground.value) return
    wsBgFlipH.value = !wsBgFlipH.value
    canvasManager.value.updateWorkspaceBackgroundFlip(wsBgFlipH.value, wsBgFlipV.value)
    console.log('🔄 Workspace-Hintergrund Flip H:', wsBgFlipH.value)
  }

  function toggleWsBgFlipV() {
    if (!canvasManager.value || !hasWorkspaceBackground.value) return
    wsBgFlipV.value = !wsBgFlipV.value
    canvasManager.value.updateWorkspaceBackgroundFlip(wsBgFlipH.value, wsBgFlipV.value)
    console.log('🔄 Workspace-Hintergrund Flip V:', wsBgFlipV.value)
  }

  // ===== MODAL FUNCTIONS =====

  function openBackgroundReplaceModal(type) {
    replaceType.value = type
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    showBackgroundReplaceModal.value = true
    console.log(`🖼️ Hintergrund-Ersetzung Modal geöffnet für: ${type}`)
  }

  function closeBackgroundReplaceModal() {
    showBackgroundReplaceModal.value = false
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    showBgReplaceGallery.value = false
    selectedBgGalleryImage.value = null
  }

  function handleBackgroundReplaceFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        pendingBackgroundReplaceImage.value = img
        pendingBackgroundReplaceSrc.value = e.target.result
        console.log(
          '🔍 Neues Hintergrundbild in Vorschau geladen:',
          img.naturalWidth,
          'x',
          img.naturalHeight,
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)

    event.target.value = ''
  }

  function confirmBackgroundReplace() {
    if (!pendingBackgroundReplaceImage.value || !canvasManager.value) return

    let result
    if (replaceType.value === 'workspace') {
      result = canvasManager.value.replaceWorkspaceBackground(pendingBackgroundReplaceImage.value)
    } else {
      result = canvasManager.value.replaceBackground(pendingBackgroundReplaceImage.value)
    }

    if (result) {
      console.log(
        `✅ ${replaceType.value === 'workspace' ? 'Workspace-' : ''}Hintergrund erfolgreich ersetzt`,
      )
    }

    closeBackgroundReplaceModal()
  }

  function cancelBackgroundReplace() {
    pendingBackgroundReplaceImage.value = null
    pendingBackgroundReplaceSrc.value = null
    console.log('❌ Hintergrund-Ersetzen abgebrochen')
  }

  // ===== GALLERY FUNCTIONS =====

  async function openBgReplaceGallery() {
    showBgReplaceGallery.value = true
    selectedBgGalleryImage.value = null

    if (bgGalleryCategories.value.length === 0) {
      await loadBgGalleryIndex()
    }
  }

  function closeBgReplaceGallery() {
    showBgReplaceGallery.value = false
    selectedBgGalleryImage.value = null
  }

  async function loadBgGalleryIndex() {
    bgGalleryLoading.value = true
    try {
      const paths = ['gallery/gallery.json', './gallery/gallery.json']
      let response = null

      for (const path of paths) {
        try {
          response = await fetch(path)
          if (response.ok) break
        } catch (e) {
          // Try next path
        }
      }

      if (!response || !response.ok) {
        throw new Error('Galerie konnte nicht geladen werden')
      }

      const data = await response.json()

      if (data._version === '2.0' && data.categories) {
        bgGalleryCategories.value = data.categories

        if (bgGalleryCategories.value.length > 0) {
          await selectBgGalleryCategory(bgGalleryCategories.value[0].id)
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Galerie:', error)
    } finally {
      bgGalleryLoading.value = false
    }
  }

  async function selectBgGalleryCategory(categoryId) {
    if (selectedBgCategory.value === categoryId) return

    selectedBgCategory.value = categoryId
    selectedBgGalleryImage.value = null

    if (bgGalleryCategoryCache.value.has(categoryId)) {
      bgGalleryImages.value = bgGalleryCategoryCache.value.get(categoryId)
      return
    }

    bgGalleryLoading.value = true
    try {
      const categoryInfo = bgGalleryCategories.value.find((c) => c.id === categoryId)
      if (!categoryInfo || !categoryInfo.jsonFile) {
        bgGalleryImages.value = []
        return
      }

      const response = await fetch(categoryInfo.jsonFile)
      if (!response.ok) {
        throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`)
      }

      const data = await response.json()
      const images = data.images || []

      bgGalleryCategoryCache.value.set(categoryId, images)
      bgGalleryImages.value = images
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kategorie:', error)
      bgGalleryImages.value = []
    } finally {
      bgGalleryLoading.value = false
    }
  }

  function selectBgGalleryImage(image) {
    selectedBgGalleryImage.value = image
  }

  async function confirmBgReplaceFromGallery() {
    if (!selectedBgGalleryImage.value) {
      closeBgReplaceGallery()
      return
    }

    const imagePath = selectedBgGalleryImage.value.file

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imagePath
      })

      pendingBackgroundReplaceImage.value = img
      pendingBackgroundReplaceSrc.value = imagePath
      console.log('🔍 Galeriebild in Vorschau geladen:', imagePath)

      closeBgReplaceGallery()
    } catch (error) {
      console.error('❌ Fehler beim Laden des Galeriebildes:', error)
    }
  }

  // ===== PRESET FUNCTIONS =====

  function loadPresets() {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) {
        savedPresets.value = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Fehler beim Laden der Presets:', e)
    }
  }

  function persistPresets() {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(savedPresets.value))
    } catch (e) {
      console.warn('Fehler beim Speichern der Presets:', e)
    }
  }

  function saveCurrentAsPreset() {
    console.log('🔍 Aktuelle Werte vor dem Speichern:')
    console.log('  - gradientEnabled:', gradientEnabled.value)
    console.log('  - backgroundColor:', backgroundColor.value)
    console.log('  - bgAudioEnabled:', bgAudioEnabled.value)

    const presetNumber = savedPresets.value.length + 1
    const newPreset = {
      id: Date.now(),
      name: `Preset ${presetNumber}`,
      backgroundColor: backgroundColor.value,
      backgroundOpacity: backgroundOpacity.value,
      gradientEnabled: Boolean(gradientEnabled.value),
      gradientColor2: gradientColor2.value,
      gradientType: gradientType.value,
      gradientAngle: gradientAngle.value,
      bgAudioEnabled: Boolean(bgAudioEnabled.value),
      bgAudioSource: bgAudioSource.value,
      bgAudioSmoothing: bgAudioSmoothing.value,
      bgEffects: {
        hue: { enabled: Boolean(bgEffectHue.value), intensity: bgEffectHueIntensity.value },
        brightness: {
          enabled: Boolean(bgEffectBrightness.value),
          intensity: bgEffectBrightnessIntensity.value,
        },
        saturation: {
          enabled: Boolean(bgEffectSaturation.value),
          intensity: bgEffectSaturationIntensity.value,
        },
        glow: { enabled: Boolean(bgEffectGlow.value), intensity: bgEffectGlowIntensity.value },
        gradientPulse: {
          enabled: Boolean(bgEffectGradientPulse.value),
          intensity: bgEffectGradientPulseIntensity.value,
        },
        gradientRotation: {
          enabled: Boolean(bgEffectGradientRotation.value),
          intensity: bgEffectGradientRotationIntensity.value,
        },
      },
    }

    savedPresets.value.push(newPreset)
    persistPresets()
    console.log('✅ Canvas-Preset gespeichert:', newPreset)
  }

  function loadPreset(preset) {
    console.log('📥 Lade Canvas-Preset:', preset)

    try {
      backgroundColor.value = preset.backgroundColor
      backgroundOpacity.value = preset.backgroundOpacity
      console.log('  → Farbe:', preset.backgroundColor, 'Deckkraft:', preset.backgroundOpacity)

      gradientEnabled.value = preset.gradientEnabled || false
      gradientColor2.value = preset.gradientColor2 || '#0066ff'
      gradientType.value = preset.gradientType || 'radial'
      gradientAngle.value = preset.gradientAngle || 45

      bgAudioEnabled.value = preset.bgAudioEnabled || false
      bgAudioSource.value = preset.bgAudioSource || 'bass'
      bgAudioSmoothing.value = preset.bgAudioSmoothing || 50

      if (preset.bgEffects) {
        bgEffectHue.value = preset.bgEffects.hue?.enabled || false
        bgEffectHueIntensity.value = preset.bgEffects.hue?.intensity || 80
        bgEffectBrightness.value = preset.bgEffects.brightness?.enabled || false
        bgEffectBrightnessIntensity.value = preset.bgEffects.brightness?.intensity || 80
        bgEffectSaturation.value = preset.bgEffects.saturation?.enabled || false
        bgEffectSaturationIntensity.value = preset.bgEffects.saturation?.intensity || 80
        bgEffectGlow.value = preset.bgEffects.glow?.enabled || false
        bgEffectGlowIntensity.value = preset.bgEffects.glow?.intensity || 80
        bgEffectGradientPulse.value = preset.bgEffects.gradientPulse?.enabled || false
        bgEffectGradientPulseIntensity.value = preset.bgEffects.gradientPulse?.intensity || 80
        bgEffectGradientRotation.value = preset.bgEffects.gradientRotation?.enabled || false
        bgEffectGradientRotationIntensity.value = preset.bgEffects.gradientRotation?.intensity || 80
      }

      updateFromColorPicker()
      updateGradientSettings()
      updateBgAudioReactive()

      console.log('✅ Canvas-Preset erfolgreich geladen:', preset.name)
    } catch (error) {
      console.error('❌ Fehler beim Laden des Canvas-Presets:', error)
    }
  }

  function deletePreset(presetId) {
    savedPresets.value = savedPresets.value.filter((p) => p.id !== presetId)
    persistPresets()
    console.log('🗑️ Preset gelöscht')
  }

  // ===== UNDO SYSTEM =====

  function saveCanvasState() {
    if (!canvasManager.value) return

    const state = {
      background: canvasManager.value.background,
      workspaceBackground: canvasManager.value.workspaceBackground,
      backgroundColor: backgroundColor.value,
      backgroundOpacity: backgroundOpacity.value,
      images: canvasManager.value.multiImageManager
        ? canvasManager.value.multiImageManager.getAllImages().map((img) => ({
            id: img.id,
            type: img.type,
            relX: img.relX,
            relY: img.relY,
            relWidth: img.relWidth,
            relHeight: img.relHeight,
            rotation: img.rotation,
            imageObject: img.imageObject,
          }))
        : [],
      texts:
        canvasManager.value.textManager && canvasManager.value.textManager.textObjects
          ? JSON.parse(JSON.stringify(canvasManager.value.textManager.textObjects))
          : [],
      timestamp: Date.now(),
    }

    undoHistory.value.push(state)

    if (undoHistory.value.length > MAX_HISTORY) {
      undoHistory.value.shift()
    }

    console.log('💾 Canvas-Zustand gespeichert')
  }

  function undoLastChange() {
    if (undoHistory.value.length === 0 || !canvasManager.value) {
      console.warn('⚠️ Kein Verlauf vorhanden')
      return
    }

    const lastState = undoHistory.value.pop()

    if (lastState.background !== undefined) {
      canvasManager.value.background = lastState.background
    }

    if (lastState.backgroundColor !== undefined) {
      backgroundColor.value = lastState.backgroundColor
    }
    if (lastState.backgroundOpacity !== undefined) {
      backgroundOpacity.value = lastState.backgroundOpacity
    }
    updateColorDisplay()

    if (lastState.workspaceBackground !== undefined) {
      canvasManager.value.workspaceBackground = lastState.workspaceBackground
    }

    if (canvasManager.value.multiImageManager && lastState.images) {
      canvasManager.value.multiImageManager.images = [...lastState.images]
    }

    if (canvasManager.value.textManager && lastState.texts) {
      canvasManager.value.textManager.textObjects = JSON.parse(JSON.stringify(lastState.texts))
    }

    if (canvasManager.value.redrawCallback) {
      canvasManager.value.redrawCallback()
    }

    if (canvasManager.value.updateUICallback) {
      canvasManager.value.updateUICallback()
    }

    console.log('✅ Zustand wiederhergestellt')
  }

  // ===== RESET FUNCTIONS =====

  function resetNormalBackground() {
    if (!canvasManager.value) {
      console.warn('⚠️ CanvasManager nicht verfügbar')
      return
    }

    saveCanvasState()

    console.log('🔄 Setze normalen Hintergrund zurück')
    canvasManager.value.setBackground('#ffffff')
    backgroundColor.value = '#ffffff'
    backgroundOpacity.value = 1.0

    bgFlipH.value = false
    bgFlipV.value = false

    if (canvasManager.value.videoBackground) {
      const video = canvasManager.value.videoBackground.videoElement
      if (video) {
        video.pause()
        video.src = ''
      }
      canvasManager.value.videoBackground = null
      console.log('🗑️ Video-Hintergrund entfernt')
    }

    canvasManager.value.redrawCallback()
    updateColorDisplay()
    console.log('✅ Normaler Hintergrund zurückgesetzt')
  }

  function resetWorkspaceBackgroundOnly() {
    if (!canvasManager.value) {
      console.warn('⚠️ CanvasManager nicht verfügbar')
      return
    }

    saveCanvasState()

    console.log('🔄 Setze Workspace-Hintergrund zurück')
    canvasManager.value.workspaceBackground = null

    wsBgFlipH.value = false
    wsBgFlipV.value = false

    if (canvasManager.value.workspaceVideoBackground) {
      const wsVideo = canvasManager.value.workspaceVideoBackground.videoElement
      if (wsVideo) {
        wsVideo.pause()
        wsVideo.src = ''
      }
      canvasManager.value.workspaceVideoBackground = null
      console.log('🗑️ Workspace-Video-Hintergrund entfernt')
    }

    canvasManager.value.redrawCallback()
    console.log('✅ Workspace-Hintergrund zurückgesetzt')
  }

  function resetAllBackgrounds() {
    if (!canvasManager.value) {
      console.warn('⚠️ CanvasManager nicht verfügbar')
      return
    }

    saveCanvasState()

    console.log('🔄 Setze alle Hintergründe zurück')

    canvasManager.value.setBackground('#ffffff')
    backgroundColor.value = '#ffffff'
    backgroundOpacity.value = 1.0

    canvasManager.value.workspaceBackground = null

    bgFlipH.value = false
    bgFlipV.value = false
    wsBgFlipH.value = false
    wsBgFlipV.value = false

    if (canvasManager.value.videoBackground) {
      const video = canvasManager.value.videoBackground.videoElement
      if (video) {
        video.pause()
        video.src = ''
      }
      canvasManager.value.videoBackground = null
      console.log('🗑️ Video-Hintergrund entfernt')
    }

    if (canvasManager.value.workspaceVideoBackground) {
      const wsVideo = canvasManager.value.workspaceVideoBackground.videoElement
      if (wsVideo) {
        wsVideo.pause()
        wsVideo.src = ''
      }
      canvasManager.value.workspaceVideoBackground = null
      console.log('🗑️ Workspace-Video-Hintergrund entfernt')
    }

    canvasManager.value.redrawCallback()
    updateColorDisplay()
    console.log('✅ Alle Hintergründe zurückgesetzt')
  }

  function confirmReset() {
    if (!canvasManager.value) {
      console.warn('⚠️ CanvasManager nicht verfügbar')
      return
    }

    saveCanvasState()

    console.log('🗑️ Setze Canvas komplett zurück')
    canvasManager.value.reset()
    backgroundColor.value = '#ffffff'
    backgroundOpacity.value = 1.0
    updateColorDisplay()
    console.log('✅ Canvas zurückgesetzt')
  }

  // ===== INIT =====

  function initializeCanvasSettings() {
    if (!canvasManager.value) return false

    canvasManager.value.setBackground('#ffffff')
    backgroundColor.value = '#ffffff'
    backgroundOpacity.value = 1.0
    updateColorDisplay()
    console.log('✅ CanvasControlPanel initialisiert - Hintergrund auf Weiß gesetzt')
    return true
  }

  function handlePresetApply(event) {
    const bg = event.detail?.background
    if (!bg || !canvasManager.value) return
    backgroundColor.value = bg.color || '#ffffff'
    backgroundOpacity.value = bg.opacity ?? 1.0
    gradientEnabled.value = bg.gradientEnabled ?? false
    gradientColor2.value = bg.gradientColor2 || '#0066ff'
    applyBackgroundColor()
    if (gradientEnabled.value) updateGradientSettings()
  }

  // ===== WATCHERS =====

  watch([backgroundColor, backgroundOpacity], () => {
    updateColorDisplay()
  })

  watch(
    () => canvasManager.value?.background,
    (newBg) => {
      if (newBg && typeof newBg === 'object' && newBg.fotoSettings) {
        bgFlipH.value = newBg.fotoSettings.flipH || false
        bgFlipV.value = newBg.fotoSettings.flipV || false
      } else {
        bgFlipH.value = false
        bgFlipV.value = false
      }
    },
    { deep: true },
  )

  watch(
    () => canvasManager.value?.workspaceBackground,
    (newWsBg) => {
      if (newWsBg && newWsBg.fotoSettings) {
        wsBgFlipH.value = newWsBg.fotoSettings.flipH || false
        wsBgFlipV.value = newWsBg.fotoSettings.flipV || false
      } else {
        wsBgFlipH.value = false
        wsBgFlipV.value = false
      }
    },
    { deep: true },
  )

  watch(
    () => canvasManager.value,
    (newValue) => {
      if (newValue) {
        console.log('✅ CanvasManager verfügbar - initialisiere Einstellungen')
        nextTick(() => {
          initializeCanvasSettings()
        })
      }
    },
    { immediate: true },
  )

  // ===== LIFECYCLE =====

  onMounted(() => {
    loadPresets()
    window.addEventListener('preset:apply', handlePresetApply)
    if (!initializeCanvasSettings()) {
      console.log('⏳ CanvasControlPanel mounted - warte auf CanvasManager...')
    }
  })

  onUnmounted(() => {
    window.removeEventListener('preset:apply', handlePresetApply)
  })

  return {
    // Refs
    backgroundColor,
    backgroundOpacity,
    colorDisplay,
    gradientEnabled,
    gradientColor2,
    gradientType,
    gradientAngle,
    bgAudioEnabled,
    bgAudioSource,
    bgAudioSmoothing,
    bgEffectHue,
    bgEffectHueIntensity,
    bgEffectBrightness,
    bgEffectBrightnessIntensity,
    bgEffectSaturation,
    bgEffectSaturationIntensity,
    bgEffectGlow,
    bgEffectGlowIntensity,
    bgEffectStrobe,
    bgEffectStrobeIntensity,
    bgEffectContrast,
    bgEffectContrastIntensity,
    bgEffectGradientPulse,
    bgEffectGradientPulseIntensity,
    bgEffectGradientRotation,
    bgEffectGradientRotationIntensity,
    bgFlipH,
    bgFlipV,
    wsBgFlipH,
    wsBgFlipV,
    showBackgroundReplaceModal,
    replaceType,
    pendingBackgroundReplaceImage,
    pendingBackgroundReplaceSrc,
    showBgReplaceGallery,
    bgGalleryCategories,
    bgGalleryImages,
    selectedBgCategory,
    selectedBgGalleryImage,
    bgGalleryLoading,
    bgGalleryCategoryCache,
    savedPresets,
    undoHistory,
    // Computed
    hasImageBackground,
    hasWorkspaceBackground,
    hasVideoBackground,
    hasWorkspaceVideoBackground,
    backgroundImageSrc,
    workspaceBackgroundImageSrc,
    currentBackgroundForReplace,
    canUndo,
    isCanvasEmpty,
    // Functions
    hexToRGBA,
    rgbToHex,
    parseRGBA,
    updateColorDisplay,
    updateFromColorPicker,
    updateFromOpacitySlider,
    updateFromTextInput,
    formatColorDisplay,
    applyBackgroundColor,
    updateBgAudioReactive,
    updateGradientSettings,
    toggleBgFlipH,
    toggleBgFlipV,
    toggleWsBgFlipH,
    toggleWsBgFlipV,
    openBackgroundReplaceModal,
    closeBackgroundReplaceModal,
    handleBackgroundReplaceFile,
    confirmBackgroundReplace,
    cancelBackgroundReplace,
    openBgReplaceGallery,
    closeBgReplaceGallery,
    selectBgGalleryCategory,
    selectBgGalleryImage,
    confirmBgReplaceFromGallery,
    loadPresets,
    saveCurrentAsPreset,
    loadPreset,
    deletePreset,
    saveCanvasState,
    undoLastChange,
    resetNormalBackground,
    resetWorkspaceBackgroundOnly,
    resetAllBackgrounds,
    confirmReset,
    initializeCanvasSettings,
    handlePresetApply,
  }
}
