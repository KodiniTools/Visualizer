// Auswahllisten des Audio-Reaktiv-Panels (Optionen für UiSelect).

const BANDS = ['bass', 'mid', 'treble', 'volume']
const ONSETS = ['bassOnset', 'midOnset', 'trebleOnset', 'allOnset']
export const EASINGS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic', 'punch']

/**
 * Audio-Quellen: Bänder plus Onset-Gruppe. `withGlobal` stellt „Global“
 * (Wert '') voran – für Effekte, die sonst der Master-Quelle folgen.
 * @param {(key: string) => string} t
 */
export function audioSourceOptions(t, { withGlobal = false } = {}) {
  return [
    ...(withGlobal ? [{ value: '', label: t('foto.global') }] : []),
    ...BANDS.map((value) => ({ value, label: t(`foto.${value}`) })),
    {
      label: t('foto.onsetGroup'),
      options: ONSETS.map((value) => ({ value, label: t(`foto.${value}`) })),
    },
  ]
}

/** @param {(key: string) => string} t */
export function easingOptions(t) {
  return EASINGS.map((value) => ({ value, label: t(`foto.easings.${value}`) }))
}
