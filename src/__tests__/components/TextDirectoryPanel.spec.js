import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextDirectoryPanel from '../../components/text-manager/TextDirectoryPanel.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const items = [
  { id: 1, number: 1, content: 'Auf dem Canvas', animated: false, offCanvas: false },
  { id: 2, number: 2, content: 'Snovi moji', animated: true, offCanvas: true },
]

function mountPanel(props = {}) {
  return mount(TextDirectoryPanel, { props: { items, activeId: null, ...props } })
}

describe('TextDirectoryPanel – vom Canvas entfernte Texte', () => {
  it('zeigt entfernte Texte mit Badge und ohne Markier-Button', () => {
    const w = mountPanel()
    const rows = w.findAll('.text-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.off-canvas-badge').exists()).toBe(false)
    expect(rows[1].classes()).toContain('text-row--off-canvas')
    expect(rows[1].find('.off-canvas-badge').exists()).toBe(true)
    expect(rows[1].find('button.text-item').exists()).toBe(false)
    expect(rows[1].text()).toContain('Snovi moji')
  })

  it('markiert nur Texte auf dem Canvas', async () => {
    const w = mountPanel()
    await w.findAll('.text-row')[0].find('button.text-item').trigger('click')
    expect(w.emitted('select')).toEqual([[1]])
    await w.findAll('.text-row')[1].find('.text-item').trigger('click')
    expect(w.emitted('select')).toHaveLength(1)
  })

  it('holt entfernte Texte zurück auf den Canvas', async () => {
    const w = mountPanel()
    expect(w.findAll('.text-row')[0].find('[data-test="return-to-canvas"]').exists()).toBe(false)
    await w.findAll('.text-row')[1].find('[data-test="return-to-canvas"]').trigger('click')
    expect(w.emitted('return-to-canvas')).toEqual([[2]])
  })

  it('löscht Texte endgültig aus dem Verzeichnis', async () => {
    const w = mountPanel()
    const del = w.findAll('[data-test="delete-from-directory"]')
    expect(del).toHaveLength(2)
    await del[1].trigger('click')
    await del[0].trigger('click')
    expect(w.emitted('delete')).toEqual([[2], [1]])
  })

  it('zeigt den Neu-Start-Button nicht für entfernte Texte', () => {
    const w = mountPanel({ activeId: 2 })
    expect(w.find('.play-btn').exists()).toBe(false)
  })
})

// Charakterisierung der Bedienelemente: Reihenwiedergabe, globale
// Anzeigedauer, Neu-Start. Zugriff über Titel, Beschriftungen und Rollen,
// damit die Tests den Wechsel auf die Ui-Bausteine überstehen.
const T = de.textManager
const byTitle = (w, title) => w.findAll('button').find((b) => b.attributes('title') === title)

/** Schalter „Globale Anzeigedauer“: Checkbox im Label oder Switch mit Label. */
function globalToggle(w) {
  const label = w.findAll('label').find((l) => l.text().trim() === T.globalDuration)
  const cb = label?.find('input[type="checkbox"]')
  if (cb?.exists()) return cb
  return w.find(`#${label.attributes('for')}`)
}

describe('TextDirectoryPanel – Bedienelemente', () => {
  it('Alle abspielen und Stoppen', async () => {
    const w = mountPanel()
    await byTitle(w, T.playAllTexts).trigger('click')
    expect(w.emitted('play-all')).toHaveLength(1)
    await w.setProps({ sequencePlaying: true })
    expect(byTitle(w, T.playAllTexts)).toBeFalsy()
    await byTitle(w, T.stopPlayback).trigger('click')
    expect(w.emitted('stop-all')).toHaveLength(1)
  })

  it('Globale Anzeigedauer schaltet den Regler', async () => {
    const w = mountPanel({
      'onUpdate:globalDurationEnabled': (v) => w.setProps({ globalDurationEnabled: v }),
    })
    expect(w.text()).not.toContain(T.globalDurationHint)
    const toggle = globalToggle(w)
    if (toggle.attributes('type') === 'checkbox') await toggle.setValue(true)
    else await toggle.trigger('click')
    expect(w.emitted('update:globalDurationEnabled')).toEqual([[true]])
    expect(w.text()).toContain(T.globalDurationHint)
    expect(w.find('input[type="range"]').exists()).toBe(true)
  })

  it('Neu-Start nur für den aktiven, animierten Text', async () => {
    const list = [{ id: 3, number: 1, content: 'Hallo', animated: true, offCanvas: false }]
    const w = mountPanel({ items: list, activeId: 3 })
    await byTitle(w, T.restartAnimation).trigger('click')
    expect(w.emitted('restart')).toEqual([[3]])
    await w.setProps({ activeId: null })
    expect(byTitle(w, T.restartAnimation)).toBeFalsy()
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      const w = mountPanel()
      expect(w.text()).toContain(en.textManager.textDirectory)
      expect(byTitle(w, en.textManager.playAllTexts)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('TextDirectoryPanel – Ui-Bausteine', () => {
  it('Switch, Ui-Icon-Buttons und keine Emoji', () => {
    const w = mountPanel({ items: [items[0], { ...items[1], offCanvas: false }], activeId: 2 })
    expect(globalToggle(w).attributes('role')).toBe('switch')
    for (const title of [T.playAllTexts, T.restartAnimation]) {
      expect(byTitle(w, title).classes(), title).toContain('ui-icon-button')
    }
    expect(w.text()).not.toMatch(/[📋🎬↩🗑▶⏹]/u)
    expect(w.find('button.text-item.active').attributes('aria-pressed')).toBe('true')
  })
})
