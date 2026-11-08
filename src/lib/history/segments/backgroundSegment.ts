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
import type { Ref } from 'vue'
import { mediaRegistry, loadImageElement } from '../mediaRegistry'
import type { SegmentAdapter } from '../historyRecorder'
import { assignDeep, clone } from './storeSegments'
import {
  applyFotoSettings,
  cleanFotoSettings,
  recreateVideoElement,
  videoSourceOf,
  type FotoSettingsTarget,
  type ObjectId,
} from './canvasSegments'

type Loose = Record<string, unknown>

/** Bild-Hintergrund (Canvas- oder Workspace-Hintergrund) */
export interface BackgroundImageSlotObject extends FotoSettingsTarget {
  id?: ObjectId | null
  type?: string
  imageObject: HTMLImageElement | null
  /** Animationen wie bei Texten (canvasObjects/imageAnimation) */
  timedAnimation?: Loose | null
}

/** Video-Hintergrund (Canvas- oder Workspace-Video) */
export interface BackgroundVideoSlotObject extends FotoSettingsTarget {
  id?: ObjectId | null
  type?: string
  videoElement: HTMLVideoElement | null
  loop?: boolean
  muted?: boolean
}

type SlotObject = BackgroundImageSlotObject | BackgroundVideoSlotObject

/** Benötigter Ausschnitt des CanvasManagers */
export interface BackgroundCanvasManager {
  /** Farbe als String, Bild als Objekt, oder null */
  background?: string | BackgroundImageSlotObject | null
  workspaceBackground?: BackgroundImageSlotObject | null
  videoBackground?: BackgroundVideoSlotObject | null
  workspaceVideoBackground?: BackgroundVideoSlotObject | null
  activeObject?: ({ id?: ObjectId | null; type?: unknown } & Loose) | null
  setGradientSettings?(settings: BackgroundGradientSnapshot): void
}

export interface BackgroundSegmentRefs {
  backgroundColor: Ref<string>
  backgroundOpacity: Ref<number>
  gradientEnabled: Ref<boolean>
  gradientColor2: Ref<string>
  gradientType: Ref<string>
  gradientAngle: Ref<number>
}

export interface BackgroundSegmentDeps {
  getCanvasManager: () => BackgroundCanvasManager | null | undefined
  refs: BackgroundSegmentRefs
  /** reaktive Audio-Reaktiv-Konfiguration */
  bgAudioReactive: Loose
  /** UI/Renderer synchronisieren */
  afterApply?: () => void
}

export interface BackgroundGradientSnapshot {
  enabled: boolean
  color2: string
  type: string
  angle: number
}

interface SlotSnapshot {
  key: ObjectId
  id: ObjectId | null
  type: string | undefined
  media: string | null
  loop: boolean | undefined
  muted: boolean | undefined
  fotoSettings: Loose | null
  /** nur Bild-Hintergründe mit Animation (canvasObjects/imageAnimation) */
  timedAnimation?: Loose | null
}

export interface BackgroundSnapshot {
  color: string
  opacity: number
  gradient: BackgroundGradientSnapshot
  audio: Loose
  background: string | SlotSnapshot | null
  workspaceBackground: SlotSnapshot | null
  videoBackground?: SlotSnapshot | null
  workspaceVideoBackground?: SlotSnapshot | null
}

const IMAGE_SLOTS = ['background', 'workspaceBackground'] as const
const VIDEO_SLOTS = ['videoBackground', 'workspaceVideoBackground'] as const

function slotKey(obj: SlotObject | null | undefined, slot: string): ObjectId {
  return obj?.id ?? `${slot}:${obj?.type ?? ''}`
}

/** Erzeugt das History-Segment für den Canvas-Hintergrund. */
export function createBackgroundSegment({
  getCanvasManager,
  refs,
  bgAudioReactive,
  afterApply,
}: BackgroundSegmentDeps): SegmentAdapter<BackgroundSnapshot | null | undefined> {
  const pool = new Map<ObjectId, SlotObject>()

  function captureSlot(
    obj: SlotObject | string | null | undefined,
    slot: string,
    kind: 'image' | 'video',
  ): SlotSnapshot | null {
    if (!obj || typeof obj !== 'object') return null
    const key = slotKey(obj, slot)
    pool.set(key, obj)
    // Slot-Art bestimmt die Form (Bild- bzw. Video-Hintergrund)
    const image = obj as Partial<BackgroundImageSlotObject>
    const video = obj as Partial<BackgroundVideoSlotObject>
    const src =
      kind === 'image' ? image.imageObject?.src || null : videoSourceOf(video.videoElement)
    const element = kind === 'image' ? image.imageObject : video.videoElement
    return {
      key,
      id: obj.id ?? null,
      type: obj.type,
      media: src ? mediaRegistry.remember(src, element) : null,
      loop: video.loop,
      muted: video.muted,
      fotoSettings: cleanFotoSettings(obj.fotoSettings),
      ...(kind === 'image' && image.timedAnimation
        ? { timedAnimation: clone(image.timedAnimation) }
        : {}),
    }
  }

  async function restoreImageSlot(
    snap: SlotSnapshot,
    current: BackgroundImageSlotObject | string | null | undefined,
    slot: string,
  ): Promise<BackgroundImageSlotObject | null> {
    // Pool-Einträge unter einem Bild-Slot-Key sind Bild-Hintergründe
    let obj =
      current && typeof current === 'object' && slotKey(current, slot) === snap.key
        ? current
        : (pool.get(snap.key) as BackgroundImageSlotObject | undefined)
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
    // Laufzeit-Zustand (Startzeiten) hängt am Objekt und bleibt erhalten
    if (!snap.timedAnimation) delete obj.timedAnimation
    else if (obj.timedAnimation) assignDeep(obj.timedAnimation, snap.timedAnimation)
    else obj.timedAnimation = clone(snap.timedAnimation)
    pool.set(snap.key, obj)
    return obj
  }

  function restoreVideoSlot(
    snap: SlotSnapshot,
    current: BackgroundVideoSlotObject | null | undefined,
    slot: string,
  ): BackgroundVideoSlotObject | null {
    // Pool-Einträge unter einem Video-Slot-Key sind Video-Hintergründe
    let obj: BackgroundVideoSlotObject | null =
      current && slotKey(current, slot) === snap.key
        ? current
        : ((pool.get(snap.key) as BackgroundVideoSlotObject | undefined) ?? null)
    if (!obj) obj = { id: snap.id, type: snap.type, videoElement: null }
    let videoElement = obj.videoElement
    if (!videoElement || !videoSourceOf(videoElement)) {
      // Element wurde (z. B. durch Reset) mit src = '' zerstört → neu erzeugen
      const src = mediaRegistry.resolve(snap.media)
      if (!src) return null
      videoElement = recreateVideoElement(src, { loop: snap.loop, muted: snap.muted })
      obj.videoElement = videoElement
    }
    obj.loop = snap.loop
    obj.muted = snap.muted
    videoElement.loop = snap.loop ?? true
    videoElement.muted = snap.muted ?? true
    applyFotoSettings(obj, snap.fotoSettings)
    videoElement.play?.().catch(() => {})
    pool.set(snap.key, obj)
    return obj
  }

  return {
    label: 'background',
    order: 20,
    capture() {
      const cm = getCanvasManager()
      if (!cm) return null
      const snap: BackgroundSnapshot = {
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
        } else if (slot === 'background') {
          cm.background = snap ?? null
        } else {
          cm[slot] = null
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
          .filter((o): o is SlotObject => !!o && typeof o === 'object')
          .some((o) => o.id === active.id)
      ) {
        cm.activeObject = null
      }

      afterApply?.()
    },
  }
}
