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
import { createTextObject } from './textManager/createTextObject'
import { findObjectAt, getObjectBounds, isPointInRect } from './textManager/geometry/textBounds'
import {
  applyTextStyle,
  applyTextStyleForMeasurement,
  applyTextStyleWithAudio,
  resetShadow,
  strongestGlow,
} from './textManager/style/textStyle'
import { getTypewriterText, restartTypewriter } from './textManager/animation/typewriter'
import { getDisplayOpacity } from './textManager/animation/displayOpacity'
import { getFadeOpacity, restartFade } from './textManager/animation/fade'
import { getScaleValue, restartScale } from './textManager/animation/scale'
import { getSlideOffset, restartSlide } from './textManager/animation/slide'
import {
  calculateTextEffectValue,
  getAudioReactiveValues,
} from './textManager/audio/textEffectValues'
import { drawText } from './textManager/render/drawText'
import type { TextObjectOptions } from './textManager/createTextObject'
import type { TextObject } from './textManager/types'

/** Effekt-Konfiguration wie von calculateTextEffectValue erwartet */
type TextEffectConfig = Parameters<typeof calculateTextEffectValue>[2]

export class TextManager {
  textStore: unknown
  textObjects: TextObject[]
  markerRevealedIds: Set<TextObject['id']>

  constructor(textStore?: unknown) {
    this.textStore = textStore
    this.textObjects = []
    // Laufzeit-Zustand (nicht im Verlauf): IDs vom Canvas entfernter Texte,
    // die ein Beat-Marker gerade wieder anzeigt.
    this.markerRevealedIds = new Set()
  }

  /**
   * true, wenn der Text auf dem Canvas liegt (nicht nur im Text-Verzeichnis).
   * @param {object} textObj
   */
  isOnCanvas(textObj: TextObject | null | undefined): boolean {
    return !!textObj && !textObj.offCanvas
  }

  /**
   * true, wenn der Text gezeichnet wird: auf dem Canvas oder (vom Canvas
   * entfernt) gerade von einem Beat-Marker eingeblendet.
   * @param {object} textObj
   */
  isDrawable(textObj: TextObject | null | undefined): boolean {
    return this.isOnCanvas(textObj) || (!!textObj && this.markerRevealedIds.has(textObj.id))
  }

  /** Alle Texte, die auf dem Canvas liegen (Ebenen-Reihenfolge). */
  getCanvasTexts(): TextObject[] {
    return this.textObjects.filter((t) => this.isOnCanvas(t))
  }

  /**
   * Entfernt einen Text vom Canvas, behält ihn aber mit allen Einstellungen im
   * Text-Verzeichnis (für Beat-Marker weiter verfügbar). Endgültig entfernt
   * erst delete().
   * @returns {boolean} true, wenn der Text vorher auf dem Canvas lag
   */
  removeFromCanvas(textObject: Pick<TextObject, 'id'> | null | undefined): boolean {
    const obj = this.textObjects.find((t) => t.id === textObject?.id)
    if (!obj || obj.offCanvas) return false
    obj.offCanvas = true
    return true
  }

  /**
   * Holt einen vom Canvas entfernten Text aus dem Verzeichnis zurück.
   * @returns {boolean} true, wenn der Text vorher nicht auf dem Canvas lag
   */
  returnToCanvas(textObject: Pick<TextObject, 'id'> | null | undefined): boolean {
    const obj = this.textObjects.find((t) => t.id === textObject?.id)
    if (!obj || !obj.offCanvas) return false
    obj.offCanvas = false
    this.markerRevealedIds.delete(obj.id)
    return true
  }

  /**
   * Fügt ein neues Text-Objekt hinzu
   */
  add(text: string, options: TextObjectOptions = {}): TextObject {
    const newText = createTextObject(text, options)
    this.textObjects.push(newText)
    return newText
  }

  /**
   * Löscht ein Text-Objekt endgültig (auch aus dem Text-Verzeichnis)
   */
  delete(textObject: Pick<TextObject, 'id'>): boolean {
    const index = this.textObjects.findIndex((t) => t.id === textObject.id)
    if (index !== -1) {
      this.textObjects.splice(index, 1)
      this.markerRevealedIds.delete(textObject.id)
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
  restore(textObject: TextObject | null | undefined, index?: number): boolean {
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
  findObjectAt(x: number, y: number, targetCanvas: Parameters<typeof findObjectAt>[3]) {
    return findObjectAt(this.textObjects, x, y, targetCanvas)
  }

  /**
   * ✅ FIXED: Berechnet die PRÄZISEN Bounds (Begrenzungsrahmen) eines Text-Objekts
   * Berücksichtigt: Schatten, Stroke, letterSpacing, mehrzeilige Texte
   */
  getObjectBounds(
    textObj: Parameters<typeof getObjectBounds>[0],
    targetCanvas: Parameters<typeof getObjectBounds>[1],
  ) {
    return getObjectBounds(textObj, targetCanvas)
  }

  /**
   * Prüft ob ein Punkt in einem Rechteck liegt
   */
  isPointInRect(x: number, y: number, rect: Parameters<typeof isPointInRect>[2]) {
    return isPointInRect(x, y, rect)
  }

  /**
   * ✅ Wendet Text-Stil für MESSUNG an (OHNE Schatten)
   */
  applyTextStyleForMeasurement(ctx: CanvasRenderingContext2D, textObj: TextObject): void {
    applyTextStyleForMeasurement(ctx, textObj)
  }

  /**
   * Wendet Text-Stil auf den Context an (für Zeichnen)
   */
  applyTextStyle(ctx: CanvasRenderingContext2D, textObj: TextObject): void {
    applyTextStyle(ctx, textObj)
  }

  /**
   * 🔧 Setzt ALLE Schatten-Eigenschaften explizit zurück
   * Verhindert "Schatten-Lecks" auf nachfolgende Canvas-Elemente
   */
  resetShadow(ctx: CanvasRenderingContext2D): void {
    resetShadow(ctx)
  }

  /**
   * ✨ NEU: Berechnet den sichtbaren Text für Typewriter-Animation
   * Gibt den anzuzeigenden Text und Cursor-Info zurück
   */
  _getTypewriterText(textObj: TextObject) {
    return getTypewriterText(textObj)
  }

  /**
   * ✨ NEU: Startet die Typewriter-Animation neu
   */
  restartTypewriter(textObj: TextObject | null | undefined): void {
    restartTypewriter(textObj)
  }

  /**
   * ✨ NEU: Berechnet die Opacity für Fade-Animation
   * Gibt einen Wert zwischen 0 und 1 zurück
   */
  _getFadeOpacity(textObj: Parameters<typeof getFadeOpacity>[0]) {
    return getFadeOpacity(textObj)
  }

  /**
   * ✨ NEU: Startet die Fade-Animation neu
   */
  restartFade(textObj: TextObject | null | undefined): void {
    restartFade(textObj)
  }

  /**
   * ✨ NEU: Berechnet den Scale-Wert für Scale-Animation
   * Gibt einen Wert zurück (z.B. 0.5, 1.0, 2.0)
   */
  _getScaleValue(textObj: Parameters<typeof getScaleValue>[0]) {
    return getScaleValue(textObj)
  }

  /**
   * ✨ NEU: Startet die Scale-Animation neu
   */
  restartScale(textObj: TextObject | null | undefined): void {
    restartScale(textObj)
  }

  /**
   * ✨ NEU: Berechnet den Slide-Offset für Slide-Animation
   * Gibt X und Y Offset in Pixeln zurück
   */
  _getSlideOffset(
    textObj: Parameters<typeof getSlideOffset>[0],
    canvasWidth: number,
    canvasHeight: number,
  ) {
    return getSlideOffset(textObj, canvasWidth, canvasHeight)
  }

  /**
   * ✨ NEU: Startet die Slide-Animation neu
   */
  restartSlide(textObj: TextObject | null | undefined): void {
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
  _getDisplayOpacity(textObj: TextObject): number {
    return getDisplayOpacity(textObj)
  }

  /**
   * Zeichnet einen einzelnen Text (mit Unterstützung für mehrzeilige Texte)
   * ✨ ERWEITERT: Unterstützt jetzt Audio-Reaktive Effekte und Typewriter-Animation
   */
  drawText(
    ctx: CanvasRenderingContext2D,
    textObj: Parameters<typeof drawText>[1],
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    drawText(ctx, textObj, canvasWidth, canvasHeight)
  }

  /**
   * Stärkstes Leuchten aus allen glow-liefernden Effekten (oder null).
   */
  _strongestGlow(effects: Parameters<typeof strongestGlow>[0]) {
    return strongestGlow(effects)
  }

  /**
   * ✨ NEU: Wendet Text-Stil mit Audio-Reaktiven Überschreibungen an
   */
  applyTextStyleWithAudio(
    ctx: CanvasRenderingContext2D,
    textObj: Parameters<typeof applyTextStyleWithAudio>[1],
    audioReactive: Parameters<typeof applyTextStyleWithAudio>[2],
    useAudioGlow: Parameters<typeof applyTextStyleWithAudio>[3],
  ): void {
    applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow)
  }

  /**
   * Zeichnet alle Text-Objekte
   */
  drawAll(ctx: CanvasRenderingContext2D): void {
    this.textObjects.forEach((textObj) => {
      if (!this.isDrawable(textObj)) return
      this.drawText(ctx, textObj, ctx.canvas.width, ctx.canvas.height)
    })
  }

  /**
   * Alternative draw-Methode (für Kompatibilität mit älterem Code)
   * ✅ CRITICAL FIX: Error Handling hinzugefügt um Recording nicht zu brechen
   */
  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    this.textObjects.forEach((textObj) => {
      if (!this.isDrawable(textObj)) return
      try {
        this.drawText(ctx, textObj, canvasWidth, canvasHeight)
      } catch (error) {
        console.error('❌ [TextManager] Fehler beim Zeichnen von Text:', error)
        // Versuche den Canvas-State wiederherzustellen falls ctx.save() aufgerufen wurde
        try {
          ctx.restore()
        } catch {
          // Der Context war nicht im save()-Zustand – nichts zu tun
        }
      }
    })
  }

  /**
   * Aktualisiert eine Eigenschaft eines Text-Objekts
   */
  updateProperty(textObj: TextObject | null | undefined, property: string, value: unknown): void {
    if (!textObj) return

    // Schatten-Eigenschaften
    if (property.startsWith('shadow.')) {
      const shadowProp = property.split('.')[1] as string
      ;(textObj.shadow as unknown as Record<string, unknown>)[shadowProp] = value
    }
    // Kontur-Eigenschaften
    else if (property.startsWith('stroke.')) {
      const strokeProp = property.split('.')[1] as string
      ;(textObj.stroke as unknown as Record<string, unknown>)[strokeProp] = value
    }
    // Normale Eigenschaften
    else {
      ;(textObj as unknown as Record<string, unknown>)[property] = value
    }
  }

  /**
   * Gibt alle Text-Objekte zurück
   */
  getAllTexts(): TextObject[] {
    return this.textObjects
  }

  /**
   * Räumt alle Texte auf
   */
  clear(): void {
    this.textObjects = []
    this.markerRevealedIds.clear()
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✨ AUDIO-REAKTIVE EFFEKTE FÜR TEXT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * ✨ Berechnet Audio-Reaktive Effekt-Werte basierend auf den aktuellen Audio-Daten
   * Unterstützt MEHRERE Effekte gleichzeitig
   */
  getAudioReactiveValues(audioSettings: Parameters<typeof getAudioReactiveValues>[0]) {
    return getAudioReactiveValues(audioSettings)
  }

  /**
   * ✨ Berechnet den Wert für einen einzelnen Text-Effekt
   * @param {string} effectName - Name des Effekts
   * @param {number} normalizedLevel - Audio-Level normalisiert (0-1)
   * @param {object} effectConfig - Konfiguration des Effekts (enthält minimum, ease, etc.)
   */
  _calculateTextEffectValue(
    effectName: string,
    normalizedLevel: number,
    effectConfig: TextEffectConfig = {},
  ) {
    return calculateTextEffectValue(effectName, normalizedLevel, effectConfig)
  }

  /**
   * ✨ NEU: Verschiebt ein Text-Objekt an die oberste Ebene (z-index)
   * Damit ist der Text immer anklickbar und sichtbar
   */
  moveToTop(textObj: TextObject | null | undefined): void {
    if (!textObj) return

    const index = this.textObjects.findIndex((t) => t.id === textObj.id)
    if (index === -1) return

    // Entferne das Objekt aus der aktuellen Position
    this.textObjects.splice(index, 1)

    // Füge es am Ende hinzu (oberste Ebene)
    this.textObjects.push(textObj)
  }
}
