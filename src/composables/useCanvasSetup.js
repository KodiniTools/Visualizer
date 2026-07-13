import { TextManager } from '../lib/textManager.js'
import { CanvasManager } from '../lib/canvasManager.js'
import { FotoManager } from '../lib/fotoManager.js'
import { GridManager } from '../lib/gridManager.js'
import { MultiImageManager } from '../lib/multiImageManager.js'
import { VideoManager } from '../lib/videoManager.js'

/**
 * Canvas pixel dimensions per social-media workspace preset.
 */
export const SOCIAL_MEDIA_PRESETS = {
  tiktok: { width: 1080, height: 1920 },
  'instagram-story': { width: 1080, height: 1920 },
  'instagram-post': { width: 1080, height: 1080 },
  'instagram-reel': { width: 1080, height: 1920 },
  'youtube-short': { width: 1080, height: 1920 },
  'youtube-video': { width: 1920, height: 1080 },
  'facebook-post': { width: 1200, height: 630 },
  'twitter-video': { width: 1280, height: 720 },
  'linkedin-video': { width: 1920, height: 1080 },
}

/**
 * useCanvasSetup - one-time canvas/manager construction plus the selection and
 * deletion callbacks the managers fire back into the app.
 *
 * Owns the TextManager instance (exposed via getTextManager) and the
 * initialized flag; initializeCanvas is idempotent.
 *
 * @param {Object} deps
 * @param {import('vue').Ref} deps.audioRef
 * @param {Object} deps.managers - refs for each manager instance
 * @param {Object} deps.stores - { workspaceStore, textStore, backgroundTilesStore, historyStore, toastStore }
 * @param {(key:string)=>string} deps.t
 * @param {()=>HTMLCanvasElement} deps.getRecordingCanvas
 * @param {import('vue').Ref} deps.selectedCanvasImageId
 */
export function useCanvasSetup({
  audioRef,
  managers,
  stores,
  t,
  getRecordingCanvas,
  selectedCanvasImageId,
}) {
  const {
    canvasManagerInstance,
    fotoManagerInstance,
    gridManagerInstance,
    multiImageManagerInstance,
    videoManagerInstance,
  } = managers
  const { workspaceStore, textStore, backgroundTilesStore, historyStore, toastStore } = stores

  let textManagerInstance = null
  let canvasInitialized = false
  let deletionCommandCounter = 0

  const getTextManager = () => textManagerInstance
  const isInitialized = () => canvasInitialized

  function initializeCanvas(canvasParam) {
    if (canvasInitialized) return false

    const domCanvas = document.querySelector('.canvas-wrapper canvas')
    const canvas = domCanvas || canvasParam
    if (!canvas) return false

    const presetKey = workspaceStore.selectedPresetKey
    const preset = SOCIAL_MEDIA_PRESETS[presetKey]
    canvas.width = preset?.width ?? 1920
    canvas.height = preset?.height ?? 1080

    const recordingCanvas = getRecordingCanvas()
    if (recordingCanvas) {
      recordingCanvas.width = canvas.width
      recordingCanvas.height = canvas.height
    }

    textManagerInstance = new TextManager(textStore)
    gridManagerInstance.value = new GridManager(canvas)
    fotoManagerInstance.value = new FotoManager(() => {})

    multiImageManagerInstance.value = new MultiImageManager(canvas, {
      redrawCallback: () => {},
      onImageSelected: onObjectSelected,
      onImageChanged: () => {},
      fotoManager: fotoManagerInstance.value,
    })

    videoManagerInstance.value = new VideoManager(canvas, {
      redrawCallback: () => {},
      onVideoSelected: onObjectSelected,
      onVideoChanged: () => {},
      fotoManager: fotoManagerInstance.value,
      audioElement: audioRef.value,
    })

    canvasManagerInstance.value = new CanvasManager(canvas, {
      redrawCallback: () => {},
      onObjectSelected,
      onStateChange: () => {},
      onTextDoubleClick: () => {},
      onObjectDeleted: handleObjectDeleted,
      textManager: textManagerInstance,
      fotoManager: fotoManagerInstance.value,
      gridManager: gridManagerInstance.value,
      multiImageManager: multiImageManagerInstance.value,
      videoManager: videoManagerInstance.value,
    })
    canvasManagerInstance.value.setupInteractionHandlers()
    canvasManagerInstance.value.setBackgroundTilesStore(backgroundTilesStore)

    canvasInitialized = true
    return true
  }

  // ↩️ Undo-fähige Löschung eines Canvas-Objekts (Text/Bild/Video)
  // Wird vom CanvasManager nach dem Löschen aufgerufen. Registriert einen
  // History-Command (Strg+Z / Strg+Y) und zeigt einen Toast mit
  // "Rückgängig"-Button zur direkten Wiederherstellung.
  function handleObjectDeleted({ type, undo, redo }) {
    // Eindeutiges Token zum Wiedererkennen dieses Commands im History-Stack.
    // WICHTIG: Kein Identitätsvergleich (===) mit dem Command-Objekt, da Pinia
    // das Objekt beim Speichern in einen reaktiven Proxy einwickelt – die
    // Referenz ist danach nicht mehr identisch. Primitive (das Token) werden
    // vom Proxy dagegen unverändert durchgereicht.
    const token = ++deletionCommandCounter

    const command = {
      name: `delete:${type}`,
      token,
      execute: redo,
      undo,
      timestamp: Date.now(),
    }
    historyStore.addCommand(command)

    const messageKey =
      type === 'image'
        ? 'toast.imageDeleted'
        : type === 'video'
          ? 'toast.videoDeleted'
          : 'toast.textDeleted'

    let handled = false

    toastStore.addToast({
      type: 'info',
      message: t(messageKey),
      duration: 6000,
      action: {
        label: t('toast.undo'),
        handler: () => {
          if (handled) return
          // Nur rückgängig machen, wenn diese Löschung noch die aktuelle
          // History-Aktion ist (sonst wurde sie z.B. bereits per Strg+Z
          // rückgängig gemacht) – verhindert versehentliches Über-Undo.
          const h = historyStore
          if (h.currentIndex >= 0 && h.history[h.currentIndex]?.token === token) {
            handled = true
            h.undo()
          }
        },
      },
    })
  }

  function onObjectSelected(selectedObject) {
    if (!window.fotoPanelControls) {
      setTimeout(() => onObjectSelected(selectedObject), 100)
      return
    }

    const isImageSelected =
      selectedObject &&
      (selectedObject.type === 'image' ||
        selectedObject.type === 'background' ||
        selectedObject.type === 'workspace-background')

    if (isImageSelected && selectedObject.type === 'image' && selectedObject.id) {
      selectedCanvasImageId.value = selectedObject.id
    } else if (!isImageSelected) {
      selectedCanvasImageId.value = null
    }

    const isBackgroundType =
      selectedObject &&
      (selectedObject.type === 'workspace-background' || selectedObject.type === 'background')

    if (window.fotoPanelControls.currentActiveImage) {
      if (isBackgroundType) {
        window.fotoPanelControls.currentActiveImage.value = null
        setTimeout(() => {
          if (window.fotoPanelControls?.currentActiveImage) {
            window.fotoPanelControls.currentActiveImage.value = selectedObject
          }
        }, 0)
      } else {
        window.fotoPanelControls.currentActiveImage.value = isImageSelected ? selectedObject : null
      }
    }

    if (window.fotoPanelControls.container) {
      window.fotoPanelControls.container.style.display = isImageSelected ? 'block' : 'none'
    }

    if (isImageSelected && window.fotoPanelControls.loadImageSettings) {
      window.fotoPanelControls.loadImageSettings(selectedObject)
    } else if (isImageSelected && fotoManagerInstance.value) {
      fotoManagerInstance.value.updateUIFromSettings(window.fotoPanelControls, selectedObject)
    }
  }

  return {
    SOCIAL_MEDIA_PRESETS,
    initializeCanvas,
    onObjectSelected,
    handleObjectDeleted,
    getTextManager,
    isInitialized,
  }
}
