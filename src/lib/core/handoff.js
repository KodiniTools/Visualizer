/**
 * KodiniTools Cross-Tool Handoff Protocol — Receiver (Visualizer)
 *
 * Enables image transfer between tools on kodinitools.com via localStorage.
 * All tools share the same origin, so localStorage acts as the transfer channel.
 *
 * The Visualizer acts purely as a *receiver* here: another tool (e.g. the
 * Bildkonverter) writes a payload to localStorage and navigates the browser to
 * `/visualizer/app`. On mount the app calls `checkHandoff()` and, if the user
 * accepts, `consumeHandoff()` to import the image(s) as a canvas background.
 *
 * Constraints (mirrored from the sender):
 *   - localStorage limit: ~5 MB
 *   - Handoff expires after 5 minutes
 */

const STORAGE_KEY = 'kodinitools-handoff'
const EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * @typedef {Object} HandoffImage
 * @property {string} name
 * @property {string} dataUrl
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} HandoffPayload
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {number} timestamp
 * @property {HandoffImage[]} images
 */

/**
 * Check if a valid, non-expired handoff is waiting in localStorage.
 * Reads localStorage directly — no URL query param required.
 *
 * @returns {HandoffPayload|null}
 */
export function checkHandoff() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const payload = JSON.parse(raw)

    if (Date.now() - payload.timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return payload
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * Consume (accept) the handoff and clean up localStorage + URL.
 *
 * @returns {HandoffImage[]|null} The images ready for import, or null on failure
 */
export function consumeHandoff() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const payload = JSON.parse(raw)
    localStorage.removeItem(STORAGE_KEY)
    cleanHandoffUrl()

    return payload.images
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * Dismiss the handoff without importing.
 */
export function dismissHandoff() {
  localStorage.removeItem(STORAGE_KEY)
  cleanHandoffUrl()
}

/**
 * Remove the handoff query param from the URL if present.
 */
function cleanHandoffUrl() {
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('handoff')) {
      url.searchParams.delete('handoff')
      window.history.replaceState({}, '', url.toString())
    }
  } catch {
    // Ignore URL cleanup errors
  }
}

/**
 * Convert a HandoffImage dataUrl into a loaded HTMLImageElement,
 * ready to be handed to canvasManager.setBackground().
 *
 * @param {HandoffImage} img
 * @returns {Promise<HTMLImageElement>}
 */
export function handoffImageToElement(img) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${img?.name || 'unknown'}`))
    image.src = img.dataUrl
  })
}

export { STORAGE_KEY }
