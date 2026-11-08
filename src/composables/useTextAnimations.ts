import type { Ref } from 'vue'
import type { CanvasManager } from '../lib/canvasManager'
import type { TextAnimation, TextObject } from '../lib/textManager/types'

/** Animation eines Textes, nachdem ensureAnimation() bzw. die Init-Blöcke gelaufen sind */
type FullAnimation = TextAnimation &
  Required<Pick<TextAnimation, 'typewriter' | 'fade' | 'scale' | 'slide' | '_state'>>

export function useTextAnimations(
  selectedText: Ref<TextObject | null | undefined>,
  canvasManager: Ref<CanvasManager | null | undefined>,
) {
  /** Animation des ausgewählten Textes (Aufrufer prüfen vorher selectedText.value) */
  const anim = (): FullAnimation => (selectedText.value as TextObject).animation as FullAnimation

  function updateText() {
    if (canvasManager.value && canvasManager.value.redrawCallback) {
      canvasManager.value.redrawCallback()
    }
  }

  const defaultAnimation = () => ({
    type: 'none',
    typewriter: {
      enabled: false,
      speed: 50,
      startDelay: 0,
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      showCursor: true,
      cursorChar: '|',
    },
    fade: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
    scale: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      startScale: 0,
      endScale: 1,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
    slide: {
      enabled: false,
      duration: 1000,
      startDelay: 0,
      from: 'left',
      distance: 100,
      direction: 'in',
      loop: false,
      loopDelay: 1000,
      permanent: true,
      displayDuration: 5000,
      easing: 'ease',
    },
    _state: {
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
    },
  })

  function ensureAnimation() {
    const text = selectedText.value as TextObject
    if (!text.animation) {
      text.animation = defaultAnimation()
    }
  }

  function updateAnimationType() {
    const hasTypewriter = anim().typewriter?.enabled
    const hasFade = anim().fade?.enabled
    const hasScale = anim().scale?.enabled
    const hasSlide = anim().slide?.enabled

    const types = []
    if (hasTypewriter) types.push('typewriter')
    if (hasFade) types.push('fade')
    if (hasScale) types.push('scale')
    if (hasSlide) types.push('slide')
    anim().type = types.join('+') || 'none'
  }

  // ✨ Typewriter-Animation aktivieren/deaktivieren
  function toggleTypewriter() {
    if (!selectedText.value) return

    ensureAnimation()

    // Toggle enabled
    anim().typewriter.enabled = !anim().typewriter.enabled

    updateAnimationType()

    // Bei Aktivierung: Animation-State zurücksetzen für sofortigen Start
    if (anim().typewriter.enabled) {
      anim()._state.startTime = null
      anim()._state.isPlaying = false
      anim()._state.currentIndex = 0
    }

    updateText()
    console.log(`⌨️ Typewriter ${anim().typewriter.enabled ? 'aktiviert' : 'deaktiviert'}`)
  }

  // ✨ Typewriter-Animation neu starten
  function restartTypewriter() {
    if (!selectedText.value?.animation) return

    // State zurücksetzen
    anim()._state = {
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
    }

    updateText()
    console.log('🔄 Typewriter-Animation neu gestartet')
  }

  // ✨ Fade-Animation aktivieren/deaktivieren
  function toggleFade() {
    if (!selectedText.value) return

    ensureAnimation()

    // Initialisiere fade wenn nicht vorhanden
    if (!anim().fade) {
      anim().fade = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        permanent: true,
        displayDuration: 5000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    anim().fade.enabled = !anim().fade.enabled

    updateAnimationType()

    // Bei Aktivierung: Fade-State zurücksetzen für sofortigen Start
    if (anim().fade.enabled) {
      anim()._state.fadeStartTime = null
      anim()._state.fadePhase = null
    }

    updateText()
    console.log(`🌫️ Fade ${anim().fade.enabled ? 'aktiviert' : 'deaktiviert'}`)
  }

  // ✨ Fade-Animation neu starten
  function restartFade() {
    if (!selectedText.value?.animation) return

    // Fade-State zurücksetzen
    anim()._state.fadeStartTime = null
    anim()._state.fadePhase = null

    updateText()
    console.log('🔄 Fade-Animation neu gestartet')
  }

  // ✨ Scale-Animation aktivieren/deaktivieren
  function toggleScale() {
    if (!selectedText.value) return

    ensureAnimation()

    // Initialisiere scale wenn nicht vorhanden
    if (!anim().scale) {
      anim().scale = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        permanent: true,
        displayDuration: 5000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    anim().scale.enabled = !anim().scale.enabled

    updateAnimationType()

    // Bei Aktivierung: Scale-State zurücksetzen für sofortigen Start
    if (anim().scale.enabled) {
      anim()._state.scaleStartTime = null
    }

    updateText()
    console.log(`🔍 Scale ${anim().scale.enabled ? 'aktiviert' : 'deaktiviert'}`)
  }

  // ✨ Scale-Animation neu starten
  function restartScale() {
    if (!selectedText.value?.animation) return

    // Scale-State zurücksetzen
    anim()._state.scaleStartTime = null

    updateText()
    console.log('🔄 Scale-Animation neu gestartet')
  }

  // ✨ Slide-Animation aktivieren/deaktivieren
  function toggleSlide() {
    if (!selectedText.value) return

    ensureAnimation()

    // Initialisiere slide wenn nicht vorhanden
    if (!anim().slide) {
      anim().slide = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        permanent: true,
        displayDuration: 5000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    anim().slide.enabled = !anim().slide.enabled

    updateAnimationType()

    // Bei Aktivierung: Slide-State zurücksetzen für sofortigen Start
    if (anim().slide.enabled) {
      anim()._state.slideStartTime = null
    }

    updateText()
    console.log(`➡️ Slide ${anim().slide.enabled ? 'aktiviert' : 'deaktiviert'}`)
  }

  // ✨ Slide-Animation neu starten
  function restartSlide() {
    if (!selectedText.value?.animation) return

    // Slide-State zurücksetzen
    anim()._state.slideStartTime = null

    updateText()
    console.log('🔄 Slide-Animation neu gestartet')
  }

  return {
    toggleTypewriter,
    restartTypewriter,
    toggleFade,
    restartFade,
    toggleScale,
    restartScale,
    toggleSlide,
    restartSlide,
  }
}
