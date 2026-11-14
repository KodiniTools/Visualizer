import type { StackAction } from '../../../lib/canvasObjects/mediaStack'

/**
 * Ebenen-Knöpfe (Bilder im Foto-Panel, Videos im Video-Panel), in der
 * Reihenfolge: ganz nach vorne, eins hoch, eins runter, ganz nach hinten.
 * `key` ist zugleich der i18n-Schlüssel unter `foto.`.
 */
export const LAYER_ACTION_DEFS: readonly { key: StackAction; up: boolean; path: string }[] = [
  { key: 'bringToFront', up: true, path: 'M3 2.5h10M8 13.5V6M4.5 9.5 8 6l3.5 3.5' },
  { key: 'moveUp', up: true, path: 'M8 13V3M4 7l4-4 4 4' },
  { key: 'moveDown', up: false, path: 'M8 3v10M4 9l4 4 4-4' },
  { key: 'sendToBack', up: false, path: 'M3 13.5h10M8 2.5V10M4.5 6.5 8 10l3.5-3.5' },
]
