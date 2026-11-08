import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import de from '../../lib/i18n/de.js'
import VisualizerLedTextSection from '../../components/visualizer-panel/VisualizerLedTextSection.vue'
import VisualizerControlsPanel from '../../components/VisualizerControlsPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore'

let wrapper

afterEach(() => wrapper?.unmount())

describe('VisualizerLedTextSection', () => {
  it('LED-Text: Textfeld meldet Änderungen', async () => {
    wrapper = mount(VisualizerLedTextSection, {
      props: { visualizerId: 'glLedText', config: { ledText: 'HI' } },
    })
    const area = wrapper.find('textarea')
    expect(area.element.value).toBe('HI')
    await area.setValue('PARTY')
    expect(wrapper.emitted('update').at(-1)).toEqual(['ledText', 'PARTY'])
    // Kein Modus-Umschalter beim reinen Text
    expect(wrapper.find('.led-text__seg').exists()).toBe(false)
  })

  it('LED-Zahlen: Modus wählen, Countdown-Ziel als ISO-Zeit melden', async () => {
    wrapper = mount(VisualizerLedTextSection, {
      props: { visualizerId: 'glLedNumber', config: { ledNumberMode: 'countdown' } },
    })
    const buttons = wrapper.findAll('.led-text__seg-btn')
    expect(buttons).toHaveLength(3)
    await buttons[1].trigger('click')
    expect(wrapper.emitted('update').at(-1)).toEqual(['ledNumberMode', 'clock'])

    const input = wrapper.find('input[type="datetime-local"]')
    await input.setValue('2026-12-31T23:30')
    const [field, value] = wrapper.emitted('update').at(-1)
    expect(field).toBe('ledCountdownTarget')
    expect(new Date(value).getTime()).toBe(new Date('2026-12-31T23:30').getTime())
    expect(wrapper.find('.led-text__preview').text()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('erscheint im Steuerungs-Popover nur für die LED-Visualizer', async () => {
    setActivePinia(createPinia())
    const store = useVisualizerStore()
    store.selectVisualizer('glBars')
    wrapper = mount(VisualizerControlsPanel, {
      global: { stubs: { VisualizerImagePicker: true, HelpTooltip: true } },
    })
    expect(wrapper.findComponent(VisualizerLedTextSection).exists()).toBe(false)
    store.selectVisualizer('glLedText')
    await wrapper.vm.$nextTick()
    const section = wrapper.findComponent(VisualizerLedTextSection)
    expect(section.exists()).toBe(true)
    await section.find('textarea').setValue('Grüße')
    expect(store.ledText).toBe('Grüße')
  })

  it('Uhrzeit: Zeitzone und Sekunden melden Änderungen', async () => {
    wrapper = mount(VisualizerLedTextSection, {
      props: {
        visualizerId: 'glLedNumber',
        config: { ledNumberMode: 'clock', ledNumberSeconds: true },
      },
      attachTo: document.body,
    })
    const select = wrapper.find('select')
    const options = select.findAll('option')
    expect(options[0].element.value).toBe('')
    expect(options[0].text()).toBe(de.visualizer.led.timeZoneLocal)
    expect(options.map((o) => o.text())).toContain('Europe/Zurich')
    await select.setValue('Europe/Berlin')
    expect(wrapper.emitted('update').at(-1)).toEqual(['ledNumberTimeZone', 'Europe/Berlin'])

    expect(wrapper.text()).toContain(de.visualizer.led.showSeconds)
    const seconds = [
      ...wrapper.element.querySelectorAll('input[type="checkbox"], [role="switch"]'),
    ][0]
    const on = (el) =>
      el.type === 'checkbox' ? el.checked : el.getAttribute('aria-checked') === 'true'
    expect(on(seconds)).toBe(true)
    if (seconds.type === 'checkbox') {
      seconds.checked = false
      seconds.dispatchEvent(new Event('change'))
    } else seconds.click()
    expect(wrapper.emitted('update').at(-1)).toEqual(['ledNumberSeconds', false])
    wrapper.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('Ui-Bausteine: Sekunden als UiSwitch, Zeitzone mit Label', async () => {
    wrapper = mount(VisualizerLedTextSection, {
      props: { visualizerId: 'glLedNumber', config: { ledNumberMode: 'clock' } },
      attachTo: document.body,
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    const sw = wrapper.find('[role="switch"]')
    expect(document.querySelector(`label[for="${sw.element.id}"]`).textContent.trim()).toBe(
      de.visualizer.led.showSeconds,
    )
    const select = wrapper.find('select').element
    expect(document.querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(
      de.visualizer.led.timeZone,
    )
    wrapper.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })
})
