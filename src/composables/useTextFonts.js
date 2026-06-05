export function useTextFonts(
  canvasManager,
  fontManager,
  fontSelectRef,
  newTextFontSelectRef,
  selectedText,
  newTextStyle,
) {
  // ✨ Befülle das Font-Dropdown mit System + Custom Fonts
  // 🎯 Die aktuelle Schriftart des ausgewählten Textes wird IMMER an erster Stelle angezeigt
  function populateFontDropdown() {
    if (!fontSelectRef.value) {
      return
    }

    // Leere das Dropdown
    fontSelectRef.value.innerHTML = ''

    // System Fonts
    const systemFonts = [
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

    // Custom Fonts sammeln
    const customFonts =
      fontManager?.value && fontManager.value.isInitialized
        ? Array.from(fontManager.value.loadedFonts).sort()
        : []

    // Alle verfügbaren Fonts kombinieren
    const allFonts = [...systemFonts, ...customFonts]

    // 🎯 AKTUELLE SCHRIFTART DES AUSGEWÄHLTEN TEXTES
    const currentFont = selectedText.value?.fontFamily || 'Arial'

    // 1️⃣ Aktuelle Schriftart an erster Stelle (hervorgehoben)
    if (currentFont && allFonts.includes(currentFont)) {
      const currentOption = document.createElement('option')
      currentOption.value = currentFont
      currentOption.textContent = `✨ ${currentFont} (aktuell)`
      currentOption.style.fontFamily = currentFont
      currentOption.style.fontWeight = 'bold'
      currentOption.style.backgroundColor = 'var(--card-bg)'
      fontSelectRef.value.appendChild(currentOption)

      // Separator
      const separator1 = document.createElement('option')
      separator1.disabled = true
      separator1.textContent = '──────────────────'
      fontSelectRef.value.appendChild(separator1)
    }

    // 2️⃣ System Fonts (ohne die aktuelle Schriftart, falls bereits oben)
    systemFonts.forEach((fontName) => {
      if (fontName === currentFont) return // Überspringe aktuelle Schriftart

      const option = document.createElement('option')
      option.value = fontName
      option.textContent = fontName
      option.style.fontFamily = fontName
      fontSelectRef.value.appendChild(option)
    })

    // 3️⃣ Custom Fonts (mit Separator, falls vorhanden)
    if (customFonts.length > 0) {
      const separator2 = document.createElement('option')
      separator2.disabled = true
      separator2.textContent = '── Custom Fonts ──'
      fontSelectRef.value.appendChild(separator2)

      customFonts.forEach((fontName) => {
        if (fontName === currentFont) return // Überspringe aktuelle Schriftart

        const option = document.createElement('option')
        option.value = fontName
        option.textContent = fontName
        option.style.fontFamily = fontName
        fontSelectRef.value.appendChild(option)
      })
    }
  }

  // ✨ Befülle das Font-Dropdown im Eingabemodus mit System + Custom Fonts
  function populateNewTextFontDropdown() {
    if (!newTextFontSelectRef.value) {
      return
    }

    // Leere das Dropdown
    newTextFontSelectRef.value.innerHTML = ''

    // System Fonts
    const systemFonts = [
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

    // Custom Fonts sammeln
    const customFonts =
      fontManager?.value && fontManager.value.isInitialized
        ? Array.from(fontManager.value.loadedFonts).sort()
        : []

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
    populateFontDropdown,
    populateNewTextFontDropdown,
  }
}
