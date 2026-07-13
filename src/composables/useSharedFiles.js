import { getSharedFiles, clearSharedFiles } from '../utils/sharedFileRepository.js'

/**
 * useSharedFiles - imports tracks handed over from the Audiokonverter tool.
 *
 * Reads the shared-file repository once, adds any tracks to the player, and
 * reports progress through the shared status banner. Runs at most once per
 * session (guarded by `handled`).
 *
 * @param {Object} deps
 * @param {(key:string)=>string} deps.t - i18n translator
 * @param {Object} deps.playerStore
 * @param {(type:string, message:string, duration?:number)=>void} deps.showBanner
 */
export function useSharedFiles({ t, playerStore, showBanner }) {
  let handled = false

  async function loadSharedFiles() {
    if (handled) return
    handled = true

    try {
      const records = await getSharedFiles()
      if (!records?.length) {
        showBanner('warning', t('toast.sharedFilesEmpty'))
        return
      }

      // Persistent "loading" message (duration 0) until the result is known.
      showBanner('info', t('toast.sharedFilesLoading').replace('{count}', records.length), 0)
      const processed = playerStore.addTracksFromBlobs(records)

      if (processed > 0) {
        showBanner('success', t('toast.sharedFilesLoaded').replace('{count}', processed))
        await clearSharedFiles()
      } else {
        showBanner('warning', t('toast.sharedFilesEmpty'))
      }
    } catch (error) {
      console.error('[App] Shared files import error:', error)
      showBanner('error', t('toast.sharedFilesError'))
    }
  }

  return { loadSharedFiles }
}
