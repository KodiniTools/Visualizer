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
 */
import { ref, type Ref } from 'vue'
import type { MultiImageManager } from '../lib/multiImageManager'
import type { ImageTimedAnimation } from '../lib/canvasObjects/imageAnimation'
import type { CanvasManagerRef } from './types'

/** Refs mit den Platzierungs-Einstellungen */
export interface GalleryDropPlacement {
  selectedAnimation?: Ref<string>
  animationDuration?: Ref<number>
  imageScale?: Ref<number>
  /** Animationen wie bei Texten für neue Bilder (optional) */
  timedAnimation?: Ref<ImageTimedAnimation | null | undefined>
}

/** Optionen für useGalleryCanvasDrop; P ist die gezogene Nutzlast */
export interface GalleryCanvasDropOptions<P> {
  canvasManagerRef?: CanvasManagerRef | null
  multiImageManagerRef?: Ref<MultiImageManager | null | undefined> | null
  placement: GalleryDropPlacement
  /** Wandelt die gezogene Nutzlast in ein <img>-Element um (ggf. asynchron). */
  resolveImage: (
    payload: P,
  ) => HTMLImageElement | null | undefined | Promise<HTMLImageElement | null | undefined>
  /** Dateiname der Nutzlast für das Canvas-Bild (sonst aus der Bild-URL abgeleitet) */
  resolveName?: (payload: P) => string | null | undefined
  /** Callback nach erfolgreicher Platzierung */
  onPlaced?: (payload: P) => void
  /** Callback bei Fehler */
  onError?: (error: unknown) => void
}

export function useGalleryCanvasDrop<P>({
  canvasManagerRef,
  multiImageManagerRef,
  placement,
  resolveImage,
  resolveName,
  onPlaced,
  onError,
}: GalleryCanvasDropOptions<P>) {
  const draggedPayload = ref(null) as Ref<P | null>
  let dropZoneEl: HTMLElement | null = null

  function getDropZoneElement(): HTMLElement | null | undefined {
    return (
      document.querySelector<HTMLElement>('.canvas-wrapper') ||
      canvasManagerRef?.value?.canvas ||
      document.querySelector<HTMLElement>('.canvas-wrapper canvas')
    )
  }

  function attach() {
    const zone = getDropZoneElement()
    if (!zone) return
    if (dropZoneEl && dropZoneEl !== zone) detach()
    if (dropZoneEl === zone) return
    dropZoneEl = zone
    zone.addEventListener('dragover', onDragOver, true)
    zone.addEventListener('dragleave', onDragLeave, true)
    zone.addEventListener('drop', onDrop, true)
  }

  function detach() {
    if (!dropZoneEl) return
    dropZoneEl.removeEventListener('dragover', onDragOver, true)
    dropZoneEl.removeEventListener('dragleave', onDragLeave, true)
    dropZoneEl.removeEventListener('drop', onDrop, true)
    dropZoneEl.classList.remove('gallery-drop-active')
    dropZoneEl = null
  }

  function onDragOver(event: DragEvent) {
    if (!draggedPayload.value) return
    // preventDefault ist zwingend, sonst feuert 'drop' nicht
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    dropZoneEl?.classList.add('gallery-drop-active')
  }

  function onDragLeave(event: DragEvent) {
    // Nur ausblenden, wenn die Maus die Drop-Zone wirklich verlässt
    if (event?.relatedTarget && dropZoneEl?.contains(event.relatedTarget as Node)) return
    dropZoneEl?.classList.remove('gallery-drop-active')
  }

  async function onDrop(event: DragEvent) {
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
          timedAnimation: placement.timedAnimation?.value ?? null,
          name: resolveName ? resolveName(payload) : undefined,
        },
      )

      if (onPlaced) onPlaced(payload)
    } catch (error) {
      console.error('❌ Fehler beim Platzieren des Galerie-Bildes (Drag & Drop):', error)
      if (onError) onError(error)
    }
  }

  /** Aus dem dragstart-Handler der Galerie aufrufen. */
  function startDrag(payload: P, event?: DragEvent | null) {
    draggedPayload.value = payload
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      try {
        event.dataTransfer.setData(
          'text/plain',
          (payload as { name?: string } | null | undefined)?.name || 'gallery-image',
        )
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
