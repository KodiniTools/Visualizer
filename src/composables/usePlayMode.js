import { computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'

const PLAY_MODES = ['none', 'sequence', 'repeat-one', 'repeat-all', 'shuffle']

/**
 * Cycling play-mode control (no autoplay / sequence / repeat-one / repeat-all /
 * shuffle) plus its localized label.
 */
export function usePlayMode() {
  const { locale } = useI18n()
  const playerStore = usePlayerStore()

  function cyclePlayMode() {
    const idx = PLAY_MODES.indexOf(playerStore.playMode)
    playerStore.playMode = PLAY_MODES[(idx + 1) % PLAY_MODES.length]
  }

  const playModeLabel = computed(() => {
    const labels = {
      none: locale.value === 'de' ? 'Kein Autoplay' : 'No autoplay',
      sequence: locale.value === 'de' ? 'Playlist (einmal)' : 'Playlist (once)',
      'repeat-one': locale.value === 'de' ? 'Track wiederholen' : 'Repeat track',
      'repeat-all': locale.value === 'de' ? 'Playlist wiederholen' : 'Repeat all',
      shuffle: locale.value === 'de' ? 'Zufällige Reihenfolge' : 'Shuffle',
    }
    return labels[playerStore.playMode] ?? ''
  })

  return { cyclePlayMode, playModeLabel }
}
