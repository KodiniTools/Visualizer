// @vitest-environment jsdom
// Ebenen des ausgewählten Canvas-Videos im Video-Panel. Regression: Ein Video
// lag unter Bildern und ließ sich nirgends nach vorne holen – die
// Ebenen-Knöpfe gab es nur für Bilder.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import VideoLayerControls from '../../components/video-panel/VideoLayerControls.vue'
import type { StackAction } from '../../lib/canvasObjects/mediaStack'
import { setLocale } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const F = de.foto
const V = de.videoPanel
let wrapper: VueWrapper | null

function mountControls({ blocked = [] as StackAction[], behind = false } = {}) {
  const vp = {
    selectedVideoLayerInfo: ref('2 / 3'),
    canMoveSelectedVideo: vi.fn((a: StackAction) => !blocked.includes(a)),
    moveSelectedVideo: vi.fn(),
    selectedVideoBehindVisualizer: ref(behind),
    setVideoBehindVisualizer: vi.fn(),
  }
  wrapper = mount(VideoLayerControls, {
    attachTo: document.body,
    global: { provide: { videoPanel: vp } },
  })
  return vp
}

const button = (name: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent!.trim() === name)

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

describe('VideoLayerControls', () => {
  it('zeigt Titel, Position und vier Ebenen-Knöpfe', () => {
    mountControls()
    const text = document.body.textContent!
    expect(text).toContain(F.layers)
    expect(text).toContain('2 / 3')
    for (const name of [F.bringToFront, F.moveUp, F.moveDown, F.sendToBack]) {
      expect(button(name), name).toBeTruthy()
    }
  })

  it('Knöpfe verschieben das Video im gemeinsamen Stapel', async () => {
    const vp = mountControls()
    const pairs: [string, StackAction][] = [
      [F.bringToFront, 'bringToFront'],
      [F.moveUp, 'moveUp'],
      [F.moveDown, 'moveDown'],
      [F.sendToBack, 'sendToBack'],
    ]
    for (const [name, action] of pairs) {
      button(name)!.click()
      await flushPromises()
      expect(vp.moveSelectedVideo).toHaveBeenLastCalledWith(action)
    }
  })

  it('oben angekommen: Knöpfe nach oben gesperrt', () => {
    mountControls({ blocked: ['bringToFront', 'moveUp'] })
    expect(button(F.bringToFront)!.disabled).toBe(true)
    expect(button(F.moveUp)!.disabled).toBe(true)
    expect(button(F.moveDown)!.disabled).toBe(false)
  })

  it('hinter dem Visualizer: Hinweis, warum Bilder davor liegen', async () => {
    const vp = mountControls()
    expect(document.body.textContent).not.toContain(V.behindLayerHint)
    vp.selectedVideoBehindVisualizer.value = true
    await flushPromises()
    expect(document.body.textContent).toContain(V.behindLayerHint)
    const label = [...document.body.querySelectorAll('label')].find(
      (l) => l.textContent!.trim() === V.selectedBehindVisualizer,
    )!
    label.click()
    await flushPromises()
    expect(vp.setVideoBehindVisualizer).toHaveBeenCalledWith(false)
  })

  it('englische Texte', async () => {
    await setLocale('en')
    mountControls({ behind: true })
    await flushPromises()
    expect(document.body.textContent).toContain(en.foto.layers)
    expect(document.body.textContent).toContain(en.videoPanel.behindLayerHint)
  })
})
