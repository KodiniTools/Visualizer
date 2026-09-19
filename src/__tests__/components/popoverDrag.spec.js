import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

// Popover-Attrappe mit Header, wie sie die Sticky-Player-Bar rendert.
const Popover = defineComponent({
  directives: { popoverDrag: vPopoverDrag },
  template: `
    <div v-popover-drag class="spb-popover spb-popover-testpop" data-v-abc123="">
      <div class="spb-popover-header"><span>Kopf</span></div>
      <div class="body">Inhalt</div>
    </div>`,
})

let wrapper
let el

function pointer(target, type, x, y) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  })
  target.dispatchEvent(ev)
}

function drag(handle, fromX, fromY, toX, toY) {
  pointer(handle, 'pointerdown', fromX, fromY)
  pointer(window, 'pointermove', toX, toY)
  pointer(window, 'pointerup', toX, toY)
}

beforeEach(() => {
  localStorage.clear()
  wrapper = mount(Popover, { attachTo: document.body })
  el = wrapper.element
})

afterEach(() => wrapper?.unmount())

describe('v-popover-drag – Größe per Rand ziehen', () => {
  it('erzeugt Griffe für linken, rechten, unteren Rand und untere Ecken mit Scope-Attribut', () => {
    const handles = el.querySelectorAll('.spb-resize-handle')
    expect(handles).toHaveLength(5)
    const dirs = Array.from(handles).map((h) =>
      h.className.replace('spb-resize-handle spb-resize-', ''),
    )
    expect(dirs.sort()).toEqual(['e', 's', 'se', 'sw', 'w'])
    expect(handles[0].hasAttribute('data-v-abc123')).toBe(true)
  })

  it('vergrößert die Breite beim Ziehen des linken Rands nach links (jsdom: Basis 340px)', () => {
    drag(el.querySelector('.spb-resize-w'), 100, 300, 20, 300)
    expect(el.style.width).toBe('420px')
    expect(el.style.height).toBe('')
  })

  it('vergrößert Breite und Höhe über die untere rechte Ecke', () => {
    drag(el.querySelector('.spb-resize-se'), 400, 500, 460, 580)
    expect(el.style.width).toBe('400px')
    expect(el.style.height).toBe('480px')
  })

  it('hält Mindest- und Höchstgröße ein', () => {
    drag(el.querySelector('.spb-resize-w'), 100, 300, 900, 300) // sehr schmal
    expect(el.style.width).toBe('260px')
    drag(el.querySelector('.spb-resize-e'), 100, 300, 5000, 300) // sehr breit
    expect(parseInt(el.style.width, 10)).toBe(window.innerWidth - 16)
    drag(el.querySelector('.spb-resize-s'), 100, 300, 100, -5000) // sehr niedrig
    expect(el.style.height).toBe('160px')
  })

  it('speichert die Größe pro Popover und stellt sie beim nächsten Öffnen wieder her', () => {
    drag(el.querySelector('.spb-resize-se'), 400, 500, 450, 560)
    expect(JSON.parse(localStorage.getItem('spb-popover-size:testpop'))).toEqual({
      width: 390,
      height: 460,
    })

    wrapper.unmount()
    wrapper = mount(Popover, { attachTo: document.body })
    expect(wrapper.element.style.width).toBe('390px')
    expect(wrapper.element.style.height).toBe('460px')
  })

  it('setzt die Größe per Doppelklick auf einen Griff zurück', () => {
    drag(el.querySelector('.spb-resize-e'), 100, 300, 200, 300)
    expect(el.style.width).toBe('440px')
    el.querySelector('.spb-resize-e').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(el.style.width).toBe('')
    expect(localStorage.getItem('spb-popover-size:testpop')).toBeNull()
  })

  it('räumt Griffe und Body-Styles beim Unmount auf', () => {
    pointer(el.querySelector('.spb-resize-e'), 'pointerdown', 100, 300)
    expect(document.body.style.userSelect).toBe('none')
    wrapper.unmount()
    expect(document.body.style.userSelect).toBe('')
    expect(document.querySelectorAll('.spb-resize-handle')).toHaveLength(0)
    wrapper = null
  })
})
