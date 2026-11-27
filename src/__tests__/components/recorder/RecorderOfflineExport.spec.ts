// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import RecorderOfflineExport from '../../../components/recorder/RecorderOfflineExport.vue'
import { useI18n } from '../../../lib/i18n'
import de from '../../../lib/i18n/de'
import en from '../../../lib/i18n/en'

const O = de.recorder.offline
let wrapper: VueWrapper | null = null

function mountExport(props: Record<string, unknown> = {}) {
  wrapper = mount(RecorderOfflineExport, {
    attachTo: document.body,
    props: { status: '', canStart: true, isSupported: true, hasTrack: true, ...props },
  })
  return wrapper
}

const dialog = () => document.body.querySelector('[role="dialog"]')

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await useI18n().setLocale('de')
})

describe('RecorderOfflineExport', () => {
  it('zeigt Titel, Hinweis und den Start-Knopf', async () => {
    const w = mountExport()
    expect(w.text()).toContain(O.title)
    expect(w.text()).toContain(O.info)
    const button = w.get('button.offline-start')
    expect(button.text()).toContain(O.start)
    await button.trigger('click')
    expect(w.emitted('start')).toHaveLength(1)
    expect(dialog()).toBeNull()
  })

  it('Start gesperrt mit Hinweis: ohne Track bzw. ohne WebCodecs', () => {
    const noTrack = mountExport({ canStart: false, hasTrack: false })
    expect(noTrack.get('button.offline-start').attributes('disabled')).toBeDefined()
    expect(noTrack.get('.offline-hint').text()).toBe(O.errorNoTrack)
    noTrack.unmount()

    const unsupported = mountExport({ canStart: false, isSupported: false })
    expect(unsupported.get('.offline-hint').text()).toBe(O.errorUnsupported)
  })

  it('zeigt den Fortschritt im modalen Dialog; Abbrechen meldet cancel', async () => {
    const w = mountExport({
      status: 'rendering',
      progress: 42,
      frame: 126,
      totalFrames: 300,
      renderedSeconds: 4.2,
      totalSeconds: 10,
      speed: 2.345,
    })
    const d = dialog()!
    expect(d.textContent).toContain(O.dialogTitle)
    expect(d.textContent).toContain('Bild 126 von 300')
    expect(d.textContent).toContain('42%')
    expect(d.textContent).toContain('0:04 von 0:10')
    expect(d.textContent).toContain('2.3× Echtzeit')
    expect(d.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('42')

    const cancel = [...d.querySelectorAll('button')].find((b) => b.textContent?.trim() === O.cancel)
    cancel!.click()
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('Vorbereiten und Abschließen haben eigene Texte', async () => {
    const w = mountExport({ status: 'preparing' })
    expect(dialog()!.textContent).toContain(O.preparing)
    await w.setProps({ status: 'finalizing' })
    expect(dialog()!.textContent).toContain(O.finalizing)
  })

  it('fertig: Speichern und Schließen', async () => {
    const w = mountExport({ status: 'completed' })
    expect(w.find('button.offline-start').exists()).toBe(false)
    expect(w.get('.offline-done').text()).toBe(O.completed)
    await w.get('.mp4-download-btn').trigger('click')
    expect(w.emitted('download')).toHaveLength(1)
    await w.get('.btn-close-conversion').trigger('click')
    expect(w.emitted('dismiss')).toHaveLength(1)
  })

  it('Fehler: Meldung je Code, Schließen meldet dismiss', async () => {
    const w = mountExport({ status: 'error', errorCode: 'too-long' })
    expect(w.text()).toContain(O.errorTitle)
    expect(w.text()).toContain('länger als 10 Minuten')
    const close = w.findAll('.offline-error button').at(-1)!
    await close.trigger('click')
    expect(w.emitted('dismiss')).toHaveLength(1)
  })

  it('Englisch', async () => {
    await useI18n().setLocale('en')
    const w = mountExport({ status: 'rendering', frame: 3, totalFrames: 9, speed: 1.5 })
    expect(w.text()).toContain(en.recorder.offline.title)
    expect(dialog()!.textContent).toContain('Frame 3 of 9')
    expect(dialog()!.textContent).toContain('1.5× real time')
  })
})
