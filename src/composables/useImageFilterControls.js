import { ref, reactive, computed, watch } from 'vue'
import { normalizeHex } from '../lib/color.js'

/** Werkseinstellungen aller numerischen Filter (Reset-Werte der SliderFields). */
export const IMAGE_FILTER_DEFAULTS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  hueRotate: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  rotation: 0, // Grad, -180..180
  borderWidth: 0,
  borderOpacity: 100,
})

/**
 * All state + imperative logic for the image filters panel (ImageFiltersPanel).
 *
 * Numeric sliders and colors are reactive state (`filters`, `shadowColor`,
 * `borderColor`) bound to SliderField/ColorField components; only the preset
 * select and the container are still plain template refs. The sub-sections of
 * the panel consume this state and the handlers returned here through
 * provide/inject. Keeping the logic in one place preserves the cross-section
 * undo/redo history and the single `loadImageSettings` that writes every control.
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
      ...filters,
      shadowColor: shadowColor.value,
      flipH: flipHRef.value,
      flipV: flipVRef.value,
      borderColor: borderColor.value,
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

  // Numerische Filterwerte (SliderField ist v-model-basiert, kein DOM-Ref)
  const filters = reactive({ ...IMAGE_FILTER_DEFAULTS })

  // Farben sind reaktive Werte (ColorField ist v-model-basiert, kein DOM-Ref)
  const shadowColor = ref('#000000')

  // Flip Refs
  const flipHRef = ref(false)
  const flipVRef = ref(false)

  // Visualizer Layer Ref
  const renderBehindVisualizerRef = ref(false)

  // Border
  const borderColor = ref('#ffffff')

  // Emit filter change
  function emitFilterChange(property, value) {
    emit('filter-change', { property, value })
  }

  // Handlers
  function onPresetChange(event) {
    emit('preset-change', event.target.value)
  }

  /**
   * Erzeugt einen Handler für ein numerisches Filterfeld. Der Wert kommt als
   * Zahl vom SliderField (`update:modelValue`).
   * @param {keyof typeof IMAGE_FILTER_DEFAULTS} property
   */
  function numericHandler(property) {
    return (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return
      filters[property] = n
      emitFilterChange(property, n)
    }
  }

  const onBrightnessChange = numericHandler('brightness')
  const onContrastChange = numericHandler('contrast')
  const onSaturationChange = numericHandler('saturation')
  const onOpacityChange = numericHandler('opacity')
  const onBlurChange = numericHandler('blur')
  const onHueRotateChange = numericHandler('hueRotate')

  /** @param {string} hex - vom ColorField emittierter Hex-Wert */
  function onShadowColorChange(hex) {
    shadowColor.value = hex
    emitFilterChange('shadowColor', hex)
  }

  function onShadowColorTextChange(event) {
    const hex = normalizeHex(event.target.value)
    if (!hex) {
      event.target.value = shadowColor.value // ungültige Eingabe verwerfen
      return
    }
    onSliderStart() // Undo-Snapshot vor der Änderung
    shadowColor.value = hex
    emitFilterChange('shadowColor', hex)
    onSliderEnd()
  }

  const onShadowBlurChange = numericHandler('shadowBlur')
  const onShadowOffsetXChange = numericHandler('shadowOffsetX')
  const onShadowOffsetYChange = numericHandler('shadowOffsetY')
  /** Rotation direkt in Grad (-180..180). */
  const onRotationChange = numericHandler('rotation')

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

  /** @param {string} hex - vom ColorField emittierter Hex-Wert */
  function onBorderColorChange(hex) {
    borderColor.value = hex
    emitFilterChange('borderColor', hex)
  }

  function onBorderColorTextChange(event) {
    const hex = normalizeHex(event.target.value)
    if (!hex) {
      event.target.value = borderColor.value // ungültige Eingabe verwerfen
      return
    }
    onSliderStart() // Undo-Snapshot vor der Änderung
    borderColor.value = hex
    emitFilterChange('borderColor', hex)
    onSliderEnd()
  }

  const onBorderWidthChange = numericHandler('borderWidth')
  const onBorderOpacityChange = numericHandler('borderOpacity')

  function resetFilters() {
    _pushToUndo(_getCurrentSnapshot())
    // Reset all controls to default values
    Object.assign(filters, IMAGE_FILTER_DEFAULTS)
    shadowColor.value = '#000000'
    flipHRef.value = false
    flipVRef.value = false
    borderColor.value = '#ffffff'

    if (presetSelectRef.value) presetSelectRef.value.value = ''

    emit('reset-filters')
  }

  function loadImageSettings(settings) {
    const s = settings || {}

    // `|| default` wie bisher: 0/undefined fallen auf den Default zurück –
    // außer bei Feldern, deren Default ohnehin 0 ist bzw. wo 0 gültig ist (borderOpacity).
    filters.brightness = s.brightness || IMAGE_FILTER_DEFAULTS.brightness
    filters.contrast = s.contrast || IMAGE_FILTER_DEFAULTS.contrast
    filters.saturation = s.saturation || IMAGE_FILTER_DEFAULTS.saturation
    filters.opacity = s.opacity || IMAGE_FILTER_DEFAULTS.opacity
    filters.blur = s.blur || 0
    filters.hueRotate = s.hueRotate || 0

    shadowColor.value = s.shadowColor || '#000000'
    filters.shadowBlur = s.shadowBlur || 0
    filters.shadowOffsetX = s.shadowOffsetX || 0
    filters.shadowOffsetY = s.shadowOffsetY || 0
    filters.rotation = s.rotation || 0

    flipHRef.value = s.flipH || false
    flipVRef.value = s.flipV || false
    renderBehindVisualizerRef.value = s.renderBehindVisualizer || false

    borderColor.value = s.borderColor || '#ffffff'
    filters.borderWidth = s.borderWidth || 0
    filters.borderOpacity = s.borderOpacity ?? IMAGE_FILTER_DEFAULTS.borderOpacity

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
    filters,
    shadowColor,
    flipHRef,
    flipVRef,
    renderBehindVisualizerRef,
    borderColor,
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
