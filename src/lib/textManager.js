/**
 * TextManager - Verwaltet Text-Objekte auf dem Canvas
 * Unterstützt: Schriftarten, Größen, Farben, Stile und SCHATTEN
 * ✅ FIXED: Präzise Textmarkierung mit Schatten-, Stroke- und letterSpacing-Unterstützung
 *
 * Die Klasse ist Orchestrator; fachliche Teile liegen in Modulen
 * (siehe docs/REFACTORING-textManager.md):
 * - textManager/createTextObject.js    - Defaults neuer Text-Objekte
 * - textManager/geometry/textBounds.js - Bounds & Treffer-Erkennung
 * - textManager/style/textStyle.js     - Canvas-Style, Schatten, Kontur, Glow
 * - textManager/animation/*            - Typewriter, Fade, Scale, Slide,
 *                                        gemeinsame Timeline und Easing
 * - textManager/audio/textEffectValues.js - Audio-reaktive Effektwerte
 */
import { getMotionOffset } from './audio/index.js'
import { createTextObject } from './textManager/createTextObject.js'
import { findObjectAt, getObjectBounds, isPointInRect } from './textManager/geometry/textBounds.js'
import {
  applyTextStyle,
  applyTextStyleForMeasurement,
  applyTextStyleWithAudio,
  resetShadow,
  strongestGlow,
} from './textManager/style/textStyle.js'
import { getTypewriterText, restartTypewriter } from './textManager/animation/typewriter.js'
import { getDisplayOpacity } from './textManager/animation/displayOpacity.js'
import { getFadeOpacity, restartFade } from './textManager/animation/fade.js'
import { getScaleValue, restartScale } from './textManager/animation/scale.js'
import { getSlideOffset, restartSlide } from './textManager/animation/slide.js'
import {
  calculateTextEffectValue,
  getAudioReactiveValues,
} from './textManager/audio/textEffectValues.js'

export class TextManager {
  constructor(textStore) {
    this.textStore = textStore
    this.textObjects = []
  }

  /**
   * Fügt ein neues Text-Objekt hinzu
   */
  add(text, options = {}) {
    const newText = createTextObject(text, options)
    this.textObjects.push(newText)
    return newText
  }

  /**
   * Löscht ein Text-Objekt
   */
  delete(textObject) {
    const index = this.textObjects.findIndex((t) => t.id === textObject.id)
    if (index !== -1) {
      this.textObjects.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * ↩️ Stellt ein zuvor gelöschtes Text-Objekt wieder her
   * Fügt das Objekt an seiner ursprünglichen Ebenen-Position (Index) wieder ein
   * @param {Object} textObject - Das wiederherzustellende Text-Objekt
   * @param {number} [index] - Ursprünglicher Index in der Ebenen-Reihenfolge
   * @returns {boolean} true wenn erfolgreich
   */
  restore(textObject, index) {
    if (!textObject) return false
    // Doppelte Wiederherstellung verhindern
    if (this.textObjects.some((t) => t.id === textObject.id)) return false

    if (typeof index === 'number' && index >= 0 && index <= this.textObjects.length) {
      this.textObjects.splice(index, 0, textObject)
    } else {
      this.textObjects.push(textObject)
    }
    return true
  }

  /**
   * Findet ein Text-Objekt an einer bestimmten Position
   */
  findObjectAt(x, y, targetCanvas) {
    return findObjectAt(this.textObjects, x, y, targetCanvas)
  }

  /**
   * ✅ FIXED: Berechnet die PRÄZISEN Bounds (Begrenzungsrahmen) eines Text-Objekts
   * Berücksichtigt: Schatten, Stroke, letterSpacing, mehrzeilige Texte
   */
  getObjectBounds(textObj, targetCanvas) {
    return getObjectBounds(textObj, targetCanvas)
  }

  /**
   * Prüft ob ein Punkt in einem Rechteck liegt
   */
  isPointInRect(x, y, rect) {
    return isPointInRect(x, y, rect)
  }

  /**
   * ✅ Wendet Text-Stil für MESSUNG an (OHNE Schatten)
   */
  applyTextStyleForMeasurement(ctx, textObj) {
    applyTextStyleForMeasurement(ctx, textObj)
  }

  /**
   * Wendet Text-Stil auf den Context an (für Zeichnen)
   */
  applyTextStyle(ctx, textObj) {
    applyTextStyle(ctx, textObj)
  }

  /**
   * 🔧 Setzt ALLE Schatten-Eigenschaften explizit zurück
   * Verhindert "Schatten-Lecks" auf nachfolgende Canvas-Elemente
   */
  resetShadow(ctx) {
    resetShadow(ctx)
  }

  /**
   * ✨ NEU: Berechnet den sichtbaren Text für Typewriter-Animation
   * Gibt den anzuzeigenden Text und Cursor-Info zurück
   */
  _getTypewriterText(textObj) {
    return getTypewriterText(textObj)
  }

  /**
   * ✨ NEU: Startet die Typewriter-Animation neu
   */
  restartTypewriter(textObj) {
    restartTypewriter(textObj)
  }

  /**
   * ✨ NEU: Berechnet die Opacity für Fade-Animation
   * Gibt einen Wert zwischen 0 und 1 zurück
   */
  _getFadeOpacity(textObj) {
    return getFadeOpacity(textObj)
  }

  /**
   * ✨ NEU: Startet die Fade-Animation neu
   */
  restartFade(textObj) {
    restartFade(textObj)
  }

  /**
   * ✨ NEU: Berechnet den Scale-Wert für Scale-Animation
   * Gibt einen Wert zurück (z.B. 0.5, 1.0, 2.0)
   */
  _getScaleValue(textObj) {
    return getScaleValue(textObj)
  }

  /**
   * ✨ NEU: Startet die Scale-Animation neu
   */
  restartScale(textObj) {
    restartScale(textObj)
  }

  /**
   * ✨ NEU: Berechnet den Slide-Offset für Slide-Animation
   * Gibt X und Y Offset in Pixeln zurück
   */
  _getSlideOffset(textObj, canvasWidth, canvasHeight) {
    return getSlideOffset(textObj, canvasWidth, canvasHeight)
  }

  /**
   * ✨ NEU: Startet die Slide-Animation neu
   */
  restartSlide(textObj) {
    restartSlide(textObj)
  }

  /**
   * ✨ NEU: Garantiertes Ausblenden nach Ablauf der "Anzeigedauer".
   *
   * Ist "Permanent anzeigen" für eine Animation deaktiviert, wird zwischen
   * Eingangs- und Ausgangs-Animation eine "Halte"-Phase (= Anzeigedauer)
   * eingefügt (siehe _getFadeOpacity/_getScaleValue/_getSlideOffset). Fade,
   * Scale und Slide blenden sich am Ende selbst aus; dieser Multiplikator
   * stellt sicher, dass der Text nach dem vollständigen Zyklus verborgen
   * bleibt – und übernimmt das Ausblenden für Effekte ohne eigenen Ausgang
   * (z.B. Schreibmaschinen-Effekt).
   *
   * Ist "Permanent anzeigen" aktiv (Standard) oder loopt eine Animation,
   * bleibt der Text sichtbar (Rückgabe 1).
   *
   * @returns {number} Multiplikator zwischen 0 (versteckt) und 1 (voll sichtbar)
   */
  _getDisplayOpacity(textObj) {
    return getDisplayOpacity(textObj)
  }

  /**
   * Zeichnet einen einzelnen Text (mit Unterstützung für mehrzeilige Texte)
   * ✨ ERWEITERT: Unterstützt jetzt Audio-Reaktive Effekte und Typewriter-Animation
   */
  drawText(ctx, textObj, canvasWidth, canvasHeight) {
    if (!textObj.content) return

    ctx.save()

    // ✨ AUDIO-REAKTIVE WERTE berechnen
    const audioReactive = this.getAudioReactiveValues(textObj.audioReactive)

    // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
    let baseOpacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100

    // Audio-reaktive Opacity moduliert den Basis-Wert (statt ihn zu überschreiben)
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.opacity) {
      // audioReactive.effects.opacity.opacity ist 30-100, moduliert den Slider-Wert
      const audioModulation = audioReactive.effects.opacity.opacity / 100
      baseOpacity = baseOpacity * audioModulation
    }

    // ✨ FADE-ANIMATION: Opacity aus Fade-Effekt anwenden
    const fadeResult = this._getFadeOpacity(textObj)
    baseOpacity = baseOpacity * fadeResult.opacity

    // ✨ ANZEIGEDAUER: Text nach eingestellter Dauer ausblenden (falls nicht permanent)
    baseOpacity = baseOpacity * this._getDisplayOpacity(textObj)

    // ✨ AUDIO-REAKTIV: Strobe-Effekt (Blitz bei Audio-Peaks)
    let strobeBrightnessMultiplier = 100
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.strobe) {
      const strobe = audioReactive.effects.strobe
      baseOpacity = baseOpacity * (strobe.strobeOpacity || 1.0)
      strobeBrightnessMultiplier = strobe.strobeBrightness || 100
    }

    ctx.globalAlpha = baseOpacity

    // Basis-Position berechnen
    let pixelX = textObj.relX * canvasWidth
    let pixelY = textObj.relY * canvasHeight

    // ✨ SLIDE-ANIMATION: Position-Offset aus Slide-Effekt anwenden
    const slideResult = this._getSlideOffset(textObj, canvasWidth, canvasHeight)
    pixelX += slideResult.offsetX
    pixelY += slideResult.offsetY

    // ✨ AUDIO-REAKTIV: Shake-Effekt (Erschütterung)
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.shake) {
      const shake = audioReactive.effects.shake
      pixelX += shake.shakeX || 0
      pixelY += shake.shakeY || 0
    }

    // ✨ AUDIO-REAKTIV: Bounce-Effekt (Hüpfen)
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.bounce) {
      const bounce = audioReactive.effects.bounce
      pixelY += bounce.bounceY || 0
    }

    // ✨ AUDIO-REAKTIV: Swing-Effekt (Horizontales Pendeln)
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.swing) {
      const swing = audioReactive.effects.swing
      pixelX += swing.swingX || 0
    }

    // ✨ AUDIO-REAKTIV: Weitere Bewegungspfade (Orbit, Acht, Spirale, Schweben,
    // Impuls-Shake) – gemeinsame Engine mit den Canvas-Bildern
    if (audioReactive && audioReactive.hasEffects) {
      const fx = audioReactive.effects
      const extraMotion = getMotionOffset(
        Object.assign({}, fx.orbit, fx.figure8, fx.spiral, fx.float, fx.impulseShake),
      )
      pixelX += extraMotion.x
      pixelY += extraMotion.y
    }

    // ✨ AUDIO-REAKTIV: Scale-Effekt (pulsieren)
    let scale = 1.0
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.scale) {
      scale = audioReactive.effects.scale.scale
    }

    // ✨ AUDIO-REAKTIV: Beat-Puls (rhythmischer Puls, multipliziert die Skalierung)
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.beatPulse) {
      scale *= audioReactive.effects.beatPulse.scale || 1.0
    }

    // ✨ AUDIO-REAKTIV: Zoom-Punch, BPM-Puls, Frequenz-Split (Skalierung) und Beat-Flip
    let flipScaleX = 1
    if (audioReactive && audioReactive.hasEffects) {
      const fx = audioReactive.effects
      for (const key of ['zoomPunch', 'bpmPulse', 'freqSplit']) {
        if (fx[key] && typeof fx[key].scale === 'number') scale *= fx[key].scale
      }
      if (fx.beatFlip && typeof fx.beatFlip.flipScaleX === 'number') {
        const f = fx.beatFlip.flipScaleX
        flipScaleX = Math.abs(f) < 0.02 ? 0.02 * Math.sign(f || 1) : f
      }
    }

    // ✨ SCALE-ANIMATION: Scale aus Animation anwenden
    const scaleResult = this._getScaleValue(textObj)
    scale = scale * scaleResult.scale

    // ✨ AUDIO-REAKTIV: 3D-Perspektive-Effekt (Skalierung + Scherung)
    let perspectiveSkewX = 0
    let perspectiveSkewY = 0
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.perspective3d) {
      const p3d = audioReactive.effects.perspective3d
      scale = scale * (p3d.perspective3dScale || 1.0)
      perspectiveSkewX = p3d.perspective3dSkewX || 0
      perspectiveSkewY = p3d.perspective3dSkewY || 0
    }

    // ✨ AUDIO-REAKTIV: Skew-Effekt (Verzerrung)
    let skewX = perspectiveSkewX
    let skewY = perspectiveSkewY
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.skew) {
      const skewEffect = audioReactive.effects.skew
      skewX += skewEffect.skewX || 0
      skewY += skewEffect.skewY || 0
    }

    // ✨ AUDIO-REAKTIV: Rotation-Effekt (oszillierende Drehung)
    let audioRotation = 0
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.rotation) {
      audioRotation = audioReactive.effects.rotation.rotationAngle || 0
    }

    // ✨ AUDIO-REAKTIV: Elastic-Effekt (Gummi-Verformung)
    let stretchX = 1.0
    let stretchY = 1.0
    if (audioReactive && audioReactive.hasEffects && audioReactive.effects.elastic) {
      const elastic = audioReactive.effects.elastic
      stretchX = elastic.stretchX || 1.0
      stretchY = elastic.stretchY || 1.0
    }

    // Rotation + Scale + Skew + Elastic anwenden
    const totalRotation = (textObj.rotation || 0) + audioRotation
    const hasElastic = stretchX !== 1.0 || stretchY !== 1.0
    const hasTransform =
      totalRotation !== 0 ||
      scale !== 1.0 ||
      skewX !== 0 ||
      skewY !== 0 ||
      hasElastic ||
      flipScaleX !== 1
    if (hasTransform) {
      ctx.translate(pixelX, pixelY)
      if (totalRotation !== 0) {
        ctx.rotate((totalRotation * Math.PI) / 180)
      }
      // ✨ Elastic: Asymmetrische Skalierung (Stretch)
      if (hasElastic) {
        ctx.scale(stretchX * scale, stretchY * scale)
      } else if (scale !== 1.0) {
        ctx.scale(scale, scale)
      }
      // ✨ Beat-Flip: horizontale Spiegelung im Takt
      if (flipScaleX !== 1) {
        ctx.scale(flipScaleX, 1)
      }
      // ✨ Skew-Transformation anwenden (Scheren-Effekt)
      if (skewX !== 0 || skewY !== 0) {
        // ctx.transform(a, b, c, d, e, f) - b und c sind die Scherfaktoren
        const skewXRad = (skewX * Math.PI) / 180
        const skewYRad = (skewY * Math.PI) / 180
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
      }
      ctx.translate(-pixelX, -pixelY)
    }

    // ✨ AUDIO-REAKTIV: Filter anwenden (Hue, Brightness, Strobe)
    let filterString = ''
    if (audioReactive && audioReactive.hasEffects) {
      const effects = audioReactive.effects

      // Hue-Rotation
      if (effects.hue) {
        filterString += `hue-rotate(${effects.hue.hueRotate}deg) `
      }

      // Helligkeit (kombiniert mit Strobe-Brightness)
      let totalBrightness = 100
      if (effects.brightness) {
        totalBrightness = effects.brightness.brightness
      }
      // ✨ Strobe-Brightness addieren (strobeBrightnessMultiplier kommt von weiter oben)
      if (strobeBrightnessMultiplier !== 100) {
        totalBrightness = (totalBrightness / 100) * strobeBrightnessMultiplier
      }
      if (totalBrightness !== 100) {
        filterString += `brightness(${totalBrightness}%) `
      }

      // Weitere Farbfilter (gemeinsame Engine): Sättigung, Kontrast, Graustufen,
      // Sepia, Invertieren, Weichzeichnen, Farb-Strobe, Frequenz-Split
      if (effects.saturation) filterString += `saturate(${effects.saturation.saturation}%) `
      if (effects.contrast) filterString += `contrast(${effects.contrast.contrast}%) `
      if (effects.grayscale && effects.grayscale.grayscale > 0)
        filterString += `grayscale(${effects.grayscale.grayscale}%) `
      if (effects.sepia && effects.sepia.sepia > 0)
        filterString += `sepia(${effects.sepia.sepia}%) `
      if (effects.invert && effects.invert.invert > 0)
        filterString += `invert(${effects.invert.invert}%) `
      if (effects.blur && effects.blur.blur > 0) filterString += `blur(${effects.blur.blur}px) `
      if (effects.colorStrobe)
        filterString += `hue-rotate(${effects.colorStrobe.hueRotate}deg) saturate(${effects.colorStrobe.saturate}%) `
      if (effects.freqSplit && effects.freqSplit.hueRotate)
        filterString += `hue-rotate(${effects.freqSplit.hueRotate}deg) `
    } else if (strobeBrightnessMultiplier !== 100) {
      // Strobe ohne andere Audio-Effekte
      filterString += `brightness(${strobeBrightnessMultiplier}%) `
    }
    if (filterString) {
      ctx.filter = filterString.trim()
    }

    // ✨ AUDIO-REAKTIV: Glow-Effekt (überschreibt statischen Schatten temporär)
    // Der Beat-Puls liefert ebenfalls Glow-Werte (glowBlur/glowColor).
    let useAudioGlow = false
    if (audioReactive && audioReactive.hasEffects && this._strongestGlow(audioReactive.effects)) {
      useAudioGlow = true
    }

    // Text-Stil anwenden (mit Audio-Reaktiven Überschreibungen)
    this.applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow)

    // ✨ TYPEWRITER-ANIMATION: Hole den sichtbaren Text
    const typewriterResult = this._getTypewriterText(textObj)
    const displayContent = typewriterResult.text

    // ✨ Mehrzeilige Texte unterstützen (Zeilenumbrüche mit \n)
    const lines = displayContent.split('\n')

    // ✨ DYNAMISCHER ZEILENABSTAND (lineHeightMultiplier: 100-300%)
    const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100
    const lineHeight = textObj.fontSize * lineHeightMultiplier

    // Für Positionsberechnung: Verwende Original-Content für konsistente Positionierung
    const originalLines = textObj.content.split('\n')

    // Berechne Start-Y-Position für zentrierte mehrzeilige Texte
    let startY = pixelY
    if (originalLines.length > 1) {
      // Wenn textBaseline 'middle' ist, verschiebe nach oben um die halbe Gesamthöhe
      if (textObj.textBaseline === 'middle') {
        startY = pixelY - ((originalLines.length - 1) * lineHeight) / 2
      }
    }

    // ✨ AUDIO-REAKTIV: RGB-Glitch prüfen
    const hasRgbGlitch =
      audioReactive && audioReactive.hasEffects && audioReactive.effects.rgbGlitch
    const rgbGlitch = hasRgbGlitch ? audioReactive.effects.rgbGlitch : null

    // ✨ AUDIO-REAKTIV: Wave-Effekt prüfen
    const hasWave =
      audioReactive &&
      audioReactive.hasEffects &&
      audioReactive.effects.wave &&
      audioReactive.effects.wave.waveEnabled
    const wave = hasWave ? audioReactive.effects.wave : null

    // Zeichne jede Zeile einzeln
    lines.forEach((line, lineIndex) => {
      const yPos = startY + lineIndex * lineHeight

      // ✨ KONTUR zeichnen (wenn aktiviert oder audio-reaktiv)
      const hasStroke =
        textObj.stroke.enabled ||
        (audioReactive && audioReactive.hasEffects && audioReactive.effects.strokeWidth)

      // ✨ WAVE-EFFEKT: Buchstaben einzeln mit Wellenverschiebung zeichnen
      if (hasWave && wave.waveAmplitude > 0) {
        // Buchstabenweises Rendering für Welleneffekt
        const chars = line.split('')
        let currentX = pixelX
        const letterSpacing = textObj.letterSpacing || 0

        // Bei zentriertem Text: Startposition berechnen
        if (textObj.textAlign === 'center') {
          const totalWidth = ctx.measureText(line).width + letterSpacing * (chars.length - 1)
          currentX = pixelX - totalWidth / 2
          ctx.textAlign = 'left' // Temporär auf left setzen für buchstabenweises Rendering
        } else if (textObj.textAlign === 'right') {
          const totalWidth = ctx.measureText(line).width + letterSpacing * (chars.length - 1)
          currentX = pixelX - totalWidth
          ctx.textAlign = 'left'
        }

        chars.forEach((char, charIndex) => {
          // Wellenförmige Y-Verschiebung basierend auf Buchstabenindex und Zeit
          const waveOffset =
            Math.sin(wave.waveSpeed + charIndex * wave.waveFrequency) * wave.waveAmplitude
          const charY = yPos + waveOffset

          if (hasStroke && !hasRgbGlitch) {
            ctx.strokeText(char, currentX, charY)
          }
          ctx.fillText(char, currentX, charY)

          // Nächste X-Position berechnen
          currentX += ctx.measureText(char).width + letterSpacing
        })

        // TextAlign zurücksetzen
        ctx.textAlign = textObj.textAlign
      }
      // ✨ RGB-Glitch: Chromatische Aberration (Text 3x mit R/G/B Verschiebung)
      else if (hasRgbGlitch && rgbGlitch.glitchIntensity > 0) {
        const originalFillStyle = ctx.fillStyle
        const originalComposite = ctx.globalCompositeOperation

        // Additives Blending für Farbüberlagerung
        ctx.globalCompositeOperation = 'lighter'

        // Rot-Kanal (versetzt nach links-oben)
        ctx.fillStyle = `rgba(255, 0, 0, 0.7)`
        ctx.fillText(line, pixelX + rgbGlitch.redOffsetX, yPos + rgbGlitch.redOffsetY)

        // Grün-Kanal (Original-Position)
        ctx.fillStyle = `rgba(0, 255, 0, 0.7)`
        ctx.fillText(line, pixelX, yPos)

        // Blau-Kanal (versetzt nach rechts-unten)
        ctx.fillStyle = `rgba(0, 0, 255, 0.7)`
        ctx.fillText(line, pixelX + rgbGlitch.blueOffsetX, yPos + rgbGlitch.blueOffsetY)

        // Zurücksetzen
        ctx.globalCompositeOperation = originalComposite
        ctx.fillStyle = originalFillStyle
      } else {
        // ✨ Standard-Rendering (ohne Wave/RGB-Glitch)
        if (hasStroke) {
          ctx.strokeText(line, pixelX, yPos)
        }
        // Text füllen (normal)
        ctx.fillText(line, pixelX, yPos)
      }
    })

    // ✨ TYPEWRITER: Cursor zeichnen
    if (typewriterResult.showCursor && !typewriterResult.isComplete) {
      const lastLineIndex = lines.length - 1
      const lastLine = lines[lastLineIndex] || ''
      const yPos = startY + lastLineIndex * lineHeight

      // Cursor-Position berechnen (nach dem letzten Zeichen)
      const lastLineWidth = ctx.measureText(lastLine).width
      const letterSpacingExtra = (textObj.letterSpacing || 0) * Math.max(0, lastLine.length)

      let cursorX = pixelX
      // Position basierend auf textAlign
      switch (textObj.textAlign) {
        case 'left':
          cursorX = pixelX + lastLineWidth + letterSpacingExtra
          break
        case 'right':
          cursorX = pixelX
          break
        case 'center':
        default:
          cursorX = pixelX + (lastLineWidth + letterSpacingExtra) / 2
          break
      }

      // Blinkender Cursor (500ms Intervall)
      const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0
      if (cursorVisible) {
        const cursorChar = typewriterResult.cursorChar || '|'
        ctx.fillText(cursorChar, cursorX, yPos)
      }
    }

    // 🔧 WICHTIG: Schatten und Filter explizit zurücksetzen VOR restore()
    this.resetShadow(ctx)
    ctx.filter = 'none'

    ctx.restore()
  }

  /**
   * Stärkstes Leuchten aus allen glow-liefernden Effekten (oder null).
   */
  _strongestGlow(effects) {
    return strongestGlow(effects)
  }

  /**
   * ✨ NEU: Wendet Text-Stil mit Audio-Reaktiven Überschreibungen an
   */
  applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow) {
    applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow)
  }

  /**
   * Zeichnet alle Text-Objekte
   */
  drawAll(ctx) {
    this.textObjects.forEach((textObj) => {
      this.drawText(ctx, textObj, ctx.canvas.width, ctx.canvas.height)
    })
  }

  /**
   * Alternative draw-Methode (für Kompatibilität mit älterem Code)
   * ✅ CRITICAL FIX: Error Handling hinzugefügt um Recording nicht zu brechen
   */
  draw(ctx, canvasWidth, canvasHeight) {
    this.textObjects.forEach((textObj) => {
      try {
        this.drawText(ctx, textObj, canvasWidth, canvasHeight)
      } catch (error) {
        console.error('❌ [TextManager] Fehler beim Zeichnen von Text:', error)
        // Versuche den Canvas-State wiederherzustellen falls ctx.save() aufgerufen wurde
        try {
          ctx.restore()
        } catch (e) {
          /* ignore */
        }
      }
    })
  }

  /**
   * Aktualisiert eine Eigenschaft eines Text-Objekts
   */
  updateProperty(textObj, property, value) {
    if (!textObj) return

    // Schatten-Eigenschaften
    if (property.startsWith('shadow.')) {
      const shadowProp = property.split('.')[1]
      textObj.shadow[shadowProp] = value
    }
    // Kontur-Eigenschaften
    else if (property.startsWith('stroke.')) {
      const strokeProp = property.split('.')[1]
      textObj.stroke[strokeProp] = value
    }
    // Normale Eigenschaften
    else {
      textObj[property] = value
    }
  }

  /**
   * Gibt alle Text-Objekte zurück
   */
  getAllTexts() {
    return this.textObjects
  }

  /**
   * Räumt alle Texte auf
   */
  clear() {
    this.textObjects = []
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✨ AUDIO-REAKTIVE EFFEKTE FÜR TEXT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * ✨ Berechnet Audio-Reaktive Effekt-Werte basierend auf den aktuellen Audio-Daten
   * Unterstützt MEHRERE Effekte gleichzeitig
   */
  getAudioReactiveValues(audioSettings) {
    return getAudioReactiveValues(audioSettings)
  }

  /**
   * ✨ Berechnet den Wert für einen einzelnen Text-Effekt
   * @param {string} effectName - Name des Effekts
   * @param {number} normalizedLevel - Audio-Level normalisiert (0-1)
   * @param {object} effectConfig - Konfiguration des Effekts (enthält minimum, ease, etc.)
   */
  _calculateTextEffectValue(effectName, normalizedLevel, effectConfig = {}) {
    return calculateTextEffectValue(effectName, normalizedLevel, effectConfig)
  }

  /**
   * ✨ NEU: Verschiebt ein Text-Objekt an die oberste Ebene (z-index)
   * Damit ist der Text immer anklickbar und sichtbar
   */
  moveToTop(textObj) {
    if (!textObj) return

    const index = this.textObjects.findIndex((t) => t.id === textObj.id)
    if (index === -1) return

    // Entferne das Objekt aus der aktuellen Position
    this.textObjects.splice(index, 1)

    // Füge es am Ende hinzu (oberste Ebene)
    this.textObjects.push(textObj)
  }
}
