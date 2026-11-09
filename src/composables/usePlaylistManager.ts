import { ref } from 'vue'
import { useI18n } from '../lib/i18n'
import { usePlayerStore, type PlaylistTrack } from '../stores/playerStore'

/**
 * Playlist interactions for the sticky player bar: playing a selected track,
 * drag-and-drop reordering, and track/playlist removal.
 */
export function usePlaylistManager() {
  const { t } = useI18n()
  const playerStore = usePlayerStore()

  const draggedTrackIndex = ref<number | null>(null)
  const dragOverTrackIndex = ref<number | null>(null)

  // Selecting a track in the playlist plays it immediately.
  const playTrackAt = (index: number) => {
    playerStore.playTrack(index)
    console.log(
      '[StickyPlayerBar] Track selected and playing:',
      (playerStore.playlist[index] as PlaylistTrack).name,
    )
  }

  const handleDragStart = (event: DragEvent, index: number) => {
    draggedTrackIndex.value = index
    const dataTransfer = event.dataTransfer as DataTransfer
    dataTransfer.effectAllowed = 'move'
    dataTransfer.setData('text/plain', index.toString())
    setTimeout(() => {
      ;(event.target as HTMLElement).classList.add('dragging')
    }, 0)
  }
  const handleDragEnd = () => {
    draggedTrackIndex.value = null
    dragOverTrackIndex.value = null
  }
  const handleDragOver = (event: DragEvent, index: number) => {
    if (draggedTrackIndex.value === null) return
    if (draggedTrackIndex.value === index) return
    dragOverTrackIndex.value = index
    ;(event.dataTransfer as DataTransfer).dropEffect = 'move'
  }
  const handleDragLeave = () => {}
  const handleDrop = (_event: DragEvent, toIndex: number) => {
    const fromIndex = draggedTrackIndex.value
    if (fromIndex === null || fromIndex === toIndex) {
      handleDragEnd()
      return
    }
    playerStore.reorderPlaylist(fromIndex, toIndex)
    handleDragEnd()
  }

  const resetPlayer = () => {
    playerStore.clearPlaylist()
  }

  const removeTrack = (index: number) => {
    const wasCurrentTrack = index === playerStore.currentTrackIndex
    playerStore.playlist.splice(index, 1)

    if (playerStore.playlist.length === 0) {
      resetPlayer()
    } else {
      if (index < playerStore.currentTrackIndex) {
        playerStore.currentTrackIndex--
      } else if (wasCurrentTrack) {
        playerStore.stopPlayer()
        if (index >= playerStore.playlist.length) {
          playerStore.currentTrackIndex = playerStore.playlist.length - 1
        } else {
          playerStore.currentTrackIndex = index
        }
        playerStore.loadTrack(playerStore.currentTrackIndex)
      }
    }
  }

  const clearAllTracks = () => {
    if (confirm(t('player.confirmDeleteAll'))) {
      resetPlayer()
    }
  }

  return {
    draggedTrackIndex,
    dragOverTrackIndex,
    playTrackAt,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeTrack,
    clearAllTracks,
  }
}
