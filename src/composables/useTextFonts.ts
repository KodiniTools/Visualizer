import { computed, ref, type Ref } from 'vue'
import { useI18n } from '../lib/i18n'
import type { FontManager } from '../lib/fontManager'
import type { CanvasManagerRef, SelectedTextRef } from './types'

/** Eintrag einer Schrift-Auswahl (UiSelect) */
export interface FontOption {
  value: string
  label: string
  style: { fontFamily: string }
}

/** Gruppe der Schrift-Auswahl */
export interface FontOptionGroup {
  label: string
  options: FontOption[]
}

const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
]

export function useTextFonts(
  canvasManager: CanvasManagerRef | null | undefined,
  fontManager: Ref<FontManager | null | undefined> | null | undefined,
  _fontSelectRef?: unknown, // ungenutzt: Bearbeiten-Modus nutzt fontOptions
  _newTextFontSelectRef?: unknown, // ungenutzt: Formular nutzt newTextFontOptions
  selectedText?: Pick<SelectedTextRef, 'value'> | null,
  _newTextStyle?: unknown, // ungenutzt (frühere DOM-Befüllung)
) {
  const { t } = useI18n()

  // Schriftwahl im Bearbeiten-Modus als Daten für UiSelect. Die Schrift des
  // markierten Textes steht oben; sie wird beim Auffrischen festgehalten, damit
  // die Liste beim Wechseln der Schrift nicht umspringt. fontManager.loadedFonts
  // ist ein nicht-reaktives Set, daher stößt populateFontDropdown() die
  // Neuberechnung an (nach Textwechsel oder geladenen Fonts).
  const pinnedFont = ref<string | null>(null)
  const fontRevision = ref(0)

  function populateFontDropdown() {
    pinnedFont.value = (selectedText?.value?.fontFamily as string | undefined) || 'Arial'
    fontRevision.value++
  }

  const fontOptions = computed(() => {
    void fontRevision.value
    const customFonts = loadedCustomFonts()
    const current = pinnedFont.value
    const pinned = current && [...SYSTEM_FONTS, ...customFonts].includes(current)
    const toOption = (name: string): FontOption => ({
      value: name,
      label: name,
      style: { fontFamily: name },
    })
    const rest = (list: string[]) =>
      list.filter((name) => !pinned || name !== current).map(toOption)
    const groups: FontOptionGroup[] = []
    if (pinned && current)
      groups.push({ label: t('textManager.fontGroups.current'), options: [toOption(current)] })
    groups.push({ label: t('textManager.fontGroups.system'), options: rest(SYSTEM_FONTS) })
    const custom = rest(customFonts)
    if (custom.length > 0)
      groups.push({ label: t('textManager.fontGroups.custom'), options: custom })
    return groups
  })

  function loadedCustomFonts(): string[] {
    return fontManager?.value && fontManager.value.isInitialized
      ? Array.from(fontManager.value.loadedFonts).sort()
      : []
  }

  // Schriftwahl im Formular für neue Texte: Systemschriften, dann eigene.
  // populateNewTextFontDropdown() frischt nach geladenen Fonts auf.
  function populateNewTextFontDropdown() {
    fontRevision.value++
  }

  const newTextFontOptions = computed(() => {
    void fontRevision.value
    const toOption = (name: string): FontOption => ({
      value: name,
      label: name,
      style: { fontFamily: name },
    })
    const groups: FontOptionGroup[] = [
      { label: t('textManager.fontGroups.system'), options: SYSTEM_FONTS.map(toOption) },
    ]
    const custom = loadedCustomFonts()
    if (custom.length > 0) {
      groups.push({ label: t('textManager.fontGroups.custom'), options: custom.map(toOption) })
    }
    return groups
  })

  return {
    fontOptions,
    newTextFontOptions,
    populateFontDropdown,
    populateNewTextFontDropdown,
  }
}
