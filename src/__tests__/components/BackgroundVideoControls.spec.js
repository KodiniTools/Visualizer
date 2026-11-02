// @vitest-environment jsdom
// Charakterisierung der Hintergrund-Video-Steuerung (Video-Popover). Zugriff
// über Texte, Namen und Werte statt CSS-Klassen, damit die Tests den Wechsel
// auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import BackgroundVideoControls from '../../components/video-panel/BackgroundVideoControls.vue'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const V = de.videoPanel
let wrapper

const AudioStub = defineComponent({
  name: 'VideoAudioReactive',
  props: { video: { type: Object, default: null }, label: { type: String, default: '' } },
  setup: (props) => () => h('div', { 'data-audio': props.label }),
})

function makePanel({ bg = true, ws = false } = {}) {
  return {
    hasVideoBackground: ref(bg || ws),
    videoBackground: ref(bg ? { id: 'bg' } : null),
    workspaceVideoBackground: ref(ws ? { id: 'ws' } : null),
    isVideoBackgroundPlaying: ref(false),
    isWsVideoBackgroundPlaying: ref(true),
    videoBackgroundTime: ref(10),
    videoBackgroundDuration: ref(60),
    wsVideoBackgroundTime: ref(5),
    wsVideoBackgroundDuration: ref(30),
    videoBackgroundVolume: ref(0.8),
    wsVideoBackgroundVolume: ref(0.5),
    toggleVideoBackground: vi.fn(),
    toggleWsVideoBackground: vi.fn(),
    seekVideoBackground: vi.fn(),
    seekBackwardBg: vi.fn(),
    seekForwardBg: vi.fn(),
    seekWsVideoBackground: vi.fn(),
    seekBackwardWsBg: vi.fn(),
    seekForwardWsBg: vi.fn(),
    updateBgVideoVolume: vi.fn(),
    updateWsBgVideoVolume: vi.fn(),
    removeVideoBackground: vi.fn(),
    removeWsVideoBackground: vi.fn(),
    formatTime: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
  }
}

function mountControls(opts) {
  const panel = makePanel(opts)
  wrapper = mount(BackgroundVideoControls, {
    attachTo: document.body,
    global: { provide: { videoPanel: panel }, stubs: { VideoAudioReactive: AudioStub } },
  })
  return panel
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const root = () => wrapper.element
const text = () => (root().textContent || '').replace(/\s+/g, ' ')

/** Abschnitt eines Videos über seine Beschriftung (kleinster Block mit eigenen Knöpfen). */
function item(label) {
  const blocks = [...root().querySelectorAll('div, section')].filter(
    (el) => el.textContent.includes(label) && el.querySelector('button'),
  )
  return blocks.find((b) => !blocks.some((o) => o !== b && b.contains(o)))
}

/** Knopf über Namen: alter title oder neues aria-label. */
const btn = (scope, ...names) =>
  [...scope.querySelectorAll('button')].find((b) =>
    names.includes(b.getAttribute('aria-label') || b.getAttribute('title')),
  )
const ranges = (scope) => [...scope.querySelectorAll('input[type="range"]')]

describe('Hintergrund-Video – Anzeige', () => {
  it('ohne Hintergrund-Video nichts', () => {
    mountControls({ bg: false, ws: false })
    expect(text()).toBe('')
  })

  it('nur Hintergrund: Titel, Beschriftung, Zeiten, Lautstärke', () => {
    mountControls({ bg: true })
    expect(text()).toContain(V.bgVideoTitle)
    expect(text()).toContain(V.bgLabel)
    expect(text()).not.toContain(V.wsBgLabel)
    expect(text()).toContain('0:10')
    expect(text()).toContain('1:00')
    expect(text()).toContain('80%')
    expect(ranges(root()).map((r) => r.value)).toEqual(['10', '0.8'])
  })

  it('beide: zwei Abschnitte, Audio-Reaktiv je Video mit Beschriftung', () => {
    mountControls({ bg: true, ws: true })
    expect(text()).toContain(V.wsBgLabel)
    const audio = [...root().querySelectorAll('[data-audio]')].map((e) => e.dataset.audio)
    expect(audio).toEqual([V.bgLabel, V.wsBgLabel])
    expect(text()).toContain('50%')
  })
})

describe('Hintergrund-Video – Bedienung', () => {
  it('Abspielen, Spulen, Entfernen (Hintergrund)', () => {
    const p = mountControls({ bg: true })
    const scope = item(V.bgLabel)
    btn(scope, 'Play', V.play).click()
    expect(p.toggleVideoBackground).toHaveBeenCalledTimes(1)
    btn(scope, '-5s', V.seekBack5).click()
    expect(p.seekBackwardBg).toHaveBeenCalledWith(5)
    btn(scope, '+5s', V.seekForward5).click()
    expect(p.seekForwardBg).toHaveBeenCalledWith(5)
    btn(scope, de.common.remove).click()
    expect(p.removeVideoBackground).toHaveBeenCalledTimes(1)
  })

  it('Workspace läuft: Pause-Knopf, eigene Handler', () => {
    const p = mountControls({ bg: false, ws: true })
    const scope = item(V.wsBgLabel)
    btn(scope, 'Pause', V.pause).click()
    expect(p.toggleWsVideoBackground).toHaveBeenCalledTimes(1)
    btn(scope, '-5s', V.seekBack5).click()
    expect(p.seekBackwardWsBg).toHaveBeenCalledWith(5)
    btn(scope, '+5s', V.seekForward5).click()
    expect(p.seekForwardWsBg).toHaveBeenCalledWith(5)
    btn(scope, de.common.remove).click()
    expect(p.removeWsVideoBackground).toHaveBeenCalledTimes(1)
  })

  it('Zeit- und Lautstärke-Regler melden Werte', async () => {
    const p = mountControls({ bg: true })
    const [seek, volume] = ranges(root())
    seek.value = '20'
    seek.dispatchEvent(new Event('input'))
    volume.value = '0.3'
    volume.dispatchEvent(new Event('input'))
    await nextTick()
    expect(p.seekVideoBackground).toHaveBeenCalledWith(20)
    expect(p.updateBgVideoVolume).toHaveBeenCalledWith(0.3)
  })

  it('Status wechselt mit dem Abspielzustand', async () => {
    const p = mountControls({ bg: true })
    const scope = () => item(V.bgLabel)
    expect(btn(scope(), 'Play', V.play)).toBeTruthy()
    p.isVideoBackgroundPlaying.value = true
    await nextTick()
    expect(btn(scope(), 'Pause', V.pause)).toBeTruthy()
  })
})

describe('Hintergrund-Video – Sprache', () => {
  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountControls({ bg: true, ws: true })
      expect(text()).toContain(en.videoPanel.bgVideoTitle)
      expect(text()).toContain(en.videoPanel.wsBgLabel)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Hintergrund-Video – Ui-Bausteine', () => {
  it('Knöpfe sind Ui-Icon-Buttons mit übersetzten Namen, keine Emoji-Glyphen', () => {
    mountControls({ bg: true })
    const scope = item(V.bgLabel)
    const buttons = [...scope.querySelectorAll('button')].slice(0, 4)
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      V.play,
      V.seekBack5,
      V.seekForward5,
      de.common.remove,
    ])
    for (const b of buttons) expect(b.classList.contains('ui-icon-button')).toBe(true)
    expect(text()).not.toMatch(/[⏪⏩⏸▶✕]/u)
  })

  it('Status als Text, Lautstärke als Standard-Regler mit Label', () => {
    mountControls({ bg: true, ws: true })
    expect(item(V.bgLabel).textContent).toContain(V.paused)
    expect(item(V.wsBgLabel).textContent).toContain(V.playing)
    const labels = [...root().querySelectorAll('.control-group.slider > label')].map((l) =>
      l.textContent.trim(),
    )
    expect(labels).toEqual([V.volume, V.volume])
  })

  it('beide Videos teilen sich eine Zeilen-Komponente', () => {
    mountControls({ bg: true, ws: true })
    expect(wrapper.findAllComponents({ name: 'BackgroundVideoItem' })).toHaveLength(2)
  })
})
