/**
 * useGalleryCanvasDrop
 * ─────────────────────────────────────────────────────────────────────────
 * Gemeinsame Drag-&-Drop-Logik, um ein Galerie-Bild direkt auf den Canvas zu
 * ziehen. Wird sowohl von der Stock-Galerie (GalleryPanel) als auch von der
 * Galerie eigener Bilder (FotoPanel) genutzt, damit sich beide identisch und
 * robust verhalten.
 *
 * Robustheit:
 * - Die Drop-Listener hängen an der GESAMTEN Canvas-Fläche (.canvas-wrapper)
 *   und laufen mit capture:true. So wird ein Drop auch dann erfasst, wenn ein
 *   Overlay (Bilder-auf-Canvas-Leiste, Popover, Workspace-Rahmen) über dem
 *   <canvas> liegt.
 * - Listener werden nur während eines aktiven Drags registriert und danach
 *   wieder entfernt – kein State-Leak, keine Beeinträchtigung anderer Funktionen.
 * - NaN-Guard für die Drop-Koordinaten (Fallback: Canvas-Mitte).
 *
 * @param {Object} opts
 * @param {import('vue').Ref} opts.canvasManagerRef      Ref auf die CanvasManager-Instanz
 * @param {import('vue').Ref} opts.multiImageManagerRef  Ref auf die MultiImageManager-Instanz
 * @param {Object} opts.placement                        Refs mit den Platzierungs-Einstellungen
 * @param {import('vue').Ref<string>} opts.placement.selectedAnimation
 * @param {import('vue').Ref<number>} opts.placement.animationDuration
 * @param {import('vue').Ref<number>} opts.placement.imageScale
 * @param {(payload:any) => (HTMLImageElement|Promise<HTMLImageElement>)} opts.resolveImage
 *        Wandelt die gezogene Nutzlast in ein <img>-Element um (ggf. asynchron).
 * @param {(payload:any) => void} [opts.onPlaced]  Callback nach erfolgreicher Platzierung
 * @param {(error:any) => void}  [opts.onError]    Callback bei Fehler
 */
import { ref } from 'vue'

export function useGalleryCanvasDrop({
  canvasManagerRef,
  multiImageManagerRef,
  placement,
  resolveImage,
  onPlaced,
  onError,
}) {
  const draggedPayload = ref(null)
  let dropZoneEl = null

  function getDropZoneElement() {
    return (
      document.querySelector('.canvas-wrapper') ||
      canvasManagerRef?.value?.canvas ||
      document.querySelector('.canvas-wrapper canvas')
    )
  }

  function attach() {
    const zone = getDropZoneElement()
    if (!zone) return
    if (dropZoneEl && dropZoneEl !== zone) detach()
    if (dropZoneEl === zone) return
    dropZoneEl = zone
    dropZoneEl.addEventListener('dragover', onDragOver, true)
    dropZoneEl.addEventListener('dragleave', onDragLeave, true)
    dropZoneEl.addEventListener('drop', onDrop, true)
  }

  function detach() {
    if (!dropZoneEl) return
    dropZoneEl.removeEventListener('dragover', onDragOver, true)
    dropZoneEl.removeEventListener('dragleave', onDragLeave, true)
    dropZoneEl.removeEventListener('drop', onDrop, true)
    dropZoneEl.classList.remove('gallery-drop-active')
    dropZoneEl = null
  }

  function onDragOver(event) {
    if (!draggedPayload.value) return
    // preventDefault ist zwingend, sonst feuert 'drop' nicht
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    dropZoneEl?.classList.add('gallery-drop-active')
  }

  function onDragLeave(event) {
    // Nur ausblenden, wenn die Maus die Drop-Zone wirklich verlässt
    if (event?.relatedTarget && dropZoneEl?.contains(event.relatedTarget)) return
    dropZoneEl?.classList.remove('gallery-drop-active')
  }

  async function onDrop(event) {
    const payload = draggedPayload.value
    if (!payload) return
    event.preventDefault()
    dropZoneEl?.classList.remove('gallery-drop-active')

    const canvasManager = canvasManagerRef?.value
    const multiImageManager = multiImageManagerRef?.value
    if (!canvasManager || !multiImageManager) return

    // Relative Drop-Position (0..1) – identische Mathematik wie die Maus-Interaktion.
    let relX = 0.5
    let relY = 0.5
    if (typeof canvasManager.getRelativePositionFromEvent === 'function') {
      const pos = canvasManager.getRelativePositionFromEvent(event)
      if (pos && Number.isFinite(pos.relX) && Number.isFinite(pos.relY)) {
        relX = pos.relX
        relY = pos.relY
      }
    }
    relX = Math.max(0, Math.min(1, relX))
    relY = Math.max(0, Math.min(1, relY))

    try {
      const img = await resolveImage(payload)
      if (!img) throw new Error('Kein Bildobjekt aufgelöst')

      const baseSize = 0.15
      const relSize = baseSize * (placement.imageScale?.value || 1)

      const bounds = {
        relX: relX - relSize / 2,
        relY: relY - relSize / 2,
        relWidth: relSize,
        relHeight: relSize,
      }

      multiImageManager.addImageWithBounds(
        img,
        bounds,
        placement.selectedAnimation?.value || 'none',
        {
          duration: placement.animationDuration?.value || 1000,
        },
      )

      if (onPlaced) onPlaced(payload)
    } catch (error) {
      console.error('❌ Fehler beim Platzieren des Galerie-Bildes (Drag & Drop):', error)
      if (onError) onError(error)
    }
  }

  /** Aus dem dragstart-Handler der Galerie aufrufen. */
  function startDrag(payload, event) {
    draggedPayload.value = payload
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      try {
        event.dataTransfer.setData('text/plain', payload?.name || 'gallery-image')
      } catch {
        // manche Browser erlauben setData im dragstart nicht – unkritisch
      }
    }
    attach()
  }

  /** Aus dem dragend-Handler der Galerie aufrufen. */
  function endDrag() {
    // drop feuert vor dragend, daher ist das Aufräumen hier sicher
    detach()
    draggedPayload.value = null
  }

  /** In onBeforeUnmount aufrufen. */
  function teardown() {
    detach()
    draggedPayload.value = null
  }

  return { startDrag, endDrag, teardown }
}
