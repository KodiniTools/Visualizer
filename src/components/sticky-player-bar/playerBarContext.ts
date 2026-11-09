import type { usePlayerPopover } from '../../composables/usePlayerPopover'
import type { usePlayerVolumeEq } from '../../composables/usePlayerVolumeEq'
import type { usePlayMode } from '../../composables/usePlayMode'
import type { useAudioSourceControls } from '../../composables/useAudioSourceControls'
import type { useBeatMarkers } from '../../composables/useBeatMarkers'
import type { usePlaylistManager } from '../../composables/usePlaylistManager'

/** Per provide('playerBar') aus StickyPlayerBar geteilter Zustand der Popover */
export interface PlayerBarContext {
  popover: ReturnType<typeof usePlayerPopover>
  volumeEq: ReturnType<typeof usePlayerVolumeEq>
  playMode: ReturnType<typeof usePlayMode>
  audioSource: ReturnType<typeof useAudioSourceControls>
  markers: ReturnType<typeof useBeatMarkers>
  playlist: ReturnType<typeof usePlaylistManager>
}
