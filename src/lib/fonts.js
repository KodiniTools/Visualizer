// fonts.js - Zentrale Font-Konfiguration mit robustem Loading

export const CUSTOM_FONTS = [
  // Alpino Familie
  { name: 'Alpino Black', file: 'Alpino-Black.woff2' },
  { name: 'Alpino Bold', file: 'Alpino-Bold.woff2' },
  { name: 'Alpino Light', file: 'Alpino-Light.woff2' },
  { name: 'Alpino Medium', file: 'Alpino-Medium.woff2' },
  { name: 'Alpino Regular', file: 'Alpino-Regular.woff2' },
  { name: 'Alpino Thin', file: 'Alpino-Thin.woff2' },
  { name: 'Alpino Variable', file: 'Alpino-Variable.woff2' },

  // Author Familie
  { name: 'Author Bold', file: 'Author-Bold.woff2' },
  { name: 'Author Bold Italic', file: 'Author-BoldItalic.woff2' },
  { name: 'Author Extralight', file: 'Author-Extralight.woff2' },
  { name: 'Author Extralight Italic', file: 'Author-ExtralightItalic.woff2' },
  { name: 'Author Italic', file: 'Author-Italic.woff2' },
  { name: 'Author Light', file: 'Author-Light.woff2' },
  { name: 'Author Light Italic', file: 'Author-LightItalic.woff2' },
  { name: 'Author Medium', file: 'Author-Medium.woff2' },
  { name: 'Author Medium Italic', file: 'Author-MediumItalic.woff2' },
  { name: 'Author Regular', file: 'Author-Regular.woff2' },
  { name: 'Author Semibold', file: 'Author-Semibold.woff2' },
  { name: 'Author Semibold Italic', file: 'Author-SemiboldItalic.woff2' },
  { name: 'Author Variable', file: 'Author-Variable.woff2' },
  { name: 'Author Variable Italic', file: 'Author-VariableItalic.woff2' },

  // ClashDisplay Familie
  { name: 'ClashDisplay Extralight', file: 'ClashDisplay-Extralight.woff2' },
  { name: 'ClashDisplay Light', file: 'ClashDisplay-Light.woff2' },
  { name: 'ClashDisplay Medium', file: 'ClashDisplay-Medium.woff2' },
  { name: 'ClashDisplay Regular', file: 'ClashDisplay-Regular.woff2' },
  { name: 'ClashDisplay Bold', file: 'ClashDisplay-Bold.woff2' },
  { name: 'ClashDisplay Semibold', file: 'ClashDisplay-Semibold.woff2' },
  { name: 'ClashDisplay Variable', file: 'ClashDisplay-Variable.woff2' },

  // GeneralSans Familie
  { name: 'GeneralSans Bold', file: 'GeneralSans-Bold.woff2' },
  { name: 'GeneralSans Bold Italic', file: 'GeneralSans-BoldItalic.woff2' },
  { name: 'GeneralSans Extralight', file: 'GeneralSans-Extralight.woff2' },
  { name: 'GeneralSans Extralight Italic', file: 'GeneralSans-ExtralightItalic.woff2' },
  { name: 'GeneralSans Italic', file: 'GeneralSans-Italic.woff2' },
  { name: 'GeneralSans Light', file: 'GeneralSans-Light.woff2' },
  { name: 'GeneralSans Light Italic', file: 'GeneralSans-LightItalic.woff2' },
  { name: 'GeneralSans Medium', file: 'GeneralSans-Medium.woff2' },
  { name: 'GeneralSans Medium Italic', file: 'GeneralSans-MediumItalic.woff2' },
  { name: 'GeneralSans Regular', file: 'GeneralSans-Regular.woff2' },
  { name: 'GeneralSans Semibold', file: 'GeneralSans-Semibold.woff2' },
  { name: 'GeneralSans Semibold Italic', file: 'GeneralSans-SemiboldItalic.woff2' },
  { name: 'GeneralSans Variable', file: 'GeneralSans-Variable.woff2' },
  { name: 'GeneralSans Variable Italic', file: 'GeneralSans-VariableItalic.woff2' },

  // Hind Familie
  { name: 'Hind Bold', file: 'Hind-Bold.woff2' },
  { name: 'Hind Light', file: 'Hind-Light.woff2' },
  { name: 'Hind Medium', file: 'Hind-Medium.woff2' },
  { name: 'Hind Regular', file: 'Hind-Regular.woff2' },
  { name: 'Hind SemiBold', file: 'Hind-SemiBold.woff2' },
  { name: 'Hind Variable', file: 'Hind-Variable.woff2' },

  // Satoshi Familie
  { name: 'Satoshi Light', file: 'Satoshi-Light.woff2' },
  { name: 'Satoshi LightItalic', file: 'Satoshi-LightItalic.woff2' },
  { name: 'Satoshi Bold', file: 'Satoshi-Bold.woff2' },
  { name: 'Satoshi BoldItalic', file: 'Satoshi-BoldItalic.woff2' },
  { name: 'Satoshi Italic', file: 'Satoshi-Italic.woff2' },
  { name: 'Satoshi Medium', file: 'Satoshi-Medium.woff2' },
  { name: 'Satoshi MediumItalic', file: 'Satoshi-MediumItalic.woff2' },
  { name: 'Satoshi Regular', file: 'Satoshi-Regular.woff2' },
  { name: 'Satoshi Black', file: 'Satoshi-Black.woff2' },
  { name: 'Satoshi BlackItalic', file: 'Satoshi-BlackItalic.woff2' },
  { name: 'Satoshi Variable', file: 'Satoshi-Variable.woff2' },
  { name: 'Satoshi Variable Italic', file: 'Satoshi-VariableItalic.woff2' },

  // Supreme Familie
  { name: 'Supreme Extralight', file: 'Supreme-Extralight.woff2' },
  { name: 'Supreme Thin', file: 'Supreme-Thin.woff2' },
  { name: 'Supreme ThinItalic', file: 'Supreme-ThinItalic.woff2' },
  { name: 'Supreme ExtralightItalic', file: 'Supreme-ExtralightItalic.woff2' },
  { name: 'Supreme Italic', file: 'Supreme-Italic.woff2' },
  { name: 'Supreme Light', file: 'Supreme-Light.woff2' },
  { name: 'Supreme LightItalic', file: 'Supreme-LightItalic.woff2' },
  { name: 'Supreme Regular', file: 'Supreme-Regular.woff2' },
  { name: 'Supreme Bold', file: 'Supreme-Bold.woff2' },
  { name: 'Supreme BoldItalic', file: 'Supreme-BoldItalic.woff2' },
  { name: 'Supreme Extrabold', file: 'Supreme-Extrabold.woff2' },
  { name: 'Supreme ExtraboldItalic', file: 'Supreme-ExtraboldItalic.woff2' },
  { name: 'Supreme Medium', file: 'Supreme-Medium.woff2' },
  { name: 'Supreme MediumItalic', file: 'Supreme-MediumItalic.woff2' },
  { name: 'Supreme Variable', file: 'Supreme-Variable.woff2' },
  { name: 'Supreme VariableItalic', file: 'Supreme-VariableItalic.woff2' },

  // Tanker Familie
  { name: 'Tanker Regular', file: 'Tanker-Regular.woff2' },

  // Zodiak Familie
  { name: 'Zodiak Black', file: 'Zodiak-Black.woff2' },
  { name: 'Zodiak Black Italic', file: 'Zodiak-BlackItalic.woff2' },
  { name: 'Zodiak Bold', file: 'Zodiak-Bold.woff2' },
  { name: 'Zodiak Bold Italic', file: 'Zodiak-BoldItalic.woff2' },
  { name: 'Zodiak Extrabold', file: 'Zodiak-Extrabold.woff2' },
  { name: 'Zodiak Extrabold Italic', file: 'Zodiak-ExtraboldItalic.woff2' },
  { name: 'Zodiak Italic', file: 'Zodiak-Italic.woff2' },
  { name: 'Zodiak Light', file: 'Zodiak-Light.woff2' },
  { name: 'Zodiak Light Italic', file: 'Zodiak-LightItalic.woff2' },
  { name: 'Zodiak Regular', file: 'Zodiak-Regular.woff2' },
  { name: 'Zodiak Thin', file: 'Zodiak-Thin.woff2' },
  { name: 'Zodiak Thin Italic', file: 'Zodiak-ThinItalic.woff2' },
  { name: 'Zodiak Variable', file: 'Zodiak-Variable.woff2' },
  { name: 'Zodiak Variable Italic', file: 'Zodiak-VariableItalic.woff2' },

  // Ranade Familie
  { name: 'Ranade Thin Italic', file: 'Ranade-ThinItalic.woff2' },
  { name: 'Ranade Bold', file: 'Ranade-Bold.woff2' },
  { name: 'Ranade Bold Italic', file: 'Ranade-BoldItalic.woff2' },
  { name: 'Ranade Italic', file: 'Ranade-Italic.woff2' },
  { name: 'Ranade Medium', file: 'Ranade-Medium.woff2' },
  { name: 'Ranade Medium Italic', file: 'Ranade-MediumItalic.woff2' },
  { name: 'Ranade Variable', file: 'Ranade-Variable.woff2' },
  { name: 'Ranade Variable Italic', file: 'Ranade-VariableItalic.woff2' },

  // Switzer Familie
  { name: 'Switzer Thin', file: 'Switzer-Thin.woff2' },
  { name: 'Switzer Thin Italic', file: 'Switzer-ThinItalic.woff2' },
  { name: 'Switzer Extralight', file: 'Switzer-Extralight.woff2' },
  { name: 'Switzer Extralight Italic', file: 'Switzer-ExtralightItalic.woff2' },
  { name: 'Switzer Light', file: 'Switzer-Light.woff2' },
  { name: 'Switzer Light Italic', file: 'Switzer-LightItalic.woff2' },
  { name: 'Switzer Regular', file: 'Switzer-Regular.woff2' },
  { name: 'Switzer Italic', file: 'Switzer-Italic.woff2' },
  { name: 'Switzer Medium', file: 'Switzer-Medium.woff2' },
  { name: 'Switzer Medium Italic', file: 'Switzer-MediumItalic.woff2' },
  { name: 'Switzer Semibold', file: 'Switzer-Semibold.woff2' },
  { name: 'Switzer Semibold Italic', file: 'Switzer-SemiboldItalic.woff2' },
  { name: 'Switzer Bold', file: 'Switzer-Bold.woff2' },
  { name: 'Switzer Bold Italic', file: 'Switzer-BoldItalic.woff2' },
  { name: 'Switzer Extrabold', file: 'Switzer-Extrabold.woff2' },
  { name: 'Switzer Extrabold Italic', file: 'Switzer-ExtraboldItalic.woff2' },
  { name: 'Switzer Black', file: 'Switzer-Black.woff2' },
  { name: 'Switzer Variable', file: 'Switzer-Variable.woff2' },
  { name: 'Switzer Variable Italic', file: 'Switzer-VariableItalic.woff2' },

  // Telma Familie
  { name: 'Telma Light', file: 'Telma-Light.woff2' },
  { name: 'Telma Regular', file: 'Telma-Regular.woff2' },
  { name: 'Telma Medium', file: 'Telma-Medium.woff2' },
  { name: 'Telma Bold', file: 'Telma-Bold.woff2' },
  { name: 'Telma Black', file: 'Telma-Black.woff2' },
  { name: 'Telma Variable', file: 'Telma-Variable.woff2' },

  // Chillax Familie
  { name: 'Chillax Extralight', file: 'Chillax-Extralight.woff2' },
  { name: 'Chillax Light', file: 'Chillax-Light.woff2' },
  { name: 'Chillax Regular', file: 'Chillax-Regular.woff2' },
  { name: 'Chillax Medium', file: 'Chillax-Medium.woff2' },
  { name: 'Chillax Semibold', file: 'Chillax-Semibold.woff2' },
  { name: 'Chillax Bold', file: 'Chillax-Bold.woff2' },
  { name: 'Chillax Variable', file: 'Chillax-Variable.woff2' }
];

/**
 * System Fonts (immer verfügbar)
 */
export const SYSTEM_FONTS = [
  { name: 'Arial' },
  { name: 'Verdana' },
  { name: 'Georgia' },
  { name: 'Courier New' },
  { name: 'Times New Roman' },
  { name: 'Comic Sans MS' },
  { name: 'Impact' },
  { name: 'Trebuchet MS' },
];

// Cache für geladene Fonts
const loadedFontsCache = new Set();

/**
 * ✨ NEU: Ermittle den Base-Path aus import.meta.env
 * Das funktioniert sowohl in Dev als auch im Build
 */
function getBasePath() {
  // In Vite können wir import.meta.env.BASE_URL verwenden
  // Das wird automatisch zur Build-Zeit ersetzt
  return import.meta.env.BASE_URL || '/';
}

/**
 * ✨ NEU: Erstelle Font-URL mit korrektem Base-Path
 */
function getFontUrl(filename) {
  const basePath = getBasePath();
  // Entferne doppelte Slashes
  const path = `${basePath}fonts/${filename}`.replace(/\/+/g, '/');
  console.log(`🔤 Font URL: ${path}`);
  return path;
}

/**
 * Lädt Custom Fonts mit Font Loading API
 * Verhindert das text/html Problem
 */
export async function loadCustomFonts() {
  if (CUSTOM_FONTS.length === 0) {
    console.log('ℹ️ Keine Custom Fonts definiert');
    return { loadedFonts: [], failedFonts: [] };
  }

  console.log(`📤 Starte Laden von ${CUSTOM_FONTS.length} Custom Fonts...`);
  console.log(`📍 Base-Path: ${getBasePath()}`);
  
  const loadedFonts = [];
  const failedFonts = [];

  for (const font of CUSTOM_FONTS) {
    // Skip if already loaded
    if (loadedFontsCache.has(font.name)) {
      loadedFonts.push(font.name);
      continue;
    }

    try {
      // ✨ NEU: Verwende getFontUrl für korrekten Pfad
      const fontUrl = getFontUrl(font.file);
      
      // Font-Face erstellen
      const fontFace = new FontFace(
        font.name,
        `url(${fontUrl})`,
        {
          weight: 'normal',
          style: 'normal',
        }
      );

      // Font laden
      const loadedFont = await fontFace.load();

      // Zum Document hinzufügen
      document.fonts.add(loadedFont);

      // Cache updaten
      loadedFontsCache.add(font.name);
      loadedFonts.push(font.name);

    } catch (error) {
      failedFonts.push(font.name);
      console.warn(`⚠️ Font konnte nicht geladen werden: ${font.name}`, error);
    }
  }

  console.log(`✅ ${loadedFonts.length}/${CUSTOM_FONTS.length} Fonts erfolgreich geladen`);
  if (failedFonts.length > 0) {
    console.warn(`⚠️ ${failedFonts.length} Fonts fehlgeschlagen:`, failedFonts.slice(0, 5).join(', ') + (failedFonts.length > 5 ? '...' : ''));
  }

  return { loadedFonts, failedFonts };
}

/**
 * Prüft ob ein Font verfügbar ist
 */
export function isFontAvailable(fontName) {
  // System Fonts sind immer verfügbar
  if (SYSTEM_FONTS.some(f => f.name === fontName)) {
    return true;
  }

  // Im Cache?
  if (loadedFontsCache.has(fontName)) {
    return true;
  }

  // Custom Font prüfen mit Font Loading API
  return document.fonts.check(`16px "${fontName}"`);
}

/**
 * Wartet bis ein Font geladen ist (oder lädt ihn nach)
 */
export async function waitForFont(fontName, timeout = 3000) {
  // System Font?
  if (SYSTEM_FONTS.some(f => f.name === fontName)) {
    return true;
  }

  // Bereits im Cache?
  if (loadedFontsCache.has(fontName)) {
    return true;
  }

  // Font finden
  const fontDef = CUSTOM_FONTS.find(f => f.name === fontName);
  if (!fontDef) {
    console.warn(`⚠️ Font nicht in CUSTOM_FONTS definiert: ${fontName}`);
    return false;
  }

  try {
    console.log(`⏳ Lade Font: ${fontName}...`);

    // ✨ NEU: Verwende getFontUrl für korrekten Pfad
    const fontUrl = getFontUrl(fontDef.file);

    // Font-Face erstellen und laden
    const fontFace = new FontFace(
      fontName,
      `url(${fontUrl})`,
      { weight: 'normal', style: 'normal' }
    );

    const loadedFont = await Promise.race([
      fontFace.load(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);

    document.fonts.add(loadedFont);
    loadedFontsCache.add(fontName);

    console.log(`✅ Font geladen: ${fontName}`);
    return true;

  } catch (error) {
    console.error(`❌ Font konnte nicht geladen werden: ${fontName}`, error);
    return false;
  }
}

/**
 * Gibt alle verfügbaren Fonts zurück (System + erfolgreich geladene Custom)
 */
export function getAllAvailableFonts() {
  const available = [...SYSTEM_FONTS];

  for (const font of CUSTOM_FONTS) {
    if (loadedFontsCache.has(font.name) || isFontAvailable(font.name)) {
      available.push(font);
    }
  }

  return available;
}

/**
 * Gibt Statistiken über geladene Fonts zurück
 */
export function getFontStats() {
  return {
    total: CUSTOM_FONTS.length,
    loaded: loadedFontsCache.size,
    systemFonts: SYSTEM_FONTS.length,
    available: getAllAvailableFonts().length
  };
}
