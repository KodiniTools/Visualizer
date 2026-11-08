/** Gemeinsame Typen der PostFX-Backends (Canvas2D und WebGL2). */

/** Quelle/Ziel der Nachbearbeitung: Haupt-Thread oder Worker (OffscreenCanvas) */
export type PostFxCanvas = HTMLCanvasElement | OffscreenCanvas
export type PostFxContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface BloomConfig {
  enabled?: boolean
  strength?: number
  threshold?: number
  radius?: number
}

export interface TrailsConfig {
  enabled?: boolean
  decay?: number
}

export interface PostFxConfig {
  bloom?: BloomConfig
  trails?: TrailsConfig
  adaptiveQuality?: boolean
}

/** Gemeinsame Schnittstelle beider Backends */
export interface PostProcessor {
  readonly backend: 'webgl2' | 'canvas2d'
  apply(source: PostFxCanvas, config?: PostFxConfig, quality?: number): void
  resize(width: number, height: number): void
  clearHistory(): void
  dispose(): void
}

/** 2D-Kontext eines Canvas beider Arten (getContext ist auf der Union nicht aufrufbar) */
export function get2dContext(canvas: PostFxCanvas): PostFxContext2D | null {
  return (canvas as HTMLCanvasElement).getContext('2d') as PostFxContext2D | null
}
