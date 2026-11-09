import { ref, watch, onMounted } from 'vue'
import type { Ref } from 'vue'
import type { CanvasManager } from '../../lib/canvasManager'

/**
 * Maße des Canvas für den Text-Editor; folgt einem neuen Canvas-Element und
 * liest beim Mount erneut ein.
 */
export function useCanvasSize(canvasManager: Ref<CanvasManager | null | undefined>) {
  const canvasWidth = ref(1920)
  const canvasHeight = ref(1080)

  function read(canvas: HTMLCanvasElement | null | undefined): void {
    if (canvas) {
      canvasWidth.value = canvas.width
      canvasHeight.value = canvas.height
    }
  }

  watch(() => canvasManager.value?.canvas, read, { immediate: true })
  onMounted(() => read(canvasManager.value?.canvas))

  return { canvasWidth, canvasHeight }
}
