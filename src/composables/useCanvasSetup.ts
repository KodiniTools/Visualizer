import type { Ref } from 'vue'
import { TextManager } from '../lib/textManager'
import { CanvasManager, type CanvasObject, type ObjectDeletedInfo } from '../lib/canvasManager'
import { FotoManager } from '../lib/fotoManager'
import { GridManager } from '../lib/gridManager'
import { MultiImageManager } from '../lib/multiImageManager'
import { VideoManager } from '../lib/videoManager'
import { getHistoryRecorder } from '../lib/history/historyRecorder'
import { getFotoPanel } from '../lib/fotoPanelBridge'
import type { useWorkspaceStore } from '../stores/workspaceStore'
import type { useTextStore } from '../stores/textStore'
import type { useBackgroundTilesStore } from '../stores/backgroundTilesStore'
import type { useHistoryStore } from '../stores/historyStore'
import type { useToastStore } from '../stores/toastStore'
import type { TranslateFn } from './types'

/** Pixelmaße eines Workspace-Presets */
export interface PresetCanvasSize {
  width: number
  height: number
}

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
} satisfies Record<string, PresetCanvasSize>

/** Refs der Manager-Instanzen (gesetzt von initializeCanvas) */
export interface CanvasSetupManagers {
  canvasManagerInstance: Ref<CanvasManager | null | undefined>
  fotoManagerInstance: Ref<FotoManager | null | undefined>
  gridManagerInstance: Ref<GridManager | null | undefined>
  multiImageManagerInstance: Ref<MultiImageManager | null | undefined>
  videoManagerInstance: Ref<VideoManager | null | undefined>
}

/** Stores, die useCanvasSetup nutzt */
export interface CanvasSetupStores {
  workspaceStore: ReturnType<typeof useWorkspaceStore>
  textStore: ReturnType<typeof useTextStore>
  backgroundTilesStore: ReturnType<typeof useBackgroundTilesStore>
  historyStore: ReturnType<typeof useHistoryStore>
  toastStore: ReturnType<typeof useToastStore>
}

/** Abhängigkeiten von useCanvasSetup */
export interface CanvasSetupDeps {
  audioRef: Ref<HTMLAudioElement | null | undefined>
  managers: CanvasSetupManagers
  stores: CanvasSetupStores
  t: TranslateFn
  getRecordingCanvas: () => HTMLCanvasElement | null | undefined
  selectedCanvasImageId: Ref<CanvasObject['id'] | null>
}

/**
 * useCanvasSetup - one-time canvas/manager construction plus the selection and
 * deletion callbacks the managers fire back into the app.
 *
 * Owns the TextManager instance (exposed via getTextManager) and the
 * initialized flag; initializeCanvas is idempotent.
 */
export function useCanvasSetup({
  audioRef,
  managers,
  stores,
  t,
  getRecordingCanvas,
  selectedCanvasImageId,
}: CanvasSetupDeps) {
  const {
    canvasManagerInstance,
    fotoManagerInstance,
    gridManagerInstance,
    multiImageManagerInstance,
    videoManagerInstance,
  } = managers
  const { workspaceStore, textStore, backgroundTilesStore, historyStore, toastStore } = stores

  let textManagerInstance: TextManager | null = null
  let canvasInitialized = false
  let deletionCommandCounter = 0

  const getTextManager = () => textManagerInstance
  const isInitialized = () => canvasInitialized

  function initializeCanvas(canvasParam?: HTMLCanvasElement | null): boolean {
    if (canvasInitialized) return false

    const domCanvas = document.querySelector<HTMLCanvasElement>('.canvas-wrapper canvas')
    const canvas = domCanvas || canvasParam
    if (!canvas) return false

    const presetKey = workspaceStore.selectedPresetKey
    const preset = (SOCIAL_MEDIA_PRESETS as Record<string, PresetCanvasSize | undefined>)[
      presetKey as string
    ]
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
  function handleObjectDeleted({ type, undo, redo, count = 1 }: ObjectDeletedInfo) {
    // Bevorzugt als Snapshot-Schritt des globalen Verlaufs (Texte/Bilder/Videos
    // sind History-Segmente). Das Token identifiziert den Schritt für den Toast.
    // WICHTIG: Kein Identitätsvergleich (===) mit dem Command-Objekt, da Pinia
    // das Objekt beim Speichern in einen reaktiven Proxy einwickelt – die
    // Referenz ist danach nicht mehr identisch. Primitive (das Token) werden
    // vom Proxy dagegen unverändert durchgereicht.
    let token: number | string | null = getHistoryRecorder(historyStore).checkpoint(
      `delete:${type}`,
    )

    if (token === null) {
      // Fallback (Segmente noch nicht registriert): closure-basiertes Command
      token = `delete-${++deletionCommandCounter}`
      historyStore.addCommand({
        name: `delete:${type}`,
        token,
        execute: redo,
        undo,
        timestamp: Date.now(),
      })
    }

    const messageKey =
      type === 'image'
        ? 'toast.imageDeleted'
        : type === 'video'
          ? 'toast.videoDeleted'
          : 'toast.textDeleted'

    // Beim gemeinsamen Löschen mehrerer Texte einen Sammel-Text mit Anzahl
    // anzeigen ("3 Texte gelöscht"), sonst die Einzel-Meldung.
    const message =
      type === 'text' && count > 1 ? `${count} ${t('toast.textsDeleted')}` : t(messageKey)

    let handled = false

    toastStore.addToast({
      type: 'info',
      message,
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

  function onObjectSelected(selectedObject: CanvasObject | null) {
    const fotoPanel = getFotoPanel()
    if (!fotoPanel) {
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

    if (isBackgroundType) {
      fotoPanel.currentActiveImage.value = null
      setTimeout(() => {
        const panel = getFotoPanel()
        if (panel) panel.currentActiveImage.value = selectedObject
      }, 0)
    } else {
      fotoPanel.currentActiveImage.value = isImageSelected ? selectedObject : null
    }

    if (isImageSelected) fotoPanel.loadImageSettings(selectedObject)
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
