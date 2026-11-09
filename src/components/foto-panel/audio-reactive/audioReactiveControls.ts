/**
 * Vom AudioReactivePanel per provide('audioReactiveControls') an die
 * Unterabschnitte (Master, Presets, Effekte, Aktionen) gereichter Zustand.
 */
import type { ComputedRef, Ref } from 'vue'

/** Effekt-Eintrag einer Kategorie */
export interface AudioReactiveEffectItem {
  id: string
  name: string
}

/** Zusätzliche Effekt-Kategorie (z. B. Gradient-Effekte des Hintergrunds) */
export interface AudioReactiveExtraCategory {
  title: string
  effects: AudioReactiveEffectItem[]
  defaultIntensity?: number
}

/** UI-Zustand eines Effekts ('' = Master-Quelle) */
export interface AudioReactiveEffectState {
  enabled: boolean
  intensity: number
  source: string
}

/** Master-Einstellungen im Panel */
export interface AudioReactiveMasterState {
  source: string
  smoothing: number
  gain: number
  easing: string
  beatBoost: number
  phase: number
}

export interface AudioReactiveControls {
  hasActiveImage: Ref<boolean>
  hasSavedSettings: Ref<boolean>
  activeAudioPreset: Ref<string | null>
  isEnabled: Ref<boolean>
  master: AudioReactiveMasterState
  audioLevelBarRef: Ref<HTMLElement | null>
  presetList: ComputedRef<ReadonlyArray<{ id: string; name: string; icon?: string }>>
  colorEffects: ComputedRef<AudioReactiveEffectItem[]>
  transformEffects: ComputedRef<AudioReactiveEffectItem[]>
  movementEffects: ComputedRef<AudioReactiveEffectItem[]>
  specialEffects: ComputedRef<AudioReactiveEffectItem[]>
  rhythmEffects: ComputedRef<AudioReactiveEffectItem[]>
  extraCategories: Ref<AudioReactiveExtraCategory[]>
  setEnabled: (enabled: boolean) => void
  setMaster: <K extends keyof AudioReactiveMasterState>(
    prop: K,
    value: AudioReactiveMasterState[K],
  ) => void
  effectState: (id: string, defaultIntensity?: number) => AudioReactiveEffectState
  togglePreset: (id: string) => void
  clearPreset: () => void
  effectToggle: (id: string, enabled: boolean, defaultIntensity: number) => void
  effectSourceChange: (id: string, source: string, defaultIntensity: number) => void
  effectIntensityChange: (id: string, intensity: number, defaultIntensity: number) => void
  saveSettings: () => void
  applySettings: () => void
}
