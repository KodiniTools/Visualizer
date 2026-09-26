// canvasManager/methods/backgroundSettingsMethods.js
import { computeAudioReactiveValues } from '../../audio/audioReactiveEngine.js'
import { applyAudioReactiveFilters } from '../rendering/audioReactiveDraw.js'
import { calculateEffectValue } from '../../audio/AudioReactiveEffects.js'

/**
 * Einstellungen des Farb-Hintergrunds (Audio-Reaktiv, Farbverlauf, Kacheln)
 * und die Audio-Reaktiv-Auswertung inkl. Gradient-Effekte.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class BackgroundSettingsMethods {
  // ═══════════════════════════════════════════════════════════════════
  // AUDIO REACTIVE & GRADIENT SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  setBackgroundColorAudioReactive(settings) {
    this.backgroundColorSettings = settings
  }

  getBackgroundColorAudioReactive() {
    return this.backgroundColorSettings
  }

  setGradientSettings(settings) {
    this.gradientSettings = { ...this.gradientSettings, ...settings }
  }

  getGradientSettings() {
    return this.gradientSettings
  }

  setBackgroundTilesStore(store) {
    this.backgroundTilesStore = store
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUDIO REACTIVE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Berechnet Audio-Reaktive Werte für Hintergründe
   */
  _getAudioReactiveValues(audioSettings) {
    // Gemeinsame Engine (Bilder, Hintergrund, Kacheln, Lauftext); nur die
    // Effektberechnung ist hier wegen der Gradient-Effekte überschrieben.
    return computeAudioReactiveValues(
      audioSettings,
      audioSettings,
      typeof window !== 'undefined' ? window.audioAnalysisData : null,
      (name, level) => this._calculateEffectValue(name, level),
    )
  }

  /**
   * Berechnet den Wert für einen einzelnen Effekt.
   *
   * Nutzt dieselbe Engine wie Canvas-Bilder (AudioReactiveEffects.calculateEffectValue),
   * damit Hintergrund und Kacheln alle Bild-Effekte (inkl. Bewegung/Rhythmus)
   * verstehen. Nur die beiden Gradient-Effekte sind hintergrundspezifisch.
   */
  _calculateEffectValue(effectName, normalizedLevel) {
    switch (effectName) {
      case 'gradientPulse':
        return { gradientRadius: 0.3 + normalizedLevel * 0.7 }
      case 'gradientRotation': {
        const timeGrad = Date.now() * 0.002
        return { gradientAngle: Math.sin(timeGrad) * normalizedLevel * 180 }
      }
      default:
        return calculateEffectValue(effectName, normalizedLevel)
    }
  }

  /**
   * Wendet Audio-Reaktive Effekte auf Canvas-Filter an
   */
  _applyAudioReactiveFilters(ctx, audioReactive) {
    applyAudioReactiveFilters(ctx, audioReactive)
  }
}
