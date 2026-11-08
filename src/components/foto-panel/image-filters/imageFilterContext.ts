import type { ComputedRef, Ref } from 'vue'
import type { useImageFilterControls } from '../../../composables/useImageFilterControls'
import type { FotoImageObject, FotoPresetInfo } from '../../../lib/fotoManager'

/**
 * Per provide('imageFilterControls') an die Sektionen des Filter-Panels
 * gereichter Zustand: Zustand/Handler aus useImageFilterControls, die
 * (reaktiven) Props des Panels, die aktuelle Sprache und die Ebenen-Aktionen.
 */
export type ImageFilterContext = ReturnType<typeof useImageFilterControls> & {
  currentActiveImage: Ref<FotoImageObject | null>
  presets: Ref<FotoPresetInfo[]>
  canMoveUp: Ref<boolean>
  canMoveDown: Ref<boolean>
  currentLayerInfo: Ref<string>
  locale: ComputedRef<string>
  bringToFront: () => void
  moveUp: () => void
  moveDown: () => void
  sendToBack: () => void
}

/** Zugriff von PositionSizeControls auf Canvas und Neuzeichnen (beides optional) */
export interface ImageBoundsApi {
  getCanvas?: () => HTMLCanvasElement | null
  redraw?: () => void
}
