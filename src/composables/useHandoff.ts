import { ref, type Ref } from 'vue'
import {
  checkHandoff,
  consumeHandoff,
  dismissHandoff,
  type HandoffImage,
  type HandoffPayload,
} from '../lib/core/handoff'
import type { ShowBannerFn } from './useStatusBanner'
import type { TranslateFn } from './types'

/** Abhängigkeiten von useHandoff */
export interface HandoffDeps {
  /** i18n translator */
  t: TranslateFn
  showBanner: ShowBannerFn
  /** Bilder in die Galerie übernehmen; liefert die Anzahl übernommener Bilder */
  addImagesFromData: (images: HandoffImage[]) => Promise<number>
  /** to reveal the gallery on mobile */
  mobilePanel: Ref<string>
}

/**
 * useHandoff - incoming image handoff from another Kodini tool (e.g. the image
 * converter). Accepted images land in the shared gallery like normal uploads.
 */
export function useHandoff({ t, showBanner, addImagesFromData, mobilePanel }: HandoffDeps) {
  const handoffPayload = ref<HandoffPayload | null>(null)
  let handled = false

  function checkForHandoff() {
    if (handled) return
    handled = true
    handoffPayload.value = checkHandoff()
  }

  async function acceptHandoff() {
    const images = consumeHandoff()
    handoffPayload.value = null
    if (!images || images.length === 0) return

    try {
      // Take image(s) into the gallery like normal uploads; the user decides
      // how to use them afterwards.
      const added = await addImagesFromData(images)
      if (added > 0) {
        // Reveal the photo/gallery panel on mobile.
        mobilePanel.value = 'left'
        showBanner('success', t('handoff.success'))
      } else {
        showBanner('error', t('handoff.error'))
      }
    } catch (error) {
      console.error('[Handoff] Bild-Import fehlgeschlagen:', error)
      showBanner('error', t('handoff.error'))
    }
  }

  function rejectHandoff() {
    dismissHandoff()
    handoffPayload.value = null
  }

  return { handoffPayload, checkForHandoff, acceptHandoff, rejectHandoff }
}
