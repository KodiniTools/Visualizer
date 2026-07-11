import { ref } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'

/**
 * Playlist interactions for the sticky player bar: loading a track without
 * autoplay, drag-and-drop reordering, and track/playlist removal.
 */
export function usePlaylistManager() {
  const { t } = useI18n()
  const playerStore = usePlayerStore()

  const draggedTrackIndex = ref(null)
  const dragOverTrackIndex = ref(null)

  const loadTrackOnly = (index) => {
    playerStore.loadTrack(index)
    console.log('[StickyPlayerBar] Track loaded (no autoplay):', playerStore.playlist[index].name)
  }

  const handleDragStart = (event, index) => {
    draggedTrackIndex.value = index
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
    setTimeout(() => {
      event.target.classList.add('dragging')
    }, 0)
  }
  const handleDragEnd = () => {
    draggedTrackIndex.value = null
    dragOverTrackIndex.value = null
  }
  const handleDragOver = (event, index) => {
    if (draggedTrackIndex.value === null) return
    if (draggedTrackIndex.value === index) return
    dragOverTrackIndex.value = index
    event.dataTransfer.dropEffect = 'move'
  }
  const handleDragLeave = () => {}
  const handleDrop = (event, toIndex) => {
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

  const removeTrack = (index) => {
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
    loadTrackOnly,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeTrack,
    clearAllTracks,
  }
}
