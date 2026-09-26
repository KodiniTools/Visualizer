/**
 * Slideshow-Fenster in der Sticky-Bar:
 * - Button direkt nach Undo/Redo (+ Trenner), schaltet das Fenster, Badge
 * - Fenster = Teleport-Ziel mit Hinweis, solange das Panel leer ist
 * - Panel meldet seine Sichtbarkeit (für den Hinweis)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, defineComponent, h, Teleport } from 'vue'
import PlayerBarControls from '../../components/sticky-player-bar/PlayerBarControls.vue'
import SlideshowPopover from '../../components/sticky-player-bar/SlideshowPopover.vue'
import SlideshowPanel from '../../components/foto-panel/SlideshowPanel.vue'
import { usePlayerPopover } from '../../composables/usePlayerPopover.js'
import {
  SLIDESHOW_POPOVER_TARGET_ID,
  useSlideshowPopover,
} from '../../composables/useSlideshowPopover.js'

let wrappers = []
let pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  const s = useSlideshowPopover()
  Object.assign(s, { panelVisible: false, imageCount: 0, active: false })
})
afterEach(() => {
  wrappers.forEach((w) => w.unmount())
  wrappers = []
  document.body.innerHTML = ''
})

function playerBar(popover = usePlayerPopover()) {
  return {
    popover,
    playMode: { cyclePlayMode: vi.fn(), playModeLabel: '' },
    markers: { getMarkerPosition: () => 0, seekToMarker: vi.fn() },
  }
}

function mountControls(popover) {
  const w = mount(PlayerBarControls, {
    global: { plugins: [pinia], provide: { playerBar: playerBar(popover) } },
  })
  wrappers.push(w)
  return w
}

describe('Sticky-Bar – Slideshow-Button', () => {
  it('sitzt direkt nach Undo/Redo und dem Trenner', () => {
    const w = mountControls()
    const first = w.findAll('.spb-actions > *').slice(0, 4)
    expect(first[0].attributes('data-testid')).toBe('history-undo')
    expect(first[1].attributes('data-testid')).toBe('history-redo')
    expect(first[2].classes()).toContain('spb-divider')
    expect(first[3].attributes('data-testid')).toBe('open-slideshow')
    expect(first[3].attributes('title')).toBe('Bild-Slideshow')
  })

  it('schaltet das Fenster und zeigt den aktiven Zustand', async () => {
    const popover = usePlayerPopover()
    const w = mountControls(popover)
    const btn = w.find('[data-testid="open-slideshow"]')
    await btn.trigger('click')
    expect(popover.isOpen('slideshow')).toBe(true)
    expect(btn.classes()).toContain('active')
    await btn.trigger('click')
    expect(popover.isOpen('slideshow')).toBe(false)
    expect(btn.classes()).not.toContain('active')
  })

  it('Badge ab 2 Bildern', async () => {
    const w = mountControls()
    const state = useSlideshowPopover()
    const badge = () => w.find('[data-testid="open-slideshow"] .spb-badge')
    state.imageCount = 1
    await nextTick()
    expect(badge().exists()).toBe(false)
    state.imageCount = 3
    await nextTick()
    expect(badge().text()).toBe('3')
  })
})

describe('Sticky-Bar – Slideshow-Fenster', () => {
  function mountPopover(popover = usePlayerPopover()) {
    const w = mount(SlideshowPopover, {
      attachTo: document.body,
      global: { plugins: [pinia], provide: { playerBar: playerBar(popover) } },
    })
    wrappers.push(w)
    return { w, popover }
  }

  it('enthält das Teleport-Ziel und den Hinweis, solange das Panel leer ist', async () => {
    const { w } = mountPopover()
    expect(document.getElementById(SLIDESHOW_POPOVER_TARGET_ID)).not.toBeNull()
    expect(w.find('.spb-empty-hint').text()).toContain('mindestens 2 Bilder')
    useSlideshowPopover().panelVisible = true
    await nextTick()
    expect(w.find('.spb-empty-hint').exists()).toBe(false)
  })

  it('Schließen-Knopf schließt nur dieses Fenster', async () => {
    const popover = usePlayerPopover()
    popover.openPopover('slideshow')
    popover.openPopover('video')
    const { w } = mountPopover(popover)
    await w.find('.spb-popover-close').trigger('click')
    expect(popover.isOpen('slideshow')).toBe(false)
    expect(popover.isOpen('video')).toBe(true)
  })

  it('teleportierter Inhalt landet im Fenster und bleibt beim Schließen gemountet', async () => {
    const popover = usePlayerPopover()
    mountPopover(popover)
    const target = document.getElementById(SLIDESHOW_POPOVER_TARGET_ID)
    let unmounted = 0
    const Content = defineComponent({
      unmounted: () => unmounted++,
      render: () => h('div', { class: 'teleported' }, 'Inhalt'),
    })
    const host = mount(
      defineComponent({ render: () => h(Teleport, { to: target }, [h(Content)]) }),
      { attachTo: document.body },
    )
    wrappers.push(host)
    expect(target.querySelector('.teleported')).not.toBeNull()
    popover.closePopover('slideshow')
    await nextTick()
    expect(unmounted).toBe(0)
  })
})

describe('SlideshowPanel – Sichtbarkeit für das Fenster', () => {
  const img = (id) => ({ id, name: `${id}.png`, img: { src: '', width: 10, height: 10 } })

  it('meldet sofort und bei Änderung', async () => {
    const w = mount(SlideshowPanel, { props: { images: [img('a')] }, global: { plugins: [pinia] } })
    wrappers.push(w)
    expect(w.emitted('visibility-change')[0]).toEqual([false])
    await w.setProps({ images: [img('a'), img('b')] })
    expect(w.emitted('visibility-change').at(-1)).toEqual([true])
    expect(w.find('.slideshow-panel').exists()).toBe(true)
  })
})
