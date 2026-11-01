import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecorderSaveDialog from '../../../components/recorder/RecorderSaveDialog.vue'

function mountDialog(props = {}) {
  return mount(RecorderSaveDialog, {
    props: { open: true, filename: 'visualizer_2026', extension: 'mp4', ...props },
    global: { stubs: { teleport: true } },
  })
}

describe('RecorderSaveDialog', () => {
  it('rendert geschlossen nichts', () => {
    const wrapper = mountDialog({ open: false })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('belegt den Namen vor und zeigt die feste Endung', () => {
    const wrapper = mountDialog()
    expect(wrapper.get('input').element.value).toBe('visualizer_2026')
    expect(wrapper.get('.save-dialog__ext').text()).toBe('.mp4')
    expect(wrapper.find('.ui-callout').exists()).toBe(true)
  })

  it('meldet den bereinigten Namen mit Endung', async () => {
    const wrapper = mountDialog()
    await wrapper.get('input').setValue('Mein: Clip')
    await wrapper.get('[data-testid="save-dialog-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([['Mein Clip.mp4']])
  })

  it('bestätigt auch per Enter im Formular', async () => {
    const wrapper = mountDialog()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirm')).toEqual([['visualizer_2026.mp4']])
  })

  it('zeigt bei leerem Namen einen Fehler und meldet nichts', async () => {
    const wrapper = mountDialog()
    await wrapper.get('input').setValue('  ')
    await wrapper.get('[data-testid="save-dialog-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).not.toBe('')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })

  it('meldet cancel über Abbrechen und Escape', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="save-dialog-cancel"]').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })

  it('setzt Namen und Fehler beim erneuten Öffnen zurück', async () => {
    const wrapper = mountDialog()
    await wrapper.get('input').setValue('')
    await wrapper.get('[data-testid="save-dialog-confirm"]').trigger('click')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true, filename: 'neu', extension: 'gif' })
    expect(wrapper.get('input').element.value).toBe('neu')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('.save-dialog__ext').text()).toBe('.gif')
  })
})
