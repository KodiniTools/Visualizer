import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { SlideshowManager } from '../../lib/slideshowManager.js'
import { resolveSlideshowAudioReactive } from '../../lib/slideshowAudio.js'
import { SLIDESHOW_EDIT_EVENT } from '../../lib/slideshowEditRequest.js'
import { useSlideshowPopover } from '../../composables/useSlideshowPopover.js'
import { slideshowStableKey } from './slideshow/slideshowImageKey.js'
import { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore.js'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore.js'
import { useWorkspaceStore } from '../../stores/workspaceStore.js'
import {
  diffAdjustments,
  restorePersistedAdjustments as restorePersistedAdjustmentsInto,
  restorePersistedBounds as restorePersistedBoundsInto,
} from '../../lib/slideshowAdjustmentsPersistence.js'
import {
  buildSlideshowSourceImages,
  ensureSlideshowImagesLoaded,
  resolveSlideshowImageObject,
} from '../../lib/slideshowSources.js'
import { useStockGallery } from '../../composables/useStockGallery.js'
import {
  createSlideshowAdjustmentsApi,
  createBoundsPersistQueue,
} from './slideshowAdjustmentsApi.js'

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
}) {
  const slideshowManagerRef = ref(null)
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
  const slideshowExternalTransform = ref(null)
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
  const slideshowEditRequest = ref(null)
  function onSlideshowEditImage(event) {
    const index = event?.detail?.index
    if (!Number.isInteger(index)) return
    slideshowEditRequest.value = { index, nonce: Date.now() }
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
    () => [
      slideshowIsActive.value,
      slideshowIsPaused.value,
      slideshowTotalImages.value,
      slideshowImages.value.length,
    ],
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
    // ✨ Global entfernen wenn gestoppt
    window.slideshowManager = null
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
        if (canvasManager && canvasManager.redraw) {
          canvasManager.redraw()
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
          audioMode,
        )
      },
      // Lazy, damit ein späteres Workspace-Format berücksichtigt wird
      getWorkspaceBounds: () => canvasManagerRef?.value?.getWorkspaceBounds?.() ?? null,
      onImageTransition: (index, total, phase) => {
        slideshowCurrentIndex.value = index
        slideshowCurrentPhase.value = phase
      },
    })

    // ✨ Global verfügbar machen für Maus-Interaktion
    window.slideshowManager = slideshowManagerRef.value

    console.log('[Slideshow] SlideshowManager initialisiert')
  }

  function getSlideshowManager() {
    if (!slideshowManagerRef.value) initSlideshowManager()
    return slideshowManagerRef.value
  }

  function slideshowImageObject(img) {
    return resolveSlideshowImageObject(img, getLoadedStockImage)
  }

  // Führt fn mit dem Image-Objekt aus – noch nicht geladene Stock-Bilder werden
  // zuerst geladen (gleiches Objekt wie beim Start, siehe loadStockImageObject)
  function withSlideshowImageObject(img, fn) {
    const obj = slideshowImageObject(img)
    if (obj) return fn(obj)
    if (img?.stockImage) {
      loadStockImageObject(img.stockImage)
        .then(fn)
        .catch((e) => console.warn('[Slideshow] Stock-Bild nicht geladen:', e))
    }
  }

  // Zugriff auf gemerkte Bild-Anpassungen für Slideshow-Presets (Speichern/Laden)
  const slideshowAdjustmentsApi = createSlideshowAdjustmentsApi({
    getManager: getSlideshowManager,
    resolveImageObject: slideshowImageObject,
    withImageObject: withSlideshowImageObject,
    adjustmentsStore,
    imageSettingsStore,
    getDefaultSettings: () => fotoManagerRef?.value?.defaultSettings,
  })

  // ─── Start / Live-Update / Steuerung ────────────────────────────────────

  async function startSlideshow(config) {
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
      loadStockImageObject,
      getLoadedStockImage,
    )
    if (failed.length > 0) {
      toastStore.warning(t('slideshow.imagesNotLoaded') + ': ' + failed.join(', '))
    }
    if (loaded.length === 0) return

    // Dauerhaft gemerkte Anpassungen für Bilder ohne Anpassungen in dieser Sitzung
    restorePersistedAdjustments(loaded)
    restorePersistedBounds(loaded)

    const { images, options } = buildSlideshowRun({ ...config, images: loaded })
    const success = slideshowManagerRef.value.start(images, options)

    if (success) {
      slideshowIsActive.value = true
      slideshowIsPaused.value = false
      slideshowTotalImages.value = images.length
      // ✨ Global verfügbar machen für Maus-Interaktion
      window.slideshowManager = slideshowManagerRef.value
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
  function buildSlideshowRun(config) {
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
  function onSlideshowLiveUpdate(config) {
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

  function onSlideshowOrderChanged(orderedImages) {
    console.log('[Slideshow] Reihenfolge geändert:', orderedImages.length, 'Bilder')
  }

  // Maus: ganze Slideshow oder einzelnes Bild verschieben
  function onSlideshowMoveModeChange(value) {
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
  function restorePersistedBounds(images) {
    restorePersistedBoundsInto(slideshowManagerRef.value, images, {
      resolveImageObject: slideshowImageObject,
      getBounds: (key) => imageSettingsStore.getImageSettings(key)?.bounds ?? null,
    })
  }

  // Dauerhaft gemerkte Anpassungen in den Sitzungsspeicher der Slideshow übernehmen
  function restorePersistedAdjustments(images) {
    restorePersistedAdjustmentsInto(slideshowManagerRef.value, images, {
      resolveImageObject: slideshowImageObject,
      getAdjustments: (key) => adjustmentsStore.getAdjustments(key),
    })
  }

  // Einstellungen des Slideshow-Panels (wirken auch während laufender Slideshow)
  const managerCall =
    (method) =>
    (...args) =>
      slideshowManagerRef.value?.[method](...args)
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

  function onSlideshowRenderLayerChange(renderBehindVisualizer) {
    if (slideshowManagerRef.value) {
      slideshowManagerRef.value.setRenderBehindVisualizer(renderBehindVisualizer)
      console.log(
        '[Slideshow] Render-Layer geändert:',
        renderBehindVisualizer ? 'hinter Visualizer' : 'vor Visualizer',
      )
    }
  }

  function onSlideshowTransformChange(transform) {
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
