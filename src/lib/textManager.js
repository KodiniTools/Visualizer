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
 * - textManager/render/*               - drawText: Transformation, Filter,
 *                                        Zeilen- und Cursor-Rendering
 */
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
import { drawText } from './textManager/render/drawText.js'

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
    drawText(ctx, textObj, canvasWidth, canvasHeight)
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
