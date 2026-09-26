import { ref, computed, watch, onMounted, onUnmounted, nextTick, inject } from 'vue'
import { serializeBackgroundAudio } from '../lib/audio/audioReactiveConfig.js'
import { hexToRGBA, rgbToHex, parseRGBA } from '../lib/background/bgColor.js'
import {
  captureImageBackground,
  applyImageBackground,
  captureVideoBackground,
  applyVideoBackground,
  clearCanvasVideoBackgrounds,
  removeVideoBackground,
} from '../lib/background/backgroundMedia.js'
import { captureCanvasElements, restoreCanvasElements } from '../lib/background/canvasElements.js'
import { useBackgroundBridgeStore } from '../stores/backgroundBridgeStore.js'
import { useToastStore } from '../stores/toastStore.js'
import { useTickerStore } from '../stores/tickerStore.js'
import { useI18n } from '../lib/i18n.js'
import { useHistoryStore } from '../stores/historyStore.js'
import { getHistoryRecorder } from '../lib/history/historyRecorder.js'
import { createBackgroundSegment } from '../lib/history/segments/backgroundSegment.js'
import { useBgAudioReactive } from './bg/useBgAudioReactive.js'
import { useBgReplace } from './bg/useBgReplace.js'
import { useBgPresets } from './bg/useBgPresets.js'

/**
 * Hintergrund-Steuerung des Canvas (Fassade).
 *
 * Bündelt Farbe/Gradient/Flip/Reset (hier) mit den Teilbereichen
 * Audio-Reaktiv (bg/useBgAudioReactive), Ersetzen/Galerie (bg/useBgReplace)
 * und Canvas-Presets (bg/useBgPresets). Die zurückgegebene API ist stabil –
 * Komponenten nutzen sie über `provide('bgSettings', useBgSettings())`.
 */
export function useBgSettings() {
  const canvasManager = inject('canvasManager')
  const getCm = () => canvasManager.value
  const backgroundBridge = useBackgroundBridgeStore()
  const toastStore = useToastStore()
  const tickerStore = useTickerStore()
  const { t } = useI18n()

  const backgroundColor = ref('#ffffff')
  const backgroundOpacity = ref(1.0)
  const colorDisplay = ref('rgba(255, 255, 255, 1)')

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

  const isCanvasEmpty = computed(() => {
    if (!canvasManager.value) return true
    return canvasManager.value.isCanvasEmpty()
  })

  // ===== TEILBEREICHE =====

  const audio = useBgAudioReactive(canvasManager)
  const {
    bgAudioReactive,
    activeBgAudioPreset,
    updateBgAudioReactive,
    bumpBgAudioRevision,
    restoreBgAudioFromSnapshot,
  } = audio

  const replace = useBgReplace(canvasManager, { backgroundImageSrc, workspaceBackgroundImageSrc })

  const presets = useBgPresets({
    createPreset: () => ({
      // Bild-Hintergrund (z.B. Galeriebild) inkl. Bild-Audio-Reaktiv mitspeichern
      backgroundImage: captureImageBackground(getCm()),
      // Video-Hintergrund (falls vorhanden) inkl. Bild-Audio-Reaktiv mitspeichern
      backgroundVideo: captureVideoBackground(getCm()),
      // Alle Canvas-Elemente (Bilder, Videos, Texte, Lauftext) inkl. Position,
      // Einstellungen und Audio-Reaktiv im Moment des Speicherns erfassen.
      elements: captureCanvasElements(getCm(), tickerStore),
      ...captureColorState(),
    }),
    applyPreset: applyPresetState,
    toastStore,
    t,
  })

  // ===== FARBE & GRADIENT =====

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

    const rgbaColor = hexToRGBA(backgroundColor.value, backgroundOpacity.value)
    console.log('🎨 Setze Hintergrundfarbe:', rgbaColor)
    canvasManager.value.setBackground(rgbaColor)
  }

  function updateGradientSettings() {
    if (!canvasManager.value) return

    const settings = {
      enabled: gradientEnabled.value,
      color2: gradientColor2.value,
      type: gradientType.value,
      angle: gradientAngle.value,
    }
    canvasManager.value.setGradientSettings(settings)
    console.log('🌈 Gradient:', settings)
  }

  // ===== FLIP =====

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

  // ===== SZENE (gemeinsam für Presets & Beat-Marker-Snapshots) =====

  /** Farbe, Gradient und Hintergrund-Audio-Reaktiv als flaches Objekt. */
  function captureColorState() {
    return {
      backgroundColor: backgroundColor.value,
      backgroundOpacity: backgroundOpacity.value,
      gradientEnabled: Boolean(gradientEnabled.value),
      gradientColor2: gradientColor2.value,
      gradientType: gradientType.value,
      gradientAngle: gradientAngle.value,
      // Hintergrund-Audio-Reaktiv (flaches, rückwärtskompatibles Format)
      ...serializeBackgroundAudio(bgAudioReactive),
    }
  }

  /**
   * Setzt den Hintergrund (Video > Bild > Farbe/Gradient) und ersetzt ggf. die
   * Vordergrund-Elemente. Farb-/Gradient-Refs müssen vorher gesetzt sein.
   * Wirft, wenn der CanvasManager fehlt (Aufrufer fangen ab).
   * @param {object} state - Preset oder Snapshot
   * @param {{ autoplay?: boolean }} options - Video von vorne starten (Beat-Marker)
   */
  function applyScene(state, { autoplay = false } = {}) {
    if (state.backgroundVideo?.src) {
      // Video-Hintergrund inkl. Bild-Audio-Reaktiv
      applyVideoBackground(getCm, state.backgroundVideo, { autoplay })
    } else if (state.backgroundImage?.src) {
      // Bild-Hintergrund (z.B. Galeriebild) inkl. Bild-Audio-Reaktiv. Kein
      // updateFromColorPicker(), da setBackground(Farbe) das Bild ersetzen würde.
      // Evtl. laufenden Video-Hintergrund entfernen.
      clearCanvasVideoBackgrounds(getCm())
      applyImageBackground(getCm, state.backgroundImage)
    } else {
      // Farb-/Gradient-Hintergrund: evtl. vorhandenes Workspace-Bild und
      // laufende Video-Hintergründe entfernen, damit die Farbe sichtbar wird
      // (setBackground ersetzt nur das Haupt-Bild).
      clearCanvasVideoBackgrounds(getCm())
      if (canvasManager.value.workspaceBackground) {
        canvasManager.value.workspaceBackground = null
      }
      updateFromColorPicker()
    }
    updateGradientSettings()
    updateBgAudioReactive()

    // Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) eines Canvas-
    // Presets einsetzen. Alte (reine Hintergrund-)Presets haben keine
    // `elements` und lassen den Vordergrund unangetastet (abwärtskompatibel).
    if (state.elements) {
      restoreCanvasElements(getCm, state.elements, tickerStore)
    }
  }

  /** Canvas-Preset anwenden (Standardwerte über `||`, wie seit jeher gespeichert). */
  function applyPresetState(preset) {
    backgroundColor.value = preset.backgroundColor
    backgroundOpacity.value = preset.backgroundOpacity

    gradientEnabled.value = preset.gradientEnabled || false
    gradientColor2.value = preset.gradientColor2 || '#0066ff'
    gradientType.value = preset.gradientType || 'radial'
    gradientAngle.value = preset.gradientAngle || 45

    restoreBgAudioFromSnapshot(preset)
    applyScene(preset)
  }

  /**
   * Erfasst den kompletten aktuellen Hintergrund (Bild/Video, Farbe, Deckkraft,
   * Gradient und alle Audio-Reaktiven Effekte) als serialisierbaren Snapshot.
   * @returns {object}
   */
  function buildBackgroundSnapshot() {
    return {
      backgroundImage: captureImageBackground(getCm()),
      backgroundVideo: captureVideoBackground(getCm()),
      ...captureColorState(),
    }
  }

  /**
   * Wendet einen zuvor erfassten Hintergrund-Snapshot an (Beat-Marker) und
   * aktualisiert Canvas + UI. Ein Video-Hintergrund startet von vorne.
   * @param {object} snapshot
   */
  function applyBackgroundSnapshot(snapshot) {
    if (!snapshot || !canvasManager.value) return

    try {
      if (snapshot.backgroundColor !== undefined) backgroundColor.value = snapshot.backgroundColor
      if (snapshot.backgroundOpacity !== undefined)
        backgroundOpacity.value = snapshot.backgroundOpacity

      gradientEnabled.value = Boolean(snapshot.gradientEnabled)
      gradientColor2.value = snapshot.gradientColor2 || '#0066ff'
      gradientType.value = snapshot.gradientType || 'radial'
      gradientAngle.value = snapshot.gradientAngle ?? 45

      restoreBgAudioFromSnapshot(snapshot)
      applyScene(snapshot, { autoplay: true })

      console.log('🎯 Hintergrund-Snapshot angewendet (Beat-Marker)')
    } catch (error) {
      console.error('❌ Fehler beim Anwenden des Hintergrund-Snapshots:', error)
    }
  }

  // ===== RESET =====

  function requireCanvasManager() {
    if (canvasManager.value) return true
    console.warn('⚠️ CanvasManager nicht verfügbar')
    return false
  }

  function resetColor() {
    canvasManager.value.setBackground('#ffffff')
    backgroundColor.value = '#ffffff'
    backgroundOpacity.value = 1.0
  }

  function resetMainVideo() {
    if (removeVideoBackground(canvasManager.value, 'videoBackground')) {
      console.log('🗑️ Video-Hintergrund entfernt')
    }
  }

  function resetWorkspaceVideo() {
    if (removeVideoBackground(canvasManager.value, 'workspaceVideoBackground')) {
      console.log('🗑️ Workspace-Video-Hintergrund entfernt')
    }
  }

  function resetNormalBackground() {
    if (!requireCanvasManager()) return

    console.log('🔄 Setze normalen Hintergrund zurück')
    resetColor()
    bgFlipH.value = false
    bgFlipV.value = false
    resetMainVideo()

    canvasManager.value.redrawCallback()
    updateColorDisplay()
    console.log('✅ Normaler Hintergrund zurückgesetzt')
  }

  function resetWorkspaceBackgroundOnly() {
    if (!requireCanvasManager()) return

    console.log('🔄 Setze Workspace-Hintergrund zurück')
    canvasManager.value.workspaceBackground = null
    wsBgFlipH.value = false
    wsBgFlipV.value = false
    resetWorkspaceVideo()

    canvasManager.value.redrawCallback()
    console.log('✅ Workspace-Hintergrund zurückgesetzt')
  }

  function resetAllBackgrounds() {
    if (!requireCanvasManager()) return

    console.log('🔄 Setze alle Hintergründe zurück')
    resetColor()
    canvasManager.value.workspaceBackground = null
    bgFlipH.value = false
    bgFlipV.value = false
    wsBgFlipH.value = false
    wsBgFlipV.value = false
    resetMainVideo()
    resetWorkspaceVideo()

    canvasManager.value.redrawCallback()
    updateColorDisplay()
    console.log('✅ Alle Hintergründe zurückgesetzt')
  }

  function confirmReset() {
    if (!requireCanvasManager()) return

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

    resetColor()
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

  /** Flip-Refs aus den fotoSettings eines (Workspace-)Hintergrunds übernehmen. */
  function syncFlip(bg, flipH, flipV) {
    const fs = bg && typeof bg === 'object' ? bg.fotoSettings : null
    flipH.value = fs?.flipH || false
    flipV.value = fs?.flipV || false
  }

  watch(
    () => canvasManager.value?.background,
    (newBg) => syncFlip(newBg, bgFlipH, bgFlipV),
    { deep: true },
  )

  watch(
    () => canvasManager.value?.workspaceBackground,
    (newWsBg) => syncFlip(newWsBg, wsBgFlipH, wsBgFlipV),
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

  // ↩️ Globaler Undo/Redo: Hintergrund als History-Segment
  let unregisterHistorySegment = null

  onMounted(() => {
    unregisterHistorySegment = getHistoryRecorder(useHistoryStore()).registerSegment(
      'background',
      createBackgroundSegment({
        getCanvasManager: getCm,
        refs: {
          backgroundColor,
          backgroundOpacity,
          gradientEnabled,
          gradientColor2,
          gradientType,
          gradientAngle,
        },
        bgAudioReactive,
        afterApply() {
          activeBgAudioPreset.value = null
          updateColorDisplay()
          updateBgAudioReactive()
          bumpBgAudioRevision()
        },
      }),
    )
    presets.loadPresets()
    window.addEventListener('preset:apply', handlePresetApply)
    // Bridge registrieren, damit z.B. Beat-Marker den Hintergrund erfassen/anwenden können
    backgroundBridge.register(buildBackgroundSnapshot, applyBackgroundSnapshot)
    if (!initializeCanvasSettings()) {
      console.log('⏳ CanvasControlPanel mounted - warte auf CanvasManager...')
    }
  })

  onUnmounted(() => {
    unregisterHistorySegment?.()
    window.removeEventListener('preset:apply', handlePresetApply)
    backgroundBridge.register(null, null)
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
    bgAudioReactive,
    activeBgAudioPreset,
    bgAudioRevision: audio.bgAudioRevision,
    hasSavedBgAudioSettings: audio.hasSavedBgAudioSettings,
    setBgAudioEnabled: audio.setBgAudioEnabled,
    setBgAudioProperty: audio.setBgAudioProperty,
    setBgEffectEnabled: audio.setBgEffectEnabled,
    setBgEffectIntensity: audio.setBgEffectIntensity,
    setBgEffectSource: audio.setBgEffectSource,
    toggleBgAudioPreset: audio.toggleBgAudioPreset,
    clearBgAudioPreset: audio.clearBgAudioPreset,
    saveBgAudioSettings: audio.saveBgAudioSettings,
    applyBgAudioSettings: audio.applyBgAudioSettings,
    bgFlipH,
    bgFlipV,
    wsBgFlipH,
    wsBgFlipV,
    showBackgroundReplaceModal: replace.showBackgroundReplaceModal,
    replaceType: replace.replaceType,
    pendingBackgroundReplaceImage: replace.pendingBackgroundReplaceImage,
    pendingBackgroundReplaceSrc: replace.pendingBackgroundReplaceSrc,
    showBgReplaceGallery: replace.showBgReplaceGallery,
    bgGalleryCategories: replace.bgGalleryCategories,
    bgGalleryImages: replace.bgGalleryImages,
    selectedBgCategory: replace.selectedBgCategory,
    selectedBgGalleryImage: replace.selectedBgGalleryImage,
    bgGalleryLoading: replace.bgGalleryLoading,
    bgGalleryCategoryCache: replace.bgGalleryCategoryCache,
    savedPresets: presets.savedPresets,
    // Computed
    hasImageBackground,
    hasWorkspaceBackground,
    hasVideoBackground,
    hasWorkspaceVideoBackground,
    backgroundImageSrc,
    workspaceBackgroundImageSrc,
    currentBackgroundForReplace: replace.currentBackgroundForReplace,
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
    openBackgroundReplaceModal: replace.openBackgroundReplaceModal,
    closeBackgroundReplaceModal: replace.closeBackgroundReplaceModal,
    handleBackgroundReplaceFile: replace.handleBackgroundReplaceFile,
    confirmBackgroundReplace: replace.confirmBackgroundReplace,
    cancelBackgroundReplace: replace.cancelBackgroundReplace,
    openBgReplaceGallery: replace.openBgReplaceGallery,
    closeBgReplaceGallery: replace.closeBgReplaceGallery,
    selectBgGalleryCategory: replace.selectBgGalleryCategory,
    selectBgGalleryImage: replace.selectBgGalleryImage,
    confirmBgReplaceFromGallery: replace.confirmBgReplaceFromGallery,
    loadPresets: presets.loadPresets,
    saveCurrentAsPreset: presets.saveCurrentAsPreset,
    loadPreset: presets.loadPreset,
    deletePreset: presets.deletePreset,
    buildBackgroundSnapshot,
    applyBackgroundSnapshot,
    resetNormalBackground,
    resetWorkspaceBackgroundOnly,
    resetAllBackgrounds,
    confirmReset,
    initializeCanvasSettings,
    handlePresetApply,
  }
}
