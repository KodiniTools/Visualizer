import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecorderConversionProgress from '../../../components/recorder/RecorderConversionProgress.vue'

describe('RecorderConversionProgress', () => {
  it('Download ist ein Button, der nur download meldet (kein direkter Link)', async () => {
    const wrapper = mount(RecorderConversionProgress, {
      props: { variant: 'mp4', status: 'completed', progress: 100, downloadUrl: '/files/a.mp4' },
    })
    const button = wrapper.get('button.mp4-download-btn')
    expect(button.attributes('type')).toBe('button')
    expect(wrapper.find('a[download]').exists()).toBe(false)
    await button.trigger('click')
    expect(wrapper.emitted('download')).toHaveLength(1)
  })

  it('zeigt keinen Download ohne URL', () => {
    const wrapper = mount(RecorderConversionProgress, {
      props: { variant: 'mp4', status: 'completed', progress: 100, downloadUrl: null },
    })
    expect(wrapper.find('.mp4-download-btn').exists()).toBe(false)
  })
})
