/**
 * Einblend-Effekte beim Platzieren von Bildern und Videos (Werte wie in
 * MultiImageManager/VideoManager). Anzeigenamen: i18n `placement.animations.*`.
 */
export const PLACEMENT_ANIMATIONS = [
  'none',
  'fade',
  'slideLeft',
  'slideRight',
  'slideUp',
  'slideDown',
  'zoom',
  'bounce',
  'spin',
  'elastic',
]

/** Optionen für UiSelect in der aktuellen Sprache */
export const placementAnimationOptions = (t: (key: string) => string) =>
  PLACEMENT_ANIMATIONS.map((value) => ({ value, label: t(`placement.animations.${value}`) }))
