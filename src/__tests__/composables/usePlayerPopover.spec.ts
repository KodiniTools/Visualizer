import { describe, it, expect, afterEach } from 'vitest'
import { usePlayerPopover, isOutsidePopoverClick } from '../../composables/usePlayerPopover'
import { stub } from '../helpers/canvasStubs'

describe('usePlayerPopover – Klickverhalten der Sticky Bar', () => {
  it('Einfachklick aktiviert die Funktion und öffnet das Fenster mittig', () => {
    const p = usePlayerPopover()
    p.onBarClick('gallery', stub({ detail: 1 }))
    expect(p.isActive('gallery')).toBe(true)
    expect(p.isOpen('gallery')).toBe(true)
    expect(p.cascadeOffset('gallery')).toMatchObject({ center: true })
    expect(Math.abs(p.cascadeOffset('gallery').x)).toBe(0)
  })

  it('Klick daneben blendet aus, Funktion bleibt aktiv; erneuter Klick öffnet wieder', () => {
    const p = usePlayerPopover()
    p.onBarClick('gallery', stub({ detail: 1 }))
    p.onBarClick('effects', stub({ detail: 1 }))
    p.hideAllPopovers()
    expect(p.isOpen('gallery')).toBe(false)
    expect(p.isOpen('effects')).toBe(false)
    expect(p.isActive('gallery')).toBe(true)
    expect(p.isActive('effects')).toBe(true)
    p.onBarClick('gallery', stub({ detail: 1 }))
    expect(p.isOpen('gallery')).toBe(true)
    expect(p.isOpen('effects')).toBe(false)
  })

  it('Einfachklick auf ein offenes Fenster lässt es offen (Tastatur: detail 0)', () => {
    const p = usePlayerPopover()
    p.onBarClick('presets', stub({ detail: 0 }))
    p.onBarClick('presets', stub({ detail: 0 }))
    expect(p.isOpen('presets')).toBe(true)
  })

  it('Doppelklick deaktiviert; dessen zweiter Klick öffnet nicht erneut', () => {
    const p = usePlayerPopover()
    // Browser-Abfolge eines Doppelklicks: click(1), click(2), dblclick
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('video', stub({ detail: 2 }))
    p.onBarDblClick('video')
    expect(p.isOpen('video')).toBe(false)
    expect(p.isActive('video')).toBe(false)
    // auch eine ausgeblendete, aktive Funktion
    p.onBarClick('video', stub({ detail: 1 }))
    p.hidePopover('video')
    p.onBarClick('video', stub({ detail: 2 }))
    expect(p.isOpen('video')).toBe(false)
    p.onBarDblClick('video')
    expect(p.isActive('video')).toBe(false)
  })

  it('Schließen-Knopf (closePopover) deaktiviert die Funktion', () => {
    const p = usePlayerPopover()
    p.openPopover('markers')
    p.closePopover('markers')
    expect(p.isActive('markers')).toBe(false)
    expect(p.isOpen('markers')).toBe(false)
  })

  it('togglePopover bleibt für externe Auslöser erhalten', () => {
    const p = usePlayerPopover()
    p.togglePopover('visualizerControls')
    expect(p.isOpen('visualizerControls')).toBe(true)
    p.togglePopover('visualizerControls')
    expect(p.isActive('visualizerControls')).toBe(false)
  })
})

describe('isOutsidePopoverClick', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function setup() {
    document.body.innerHTML = `
      <div id="app">
        <main><canvas id="cv"></canvas><button id="trigger" data-popover-trigger><span id="icon"></span></button></main>
        <div id="bar"><div class="spb-popover"><input id="inside" /></div><button id="fn"></button></div>
      </div>
      <div class="color-field__panel"><button id="teleported"></button></div>`
    return document.getElementById('bar')
  }

  it('Canvas in #app zählt als daneben', () => {
    const bar = setup()
    expect(isOutsidePopoverClick(document.getElementById('cv'), bar)).toBe(true)
  })

  it('Leiste, Fenster, Teleport-Overlays und Auslöser zählen nicht', () => {
    const bar = setup()
    for (const id of ['inside', 'fn', 'teleported', 'icon']) {
      expect(isOutsidePopoverClick(document.getElementById(id), bar), id).toBe(false)
    }
  })

  it('ignoriert Nicht-Elemente und abgehängte Knoten', () => {
    const bar = setup()
    expect(isOutsidePopoverClick(null, bar)).toBe(false)
    expect(isOutsidePopoverClick(document.createElement('div'), bar)).toBe(false)
  })
})

describe('usePlayerPopover – Fenster in den Vordergrund holen', () => {
  it('zuletzt geöffnetes Fenster liegt vorn', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('visualizer', stub({ detail: 1 }))
    expect(p.isFront('visualizer')).toBe(true)
    expect(p.isFront('video')).toBe(false)
    expect(p.zIndexOf('visualizer')).toBeGreaterThan(p.zIndexOf('video'))
  })

  it('Klick in der Leiste auf ein verdecktes offenes Fenster holt es nach vorn, ohne es zu schließen', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('visualizer', stub({ detail: 1 }))
    p.onBarClick('effects', stub({ detail: 1 }))
    p.onBarClick('video', stub({ detail: 1 }))
    expect(p.isOpen('video')).toBe(true)
    expect(p.isFront('video')).toBe(true)
    expect(p.stackOrder.value).toEqual(['visualizer', 'effects', 'video'])
    // Kaskadenposition (Öffnungsreihenfolge) bleibt unverändert.
    expect(p.openPopovers.value).toEqual(['video', 'visualizer', 'effects'])
  })

  it('zweiter Klick eines Doppelklicks ändert die Reihenfolge nicht', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('effects', stub({ detail: 1 }))
    p.onBarClick('video', stub({ detail: 2 }))
    expect(p.isFront('effects')).toBe(true)
  })

  it('bringToFront ignoriert ausgeblendete Fenster', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.bringToFront('effects')
    expect(p.stackOrder.value).toEqual(['video'])
    expect(p.zIndexOf('effects')).toBe(0)
  })

  it('Schließen, Ausblenden und Klick daneben räumen die Reihenfolge auf', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('effects', stub({ detail: 1 }))
    p.onBarClick('gallery', stub({ detail: 1 }))
    p.onBarDblClick('gallery')
    expect(p.isFront('effects')).toBe(true)
    p.hidePopover('effects')
    expect(p.isFront('video')).toBe(true)
    p.hideAllPopovers()
    expect(p.stackOrder.value).toEqual([])
    p.onBarClick('effects', stub({ detail: 1 }))
    expect(p.isFront('effects')).toBe(true)
  })

  it('cascadeOffset liefert die Stapel-Anbindung für v-popover-drag', () => {
    const p = usePlayerPopover()
    p.onBarClick('video', stub({ detail: 1 }))
    p.onBarClick('effects', stub({ detail: 1 }))
    const { stack } = p.cascadeOffset('video')
    expect(stack.isFront()).toBe(false)
    stack.raise()
    expect(stack.isFront()).toBe(true)
    expect(stack.zIndex()).toBe(2)
  })
})
