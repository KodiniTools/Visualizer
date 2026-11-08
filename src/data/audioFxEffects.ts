// Aufbau des Panels „Audio-Reaktive Effekte“ (AudioFxPanel.vue).
// Je Effekt: `key` (Store-Felder `${key}Enabled`, `${key}Source`, `${key}Color`,
// Name unter i18n `audioFx.effects.${key}`), ob er eine Audio-Quelle und eine
// Farbe hat, und seine Regler (Store-Feld, Beschriftung `audioFx.${label}`, Bereich).

const range = (prop: string, label: string, max: number, unit = '') => ({
  prop,
  label,
  min: 0,
  max,
  unit,
})

export const AUDIO_FX_GROUPS = [
  {
    id: 'audio',
    label: null,
    effects: [
      {
        key: 'brightness',
        source: true,
        ranges: [range('brightnessMin', 'min', 200), range('brightnessMax', 'max', 300)],
      },
      {
        key: 'saturation',
        source: true,
        ranges: [range('saturationMin', 'min', 200), range('saturationMax', 'max', 400)],
      },
      {
        key: 'contrast',
        source: true,
        ranges: [range('contrastMin', 'min', 200), range('contrastMax', 'max', 300)],
      },
      { key: 'hue', source: true, ranges: [range('hueRange', 'range', 360, '°')] },
      { key: 'pulse', source: true, ranges: [range('pulseStrength', 'strength', 100)] },
      {
        key: 'glow',
        source: true,
        color: true,
        ranges: [range('glowIntensity', 'intensity', 100)],
      },
      {
        key: 'tint',
        source: true,
        color: true,
        ranges: [range('tintIntensity', 'intensity', 100)],
      },
      { key: 'vignette', source: true, ranges: [range('vignetteIntensity', 'intensity', 100)] },
    ],
  },
  {
    id: 'rhythm',
    label: 'audioFx.rhythmGroup',
    effects: [
      { key: 'zoomPunch', ranges: [range('zoomPunchStrength', 'strength', 100)] },
      { key: 'vignettePulse', ranges: [range('vignettePulseIntensity', 'intensity', 100)] },
      { key: 'bpmPulse', ranges: [range('bpmPulseStrength', 'strength', 100)] },
      { key: 'freqSplit', ranges: [range('freqSplitStrength', 'strength', 100)] },
    ],
  },
]

/** Audio-Quellen der Effekte (Texte unter i18n `beatDrop.sources`). */
export const AUDIO_FX_SOURCES = ['bass', 'mid', 'treble', 'volume']
export const AUDIO_FX_ONSET_SOURCES = ['bassOnset', 'midOnset', 'trebleOnset', 'allOnset']
