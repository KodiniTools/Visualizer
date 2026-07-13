import { ref } from 'vue'
import { checkHandoff, consumeHandoff, dismissHandoff } from '../lib/core/handoff.js'

/**
 * useHandoff - incoming image handoff from another Kodini tool (e.g. the image
 * converter). Accepted images land in the shared gallery like normal uploads.
 *
 * @param {Object} deps
 * @param {(key:string)=>string} deps.t - i18n translator
 * @param {(type:string, message:string, duration?:number)=>void} deps.showBanner
 * @param {(images:Array)=>Promise<number>} deps.addImagesFromData
 * @param {import('vue').Ref<string>} deps.mobilePanel - to reveal the gallery on mobile
 */
export function useHandoff({ t, showBanner, addImagesFromData, mobilePanel }) {
  const handoffPayload = ref(null)
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
