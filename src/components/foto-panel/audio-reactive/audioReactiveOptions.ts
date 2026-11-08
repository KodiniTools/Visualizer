// Auswahllisten des Audio-Reaktiv-Panels (Optionen für UiSelect).
import type { UiSelectEntry, UiSelectOption } from '../../ui/UiSelect.vue'
import type { TranslateFn } from '../../../composables/types'

const BANDS = ['bass', 'mid', 'treble', 'volume']
const ONSETS = ['bassOnset', 'midOnset', 'trebleOnset', 'allOnset']
export const EASINGS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic', 'punch']

/**
 * Audio-Quellen: Bänder plus Onset-Gruppe. `withGlobal` stellt „Global“
 * (Wert '') voran – für Effekte, die sonst der Master-Quelle folgen.
 */
export function audioSourceOptions(
  t: TranslateFn,
  { withGlobal = false }: { withGlobal?: boolean } = {},
): UiSelectEntry[] {
  return [
    ...(withGlobal ? [{ value: '', label: t('foto.global') }] : []),
    ...BANDS.map((value) => ({ value, label: t(`foto.${value}`) })),
    {
      label: t('foto.onsetGroup'),
      options: ONSETS.map((value) => ({ value, label: t(`foto.${value}`) })),
    },
  ]
}

export function easingOptions(t: TranslateFn): UiSelectOption[] {
  return EASINGS.map((value) => ({ value, label: t(`foto.easings.${value}`) }))
}
