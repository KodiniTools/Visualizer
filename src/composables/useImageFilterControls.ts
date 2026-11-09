import { ref, reactive, computed, watch } from 'vue'
import { normalizeHex } from '../lib/color'
import { useHistoryStore } from '../stores/historyStore'
import type { FotoImageObject, FotoSettings } from '../lib/fotoManager'

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

/** Numerische Filterfelder des Panels */
export type ImageFilterKey = keyof typeof IMAGE_FILTER_DEFAULTS

/** Props des Filter-Panels, die das Composable liest */
export interface ImageFilterControlsProps {
  currentActiveImage?: FotoImageObject | null
}

/** Events des Filter-Panels, die das Composable auslöst */
export type ImageFilterEmit = (
  event: 'filter-change' | 'preset-change' | 'reset-filters',
  ...args: unknown[]
) => void

/**
 * All state + imperative logic for the image filters panel (ImageFiltersPanel).
 *
 * Numeric sliders and colors are reactive state (`filters`, `shadowColor`,
 * `borderColor`) bound to SliderField/ColorField components; only the preset
 * select and the container are still plain template refs. The sub-sections of
 * the panel consume this state and the handlers returned here through
 * provide/inject. Keeping the logic in one place preserves the single
 * `loadImageSettings` that writes every control. Undo/redo delegates to the
 * global history store.
 *
 * @param props - the panel props (currentActiveImage, ...).
 * @param emit - the panel's emit.
 */
export function useImageFilterControls(props: ImageFilterControlsProps, emit: ImageFilterEmit) {
  // ── Undo / Redo ────────────────────────────────────────────────────────────
  // Läuft über den globalen Verlauf: Filteränderungen landen in fotoSettings
  // des Bildes/Hintergrunds und werden dort als History-Schritt erfasst
  // (Slider-Zug = ein Schritt). Nach Undo/Redo aktualisiert der Deep-Watcher
  // auf currentActiveImage die Regler.
  const historyStore = useHistoryStore()
  const canUndo = computed(() => historyStore.canUndo)
  const canRedo = computed(() => historyStore.canRedo)

  function undo() {
    return historyStore.undo()
  }

  function redo() {
    return historyStore.redo()
  }

  // Beibehalten für die Slider-Events der Sektionen (@start/@change); die
  // Gruppierung übernimmt der History-Recorder.
  function onSliderStart() {}

  function onSliderEnd() {}

  // Container Ref
  const containerRef = ref<HTMLElement | null>(null)

  // Preset Ref
  /** Gewählte Preset-ID ('' = kein Filter); Quelle für das Preset-Select. */
  const selectedPreset = ref('')

  // Numerische Filterwerte (SliderField ist v-model-basiert, kein DOM-Ref)
  const filters = reactive<Record<ImageFilterKey, number>>({ ...IMAGE_FILTER_DEFAULTS })

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
  function emitFilterChange(property: string, value: unknown) {
    emit('filter-change', { property, value })
  }

  // Handlers
  /** @param value - Preset-ID (UiSelect) oder change-Event (natives select) */
  function onPresetChange(value: string | Event) {
    const id =
      typeof value === 'string'
        ? value
        : ((value?.target as HTMLSelectElement | null | undefined)?.value ?? '')
    selectedPreset.value = id
    emit('preset-change', id)
  }

  /**
   * Erzeugt einen Handler für ein numerisches Filterfeld. Der Wert kommt als
   * Zahl vom SliderField (`update:modelValue`).
   */
  function numericHandler(property: ImageFilterKey) {
    return (value: unknown) => {
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

  /** @param hex - vom ColorField emittierter Hex-Wert */
  function onShadowColorChange(hex: string) {
    shadowColor.value = hex
    emitFilterChange('shadowColor', hex)
  }

  function onShadowColorTextChange(event: Event) {
    const input = event.target as HTMLInputElement
    const hex = normalizeHex(input.value)
    if (!hex) {
      input.value = shadowColor.value // ungültige Eingabe verwerfen
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

  /** @param value - Switch-Wert (Boolean) oder Checkbox-Event */
  function onRenderBehindVisualizerChange(value: boolean | Event) {
    renderBehindVisualizerRef.value =
      typeof value === 'boolean'
        ? value
        : Boolean((value?.target as HTMLInputElement | null | undefined)?.checked)
    emitFilterChange('renderBehindVisualizer', renderBehindVisualizerRef.value)
  }

  /** @param hex - vom ColorField emittierter Hex-Wert */
  function onBorderColorChange(hex: string) {
    borderColor.value = hex
    emitFilterChange('borderColor', hex)
  }

  function onBorderColorTextChange(event: Event) {
    const input = event.target as HTMLInputElement
    const hex = normalizeHex(input.value)
    if (!hex) {
      input.value = borderColor.value // ungültige Eingabe verwerfen
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
    // Reset all controls to default values
    Object.assign(filters, IMAGE_FILTER_DEFAULTS)
    shadowColor.value = '#000000'
    flipHRef.value = false
    flipVRef.value = false
    borderColor.value = '#ffffff'

    selectedPreset.value = ''

    emit('reset-filters')
  }

  function loadImageSettings(settings: Partial<FotoSettings> | null | undefined) {
    const s: Partial<FotoSettings> = settings || {}

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

    selectedPreset.value = s.preset || ''
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
    selectedPreset,
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
