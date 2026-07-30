import { ref, watch } from 'vue'
import {
  defaultTextSettings,
  loadTextDefaults,
  saveTextDefaults,
  clearTextDefaults,
  hasTextDefaults,
} from '../lib/textDefaults.js'

export function useNewTextSettings(canvasManager) {
  const newTextStyle = ref({
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ff0000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'center',
    opacity: 100,
    letterSpacing: 0,
    lineHeightMultiplier: 120,
    rotation: 0,
    autoFit: false,
    autoFitPadding: 10,
  })

  const newTextShadow = ref({ color: '#000000', blur: 0, offsetX: 0, offsetY: 0 })
  const newTextStroke = ref({ enabled: false, color: '#000000', width: 2 })

  const newTextTypewriter = ref({
    enabled: false,
    speed: 50,
    startDelay: 0,
    loop: false,
    loopDelay: 1000,
    permanent: true,
    displayDuration: 5000,
    showCursor: true,
    cursorChar: '|',
  })

  const newTextFade = ref({
    enabled: false,
    duration: 1000,
    startDelay: 0,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    permanent: true,
    displayDuration: 5000,
    easing: 'ease',
  })

  const newTextScale = ref({
    enabled: false,
    duration: 1000,
    startDelay: 0,
    startScale: 0,
    endScale: 1,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    permanent: true,
    displayDuration: 5000,
    easing: 'ease',
  })

  const newTextSlide = ref({
    enabled: false,
    duration: 1000,
    startDelay: 0,
    from: 'left',
    distance: 100,
    direction: 'in',
    loop: false,
    loopDelay: 1000,
    permanent: true,
    displayDuration: 5000,
    easing: 'ease',
  })

  const newTextPosition = ref({
    x: 0.5,
    y: 0.5,
    xPixel: 0,
    yPixel: 0,
  })

  const isSelectingOnCanvas = ref(false)
  const textSelectionBounds = ref(null)
  const canvasWidth = ref(1920)
  const canvasHeight = ref(1080)

  function loadSavedSettings() {
    try {
      const settings = loadTextDefaults()
      if (settings) {
        if (settings.style) {
          newTextStyle.value = { ...newTextStyle.value, ...settings.style }
        }
        if (settings.shadow) {
          newTextShadow.value = { ...newTextShadow.value, ...settings.shadow }
        }
        if (settings.stroke) {
          newTextStroke.value = { ...newTextStroke.value, ...settings.stroke }
        }
        if (settings.typewriter) {
          newTextTypewriter.value = { ...newTextTypewriter.value, ...settings.typewriter }
        }
        if (settings.fade) {
          newTextFade.value = { ...newTextFade.value, ...settings.fade }
        }
        if (settings.scale) {
          newTextScale.value = { ...newTextScale.value, ...settings.scale }
        }
        if (settings.slide) {
          newTextSlide.value = { ...newTextSlide.value, ...settings.slide }
        }
        if (settings.position && typeof settings.position.x === 'number') {
          newTextPosition.value.x = settings.position.x
          newTextPosition.value.y = settings.position.y
        }

        console.log('✅ Gespeicherte Text-Einstellungen geladen')
        return true
      }
    } catch (e) {
      console.warn('⚠️ Fehler beim Laden der Einstellungen:', e)
    }
    return false
  }

  function saveCurrentSettings() {
    const settings = {
      style: {
        fontSize: newTextStyle.value.fontSize,
        fontFamily: newTextStyle.value.fontFamily,
        color: newTextStyle.value.color,
        fontWeight: newTextStyle.value.fontWeight,
        fontStyle: newTextStyle.value.fontStyle,
        textAlign: newTextStyle.value.textAlign,
        opacity: newTextStyle.value.opacity,
        letterSpacing: newTextStyle.value.letterSpacing,
        lineHeightMultiplier: newTextStyle.value.lineHeightMultiplier,
        rotation: newTextStyle.value.rotation,
        autoFit: newTextStyle.value.autoFit,
        autoFitPadding: newTextStyle.value.autoFitPadding,
      },
      shadow: { ...newTextShadow.value },
      stroke: { ...newTextStroke.value },
      position: { x: newTextPosition.value.x, y: newTextPosition.value.y },
      typewriter: { ...newTextTypewriter.value },
      fade: { ...newTextFade.value },
      scale: { ...newTextScale.value },
      slide: { ...newTextSlide.value },
    }

    const ok = saveTextDefaults(settings)
    if (ok) console.log('💾 Text-Einstellungen gespeichert')
    return ok
  }

  function clearSavedSettings() {
    const ok = clearTextDefaults()
    resetNewTextSettings()
    if (ok) console.log('🗑️ Gespeicherte Einstellungen gelöscht')
    return ok
  }

  function hasSavedSettings() {
    return hasTextDefaults()
  }

  function resetNewTextSettings() {
    newTextTypewriter.value = {
      enabled: false,
      speed: 50,
      startDelay: 0,
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      showCursor: true,
      cursorChar: '|',
    }

    newTextFade.value = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    }

    newTextScale.value = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      startScale: 0,
      endScale: 1,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    }

    newTextSlide.value = {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      from: 'left',
      distance: 100,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    }

    newTextStyle.value = {
      fontSize: 48,
      fontFamily: 'Arial',
      color: '#ff0000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      opacity: 100,
      letterSpacing: 0,
      lineHeightMultiplier: 120,
      rotation: 0,
      autoFit: false,
      autoFitPadding: 10,
    }

    const defaults = defaultTextSettings()
    newTextShadow.value = { ...defaults.shadow }
    newTextStroke.value = { ...defaults.stroke }
  }

  function calculateAutoFitFontSize(text, fontFamily, fontWeight, fontStyle, paddingPercent = 10) {
    if (!canvasManager.value || !text) return 48

    const canvas = canvasManager.value.canvas
    if (!canvas) return 48

    const cWidth = canvas.width
    const cHeight = canvas.height

    const padding = paddingPercent / 100
    const availableWidth = cWidth * (1 - padding * 2)
    const availableHeight = cHeight * (1 - padding * 2)

    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    const lines = text.split('\n')
    const lineCount = lines.length

    let fontSize = 200
    const minFontSize = 12
    const lineHeightMultiplier = 1.2

    while (fontSize > minFontSize) {
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

      const totalHeight = fontSize * lineHeightMultiplier * lineCount

      let maxWidth = 0
      lines.forEach((line) => {
        const metrics = ctx.measureText(line)
        if (metrics.width > maxWidth) {
          maxWidth = metrics.width
        }
      })

      if (maxWidth <= availableWidth && totalHeight <= availableHeight) {
        break
      }

      fontSize -= 2
    }

    return Math.max(fontSize, minFontSize)
  }

  function normalizeLineBreaks(text) {
    if (!text) return text
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    return normalized
  }

  function updateCanvasDimensions() {
    if (canvasManager.value && canvasManager.value.canvas) {
      canvasWidth.value = canvasManager.value.canvas.width
      canvasHeight.value = canvasManager.value.canvas.height

      newTextPosition.value.xPixel = Math.round(newTextPosition.value.x * canvasWidth.value)
      newTextPosition.value.yPixel = Math.round(newTextPosition.value.y * canvasHeight.value)
    }
  }

  function resetNewTextPosition() {
    newTextPosition.value = {
      x: 0.5,
      y: 0.5,
      xPixel: Math.round(canvasWidth.value / 2),
      yPixel: Math.round(canvasHeight.value / 2),
    }
    textSelectionBounds.value = null
    isSelectingOnCanvas.value = false
  }

  function updatePositionFromPixel(axis) {
    if (axis === 'x') {
      newTextPosition.value.x = newTextPosition.value.xPixel / canvasWidth.value
    } else {
      newTextPosition.value.y = newTextPosition.value.yPixel / canvasHeight.value
    }
    updatePositionPreview()
  }

  function setQuickPosition(position) {
    const positions = {
      'top-left': { x: 0.1, y: 0.1 },
      'top-center': { x: 0.5, y: 0.1 },
      'top-right': { x: 0.9, y: 0.1 },
      'middle-left': { x: 0.1, y: 0.5 },
      center: { x: 0.5, y: 0.5 },
      'middle-right': { x: 0.9, y: 0.5 },
      'bottom-left': { x: 0.1, y: 0.9 },
      'bottom-center': { x: 0.5, y: 0.9 },
      'bottom-right': { x: 0.9, y: 0.9 },
    }

    const pos = positions[position]
    if (pos) {
      newTextPosition.value.x = pos.x
      newTextPosition.value.y = pos.y
      newTextPosition.value.xPixel = Math.round(pos.x * canvasWidth.value)
      newTextPosition.value.yPixel = Math.round(pos.y * canvasHeight.value)
      textSelectionBounds.value = null

      updatePositionPreview()
    }
  }

  function updatePositionPreview() {
    if (canvasManager.value) {
      canvasManager.value.setTextPositionPreview(newTextPosition.value.x, newTextPosition.value.y)
    }
  }

  function clearPositionPreview() {
    if (canvasManager.value) {
      canvasManager.value.clearTextPositionPreview()
    }
  }

  function startTextSelectionOnCanvas() {
    if (!canvasManager.value) return

    isSelectingOnCanvas.value = true

    canvasManager.value.startTextSelectionMode((bounds) => {
      textSelectionBounds.value = bounds

      newTextPosition.value.x = bounds.relCenterX
      newTextPosition.value.y = bounds.relCenterY
      newTextPosition.value.xPixel = Math.round(bounds.centerX)
      newTextPosition.value.yPixel = Math.round(bounds.centerY)

      isSelectingOnCanvas.value = false

      console.log('✅ Text-Bereich ausgewählt:', bounds)
    })
  }

  function cancelTextSelectionOnCanvas() {
    if (canvasManager.value) {
      canvasManager.value.cancelTextSelectionMode()
    }
    isSelectingOnCanvas.value = false
  }

  function clearTextSelection() {
    textSelectionBounds.value = null
    if (canvasManager.value) {
      canvasManager.value.cancelTextSelectionMode()
    }
  }

  function updateSelectedTextPixelPosition(
    axis,
    event,
    selectedText,
    canvasW,
    canvasH,
    updateText,
  ) {
    if (!selectedText.value) return

    const value = parseFloat(event.target.value)
    if (isNaN(value)) return

    if (axis === 'x') {
      selectedText.value.relX = value / canvasW.value
    } else {
      selectedText.value.relY = value / canvasH.value
    }
    updateText()
  }

  function setSelectedTextQuickPosition(position, selectedText, updateText) {
    if (!selectedText.value) return

    const positions = {
      'top-left': { x: 0.1, y: 0.1 },
      'top-center': { x: 0.5, y: 0.1 },
      'top-right': { x: 0.9, y: 0.1 },
      'middle-left': { x: 0.1, y: 0.5 },
      center: { x: 0.5, y: 0.5 },
      'middle-right': { x: 0.9, y: 0.5 },
      'bottom-left': { x: 0.1, y: 0.9 },
      'bottom-center': { x: 0.5, y: 0.9 },
      'bottom-right': { x: 0.9, y: 0.9 },
    }

    const pos = positions[position]
    if (pos) {
      selectedText.value.relX = pos.x
      selectedText.value.relY = pos.y
      updateText()
    }
  }

  // Watch canvas dimensions
  watch(
    () => canvasManager.value?.canvas,
    (canvas) => {
      if (canvas) {
        canvasWidth.value = canvas.width
        canvasHeight.value = canvas.height
      }
    },
    { immediate: true },
  )

  return {
    newTextStyle,
    newTextShadow,
    newTextStroke,
    newTextTypewriter,
    newTextFade,
    newTextScale,
    newTextSlide,
    newTextPosition,
    isSelectingOnCanvas,
    textSelectionBounds,
    canvasWidth,
    canvasHeight,
    loadSavedSettings,
    saveCurrentSettings,
    clearSavedSettings,
    hasSavedSettings,
    resetNewTextSettings,
    calculateAutoFitFontSize,
    normalizeLineBreaks,
    updateCanvasDimensions,
    resetNewTextPosition,
    updatePositionFromPixel,
    setQuickPosition,
    updatePositionPreview,
    clearPositionPreview,
    startTextSelectionOnCanvas,
    cancelTextSelectionOnCanvas,
    clearTextSelection,
    updateSelectedTextPixelPosition,
    setSelectedTextQuickPosition,
  }
}
