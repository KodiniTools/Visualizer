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
export const HERO_SHOWCASE_INTERVAL_MS = 5000

/** Auswahl von Kodini (2026-11-12); Reihenfolge wird pro Besuch gemischt. */
export const HERO_SHOWCASE: readonly HeroShowcaseEntry[] = [
  {
    id: 'glWaveform',
    color: '#4fd1c5',
    load: () => import('../visualizers/gl/presets/glWaveform').then((m) => m.glWaveform),
  },
  {
    id: 'glBars',
    color: '#e0a955',
    load: () => import('../visualizers/gl/presets/glBars').then((m) => m.glBars),
  },
  {
    id: 'glMandala',
    color: '#e06cb0',
    load: () => import('../visualizers/gl/presets/glMandala').then((m) => m.glMandala),
  },
  {
    id: 'glRings',
    color: '#8b7cf6',
    load: () => import('../visualizers/gl/presets/glRings').then((m) => m.glRings),
  },
  {
    id: 'glLightRays',
    color: '#e0a955',
    load: () => import('../visualizers/gl/presets/glLightRays').then((m) => m.glLightRays),
  },
  {
    id: 'glTerrain',
    color: '#4fd1c5',
    load: () => import('../visualizers/gl/presets/glTerrain').then((m) => m.glTerrain),
  },
  {
    id: 'glPendulumSnake',
    color: '#e06cb0',
    load: () => import('../visualizers/gl/presets/glPendulumSnake').then((m) => m.glPendulumSnake),
  },
  {
    id: 'glVuMeter',
    color: '#4ade80',
    load: () => import('../visualizers/gl/presets/glVuMeter').then((m) => m.glVuMeter),
  },
  {
    id: 'glLaserTunnel',
    color: '#8b7cf6',
    load: () => import('../visualizers/gl/presets/glLaserTunnel').then((m) => m.glLaserTunnel),
  },
  {
    id: 'glLaserBurst',
    color: '#ef4444',
    load: () => import('../visualizers/gl/presets/glLaserBurst').then((m) => m.glLaserBurst),
  },
  {
    id: 'glLedSunstrip',
    color: '#f59e0b',
    load: () => import('../visualizers/gl/presets/glLedSunstrip').then((m) => m.glLedSunstrip),
  },
  {
    id: 'glLedDigit1',
    color: '#ef4444',
    load: () => import('../visualizers/gl/presets/glLedDigits').then((m) => m.glLedDigit1),
  },
  {
    id: 'glLedLetterA',
    color: '#4fd1c5',
    load: () => import('../visualizers/gl/presets/glLedDigits').then((m) => m.glLedLetterA),
  },
  {
    id: 'glLedFrameVu',
    color: '#4ade80',
    load: () => import('../visualizers/gl/presets/glLedFrames').then((m) => m.glLedFrameVu),
  },
  {
    id: 'glLaserGrid',
    color: '#22d3ee',
    load: () => import('../visualizers/gl/presets/glLaserGrid').then((m) => m.glLaserGrid),
  },
]

/** Index des nächsten Eintrags (zyklisch); robust gegen ungültige Werte */
export function nextShowcaseIndex(current: number, length: number): number {
  if (!Number.isInteger(length) || length <= 0) return 0
  if (!Number.isInteger(current) || current < 0) return 0
  return (current + 1) % length
}

/**
 * Zufällige Reihenfolge der Indizes 0…length-1 (Fisher-Yates). Jeder
 * Visualizer kommt einmal dran, bevor sich die Runde wiederholt.
 * @param random - Zufallsquelle [0, 1) (Tests)
 */
export function shuffledOrder(length: number, random: () => number = Math.random): number[] {
  const n = Number.isInteger(length) && length > 0 ? length : 0
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const r = random()
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * (i + 1))))
    const tmp = order[i] as number
    order[i] = order[j] as number
    order[j] = tmp
  }
  return order
}
