/**
 * History-Segment für den Canvas-Hintergrund (Farbe, Deckkraft, Gradient,
 * Audio-Reaktiv, Bild-/Video-Hintergrund und Workspace-Hintergrund).
 *
 * Der Zustand liegt verteilt: UI-Refs in useBgSettings und Felder im
 * CanvasManager (background, workspaceBackground, videoBackground,
 * workspaceVideoBackground, gradientSettings). Beide werden erfasst und beim
 * Wiederherstellen direkt gesetzt – ohne die Setter, die neue IDs vergeben,
 * fotoSettings zurücksetzen oder Video-Elemente zerstören.
 */
import { mediaRegistry, loadImageElement } from '../mediaRegistry.js'
import { assignDeep, clone } from './storeSegments.js'
import {
  applyFotoSettings,
  cleanFotoSettings,
  recreateVideoElement,
  videoSourceOf,
} from './canvasSegments.js'

const IMAGE_SLOTS = ['background', 'workspaceBackground']
const VIDEO_SLOTS = ['videoBackground', 'workspaceVideoBackground']

function slotKey(obj, slot) {
  return obj?.id ?? `${slot}:${obj?.type ?? ''}`
}

/**
 * @param {Object} deps
 * @param {() => any} deps.getCanvasManager
 * @param {Object} deps.refs - { backgroundColor, backgroundOpacity, gradientEnabled,
 *   gradientColor2, gradientType, gradientAngle } (Vue-Refs)
 * @param {Object} deps.bgAudioReactive - reaktive Audio-Reaktiv-Konfiguration
 * @param {() => void} [deps.afterApply] - UI/Renderer synchronisieren
 */
export function createBackgroundSegment({ getCanvasManager, refs, bgAudioReactive, afterApply }) {
  const pool = new Map()

  function captureSlot(obj, slot, kind) {
    if (!obj || typeof obj !== 'object') return null
    const key = slotKey(obj, slot)
    pool.set(key, obj)
    const src = kind === 'image' ? obj.imageObject?.src || null : videoSourceOf(obj.videoElement)
    const element = kind === 'image' ? obj.imageObject : obj.videoElement
    return {
      key,
      id: obj.id ?? null,
      type: obj.type,
      media: src ? mediaRegistry.remember(src, element) : null,
      loop: obj.loop,
      muted: obj.muted,
      fotoSettings: cleanFotoSettings(obj.fotoSettings),
    }
  }

  async function restoreImageSlot(snap, current, slot) {
    let obj =
      current && typeof current === 'object' && slotKey(current, slot) === snap.key
        ? current
        : pool.get(snap.key)
    if (!obj) obj = { id: snap.id, type: snap.type, imageObject: null }
    const src = mediaRegistry.resolve(snap.media)
    if (src && obj.imageObject?.src !== src) {
      try {
        obj.imageObject = await loadImageElement(src)
      } catch (error) {
        console.warn('⚠️ [History] Hintergrundbild nicht ladbar:', error)
        return null
      }
    }
    if (!obj.imageObject) return null
    applyFotoSettings(obj, snap.fotoSettings)
    pool.set(snap.key, obj)
    return obj
  }

  function restoreVideoSlot(snap, current, slot) {
    let obj =
      current && slotKey(current, slot) === snap.key ? current : (pool.get(snap.key) ?? null)
    if (!obj) obj = { id: snap.id, type: snap.type, videoElement: null }
    if (!videoSourceOf(obj.videoElement)) {
      // Element wurde (z. B. durch Reset) mit src = '' zerstört → neu erzeugen
      const src = mediaRegistry.resolve(snap.media)
      if (!src) return null
      obj.videoElement = recreateVideoElement(src, { loop: snap.loop, muted: snap.muted })
    }
    obj.loop = snap.loop
    obj.muted = snap.muted
    obj.videoElement.loop = snap.loop ?? true
    obj.videoElement.muted = snap.muted ?? true
    applyFotoSettings(obj, snap.fotoSettings)
    obj.videoElement.play?.().catch(() => {})
    pool.set(snap.key, obj)
    return obj
  }

  return {
    label: 'background',
    order: 20,
    capture() {
      const cm = getCanvasManager()
      if (!cm) return null
      const snap = {
        color: refs.backgroundColor.value,
        opacity: refs.backgroundOpacity.value,
        gradient: {
          enabled: refs.gradientEnabled.value,
          color2: refs.gradientColor2.value,
          type: refs.gradientType.value,
          angle: refs.gradientAngle.value,
        },
        audio: clone(bgAudioReactive),
        // Farbe als String, Bild als Objekt, oder null
        background:
          typeof cm.background === 'string' || !cm.background
            ? (cm.background ?? null)
            : captureSlot(cm.background, 'background', 'image'),
        workspaceBackground: captureSlot(cm.workspaceBackground, 'workspaceBackground', 'image'),
      }
      for (const slot of VIDEO_SLOTS) snap[slot] = captureSlot(cm[slot], slot, 'video')
      return snap
    },
    async apply(snapshot) {
      const cm = getCanvasManager()
      if (!cm || !snapshot) return

      refs.backgroundColor.value = snapshot.color
      refs.backgroundOpacity.value = snapshot.opacity
      refs.gradientEnabled.value = snapshot.gradient.enabled
      refs.gradientColor2.value = snapshot.gradient.color2
      refs.gradientType.value = snapshot.gradient.type
      refs.gradientAngle.value = snapshot.gradient.angle
      cm.setGradientSettings?.({ ...snapshot.gradient })
      if (snapshot.audio) assignDeep(bgAudioReactive, snapshot.audio)

      // Bild-Hintergründe
      for (const slot of IMAGE_SLOTS) {
        const snap = snapshot[slot]
        const current = cm[slot]
        if (snap && typeof snap === 'object') {
          cm[slot] = await restoreImageSlot(snap, current, slot)
        } else {
          cm[slot] = slot === 'background' ? (snap ?? null) : null
        }
      }

      // Video-Hintergründe – ersetzte Videos nur anhalten, nicht zerstören
      for (const slot of VIDEO_SLOTS) {
        const snap = snapshot[slot]
        const current = cm[slot]
        if (current && (!snap || slotKey(current, slot) !== snap.key)) {
          current.videoElement?.pause?.()
        }
        cm[slot] = snap ? restoreVideoSlot(snap, current, slot) : null
      }

      const active = cm.activeObject
      if (
        active &&
        typeof active.type === 'string' &&
        active.type.includes('background') &&
        ![cm.background, cm.workspaceBackground, cm.videoBackground, cm.workspaceVideoBackground]
          .filter((o) => o && typeof o === 'object')
          .some((o) => o.id === active.id)
      ) {
        cm.activeObject = null
      }

      afterApply?.()
    },
  }
}
