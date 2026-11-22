import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CUSTOM_FONTS } from '../../lib/fonts'

const FONT_DIR = join(__dirname, '../../../public/fonts')

describe('CUSTOM_FONTS', () => {
  it('bietet jede Schriftdatei aus public/fonts im Textmanager an (Kodini: alle 132)', () => {
    const files = readdirSync(FONT_DIR)
      .filter((f) => f.endsWith('.woff2'))
      .sort()
    const listed = CUSTOM_FONTS.map((f) => f.file).sort()
    expect(listed).toEqual(files)
    expect(listed).toHaveLength(132)
  })

  it('hat eindeutige Namen', () => {
    const names = CUSTOM_FONTS.map((f) => f.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
