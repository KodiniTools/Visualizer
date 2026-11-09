/**
 * Gemeinsame Typen der Visualizer (Zeichen-Signatur und Definition)
 * @module visualizers/core/types
 */

/** 2D-Kontext auf dem Haupt-Thread oder im OffscreenCanvas-Worker */
export type VisualizerContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Zeichenfunktion eines Visualizers.
 * @param dataArray - Frequenz- bzw. Zeitdaten (Analyser-Bytes, 0–255)
 * @param color - Grundfarbe als HEX
 * @param intensity - Deckkraft/Stärke (Standard 1)
 */
export type VisualizerDrawFn = (
  ctx: VisualizerContext,
  dataArray: Uint8Array,
  bufferLength: number,
  width: number,
  height: number,
  color: string,
  intensity?: number,
) => void

/** Ein Eintrag der Visualizer-Registry (siehe visualizers/index) */
export interface VisualizerDefinition {
  name_de: string
  name_en: string
  draw: VisualizerDrawFn
  init?(width: number, height: number): void
  cleanup?(): void
  /** draw() erhält Zeit- statt Frequenzdaten */
  needsTimeData?: boolean
  /** zeichnet visualizerState._imageSource */
  needsImage?: boolean
  /** Randabblendung beim Verkleinern (siehe edgeFade) */
  edgeFade?: string
  /** 'gl' bei GPU-Visualizern (WebGL2 mit Canvas2D-Fallback) */
  kind?: string
  /** Shader-Preset eines GPU-Visualizers */
  glPreset?: unknown
  /** zeigt LED-Text (Einstellungen in visualizerState._ledText) */
  ledText?: boolean
}

export type VisualizerRegistry = Record<string, VisualizerDefinition>
