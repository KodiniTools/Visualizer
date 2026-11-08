// Single-Modus des Visualizers: Auswahl, Farbe, Position/Größe, Form,
// Reaktionsquelle, Bild, LED-Text und Fallback auf den letzten funktionierenden.
import { ref, computed, type Ref } from 'vue'
import { Visualizers } from '../../lib/visualizers/index'
import { resolveVisualizerId } from '../../lib/visualizers/aliases'
import {
  DEFAULT_REACT_SOURCE,
  DEFAULT_REACT_STRENGTH,
  DEFAULT_REACT_SHAPE,
  isReactSource,
  normalizeReactSmoothing,
  normalizeReactGain,
  normalizeReactEasing,
  normalizeReactBeatBoost,
  normalizeReactPhase,
} from '../../lib/visualizers/core/reactSource'
import {
  LED_CONFIG_KEYS,
  DEFAULT_LED_CONFIG,
  normalizeLedField,
  normalizeLedConfig,
} from '../../lib/visualizers/gl/ledTextSettings.js'
import {
  DEFAULT_VISUALIZER_SHAPE,
  normalizeVisualizerShape,
} from '../../lib/visualizers/core/visualizerShape'

export interface SingleVisualizerDeps {
  /** wird beim Auswählen eines einzelnen Visualizers verlassen */
  multiLayerMode: Ref<boolean>
}

/** LED-Konfiguration als Objekt (Schlüssel aus LED_CONFIG_KEYS). */
export type LedConfig = Record<string, unknown>

export function useSingleVisualizer({ multiLayerMode }: SingleVisualizerDeps) {
  const selectedVisualizer = ref<string>('bars')

  // NEU: Zustand für die Farbe und die Sichtbarkeit des Visualizers
  const visualizerColor = ref('#6ea8fe') // Standardfarbe
  const showVisualizer = ref(true) // Standardmässig eingeschaltet
  const visualizerOpacity = ref(1.0) // Gesamtintensität (0.0 bis 1.0, Standard: 100%)
  const colorOpacity = ref(1.0) // Farbtransparenz (0.0 bis 1.0, Standard: 100%)

  // ✨ NEU: Position und Größe des Visualizers (frei positionierbar)
  const visualizerX = ref(0.5) // X-Position (0.0 = links, 0.5 = Mitte, 1.0 = rechts)
  const visualizerY = ref(0.5) // Y-Position (0.0 = oben, 0.5 = Mitte, 1.0 = unten)
  const visualizerScale = ref(1.0) // Skalierung (0.1 = 10%, 1.0 = 100%, 2.0 = 200%)

  // Form: sichtbarer Ausschnitt ('free' = ganze Fläche, sonst Seitenverhältnis
  // bzw. Kreis) – siehe lib/visualizers/core/visualizerShape.js
  const visualizerShape = ref<string>(DEFAULT_VISUALIZER_SHAPE)

  // Reaktionsquelle: womit der Visualizer angesteuert wird ('spectrum' = wie
  // bisher, sonst Bandpegel oder auto-normalisierter Onset) und wie stark.
  const reactSource = ref<string>(DEFAULT_REACT_SOURCE)
  const reactStrength = ref(DEFAULT_REACT_STRENGTH)
  // Formung der Reaktion – dieselben Regler wie "Audio-Reaktiv" beim Bild:
  // Glättung (0–100), Audio-Pegel (Gain 0–200 %), Übergang (Easing),
  // Beat-Verstärkung (1.0 = aus … 3.0) und Phase (0–360°).
  const reactSmoothing = ref<number>(DEFAULT_REACT_SHAPE.reactSmoothing)
  const reactGain = ref<number>(DEFAULT_REACT_SHAPE.reactGain)
  const reactEasing = ref<string>(DEFAULT_REACT_SHAPE.reactEasing)
  const reactBeatBoost = ref<number>(DEFAULT_REACT_SHAPE.reactBeatBoost)
  const reactPhase = ref<number>(DEFAULT_REACT_SHAPE.reactPhase)

  // Bild für Portrait-Presets (ID in der imageRegistry, null = keines)
  const visualizerImageId = ref<string | null>(null)

  // LED-Text / LED-Zahlen (glLedText, glLedNumber): Text, Modus (fester
  // Text, Uhrzeit, Countdown), Sekunden, Zeitzone und Countdown-Ziel.
  const ledText = ref(DEFAULT_LED_CONFIG.ledText)
  const ledNumberText = ref(DEFAULT_LED_CONFIG.ledNumberText)
  const ledNumberMode = ref(DEFAULT_LED_CONFIG.ledNumberMode)
  const ledNumberSeconds = ref(DEFAULT_LED_CONFIG.ledNumberSeconds)
  const ledNumberTimeZone = ref(DEFAULT_LED_CONFIG.ledNumberTimeZone)
  const ledCountdownTarget = ref(DEFAULT_LED_CONFIG.ledCountdownTarget)
  const ledRefs: Record<string, Ref<unknown>> = {
    ledText,
    ledNumberText,
    ledNumberMode,
    ledNumberSeconds,
    ledNumberTimeZone,
    ledCountdownTarget,
  }

  /** LED-Konfiguration des Single-Modus als Objekt. */
  const ledConfig = computed<LedConfig>(() =>
    Object.fromEntries(LED_CONFIG_KEYS.map((k: string) => [k, ledRefs[k]?.value])),
  )

  /** Ein Feld der LED-Konfiguration setzen (validiert). */
  function setLedConfig(key: string, value: unknown): boolean {
    const target = ledRefs[key]
    if (!target) return false
    target.value = normalizeLedField(key, value)
    return true
  }

  /** Mehrere/alle Felder setzen; fehlende → Standardwerte (ältere Presets). */
  function applyLedConfig(src: object | null | undefined) {
    const cfg = normalizeLedConfig(src ?? undefined) as LedConfig
    for (const key of LED_CONFIG_KEYS as string[]) (ledRefs[key] as Ref<unknown>).value = cfg[key]
  }

  // ✅ Letzter funktionierender Visualizer für Fallback
  const lastWorkingVisualizer = ref<string>('bars')

  function selectVisualizer(id: string) {
    const resolved = resolveVisualizerId(id)
    if (resolved) {
      selectedVisualizer.value = resolved
    } else {
      console.warn(
        `⚠️ [VisualizerStore] Visualizer "${id}" nicht gefunden - Fallback zu "${lastWorkingVisualizer.value}"`,
      )
      selectedVisualizer.value = lastWorkingVisualizer.value
    }
    // Ein einzelner Visualizer wird nur im Single-Modus gerendert. Wer hier
    // auswählt (Visualizer-Liste, Beat-Marker), will ihn auch sehen – also den
    // Multi-Layer-Modus verlassen. Die Layer bleiben erhalten und sind beim
    // erneuten Einschalten des Multi-Layer-Modus wieder da.
    if (multiLayerMode.value) {
      multiLayerMode.value = false
    }
  }

  // ✅ Wird aufgerufen wenn ein Visualizer erfolgreich gezeichnet wurde
  function markVisualizerWorking(id: string) {
    if ((Visualizers as Record<string, unknown>)[id]) {
      lastWorkingVisualizer.value = id
    }
  }

  // ✅ Fallback bei Fehler
  function fallbackToLastWorking() {
    console.warn(
      `⚠️ [VisualizerStore] Visualizer "${selectedVisualizer.value}" fehlgeschlagen - Fallback zu "${lastWorkingVisualizer.value}"`,
    )
    selectedVisualizer.value = lastWorkingVisualizer.value
  }

  // NEU: Funktion zum Umschalten der Sichtbarkeit
  function toggleVisualizer() {
    showVisualizer.value = !showVisualizer.value
  }

  // NEU: Funktion zum Ändern der Farbe
  function setColor(newColor: string) {
    visualizerColor.value = newColor
  }

  // NEU: Funktion zum Ändern der Deckkraft
  function setOpacity(newOpacity: number) {
    visualizerOpacity.value = newOpacity
  }

  // NEU: Funktion zum Ändern der Farbtransparenz
  function setColorOpacity(newOpacity: number) {
    colorOpacity.value = newOpacity
  }

  // ✨ NEU: Funktionen für Position und Größe
  function setVisualizerX(newX: number) {
    visualizerX.value = Math.max(0, Math.min(1, newX))
  }

  function setVisualizerY(newY: number) {
    visualizerY.value = Math.max(0, Math.min(1, newY))
  }

  function setVisualizerScale(newScale: number) {
    visualizerScale.value = Math.max(0.1, Math.min(2.0, newScale))
  }

  function setVisualizerShape(shape: unknown) {
    visualizerShape.value = normalizeVisualizerShape(shape)
  }

  function setReactSource(source: string) {
    if (isReactSource(source)) reactSource.value = source
  }

  function setReactStrength(v: unknown) {
    reactStrength.value = Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
  }

  function setReactSmoothing(v: unknown) {
    reactSmoothing.value = normalizeReactSmoothing(v)
  }

  function setReactGain(v: unknown) {
    reactGain.value = normalizeReactGain(v)
  }

  function setReactEasing(v: unknown) {
    reactEasing.value = normalizeReactEasing(v)
  }

  function setReactBeatBoost(v: unknown) {
    reactBeatBoost.value = normalizeReactBeatBoost(v)
  }

  function setReactPhase(v: unknown) {
    reactPhase.value = normalizeReactPhase(v)
  }

  /** Setzt alle Formungs-Regler auf die Standardwerte zurück. */
  function resetReactShape() {
    reactSmoothing.value = DEFAULT_REACT_SHAPE.reactSmoothing
    reactGain.value = DEFAULT_REACT_SHAPE.reactGain
    reactEasing.value = DEFAULT_REACT_SHAPE.reactEasing
    reactBeatBoost.value = DEFAULT_REACT_SHAPE.reactBeatBoost
    reactPhase.value = DEFAULT_REACT_SHAPE.reactPhase
  }

  function setVisualizerImageId(id: unknown) {
    visualizerImageId.value = typeof id === 'string' && id ? id : null
  }

  // ✨ NEU: Reset Position und Größe auf Standard
  function resetVisualizerTransform() {
    visualizerX.value = 0.5
    visualizerY.value = 0.5
    visualizerScale.value = 1.0
  }

  return {
    selectedVisualizer,
    selectVisualizer,
    visualizerColor,
    showVisualizer,
    visualizerOpacity,
    colorOpacity,
    toggleVisualizer,
    setColor,
    setOpacity,
    setColorOpacity,
    // ✨ NEU: Position und Größe
    visualizerX,
    visualizerY,
    visualizerScale,
    visualizerShape,
    setVisualizerX,
    setVisualizerY,
    setVisualizerScale,
    setVisualizerShape,
    resetVisualizerTransform,
    // Reaktionsquelle
    reactSource,
    reactStrength,
    reactSmoothing,
    reactGain,
    reactEasing,
    reactBeatBoost,
    reactPhase,
    setReactSource,
    setReactStrength,
    setReactSmoothing,
    setReactGain,
    setReactEasing,
    setReactBeatBoost,
    setReactPhase,
    resetReactShape,
    // Bild für Portrait-Presets
    visualizerImageId,
    setVisualizerImageId,
    // LED-Text / LED-Zahlen
    ledText,
    ledNumberText,
    ledNumberMode,
    ledNumberSeconds,
    ledNumberTimeZone,
    ledCountdownTarget,
    ledConfig,
    setLedConfig,
    applyLedConfig,
    // ✅ NEU: Fehlerbehandlung
    lastWorkingVisualizer,
    markVisualizerWorking,
    fallbackToLastWorking,
  }
}
