/**
 * Typen der GPU-Visualizer (Shader-Presets, Uniforms, Audio-Features)
 * @module visualizers/gl/types
 */

import type { OnsetData } from '../core/state'
import type { VisualizerDefinition } from '../core/types'

/** Frequenz- oder Zeitdaten, wie sie draw() erhält */
export type AudioData = ArrayLike<number>

/** Audio-Merkmale je Visualizer (siehe audioFeatures.createAudioFeatureState) */
export interface AudioFeatureState {
  /** Index (0..AUDIO_HISTORY_ROWS-1) der zuletzt geschriebenen Verlaufszeile */
  historyHead: number
  rows: Uint8Array
  smooth: Float32Array
  /** [bass, mid, treble, volume] */
  bands: Float32Array
  scratch: Float32Array
}

/** Kontext, den der `uniforms`-Hook eines Presets pro Frame erhält */
export interface GlUniformContext {
  /** [bass, mid, treble, volume] */
  bands: Float32Array
  /** Onset-Werte; leer, wenn der Render-Loop keine gesetzt hat */
  onset: Partial<OnsetData>
  time: number
  dt: number
  intensity: number
}

/** Uniform-Array: `{ size, data }` → uniform{size}fv */
export interface GlUniformArray {
  size?: number
  data: Float32Array
}

export type GlUniformValue = number | number[] | Float32Array | GlUniformArray

export type GlUniformMap = Record<string, GlUniformValue>

export type GlUniformsFn = (ctx: GlUniformContext) => GlUniformMap | null | undefined

/** Shader-Preset eines GPU-Visualizers */
export interface GlPresetSpec {
  /** eindeutige Preset-ID (auch der Registry-Schlüssel) */
  id: string
  name_de: string
  name_en: string
  /** Fragment-Shader-Rumpf (wird nach FRAG_HEADER kompiliert) */
  frag: string
  /** zusätzliche Uniforms pro Frame */
  uniforms?: GlUniformsFn
  /** Canvas2D-Visualizer, wenn WebGL2 nicht verfügbar ist */
  fallback?: Pick<VisualizerDefinition, 'draw' | 'init' | 'cleanup'>
  /** Zeit- statt Frequenzdaten */
  needsTimeData?: boolean
  /** nutzt die Bildtextur (Porträt-Presets), Bild aus visualizerState._imageSource */
  needsImage?: boolean
  /** weiche Kanten beim Verkleinern/Verschieben (siehe core/edgeFade) */
  edgeFade?: 'none' | 'radial' | 'rect'
}

/** Bildquellen, die als Textur hochgeladen werden können */
export type GlImageSource = TexImageSource & {
  naturalWidth?: number
  naturalHeight?: number
  width?: number
  height?: number
}
