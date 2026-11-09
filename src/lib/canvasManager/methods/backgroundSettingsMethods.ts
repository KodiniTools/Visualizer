// canvasManager/methods/backgroundSettingsMethods.js
import { computeAudioReactiveValues } from '../../audio/audioReactiveEngine'
import { applyAudioReactiveFilters } from '../rendering/audioReactiveDraw'
import { calculateEffectValue } from '../../audio/AudioReactiveEffects'
import { getAudioAnalysisData } from '../../audio/audioAnalysisData'
import type { CanvasManager } from '../../canvasManager'
import type { EngineAudioSettings } from '../../audio/audioReactiveEngine'
import type {
  BackgroundAudioReactive,
  BackgroundEffectValues,
  GradientSettings,
} from '../rendering/BackgroundRenderer'

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

  setBackgroundColorAudioReactive(this: CanvasManager, settings: EngineAudioSettings | null): void {
    this.backgroundColorSettings = settings
  }

  getBackgroundColorAudioReactive(this: CanvasManager): EngineAudioSettings | null {
    return this.backgroundColorSettings
  }

  setGradientSettings(this: CanvasManager, settings: Partial<GradientSettings>): void {
    this.gradientSettings = { ...this.gradientSettings, ...settings }
  }

  getGradientSettings(this: CanvasManager) {
    return this.gradientSettings
  }

  setBackgroundTilesStore(this: CanvasManager, store: CanvasManager['backgroundTilesStore']): void {
    this.backgroundTilesStore = store
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUDIO REACTIVE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Berechnet Audio-Reaktive Werte für Hintergründe
   */
  _getAudioReactiveValues(
    this: CanvasManager,
    audioSettings: EngineAudioSettings | null | undefined,
  ): BackgroundAudioReactive {
    // Gemeinsame Engine (Bilder, Hintergrund, Kacheln, Lauftext); nur die
    // Effektberechnung ist hier wegen der Gradient-Effekte überschrieben.
    return computeAudioReactiveValues(
      audioSettings,
      audioSettings,
      getAudioAnalysisData(),
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
  _calculateEffectValue(
    this: CanvasManager,
    effectName: string,
    normalizedLevel: number,
  ): BackgroundEffectValues {
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
  _applyAudioReactiveFilters(
    this: CanvasManager,
    ctx: CanvasRenderingContext2D,
    audioReactive: BackgroundAudioReactive,
  ): void {
    applyAudioReactiveFilters(ctx, audioReactive)
  }
}
