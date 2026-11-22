import { computed, ref, type Ref } from 'vue'
import { useI18n } from '../lib/i18n'
import type { FontManager } from '../lib/fontManager'
import { APP_FONT } from '../lib/fonts'
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

// Kodini 22.11.2026: nur noch Arial.
const SYSTEM_FONTS = [APP_FONT]

export function useTextFonts(
  _canvasManager: CanvasManagerRef | null | undefined,
  _fontManager: Ref<FontManager | null | undefined> | null | undefined, // ungenutzt: nur Arial
  _fontSelectRef?: unknown, // ungenutzt: Bearbeiten-Modus nutzt fontOptions
  _newTextFontSelectRef?: unknown, // ungenutzt: Formular nutzt newTextFontOptions
  _selectedText?: Pick<SelectedTextRef, 'value'> | null, // ungenutzt: nur Arial
  _newTextStyle?: unknown, // ungenutzt (frühere DOM-Befüllung)
) {
  const { t } = useI18n()

  const fontRevision = ref(0)

  // Bleibt für die Aufrufer erhalten (frischt die Liste auf).
  function populateFontDropdown() {
    fontRevision.value++
  }

  // Kodini 22.11.2026: Arial ist die einzige Schrift. Beide Listen bieten nur
  // Arial an; der FontManager lädt keine eigenen Schriften mehr.
  const toOption = (name: string): FontOption => ({
    value: name,
    label: name,
    style: { fontFamily: name },
  })
  const onlyArial = (): FontOptionGroup[] => [
    { label: t('textManager.fontGroups.system'), options: SYSTEM_FONTS.map(toOption) },
  ]

  const fontOptions = computed(() => {
    void fontRevision.value
    return onlyArial()
  })

  // populateNewTextFontDropdown() bleibt für die Aufrufer erhalten.
  function populateNewTextFontDropdown() {
    fontRevision.value++
  }

  const newTextFontOptions = computed(() => {
    void fontRevision.value
    return onlyArial()
  })

  return {
    fontOptions,
    newTextFontOptions,
    populateFontDropdown,
    populateNewTextFontDropdown,
  }
}
