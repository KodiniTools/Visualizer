// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecorderDownloadActions from '../../../components/recorder/RecorderDownloadActions.vue'

describe('RecorderDownloadActions', () => {
  it('zeigt Label und Schließen-Titel, meldet download und dismiss', async () => {
    const wrapper = mount(RecorderDownloadActions, {
      props: { variant: 'mp4', label: 'MP4 herunterladen', closeTitle: 'Schließen' },
    })
    const download = wrapper.get('button.mp4-download-btn')
    expect(download.text()).toBe('MP4 herunterladen')
    expect(wrapper.get('.btn-close-conversion').attributes('title')).toBe('Schließen')
    await download.trigger('click')
    await wrapper.get('.btn-close-conversion').trigger('click')
    expect(wrapper.emitted('download')).toHaveLength(1)
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it.each([
    ['mp4', []],
    ['gif', ['gif-download-btn']],
    ['hq', ['hq-download-btn']],
    ['webm', ['webm-download-btn']],
  ])('Variante %s setzt die Farbklasse', (variant, extra) => {
    const wrapper = mount(RecorderDownloadActions, { props: { variant, label: 'x' } })
    const classes = wrapper.get('button[type="button"]').classes()
    expect(classes.filter((c) => c !== 'mp4-download-btn')).toEqual(extra)
  })
})
