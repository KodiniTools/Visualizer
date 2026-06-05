export function useTextAnimations(selectedText, canvasManager) {
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
      easing: 'ease',
    },
    _state: {
      startTime: null,
      isPlaying: false,
      currentIndex: 0,
    },
  })

  function ensureAnimation() {
    if (!selectedText.value.animation) {
      selectedText.value.animation = defaultAnimation()
    }
  }

  function updateAnimationType() {
    const hasTypewriter = selectedText.value.animation.typewriter?.enabled
    const hasFade = selectedText.value.animation.fade?.enabled
    const hasScale = selectedText.value.animation.scale?.enabled
    const hasSlide = selectedText.value.animation.slide?.enabled

    const types = []
    if (hasTypewriter) types.push('typewriter')
    if (hasFade) types.push('fade')
    if (hasScale) types.push('scale')
    if (hasSlide) types.push('slide')
    selectedText.value.animation.type = types.join('+') || 'none'
  }

  // ✨ Typewriter-Animation aktivieren/deaktivieren
  function toggleTypewriter() {
    if (!selectedText.value) return

    ensureAnimation()

    // Toggle enabled
    selectedText.value.animation.typewriter.enabled =
      !selectedText.value.animation.typewriter.enabled

    updateAnimationType()

    // Bei Aktivierung: Animation-State zurücksetzen für sofortigen Start
    if (selectedText.value.animation.typewriter.enabled) {
      selectedText.value.animation._state.startTime = null
      selectedText.value.animation._state.isPlaying = false
      selectedText.value.animation._state.currentIndex = 0
    }

    updateText()
    console.log(
      `⌨️ Typewriter ${selectedText.value.animation.typewriter.enabled ? 'aktiviert' : 'deaktiviert'}`,
    )
  }

  // ✨ Typewriter-Animation neu starten
  function restartTypewriter() {
    if (!selectedText.value?.animation) return

    // State zurücksetzen
    selectedText.value.animation._state = {
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
    if (!selectedText.value.animation.fade) {
      selectedText.value.animation.fade = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    selectedText.value.animation.fade.enabled = !selectedText.value.animation.fade.enabled

    updateAnimationType()

    // Bei Aktivierung: Fade-State zurücksetzen für sofortigen Start
    if (selectedText.value.animation.fade.enabled) {
      selectedText.value.animation._state.fadeStartTime = null
      selectedText.value.animation._state.fadePhase = null
    }

    updateText()
    console.log(
      `🌫️ Fade ${selectedText.value.animation.fade.enabled ? 'aktiviert' : 'deaktiviert'}`,
    )
  }

  // ✨ Fade-Animation neu starten
  function restartFade() {
    if (!selectedText.value?.animation) return

    // Fade-State zurücksetzen
    selectedText.value.animation._state.fadeStartTime = null
    selectedText.value.animation._state.fadePhase = null

    updateText()
    console.log('🔄 Fade-Animation neu gestartet')
  }

  // ✨ Scale-Animation aktivieren/deaktivieren
  function toggleScale() {
    if (!selectedText.value) return

    ensureAnimation()

    // Initialisiere scale wenn nicht vorhanden
    if (!selectedText.value.animation.scale) {
      selectedText.value.animation.scale = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        startScale: 0,
        endScale: 1,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    selectedText.value.animation.scale.enabled = !selectedText.value.animation.scale.enabled

    updateAnimationType()

    // Bei Aktivierung: Scale-State zurücksetzen für sofortigen Start
    if (selectedText.value.animation.scale.enabled) {
      selectedText.value.animation._state.scaleStartTime = null
    }

    updateText()
    console.log(
      `🔍 Scale ${selectedText.value.animation.scale.enabled ? 'aktiviert' : 'deaktiviert'}`,
    )
  }

  // ✨ Scale-Animation neu starten
  function restartScale() {
    if (!selectedText.value?.animation) return

    // Scale-State zurücksetzen
    selectedText.value.animation._state.scaleStartTime = null

    updateText()
    console.log('🔄 Scale-Animation neu gestartet')
  }

  // ✨ Slide-Animation aktivieren/deaktivieren
  function toggleSlide() {
    if (!selectedText.value) return

    ensureAnimation()

    // Initialisiere slide wenn nicht vorhanden
    if (!selectedText.value.animation.slide) {
      selectedText.value.animation.slide = {
        enabled: false,
        duration: 1000,
        startDelay: 0,
        from: 'left',
        distance: 100,
        direction: 'in',
        loop: false,
        loopDelay: 1000,
        easing: 'ease',
      }
    }

    // Toggle enabled
    selectedText.value.animation.slide.enabled = !selectedText.value.animation.slide.enabled

    updateAnimationType()

    // Bei Aktivierung: Slide-State zurücksetzen für sofortigen Start
    if (selectedText.value.animation.slide.enabled) {
      selectedText.value.animation._state.slideStartTime = null
    }

    updateText()
    console.log(
      `➡️ Slide ${selectedText.value.animation.slide.enabled ? 'aktiviert' : 'deaktiviert'}`,
    )
  }

  // ✨ Slide-Animation neu starten
  function restartSlide() {
    if (!selectedText.value?.animation) return

    // Slide-State zurücksetzen
    selectedText.value.animation._state.slideStartTime = null

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
