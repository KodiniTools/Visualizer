import { ref, watch } from 'vue'
import {
  SLIDESHOW_GRADIENT_DEFAULT,
  isSameSlideshowGradient,
  loadStoredSlideshowBaseColor,
  loadStoredSlideshowGradient,
  normalizeSlideshowGradient,
  storeSlideshowBaseColor,
  storeSlideshowGradient,
} from '../../../lib/slideshowBaseColor.js'
import {
  SLIDESHOW_FILL_AUDIO_DEFAULT,
  isSameSlideshowFillAudio,
  loadStoredSlideshowFillAudio,
  normalizeSlideshowFillAudio,
  storeSlideshowFillAudio,
} from '../../../lib/slideshowFillAudio.js'
import { SLIDESHOW_DEFAULT_SETTINGS as D } from '../../../stores/slideshowPresetStore.js'

export function isDefaultFillAudio(a) {
  return isSameSlideshowFillAudio(a, SLIDESHOW_FILL_AUDIO_DEFAULT)
}

export function isDefaultGradient(g) {
  return isSameSlideshowGradient(g, SLIDESHOW_GRADIENT_DEFAULT)
}

/**
 * Flächen unter der Slideshow (Canvas bzw. Workspace): Farbe, Farbverlauf und
 * audio-reaktive Farbe. Alle Werte werden auch ohne Preset dauerhaft gemerkt;
 * Verlauf/Audio gehen bei jeder Änderung sofort an die Slideshow.
 * @param {(event: string, ...args: any[]) => void} emit - Emits des Slideshow-Panels
 */
export function useSlideshowBaseFills(emit) {
  // Farbe der Fläche unter der Slideshow (anstelle des ersetzten Hintergrundbildes)
  const backgroundColor = ref(loadStoredSlideshowBaseColor())
  watch(backgroundColor, (color) => storeSlideshowBaseColor(color))
  // Eigene Farbe der Workspace-Fläche
  const workspaceColor = ref(loadStoredSlideshowBaseColor('workspace'))
  watch(workspaceColor, (color) => storeSlideshowBaseColor(color, 'workspace'))

  const backgroundGradient = ref(loadStoredSlideshowGradient('canvas'))
  const workspaceGradient = ref(loadStoredSlideshowGradient('workspace'))
  watch(backgroundGradient, (g) => {
    storeSlideshowGradient(g, 'canvas')
    emit('base-gradient-change', 'canvas', { ...g })
  })
  watch(workspaceGradient, (g) => {
    storeSlideshowGradient(g, 'workspace')
    emit('base-gradient-change', 'workspace', { ...g })
  })

  const backgroundFillAudio = ref(loadStoredSlideshowFillAudio('canvas'))
  const workspaceFillAudio = ref(loadStoredSlideshowFillAudio('workspace'))
  watch(backgroundFillAudio, (a) => {
    storeSlideshowFillAudio(a, 'canvas')
    emit('base-fill-audio-change', 'canvas', { ...a })
  })
  watch(workspaceFillAudio, (a) => {
    storeSlideshowFillAudio(a, 'workspace')
    emit('base-fill-audio-change', 'workspace', { ...a })
  })

  // Farbe → Standard; Verlauf/Audio nur zurücksetzen, wenn abweichend
  // (die Watcher übernehmen Speichern + Weitergabe)
  function resetFill(colorRef, gradientRef, audioRef, defaultColor, event) {
    colorRef.value = defaultColor
    if (!isDefaultGradient(gradientRef.value)) {
      gradientRef.value = normalizeSlideshowGradient(null)
    }
    if (!isDefaultFillAudio(audioRef.value)) {
      audioRef.value = normalizeSlideshowFillAudio(null)
    }
    emit(event, colorRef.value)
  }

  function resetBackgroundColor() {
    resetFill(
      backgroundColor,
      backgroundGradient,
      backgroundFillAudio,
      D.backgroundColor,
      'background-color-change',
    )
  }

  function resetWorkspaceColor() {
    resetFill(
      workspaceColor,
      workspaceGradient,
      workspaceFillAudio,
      D.workspaceColor,
      'workspace-color-change',
    )
  }

  /** Kopie aller Flächen-Werte (Start-Payload und Preset). */
  function snapshot() {
    return {
      backgroundColor: backgroundColor.value,
      workspaceColor: workspaceColor.value,
      backgroundGradient: { ...backgroundGradient.value },
      workspaceGradient: { ...workspaceGradient.value },
      backgroundFillAudio: { ...backgroundFillAudio.value },
      workspaceFillAudio: { ...workspaceFillAudio.value },
    }
  }

  /** Werte aus einem Preset übernehmen – nur geänderte Werte setzen/melden. */
  function applySettings(s) {
    if (backgroundColor.value !== s.backgroundColor) {
      backgroundColor.value = s.backgroundColor
      emit('background-color-change', backgroundColor.value)
    }
    if (workspaceColor.value !== s.workspaceColor) {
      workspaceColor.value = s.workspaceColor
      emit('workspace-color-change', workspaceColor.value)
    }
    // Watcher übernehmen Speichern + Weitergabe an die Slideshow
    if (!isSameSlideshowGradient(backgroundGradient.value, s.backgroundGradient)) {
      backgroundGradient.value = normalizeSlideshowGradient(s.backgroundGradient)
    }
    if (!isSameSlideshowGradient(workspaceGradient.value, s.workspaceGradient)) {
      workspaceGradient.value = normalizeSlideshowGradient(s.workspaceGradient)
    }
    if (!isSameSlideshowFillAudio(backgroundFillAudio.value, s.backgroundFillAudio)) {
      backgroundFillAudio.value = normalizeSlideshowFillAudio(s.backgroundFillAudio)
    }
    if (!isSameSlideshowFillAudio(workspaceFillAudio.value, s.workspaceFillAudio)) {
      workspaceFillAudio.value = normalizeSlideshowFillAudio(s.workspaceFillAudio)
    }
  }

  return {
    backgroundColor,
    workspaceColor,
    backgroundGradient,
    workspaceGradient,
    backgroundFillAudio,
    workspaceFillAudio,
    resetBackgroundColor,
    resetWorkspaceColor,
    snapshot,
    applySettings,
  }
}
