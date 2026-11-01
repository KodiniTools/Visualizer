import { ref, watch, onMounted } from 'vue'

/**
 * Maße des Canvas für den Text-Editor; folgt einem neuen Canvas-Element und
 * liest beim Mount erneut ein.
 * @param {import('vue').Ref} canvasManager
 */
export function useCanvasSize(canvasManager) {
  const canvasWidth = ref(1920)
  const canvasHeight = ref(1080)

  function read(canvas) {
    if (canvas) {
      canvasWidth.value = canvas.width
      canvasHeight.value = canvas.height
    }
  }

  watch(() => canvasManager.value?.canvas, read, { immediate: true })
  onMounted(() => read(canvasManager.value?.canvas))

  return { canvasWidth, canvasHeight }
}
