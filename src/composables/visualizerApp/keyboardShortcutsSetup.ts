import { watch } from 'vue'
import { KeyboardShortcuts } from '../../lib/keyboardShortcuts'
import type { ShortcutManagers, ShortcutStores } from '../../lib/keyboardShortcuts'
import type { Ref } from 'vue'

/**
 * Tastenkürzel einrichten, sobald CanvasManager und MultiImageManager bereit
 * sind. Sind sie es noch nicht, wird auf sie gewartet. Die Instanz landet in
 * `instanceRef` (VisualizerApp räumt sie beim Unmount auf).
 */
export function setupKeyboardShortcuts({
  instanceRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  stores,
}: {
  instanceRef: Ref<KeyboardShortcuts | null>
  canvasManagerInstance: Ref<ShortcutManagers['canvasManager'] | null | undefined>
  multiImageManagerInstance: Ref<ShortcutManagers['multiImageManager'] | null | undefined>
  stores: ShortcutStores
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
