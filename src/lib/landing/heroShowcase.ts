/**
 * Auswahl der Visualizer, die im Hero der Landingpage live laufen.
 *
 * Jeder Eintrag lädt sein GPU-Preset erst bei Bedarf (dynamischer Import),
 * damit die Landingpage nicht die ganze Visualizer-Registry mitlädt. Ohne
 * WebGL2 zeichnet `createGlVisualizer` automatisch den Canvas2D-Fallback.
 *
 * @module lib/landing/heroShowcase
 */

import type { GlPresetSpec } from '../visualizers/gl/types'

export interface HeroShowcaseEntry {
  /** Registry-ID des Visualizers (wie in der App) */
  id: string
  /** Grundfarbe, mit der der Visualizer in der Vorschau läuft */
  color: string
  /** Lädt das Shader-Preset */
  load: () => Promise<GlPresetSpec>
}

/** Wie lange jeder Visualizer zu sehen ist, bevor der nächste kommt */
export const HERO_SHOWCASE_INTERVAL_MS = 8000

export const HERO_SHOWCASE: readonly HeroShowcaseEntry[] = [
  {
    id: 'glAurora',
    color: '#e06cb0',
    load: () => import('../visualizers/gl/presets/glAurora').then((m) => m.glAurora),
  },
  {
    id: 'glRadialBars',
    color: '#e0a955',
    load: () => import('../visualizers/gl/presets/glRadialBars').then((m) => m.glRadialBars),
  },
  {
    id: 'glGalaxy',
    color: '#8b7cf6',
    load: () => import('../visualizers/gl/presets/glGalaxy').then((m) => m.glGalaxy),
  },
  {
    id: 'glSphere',
    color: '#4fd1c5',
    load: () => import('../visualizers/gl/presets/glSphere').then((m) => m.glSphere),
  },
  {
    id: 'glStageLights',
    color: '#e0a955',
    load: () => import('../visualizers/gl/presets/glStageLights').then((m) => m.glStageLights),
  },
]

/** Index des nächsten Eintrags (zyklisch); robust gegen ungültige Werte */
export function nextShowcaseIndex(current: number, length: number): number {
  if (!Number.isInteger(length) || length <= 0) return 0
  if (!Number.isInteger(current) || current < 0) return 0
  return (current + 1) % length
}
