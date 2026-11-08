import { computed, ref } from 'vue'
import { useI18n } from '../lib/i18n'

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
  canvasManager,
  fontManager,
  _fontSelectRef, // ungenutzt: Bearbeiten-Modus nutzt fontOptions
  _newTextFontSelectRef, // ungenutzt: Formular nutzt newTextFontOptions
  selectedText,
  _newTextStyle, // ungenutzt (frühere DOM-Befüllung)
) {
  const { t } = useI18n()

  // Schriftwahl im Bearbeiten-Modus als Daten für UiSelect. Die Schrift des
  // markierten Textes steht oben; sie wird beim Auffrischen festgehalten, damit
  // die Liste beim Wechseln der Schrift nicht umspringt. fontManager.loadedFonts
  // ist ein nicht-reaktives Set, daher stößt populateFontDropdown() die
  // Neuberechnung an (nach Textwechsel oder geladenen Fonts).
  const pinnedFont = ref(null)
  const fontRevision = ref(0)

  function populateFontDropdown() {
    pinnedFont.value = selectedText.value?.fontFamily || 'Arial'
    fontRevision.value++
  }

  const fontOptions = computed(() => {
    void fontRevision.value
    const customFonts = loadedCustomFonts()
    const current = pinnedFont.value
    const pinned = current && [...SYSTEM_FONTS, ...customFonts].includes(current)
    const toOption = (name) => ({ value: name, label: name, style: { fontFamily: name } })
    const rest = (list) => list.filter((name) => !pinned || name !== current).map(toOption)
    const groups = []
    if (pinned)
      groups.push({ label: t('textManager.fontGroups.current'), options: [toOption(current)] })
    groups.push({ label: t('textManager.fontGroups.system'), options: rest(SYSTEM_FONTS) })
    const custom = rest(customFonts)
    if (custom.length > 0)
      groups.push({ label: t('textManager.fontGroups.custom'), options: custom })
    return groups
  })

  function loadedCustomFonts() {
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
    const toOption = (name) => ({ value: name, label: name, style: { fontFamily: name } })
    const groups = [
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
