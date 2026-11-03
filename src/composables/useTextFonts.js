import { computed, ref } from 'vue'
import { useI18n } from '../lib/i18n.js'

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
  newTextFontSelectRef,
  selectedText,
  newTextStyle,
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

  // ✨ Befülle das Font-Dropdown im Eingabemodus mit System + Custom Fonts
  function populateNewTextFontDropdown() {
    if (!newTextFontSelectRef.value) {
      return
    }

    // Leere das Dropdown
    newTextFontSelectRef.value.innerHTML = ''

    const systemFonts = SYSTEM_FONTS
    const customFonts = loadedCustomFonts()

    // 1️⃣ System Fonts
    systemFonts.forEach((fontName) => {
      const option = document.createElement('option')
      option.value = fontName
      option.textContent = fontName
      option.style.fontFamily = fontName
      newTextFontSelectRef.value.appendChild(option)
    })

    // 2️⃣ Custom Fonts (mit Separator, falls vorhanden)
    if (customFonts.length > 0) {
      const separator = document.createElement('option')
      separator.disabled = true
      separator.textContent = '── Custom Fonts ──'
      newTextFontSelectRef.value.appendChild(separator)

      customFonts.forEach((fontName) => {
        const option = document.createElement('option')
        option.value = fontName
        option.textContent = fontName
        option.style.fontFamily = fontName
        newTextFontSelectRef.value.appendChild(option)
      })
    }

    // Setze den Wert auf die aktuelle Auswahl
    newTextFontSelectRef.value.value = newTextStyle.value.fontFamily
  }

  return {
    fontOptions,
    populateFontDropdown,
    populateNewTextFontDropdown,
  }
}
