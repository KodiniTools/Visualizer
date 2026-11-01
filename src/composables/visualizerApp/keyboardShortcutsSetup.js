import { watch } from 'vue'
import { KeyboardShortcuts } from '../../lib/keyboardShortcuts.js'

/**
 * Tastenkürzel einrichten, sobald CanvasManager und MultiImageManager bereit
 * sind. Sind sie es noch nicht, wird auf sie gewartet. Die Instanz landet in
 * `instanceRef` (VisualizerApp räumt sie beim Unmount auf).
 *
 * @param {object} deps
 * @param {import('vue').Ref<KeyboardShortcuts|null>} deps.instanceRef
 * @param {import('vue').Ref<object|null>} deps.canvasManagerInstance
 * @param {import('vue').Ref<object|null>} deps.multiImageManagerInstance
 * @param {{ playerStore: object, recorderStore: object, gridStore: object, historyStore: object }} deps.stores
 */
export function setupKeyboardShortcuts({
  instanceRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  stores,
}) {
  function init() {
    if (instanceRef.value) return
    if (!canvasManagerInstance.value || !multiImageManagerInstance.value) return

    instanceRef.value = new KeyboardShortcuts(stores, {
      canvasManager: canvasManagerInstance.value,
      multiImageManager: multiImageManagerInstance.value,
    })
    instanceRef.value.enable()
  }

  init()
  if (!instanceRef.value) {
    watch(
      () => [canvasManagerInstance.value, multiImageManagerInstance.value],
      () => {
        if (!instanceRef.value) init()
      },
    )
  }
}
