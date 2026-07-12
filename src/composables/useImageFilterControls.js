import { ref, computed, watch } from 'vue'

/**
 * All state + imperative logic for the image filters panel (ImageFiltersPanel).
 *
 * The sliders/inputs are uncontrolled DOM elements manipulated directly through
 * template refs; the sub-sections of the panel bind those refs via `:ref` and
 * call the handlers returned here (shared through provide/inject). Keeping the
 * logic in one place preserves the cross-section undo/redo history and the
 * single `loadImageSettings` that writes every control.
 *
 * @param {object} props - the panel props (currentActiveImage, ...).
 * @param {(event: string, payload?: any) => void} emit - the panel's emit.
 */
export function useImageFilterControls(props, emit) {
  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const MAX_HISTORY = 30
  const undoStack = ref([])
  const redoStack = ref([])
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  let _beforeSnapshot = null

  function _getCurrentSnapshot() {
    return {
      brightness: parseInt(brightnessInputRef.value?.value ?? 100),
      contrast: parseInt(contrastInputRef.value?.value ?? 100),
      saturation: parseInt(saturationInputRef.value?.value ?? 100),
      opacity: parseInt(opacityInputRef.value?.value ?? 100),
      blur: parseInt(blurInputRef.value?.value ?? 0),
      hueRotate: parseInt(hueRotateInputRef.value?.value ?? 0),
      shadowColor: shadowColorInputRef.value?.value ?? '#000000',
      shadowBlur: parseInt(shadowBlurInputRef.value?.value ?? 0),
      shadowOffsetX: parseInt(shadowOffsetXInputRef.value?.value ?? 0),
      shadowOffsetY: parseInt(shadowOffsetYInputRef.value?.value ?? 0),
      rotation: rotationInputRef.value ? (parseInt(rotationInputRef.value.value) - 50) * 3.6 : 0,
      flipH: flipHRef.value,
      flipV: flipVRef.value,
      borderColor: borderColorInputRef.value?.value ?? '#ffffff',
      borderWidth: parseInt(borderWidthInputRef.value?.value ?? 0),
      borderOpacity: parseInt(borderOpacityInputRef.value?.value ?? 100),
      preset: presetSelectRef.value?.value ?? '',
    }
  }

  function _pushToUndo(snapshot) {
    undoStack.value.push(snapshot)
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
  }

  function onSliderStart() {
    _beforeSnapshot = _getCurrentSnapshot()
  }

  function onSliderEnd() {
    if (_beforeSnapshot) {
      _pushToUndo(_beforeSnapshot)
      _beforeSnapshot = null
    }
  }

  function _applySnapshot(snapshot) {
    loadImageSettings(snapshot)
    const propsToEmit = [
      'brightness',
      'contrast',
      'saturation',
      'opacity',
      'blur',
      'hueRotate',
      'shadowColor',
      'shadowBlur',
      'shadowOffsetX',
      'shadowOffsetY',
      'rotation',
      'flipH',
      'flipV',
      'borderColor',
      'borderWidth',
      'borderOpacity',
    ]
    propsToEmit.forEach((p) => emit('filter-change', { property: p, value: snapshot[p] }))
    if (snapshot.preset !== undefined) emit('preset-change', snapshot.preset)
  }

  function undo() {
    if (!canUndo.value) return
    const current = _getCurrentSnapshot()
    redoStack.value.push(current)
    const previous = undoStack.value.pop()
    _applySnapshot(previous)
  }

  function redo() {
    if (!canRedo.value) return
    const current = _getCurrentSnapshot()
    // Push to undo without clearing redo stack
    undoStack.value.push(current)
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    const next = redoStack.value.pop()
    _applySnapshot(next)
  }

  // Container Ref
  const containerRef = ref(null)

  // Preset Ref
  const presetSelectRef = ref(null)

  // Filter Refs
  const brightnessInputRef = ref(null)
  const brightnessValueRef = ref(null)
  const contrastInputRef = ref(null)
  const contrastValueRef = ref(null)
  const saturationInputRef = ref(null)
  const saturationValueRef = ref(null)
  const opacityInputRef = ref(null)
  const opacityValueRef = ref(null)
  const blurInputRef = ref(null)
  const blurValueRef = ref(null)
  const hueRotateInputRef = ref(null)
  const hueRotateValueRef = ref(null)

  // Shadow Refs
  const shadowColorInputRef = ref(null)
  const shadowColorTextRef = ref(null)
  const shadowBlurInputRef = ref(null)
  const shadowBlurValueRef = ref(null)
  const shadowOffsetXInputRef = ref(null)
  const shadowOffsetXValueRef = ref(null)
  const shadowOffsetYInputRef = ref(null)
  const shadowOffsetYValueRef = ref(null)
  const rotationInputRef = ref(null)
  const rotationValueRef = ref(null)

  // Flip Refs
  const flipHRef = ref(false)
  const flipVRef = ref(false)

  // Visualizer Layer Ref
  const renderBehindVisualizerRef = ref(false)

  // Border Refs
  const borderColorInputRef = ref(null)
  const borderColorTextRef = ref(null)
  const borderWidthInputRef = ref(null)
  const borderWidthValueRef = ref(null)
  const borderOpacityInputRef = ref(null)
  const borderOpacityValueRef = ref(null)

  // Emit filter change
  function emitFilterChange(property, value) {
    emit('filter-change', { property, value })
  }

  // Handlers
  function onPresetChange(event) {
    emit('preset-change', event.target.value)
  }

  function onBrightnessChange(event) {
    const value = parseInt(event.target.value)
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = value + '%'
    emitFilterChange('brightness', value)
  }

  function onContrastChange(event) {
    const value = parseInt(event.target.value)
    if (contrastValueRef.value) contrastValueRef.value.textContent = value + '%'
    emitFilterChange('contrast', value)
  }

  function onSaturationChange(event) {
    const value = parseInt(event.target.value)
    if (saturationValueRef.value) saturationValueRef.value.textContent = value + '%'
    emitFilterChange('saturation', value)
  }

  function onOpacityChange(event) {
    const value = parseInt(event.target.value)
    if (opacityValueRef.value) opacityValueRef.value.textContent = value + '%'
    emitFilterChange('opacity', value)
  }

  function onBlurChange(event) {
    const value = parseInt(event.target.value)
    if (blurValueRef.value) blurValueRef.value.textContent = value + 'px'
    emitFilterChange('blur', value)
  }

  function onHueRotateChange(event) {
    const value = parseInt(event.target.value)
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = value + '°'
    emitFilterChange('hueRotate', value)
  }

  function onShadowColorChange(event) {
    const value = event.target.value
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = value
    emitFilterChange('shadowColor', value)
  }

  function onShadowColorTextChange(event) {
    const value = event.target.value
    if (shadowColorInputRef.value) shadowColorInputRef.value.value = value
    emitFilterChange('shadowColor', value)
  }

  function onShadowBlurChange(event) {
    const value = parseInt(event.target.value)
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = value + 'px'
    emitFilterChange('shadowBlur', value)
  }

  function onShadowOffsetXChange(event) {
    const value = parseInt(event.target.value)
    if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = value + 'px'
    emitFilterChange('shadowOffsetX', value)
  }

  function onShadowOffsetYChange(event) {
    const value = parseInt(event.target.value)
    if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = value + 'px'
    emitFilterChange('shadowOffsetY', value)
  }

  function onRotationChange(event) {
    const sliderValue = parseInt(event.target.value)
    const actualRotation = (sliderValue - 50) * 3.6
    if (rotationValueRef.value)
      rotationValueRef.value.textContent = Math.round(actualRotation) + '°'
    emitFilterChange('rotation', actualRotation)
  }

  function onFlipHorizontal() {
    onSliderEnd()
    flipHRef.value = !flipHRef.value
    emitFilterChange('flipH', flipHRef.value)
  }

  function onFlipVertical() {
    onSliderEnd()
    flipVRef.value = !flipVRef.value
    emitFilterChange('flipV', flipVRef.value)
  }

  function onRenderBehindVisualizerChange(event) {
    renderBehindVisualizerRef.value = event.target.checked
    emitFilterChange('renderBehindVisualizer', renderBehindVisualizerRef.value)
  }

  function onBorderColorChange(event) {
    const value = event.target.value
    if (borderColorTextRef.value) borderColorTextRef.value.value = value
    emitFilterChange('borderColor', value)
  }

  function onBorderColorTextChange(event) {
    const value = event.target.value
    if (borderColorInputRef.value) borderColorInputRef.value.value = value
    emitFilterChange('borderColor', value)
  }

  function onBorderWidthChange(event) {
    const value = parseInt(event.target.value)
    if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = value + 'px'
    emitFilterChange('borderWidth', value)
  }

  function onBorderOpacityChange(event) {
    const value = parseInt(event.target.value)
    if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = value + '%'
    emitFilterChange('borderOpacity', value)
  }

  function resetFilters() {
    _pushToUndo(_getCurrentSnapshot())
    // Reset all inputs to default values
    if (brightnessInputRef.value) brightnessInputRef.value.value = 100
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = '100%'
    if (contrastInputRef.value) contrastInputRef.value.value = 100
    if (contrastValueRef.value) contrastValueRef.value.textContent = '100%'
    if (saturationInputRef.value) saturationInputRef.value.value = 100
    if (saturationValueRef.value) saturationValueRef.value.textContent = '100%'
    if (opacityInputRef.value) opacityInputRef.value.value = 100
    if (opacityValueRef.value) opacityValueRef.value.textContent = '100%'
    if (blurInputRef.value) blurInputRef.value.value = 0
    if (blurValueRef.value) blurValueRef.value.textContent = '0px'
    if (hueRotateInputRef.value) hueRotateInputRef.value.value = 0
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = '0°'

    if (shadowColorInputRef.value) shadowColorInputRef.value.value = '#000000'
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = '#000000'
    if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = 0
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = '0px'
    if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = 0
    if (shadowOffsetXValueRef.value) shadowOffsetXValueRef.value.textContent = '0px'
    if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = 0
    if (shadowOffsetYValueRef.value) shadowOffsetYValueRef.value.textContent = '0px'
    if (rotationInputRef.value) rotationInputRef.value.value = 50
    if (rotationValueRef.value) rotationValueRef.value.textContent = '0°'

    flipHRef.value = false
    flipVRef.value = false

    if (borderColorInputRef.value) borderColorInputRef.value.value = '#ffffff'
    if (borderColorTextRef.value) borderColorTextRef.value.value = '#ffffff'
    if (borderWidthInputRef.value) borderWidthInputRef.value.value = 0
    if (borderWidthValueRef.value) borderWidthValueRef.value.textContent = '0px'
    if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = 100
    if (borderOpacityValueRef.value) borderOpacityValueRef.value.textContent = '100%'

    if (presetSelectRef.value) presetSelectRef.value.value = ''

    emit('reset-filters')
  }

  function loadImageSettings(settings) {
    const s = settings || {}

    if (brightnessInputRef.value) brightnessInputRef.value.value = s.brightness || 100
    if (brightnessValueRef.value) brightnessValueRef.value.textContent = (s.brightness || 100) + '%'
    if (contrastInputRef.value) contrastInputRef.value.value = s.contrast || 100
    if (contrastValueRef.value) contrastValueRef.value.textContent = (s.contrast || 100) + '%'
    if (saturationInputRef.value) saturationInputRef.value.value = s.saturation || 100
    if (saturationValueRef.value) saturationValueRef.value.textContent = (s.saturation || 100) + '%'
    if (opacityInputRef.value) opacityInputRef.value.value = s.opacity || 100
    if (opacityValueRef.value) opacityValueRef.value.textContent = (s.opacity || 100) + '%'
    if (blurInputRef.value) blurInputRef.value.value = s.blur || 0
    if (blurValueRef.value) blurValueRef.value.textContent = (s.blur || 0) + 'px'
    if (hueRotateInputRef.value) hueRotateInputRef.value.value = s.hueRotate || 0
    if (hueRotateValueRef.value) hueRotateValueRef.value.textContent = (s.hueRotate || 0) + '°'

    if (shadowColorInputRef.value) shadowColorInputRef.value.value = s.shadowColor || '#000000'
    if (shadowColorTextRef.value) shadowColorTextRef.value.value = s.shadowColor || '#000000'
    if (shadowBlurInputRef.value) shadowBlurInputRef.value.value = s.shadowBlur || 0
    if (shadowBlurValueRef.value) shadowBlurValueRef.value.textContent = (s.shadowBlur || 0) + 'px'
    if (shadowOffsetXInputRef.value) shadowOffsetXInputRef.value.value = s.shadowOffsetX || 0
    if (shadowOffsetXValueRef.value)
      shadowOffsetXValueRef.value.textContent = (s.shadowOffsetX || 0) + 'px'
    if (shadowOffsetYInputRef.value) shadowOffsetYInputRef.value.value = s.shadowOffsetY || 0
    if (shadowOffsetYValueRef.value)
      shadowOffsetYValueRef.value.textContent = (s.shadowOffsetY || 0) + 'px'

    const rotation = s.rotation || 0
    const sliderValue = Math.round(rotation / 3.6 + 50)
    if (rotationInputRef.value) rotationInputRef.value.value = sliderValue
    if (rotationValueRef.value) rotationValueRef.value.textContent = Math.round(rotation) + '°'

    flipHRef.value = s.flipH || false
    flipVRef.value = s.flipV || false
    renderBehindVisualizerRef.value = s.renderBehindVisualizer || false

    if (borderColorInputRef.value) borderColorInputRef.value.value = s.borderColor || '#ffffff'
    if (borderColorTextRef.value) borderColorTextRef.value.value = s.borderColor || '#ffffff'
    if (borderWidthInputRef.value) borderWidthInputRef.value.value = s.borderWidth || 0
    if (borderWidthValueRef.value)
      borderWidthValueRef.value.textContent = (s.borderWidth || 0) + 'px'
    if (borderOpacityInputRef.value) borderOpacityInputRef.value.value = s.borderOpacity ?? 100
    if (borderOpacityValueRef.value)
      borderOpacityValueRef.value.textContent = (s.borderOpacity ?? 100) + '%'

    if (presetSelectRef.value) presetSelectRef.value.value = s.preset || ''
  }

  // Watch for active image changes and update UI
  watch(
    () => props.currentActiveImage,
    (newImage) => {
      if (newImage && newImage.fotoSettings) {
        loadImageSettings(newImage.fotoSettings)
      }
    },
    { immediate: true, deep: true },
  )

  return {
    containerRef,
    presetSelectRef,
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
    flipHRef,
    flipVRef,
    renderBehindVisualizerRef,
    borderColorInputRef,
    borderColorTextRef,
    borderWidthInputRef,
    borderWidthValueRef,
    borderOpacityInputRef,
    borderOpacityValueRef,
    canUndo,
    canRedo,
    onSliderStart,
    onSliderEnd,
    onPresetChange,
    onBrightnessChange,
    onContrastChange,
    onSaturationChange,
    onOpacityChange,
    onBlurChange,
    onHueRotateChange,
    onShadowColorChange,
    onShadowColorTextChange,
    onShadowBlurChange,
    onShadowOffsetXChange,
    onShadowOffsetYChange,
    onRotationChange,
    onFlipHorizontal,
    onFlipVertical,
    onRenderBehindVisualizerChange,
    onBorderColorChange,
    onBorderColorTextChange,
    onBorderWidthChange,
    onBorderOpacityChange,
    undo,
    redo,
    resetFilters,
    loadImageSettings,
  }
}
