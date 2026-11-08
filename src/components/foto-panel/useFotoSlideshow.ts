import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef, type Ref } from 'vue'
import {
  SlideshowManager,
  type SlideshowImageConfig,
  type SlideshowStartOptions,
} from '../../lib/slideshowManager'
import { resolveSlideshowAudioReactive } from '../../lib/slideshowAudio'
import { SLIDESHOW_EDIT_EVENT } from '../../lib/slideshowEditRequest'
import { useSlideshowPopover } from '../../composables/useSlideshowPopover'
import { slideshowStableKey } from './slideshow/slideshowImageKey'
import { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import {
  diffAdjustments,
  restorePersistedAdjustments as restorePersistedAdjustmentsInto,
  restorePersistedBounds as restorePersistedBoundsInto,
  type AdjustmentsManager,
} from '../../lib/slideshowAdjustmentsPersistence'
import {
  buildSlideshowSourceImages,
  ensureSlideshowImagesLoaded,
  resolveSlideshowImageObject,
  type SlideshowSourceImage,
  type SlideshowUpload,
} from '../../lib/slideshowSources'
import { useStockGallery, type StockImage } from '../../composables/useStockGallery'
import { createSlideshowAdjustmentsApi, createBoundsPersistQueue } from './slideshowAdjustmentsApi'
import { setSlideshowManager } from '../../lib/slideshowManagerBridge'
import type { FotoManager } from '../../lib/fotoManager'
import type { MultiImageManager } from '../../lib/multiImageManager'
import type { RelBounds } from '../../lib/slideshowTransitions'
import type { CanvasManagerRef, TranslateFn } from '../../composables/types'
import type { useToastStore } from '../../stores/toastStore'
import type {
  SlideshowEditRequest,
  SlideshowRunConfig,
  SlideshowRunImage,
} from './slideshow/slideshowPanelTypes'

/** Abhängigkeiten von useFotoSlideshow */
export interface FotoSlideshowDeps {
  fotoManagerRef: Ref<FotoManager | null | undefined> | undefined
  multiImageManagerRef: Ref<MultiImageManager | null | undefined> | undefined
  canvasManagerRef: CanvasManagerRef | undefined
  /** ausgewählte Galerie-Bilder */
  selectedImages: Ref<(SlideshowUpload | null | undefined)[]>
  deselectAllImages: () => void
  savedAudioReactiveSettings: Ref<object | null>
  toastStore: ReturnType<typeof useToastStore>
  t: TranslateFn
}

/** Setter des SlideshowManagers, die das Slideshow-Panel direkt aufruft */
type ManagerSetter =
  | 'setBackgroundMode'
  | 'setBackgroundColor'
  | 'setWorkspaceColor'
  | 'setBaseGradient'
  | 'setBaseFillAudio'
  | 'setBaseImage'

/**
 * Slideshow-Verdrahtung des FotoPanels: SlideshowManager erzeugen, Start/
 * Pause/Stopp, Einstellungs-Events des Slideshow-Panels an den Manager
 * weiterreichen, gemerkte Anpassungen/Größen pro Bild dauerhaft speichern.
 *
 * @param {object} deps
 * @param {import('vue').Ref} deps.fotoManagerRef
 * @param {import('vue').Ref} deps.multiImageManagerRef
 * @param {import('vue').Ref} deps.canvasManagerRef
 * @param {import('vue').Ref<object[]>} deps.selectedImages - ausgewählte Galerie-Bilder
 * @param {() => void} deps.deselectAllImages
 * @param {import('vue').Ref<object|null>} deps.savedAudioReactiveSettings
 * @param {object} deps.toastStore
 * @param {(key: string) => string} deps.t
 */
export function useFotoSlideshow({
  fotoManagerRef,
  multiImageManagerRef,
  canvasManagerRef,
  selectedImages,
  deselectAllImages,
  savedAudioReactiveSettings,
  toastStore,
  t,
}: FotoSlideshowDeps) {
  const slideshowManagerRef = shallowRef<SlideshowManager | null>(null)
  const slideshowIsActive = ref(false)
  const slideshowIsPaused = ref(false)
  const slideshowCurrentIndex = ref(0)
  const slideshowCurrentPhase = ref('fadeIn')
  const slideshowTotalImages = ref(0)
  // Geteilte Stock-Galerie (Popover „Galerie“) – ausgewählte Stock-Bilder für die Slideshow
  const {
    selectedStockImagesAll,
    getLoadedStockImage,
    loadStockImageObject,
    deselectAllStockImages,
  } = useStockGallery()
  // Per Maus verschobener gemeinsamer Bereich (für die Regler im Slideshow-Panel)
  const slideshowExternalTransform = ref<RelBounds | null>(null)
  // Zähler für geänderte Bild-Bounds (Maus/Positionsregler) → Anzeige im Bild-Editor
  const slideshowBoundsRevision = ref(0)
  // Dauerhaft gemerkte Bild-Anpassungen pro Slideshow-Bild
  const adjustmentsStore = useSlideshowImageAdjustmentsStore()
  // Dauerhaft gemerkte Einstellungen pro Bild (u. a. eigene Größe/Position)
  const imageSettingsStore = useSlideshowImageSettingsStore()
  // Größe/Position pro Bild dauerhaft merken (gebündelt, siehe createBoundsPersistQueue)
  const boundsQueue = createBoundsPersistQueue(imageSettingsStore)

  // Slideshow-Fenster der Sticky-Bar (Badge/Zustand für den Button)
  const slideshowPopover = useSlideshowPopover()

  // Klick auf ein Slideshow-Bild in der Leiste (pausiert) → dessen Einstellungen öffnen
  const slideshowEditRequest = ref<SlideshowEditRequest | null>(null)
  function onSlideshowEditImage(event: Event) {
    const index = (event as CustomEvent<{ index?: unknown } | null>)?.detail?.index
    if (!Number.isInteger(index)) return
    slideshowEditRequest.value = { index: index as number, nonce: Date.now() }
  }

  // Workspace-Format gewählt? (Voraussetzung für „An Workspace anpassen“)
  const workspaceStore = useWorkspaceStore()
  const hasWorkspace = computed(() => workspaceStore.selectedPresetKey != null)

  // Kombinierte ausgewählte Bilder für Slideshow (hochgeladene + Stock);
  // gleiches Motiv in beiden Galerien nur einmal
  const slideshowImages = computed(() =>
    buildSlideshowSourceImages(
      selectedImages.value,
      selectedStockImagesAll.value,
      getLoadedStockImage,
    ),
  )

  // Badge am Slideshow-Button (ausgewählte Bilder, während des Laufs alle Bilder)
  // und Status in der Kopfzeile des Slideshow-Fensters
  watch(
    () =>
      [
        slideshowIsActive.value,
        slideshowIsPaused.value,
        slideshowTotalImages.value,
        slideshowImages.value.length,
      ] as const,
    ([active, paused, total, selected]) => {
      slideshowPopover.active = active
      slideshowPopover.paused = active && paused
      slideshowPopover.imageCount = active ? total : selected
    },
    { immediate: true },
  )

  // ─── Manager ────────────────────────────────────────────────────────────

  function resetRunState() {
    slideshowIsActive.value = false
    slideshowIsPaused.value = false
    slideshowCurrentIndex.value = 0
    slideshowTotalImages.value = 0
    setSlideshowManager(null)
  }

  function initSlideshowManager() {
    const multiImageManager = multiImageManagerRef?.value
    const fotoManager = fotoManagerRef?.value
    const canvasManager = canvasManagerRef?.value

    if (!multiImageManager || !fotoManager) {
      console.warn('[Slideshow] Manager nicht verfügbar, versuche später erneut')
      setTimeout(initSlideshowManager, 500)
      return
    }

    slideshowManagerRef.value = new SlideshowManager(multiImageManager, fotoManager, {
      redrawCallback: () => {
        // CanvasManager hat (noch) kein redraw(); der Render-Loop zeichnet ohnehin neu
        const cm = canvasManager as { redraw?: () => void } | null | undefined
        if (cm && cm.redraw) {
          cm.redraw()
        }
      },
      onSlideshowComplete: () => {
        resetRunState()
        toastStore.success(t('slideshow.title') + ' beendet')
        console.log('[Slideshow] Beendet')
      },
      onTransformChange: (transform) => {
        slideshowExternalTransform.value = transform
      },
      // Eigene Größe/Position dauerhaft merken (gebündelt)
      onImageBoundsChange: ({ imageConfig, imageObject, bounds }) => {
        slideshowBoundsRevision.value++
        boundsQueue.queue(slideshowStableKey({ ...imageConfig, imageObject }), bounds)
      },
      // Bild-Anpassungen dauerhaft merken (Filter, Schatten, Rotation …) –
      // nur Abweichungen vom Standard (unveränderte Bilder → kein Eintrag)
      onImageAdjustmentsChange: ({ imageConfig, imageObject, adjustments, audioMode }) => {
        adjustmentsStore.setAdjustments(
          slideshowStableKey({ ...imageConfig, imageObject }),
          diffAdjustments(
            adjustments,
            fotoManager?.defaultSettings,
            imageConfig?.audioReactiveSettings ?? null,
          ),
          audioMode as string | undefined,
        )
      },
      // Lazy, damit ein späteres Workspace-Format berücksichtigt wird
      getWorkspaceBounds: () => canvasManagerRef?.value?.getWorkspaceBounds?.() ?? null,
      onImageTransition: (index, total, phase) => {
        slideshowCurrentIndex.value = index
        slideshowCurrentPhase.value = phase
      },
    })

    // Für Canvas-Rendering und Maus-Interaktion anmelden
    setSlideshowManager(slideshowManagerRef.value)

    console.log('[Slideshow] SlideshowManager initialisiert')
  }

  function getSlideshowManager(): SlideshowManager | null {
    if (!slideshowManagerRef.value) initSlideshowManager()
    return slideshowManagerRef.value
  }

  function slideshowImageObject(img: Partial<SlideshowSourceImage> | null | undefined) {
    return resolveSlideshowImageObject(img as SlideshowSourceImage, getLoadedStockImage)
  }

  // Führt fn mit dem Image-Objekt aus – noch nicht geladene Stock-Bilder werden
  // zuerst geladen (gleiches Objekt wie beim Start, siehe loadStockImageObject)
  function withSlideshowImageObject(
    img: Partial<SlideshowSourceImage> | null | undefined,
    fn: (obj: HTMLImageElement) => void,
  ) {
    const obj = slideshowImageObject(img)
    if (obj) return fn(obj)
    if (img?.stockImage) {
      loadStockImageObject(img.stockImage as StockImage)
        .then(fn)
        .catch((e: unknown) => console.warn('[Slideshow] Stock-Bild nicht geladen:', e))
    }
  }

  // Zugriff auf gemerkte Bild-Anpassungen für Slideshow-Presets (Speichern/Laden)
  const slideshowAdjustmentsApi = createSlideshowAdjustmentsApi({
    getManager: getSlideshowManager,
    resolveImageObject: slideshowImageObject,
    withImageObject: withSlideshowImageObject,
    adjustmentsStore,
    imageSettingsStore,
    getDefaultSettings: () =>
      fotoManagerRef?.value?.defaultSettings as Record<string, unknown> | undefined,
  })

  // ─── Start / Live-Update / Steuerung ────────────────────────────────────

  async function startSlideshow(config: SlideshowRunConfig) {
    if (!slideshowManagerRef.value) {
      initSlideshowManager()
    }

    if (!slideshowManagerRef.value) {
      toastStore.error('Slideshow Manager nicht bereit')
      return
    }

    // Stock-Bilder ggf. nachladen; nicht ladbare Bilder auslassen
    const { images: loaded, failed } = await ensureSlideshowImagesLoaded(
      config.images,
      (stock) => loadStockImageObject(stock as StockImage),
      getLoadedStockImage,
    )
    if (failed.length > 0) {
      toastStore.warning(t('slideshow.imagesNotLoaded') + ': ' + failed.join(', '))
    }
    if (loaded.length === 0) return

    // Dauerhaft gemerkte Anpassungen für Bilder ohne Anpassungen in dieser Sitzung
    restorePersistedAdjustments(loaded)
    restorePersistedBounds(loaded)

    const { images, options } = buildSlideshowRun({
      ...config,
      images: loaded as SlideshowRunImage[],
    })
    const success = slideshowManagerRef.value.start(images, options)

    if (success) {
      slideshowIsActive.value = true
      slideshowIsPaused.value = false
      slideshowTotalImages.value = images.length
      // Für Canvas-Rendering und Maus-Interaktion anmelden
      setSlideshowManager(slideshowManagerRef.value)
      toastStore.success(t('slideshow.title') + ' gestartet')
      // Auswahl in beiden Galerien aufheben nach dem Start
      deselectAllImages()
      deselectAllStockImages()
    }
  }

  /**
   * Baut Bilder + Optionen für den SlideshowManager aus der Panel-Konfiguration
   * (für start() und applyLiveUpdate()).
   */
  function buildSlideshowRun(config: SlideshowRunConfig): {
    images: SlideshowImageConfig[]
    options: SlideshowStartOptions
  } {
    const images = config.images.map((img) => ({
      imageObject: resolveSlideshowImageObject(img, getLoadedStockImage),
      name: img.name,
      // für den dauerhaften Schlüssel (slideshowStableKey)
      id: img.id,
      source: img.source,
      stockImage: img.stockImage,
      displayDuration: img.displayDuration,
      audioMode: img.audioMode,
      audioSource: img.audioSource,
      transition: img.transition,
      fadeInDuration: img.fadeInDuration,
      fadeOutDuration: img.fadeOutDuration,
      // Pro Bild: Standard (globale Option), Aus, Gespeichert oder Preset
      audioReactiveSettings: resolveSlideshowAudioReactive(img.audioMode, {
        applyGlobal: config.applyAudioReactive,
        savedSettings: savedAudioReactiveSettings.value,
        // Eigene Audio-Quelle des Bildes (z. B. Bass-Onset)
        source: img.audioSource,
      }),
    }))

    const options = {
      fadeInDuration: config.fadeInDuration,
      displayDuration: config.displayDuration,
      fadeOutDuration: config.fadeOutDuration,
      loop: config.loop,
      // Immer anwenden: die Auflösung pro Bild entscheidet (null = unverändert)
      autoApplyAudioReactive: true,
      audioReactiveSettings: null,
      renderBehindVisualizer: config.renderBehindVisualizer,
      backgroundMode: config.backgroundMode,
      backgroundColor: config.backgroundColor,
      workspaceColor: config.workspaceColor,
      backgroundGradient: config.backgroundGradient,
      workspaceGradient: config.workspaceGradient,
      backgroundFillAudio: config.backgroundFillAudio,
      workspaceFillAudio: config.workspaceFillAudio,
      backgroundImageFill: config.backgroundImageFill,
      workspaceImageFill: config.workspaceImageFill,
      backgroundImageObject: config.backgroundImageObject,
      workspaceImageObject: config.workspaceImageObject,
      fitToWorkspace: config.fitToWorkspace,
      moveWholeSlideshow: config.moveWholeSlideshow,
      transition: config.transition,
      transform: config.transform,
      // Live-Bearbeitung eines Bildes: aktuelle Anpassungen vorher übernehmen
      preserveLive: config.preserveLive === true,
    }
    return { images, options }
  }

  // Preset während laufender Slideshow geladen → in die laufende Slideshow übernehmen
  function onSlideshowLiveUpdate(config: SlideshowRunConfig) {
    const manager = slideshowManagerRef.value
    if (!manager?.isActive) return
    const { images, options } = buildSlideshowRun(config)
    manager.applyLiveUpdate(images, options)
  }

  function pauseSlideshow() {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.pause()
      slideshowIsPaused.value = true
    }
  }

  function resumeSlideshow() {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.resume()
      slideshowIsPaused.value = false
    }
  }

  function stopSlideshow() {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.stop()
      resetRunState()
    }
  }

  function onSlideshowOrderChanged(orderedImages: unknown[]) {
    console.log('[Slideshow] Reihenfolge geändert:', orderedImages.length, 'Bilder')
  }

  // Maus: ganze Slideshow oder einzelnes Bild verschieben
  function onSlideshowMoveModeChange(value: boolean) {
    getSlideshowManager()?.setMoveWholeSlideshow(value)
  }

  // Gemerkte Bild-Anpassungen (Filter/Audio) der Slideshow verwerfen
  function onSlideshowResetImageAdjustments() {
    slideshowManagerRef.value?.clearImageMemory()
    adjustmentsStore.clearAll()
    boundsQueue.clear()
    imageSettingsStore.clearField('bounds')
  }

  // Dauerhaft gemerkte Größe/Position für Bilder ohne eigene Bounds in dieser Sitzung
  function restorePersistedBounds(images: SlideshowSourceImage[]) {
    restorePersistedBoundsInto(slideshowManagerRef.value as AdjustmentsManager | null, images, {
      resolveImageObject: slideshowImageObject,
      getBounds: (key) => imageSettingsStore.getImageSettings(key)?.bounds ?? null,
    })
  }

  // Dauerhaft gemerkte Anpassungen in den Sitzungsspeicher der Slideshow übernehmen
  function restorePersistedAdjustments(images: SlideshowSourceImage[]) {
    restorePersistedAdjustmentsInto(
      slideshowManagerRef.value as AdjustmentsManager | null,
      images,
      {
        resolveImageObject: slideshowImageObject,
        getAdjustments: (key) => adjustmentsStore.getAdjustments(key),
      },
    )
  }

  // Einstellungen des Slideshow-Panels (wirken auch während laufender Slideshow)
  const managerCall =
    <M extends ManagerSetter>(method: M) =>
    (...args: Parameters<SlideshowManager[M]>) =>
      (slideshowManagerRef.value?.[method] as ((...a: unknown[]) => void) | undefined)?.call(
        slideshowManagerRef.value,
        ...args,
      )
  // „An Workspace anpassen“ / Hintergrund-Modus
  const onSlideshowBackgroundModeChange = managerCall('setBackgroundMode')
  // Farbe der Fläche unter der Slideshow bzw. der Workspace-Fläche
  const onSlideshowBackgroundColorChange = managerCall('setBackgroundColor')
  const onSlideshowWorkspaceColorChange = managerCall('setWorkspaceColor')
  // Farbverlauf / Audio-Reaktive Farbe / eigenes Bild einer Fläche
  // (target: 'canvas' | 'workspace')
  const onSlideshowBaseGradientChange = managerCall('setBaseGradient')
  const onSlideshowBaseFillAudioChange = managerCall('setBaseFillAudio')
  const onSlideshowBaseImageChange = managerCall('setBaseImage')

  function onSlideshowRenderLayerChange(renderBehindVisualizer: boolean) {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.setRenderBehindVisualizer(renderBehindVisualizer)
      console.log(
        '[Slideshow] Render-Layer geändert:',
        renderBehindVisualizer ? 'hinter Visualizer' : 'vor Visualizer',
      )
    }
  }

  function onSlideshowTransformChange(transform: RelBounds) {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.setTransform(transform)
      console.log('[Slideshow] Transform geändert:', transform)
    }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  onMounted(() => {
    window.addEventListener(SLIDESHOW_EDIT_EVENT, onSlideshowEditImage)
    window.addEventListener('pagehide', boundsQueue.flush)
    // Manager verzögert erzeugen (Canvas-/Foto-Manager sind dann bereit)
    setTimeout(() => {
      initSlideshowManager()
    }, 1000)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(SLIDESHOW_EDIT_EVENT, onSlideshowEditImage)
    window.removeEventListener('pagehide', boundsQueue.flush)
    boundsQueue.flush()
  })

  return {
    slideshowPopover,
    slideshowImages,
    hasWorkspace,
    slideshowIsActive,
    slideshowIsPaused,
    slideshowCurrentIndex,
    slideshowCurrentPhase,
    slideshowTotalImages,
    slideshowExternalTransform,
    slideshowBoundsRevision,
    slideshowEditRequest,
    slideshowAdjustmentsApi,
    startSlideshow,
    pauseSlideshow,
    resumeSlideshow,
    stopSlideshow,
    onSlideshowLiveUpdate,
    onSlideshowOrderChanged,
    onSlideshowMoveModeChange,
    onSlideshowResetImageAdjustments,
    onSlideshowBackgroundModeChange,
    onSlideshowBackgroundColorChange,
    onSlideshowWorkspaceColorChange,
    onSlideshowBaseGradientChange,
    onSlideshowBaseFillAudioChange,
    onSlideshowBaseImageChange,
    onSlideshowRenderLayerChange,
    onSlideshowTransformChange,
  }
}
