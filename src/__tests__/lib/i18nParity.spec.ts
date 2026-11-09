import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'
import { PLACEMENT_ANIMATIONS } from '../../lib/placementAnimations'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

/** Verschachtelte Übersetzungen als Map 'a.b.c' → Wert. */
function flatten(obj: object, prefix = ''): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  )
}

const placeholders = (s: unknown) =>
  typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []

/**
 * Doppelte Schlüssel im Quelltext finden (im Objekt überschreibt der letzte
 * stillschweigend den ersten). Die Dateien sind mit Prettier formatiert:
 * jedes Objekt öffnet mit `{` am Zeilenende und schließt mit `}` am
 * Zeilenanfang; Arrays mit `[`/`]` entsprechend.
 */
function duplicateKeys(source: string) {
  const stack = [{ keys: new Set(), path: '' }]
  const dups = []
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (/^[}\]]/.test(line)) stack.pop()
    const m = line.match(/^(['"]?)([\w$-]+)\1:\s*(.*)$/)
    const scope = stack.at(-1)
    if (m && scope) {
      if (scope.keys.has(m[2])) dups.push(`${scope.path}${m[2]}`)
      scope.keys.add(m[2])
    }
    const opens = /[{[]$/.test(line)
    if (opens) {
      const path = m ? `${scope?.path ?? ''}${m[2]}.` : `${scope?.path ?? ''}[].`
      stack.push({ keys: new Set(), path })
    }
  }
  return dups
}

describe('i18n – DE/EN-Parität', () => {
  const D = new Map(flatten(de))
  const E = new Map(flatten(en))

  it('beide Sprachen haben dieselben Schlüssel', () => {
    expect([...D.keys()].filter((k) => !E.has(k))).toEqual([])
    expect([...E.keys()].filter((k) => !D.has(k))).toEqual([])
  })

  it('gleicher Typ und gleiche Platzhalter je Schlüssel', () => {
    const mismatch = [...D.keys()].filter(
      (k) =>
        typeof D.get(k) !== typeof E.get(k) ||
        placeholders(D.get(k)).join() !== placeholders(E.get(k)).join(),
    )
    expect(mismatch).toEqual([])
  })

  it('keine leeren Übersetzungen', () => {
    const empty = [...D, ...E].filter(([, v]) => v === '').map(([k]) => k)
    expect(empty).toEqual([])
  })

  it.each(['lib/i18n/de.ts', 'lib/i18n/en.ts'])('%s enthält keine doppelten Schlüssel', (f) => {
    expect(duplicateKeys(read(f))).toEqual([])
  })

  it('Duplikat-Suche erkennt doppelte Schlüssel je Ebene', () => {
    const src = [
      'export default {',
      '  a: {',
      "    x: '1',",
      "    x: '2',",
      '  },',
      '  b: {',
      "    x: '3',",
      '    list: [',
      '      {',
      "        id: 'a',",
      '      },',
      '      {',
      "        id: 'b',",
      '      },',
      '    ],',
      '  },',
      '}',
    ].join('\n')
    // x in a doppelt; x in b und id je Listeneintrag sind eigene Ebenen
    expect(duplicateKeys(src)).toEqual(['[].a.x'])
  })
})

/** Sichtbarer Text im Template, der nicht über t() läuft. */
function hardcodedTemplateText(source: string) {
  const tpl = (source.match(/<template>([\s\S]*)<\/template>/) || [])[1] || ''
  // HTML-Kommentare ohne Regex-Ersetzung entfernen (alles ab `<!--` bis `-->`)
  const clean = tpl
    .split('<!--')
    .map((part, i) => (i === 0 ? part : part.slice(part.indexOf('-->') + 3)))
    .join('')
  const hits = []
  for (const m of clean.matchAll(/>([^<>]*)</g)) {
    const txt = m[1]!
      .replace(/\{\{[\s\S]*?\}\}/g, '')
      .replace(/&[a-z]+;/g, ' ')
      .trim()
    if (/[A-Za-zÄÖÜäöüß]{3,}/.test(txt)) hits.push(txt)
  }
  for (const m of clean.matchAll(/(?<![:@\w-])(title|placeholder|aria-label)="([^"]*)"/g)) {
    const isHexColor = /^#[0-9a-f]{3,8}$/i.test(m[2]!)
    if (!isHexColor && /[A-Za-zÄÖÜäöüß]{3,}/.test(m[2]!)) hits.push(`${m[1]}="${m[2]}"`)
  }
  // Sprachweichen im Template statt Übersetzungsschlüssel
  for (const m of clean.matchAll(/locale\s*===\s*['"]\w+['"]/g)) hits.push(m[0])
  return hits
}

describe('i18n – Text-Manager ohne fest verdrahtete Texte', () => {
  it.each([
    'components/text-manager/TextNewForm.vue',
    'components/text-manager/text-edit/TextContentSection.vue',
    'components/text-manager/text-edit/TextRotationSection.vue',
    'components/text-manager/text-edit/TextSpacingStrokeSection.vue',
    'components/text-manager/text-edit/TextPositionSection.vue',
    'components/text-manager/text-new-form/PositionSection.vue',
  ])('%s', (f) => {
    expect(hardcodedTemplateText(read(f))).toEqual([])
  })
})

describe('i18n – Kachel-Hintergrund ohne fest verdrahtete Texte', () => {
  it.each([
    'components/BackgroundTilesPanel.vue',
    'components/background-tiles/SelectedTileEditor.vue',
    'components/background-tiles/TileGridControls.vue',
    'components/background-tiles/TileImageSection.vue',
    'components/background-tiles/TilePresetsSection.vue',
    'components/background-tiles/TileGalleryModal.vue',
  ])('%s', (f) => {
    expect(hardcodedTemplateText(read(f))).toEqual([])
  })
})

describe('i18n – Beat-Marker-Popover ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Sprachweichen', () => {
    const src = read('components/sticky-player-bar/BeatMarkerPopover.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale\s*===/)
  })
})

describe('i18n – Canvas-Videoliste ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte', () => {
    expect(hardcodedTemplateText(read('components/video-panel/CanvasVideosList.vue'))).toEqual([])
  })
})

describe('i18n – Hintergrund-ersetzen-Dialog ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Fallback-Strings', () => {
    const src = read('components/canvas-control/background/BackgroundReplaceModal.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/\)\s*\|\|\s*'/)
  })
})

describe('i18n – Video-Upload ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Sprachweichen', () => {
    const src = read('components/video-panel/VideoUploadSection.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale\s*===/)
  })
})

describe('i18n – Platzierung (Video und Bild) ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Sprachweichen', () => {
    const src = read('components/video-panel/VideoPlacementControls.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale\s*===/)
  })

  it('Bild-Platzierung (Foto-Panel) ebenso', () => {
    const src = read('components/foto-panel/PlacementSettings.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale\s*===/)
  })

  it('jede Platzierungs-Animation hat einen Namen in DE und EN', () => {
    for (const key of PLACEMENT_ANIMATIONS) {
      expect((de.placement.animations as Record<string, string>)[key], key).toBeTruthy()
      expect((en.placement.animations as Record<string, string>)[key], key).toBeTruthy()
    }
  })
})

describe('i18n – Bildvorschau ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Fallback-Strings', () => {
    const src = read('components/canvas-bar/ImagePreviewModal.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/\)\s*\|\|\s*'/)
  })
})

describe('i18n – Ersatz-Galerie ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine Fallback-Strings', () => {
    const src = read('components/canvas-bar/ReplaceGalleryModal.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/\|\|\s*'/)
  })
})

describe('i18n – Bildleiste über dem Canvas ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte', () => {
    const src = read('components/canvas-bar/ImageThumbnailBar.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/alt="[^"]+"/)
  })
})

describe('i18n – Beat-Drop ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte, Quellen kommen aus i18n', () => {
    const src = read('components/canvas-control/BeatDropSection.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/<option/)
  })
})

describe('i18n – Lauftext-Panel ohne fest verdrahtete Texte', () => {
  it('Vorlage enthält keine festen Texte und keine nativen Optionen', () => {
    const src = read('components/TickerPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/<option|Custom Fonts/)
  })
})

describe('i18n – Hintergrund-Video ohne fest verdrahtete Texte', () => {
  it('Vorlagen enthalten keine festen Texte und Titel', () => {
    for (const f of [
      'components/video-panel/BackgroundVideoControls.vue',
      'components/video-panel/BackgroundVideoItem.vue',
    ]) {
      const src = read(f)
      expect(hardcodedTemplateText(src), f).toEqual([])
      expect(src, f).not.toMatch(/title="[^"]+"/)
    }
  })
})

describe('i18n – Slideshow-Steuerung ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte, Phasen kommen aus i18n', () => {
    const src = read('components/foto-panel/slideshow/SlideshowControls.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/Einblenden|Fading/)
  })
})

describe('i18n – Ebenen-Steuerung ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und Pfeil-Glyphen', () => {
    const src = read('components/foto-panel/image-filters/LayerControls.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/[⬆⬇↑↓]/u)
  })
})

describe('i18n – Recorder-Einstellungen ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und Status-Glyphen', () => {
    const src = read('components/recorder/RecorderSettingsPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/[●○]|\{\{ mode \}\}/u)
  })
})

describe('i18n – Slideshow-Zeiten ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und native Optionen', () => {
    const src = read('components/foto-panel/slideshow/SlideshowTimingSettings.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/<option|type="checkbox"/)
  })
})

describe('i18n – Preset & Verlauf ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und native Optionen', () => {
    const src = read('components/foto-panel/image-filters/PresetAndHistory.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/<option|locale === 'de' \?/)
  })
})

describe('i18n – Bild-Upload ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte, Sprachweichen und Glyphen', () => {
    const src = read('components/foto-panel/ImageUploadSection.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale === 'de'|[✕✓]/u)
  })
})

describe('i18n – Bild-Vorschau ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und Schließen-Glyphe', () => {
    const src = read('components/foto-panel/ImagePreviewOverlay.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/✕/u)
  })
})

describe('i18n – Zurücksetzen-Bereich ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne deutsche Rückfall-Texte', () => {
    const src = read('components/canvas-control/ResetSection.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/\)\s*\|\|\s*'/)
  })
})

describe('i18n – Visualizer-Bildauswahl ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte', () => {
    expect(hardcodedTemplateText(read('components/VisualizerImagePicker.vue'))).toEqual([])
  })
})

describe('i18n – Stock-Galerie ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte, Glyphen und Sprachweichen', () => {
    const src = read('components/foto-panel/StockGallerySection.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/✓/u)
    expect(src).not.toMatch(/locale === 'de'/)
  })
})

describe('i18n – Slideshow-Bildfläche ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und Herkunfts-Glyphen', () => {
    const src = read('components/foto-panel/slideshow/SlideshowImageFill.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/[🗂⬆]/u)
  })
})

describe('i18n – Recorder-Steuerknöpfe ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte', () => {
    expect(
      hardcodedTemplateText(read('components/recorder/RecorderTransportControls.vue')),
    ).toEqual([])
  })
})

describe('i18n – Visualizer-Effekte ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne lokale Sprachtabelle', () => {
    const src = read('components/VisualizerEffectsPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/LABELS|locale\.value === 'en'/)
  })
})

describe('i18n – Text-Editor ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte, Schriftwahl ohne deutsche Einschübe', () => {
    for (const file of [
      'components/text-manager/TextEditPanel.vue',
      'components/text-manager/text-edit/TextContentSection.vue',
      'components/text-manager/text-edit/TextPositionSection.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
    expect(read('composables/useTextFonts.ts')).not.toMatch(/\(aktuell\)/)
  })
})

describe('i18n – Formular für neue Texte ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte, Sprachweichen und Emoji', () => {
    for (const file of [
      'components/text-manager/TextNewForm.vue',
      'components/text-manager/text-new-form/TextStyleSection.vue',
      'components/text-manager/text-new-form/PositionSection.vue',
    ]) {
      const src = read(file)
      expect(hardcodedTemplateText(src), file).toEqual([])
      expect(src, file).not.toMatch(/locale === 'de'/)
      expect(src.split('<script')[0], file).not.toMatch(/[💾🔄📐🖱]/u)
    }
    expect(read('composables/useTextFonts.ts')).not.toMatch(/Custom Fonts|createElement/)
  })
})

describe('i18n – Text-Audio-Reaktiv ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne Emoji an Knöpfen', () => {
    const src = read('components/text-manager/TextAudioReactivePanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/[⚡🌊🎭🔥🔄]/u)
  })
})

describe('i18n – Ebenen-Panel ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne deutsche Rückfallwerte', () => {
    const src = read('components/VisualizerLayerPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/\|\| '[^']+'\s*\}\}/)
  })
})

describe('i18n – Player-Leiste ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte', () => {
    expect(
      hardcodedTemplateText(read('components/sticky-player-bar/PlayerBarControls.vue')),
    ).toEqual([])
  })
})

describe('i18n – Text-Verzeichnis ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne Emoji', () => {
    const src = read('components/text-manager/TextDirectoryPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src.split('<script')[0]).not.toMatch(/[📋🎬↩🗑⏹]|title="Animation"/u)
  })
})

describe('i18n – Audio-Upload ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne locale-Weichen', () => {
    const src = read('components/FileUploadPanel.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src).not.toMatch(/locale === 'de'/)
  })
})

describe('i18n – Schnellstart-Anleitung ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte und ohne locale-Weichen', () => {
    const src = read('components/QuickStartGuide.vue')
    expect(hardcodedTemplateText(src)).toEqual([])
    expect(src.split('<script')[0]).not.toMatch(/lang === 'de' \?/)
  })
})

describe('i18n – Audio-Reaktive Effekte ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/AudioFxPanel.vue',
      'components/audio-fx/FxEffect.vue',
      'components/audio-fx/FxSource.vue',
      'components/audio-fx/FxRange.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})

describe('i18n – Audio-Reaktiv (Foto & Co.) ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/foto-panel/AudioReactivePanel.vue',
      'components/foto-panel/audio-reactive/AudioReactiveMaster.vue',
      'components/foto-panel/audio-reactive/AudioReactiveEffectCategory.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})

describe('i18n – Hintergrund-Gradient ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte', () => {
    expect(
      hardcodedTemplateText(read('components/canvas-control/background/BackgroundGradient.vue')),
    ).toEqual([])
  })
})

describe('i18n – Audio-Quellen-Popover ohne fest verdrahtete Texte', () => {
  it('Vorlage ohne feste Texte', () => {
    expect(
      hardcodedTemplateText(read('components/sticky-player-bar/AudioSourcePopover.vue')),
    ).toEqual([])
  })
})

describe('i18n – Visualizer LED-Text und Reaktion ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/visualizer-panel/VisualizerLedTextSection.vue',
      'components/visualizer-panel/VisualizerReactSourceSection.vue',
      'components/visualizer-panel/VisualizerReactShapeControls.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})

describe('i18n – Position & Größe und Slideshow-Farbverlauf ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/foto-panel/image-filters/PositionSizeControls.vue',
      'components/foto-panel/slideshow/SlideshowBaseGradient.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})

describe('i18n – Slideshow-Bausteine ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/foto-panel/slideshow/SlideshowAudioSourceSelect.vue',
      'components/foto-panel/slideshow/SlideshowFillAudio.vue',
      'components/foto-panel/slideshow/SlideshowImageEditor.vue',
      'components/foto-panel/slideshow/SlideshowImageFill.vue',
      'components/foto-panel/slideshow/SlideshowOrderList.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})

describe('i18n – Raster und Recorder-Mikrofon ohne fest verdrahtete Texte', () => {
  it('Vorlagen ohne feste Texte', () => {
    for (const file of [
      'components/ControlsPanel.vue',
      'components/recorder/RecorderMicSource.vue',
    ]) {
      expect(hardcodedTemplateText(read(file)), file).toEqual([])
    }
  })
})
