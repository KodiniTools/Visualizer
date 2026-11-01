import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextDirectoryPanel from '../../components/text-manager/TextDirectoryPanel.vue'

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
