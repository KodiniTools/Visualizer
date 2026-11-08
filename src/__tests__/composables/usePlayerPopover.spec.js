import { describe, it, expect, afterEach } from 'vitest'
import { usePlayerPopover, isOutsidePopoverClick } from '../../composables/usePlayerPopover'

describe('usePlayerPopover – Klickverhalten der Sticky Bar', () => {
  it('Einfachklick aktiviert die Funktion und öffnet das Fenster mittig', () => {
    const p = usePlayerPopover()
    p.onBarClick('gallery', { detail: 1 })
    expect(p.isActive('gallery')).toBe(true)
    expect(p.isOpen('gallery')).toBe(true)
    expect(p.cascadeOffset('gallery')).toMatchObject({ center: true })
    expect(Math.abs(p.cascadeOffset('gallery').x)).toBe(0)
  })

  it('Klick daneben blendet aus, Funktion bleibt aktiv; erneuter Klick öffnet wieder', () => {
    const p = usePlayerPopover()
    p.onBarClick('gallery', { detail: 1 })
    p.onBarClick('effects', { detail: 1 })
    p.hideAllPopovers()
    expect(p.isOpen('gallery')).toBe(false)
    expect(p.isOpen('effects')).toBe(false)
    expect(p.isActive('gallery')).toBe(true)
    expect(p.isActive('effects')).toBe(true)
    p.onBarClick('gallery', { detail: 1 })
    expect(p.isOpen('gallery')).toBe(true)
    expect(p.isOpen('effects')).toBe(false)
  })

  it('Einfachklick auf ein offenes Fenster lässt es offen (Tastatur: detail 0)', () => {
    const p = usePlayerPopover()
    p.onBarClick('presets', { detail: 0 })
    p.onBarClick('presets', { detail: 0 })
    expect(p.isOpen('presets')).toBe(true)
  })

  it('Doppelklick deaktiviert; dessen zweiter Klick öffnet nicht erneut', () => {
    const p = usePlayerPopover()
    // Browser-Abfolge eines Doppelklicks: click(1), click(2), dblclick
    p.onBarClick('video', { detail: 1 })
    p.onBarClick('video', { detail: 2 })
    p.onBarDblClick('video')
    expect(p.isOpen('video')).toBe(false)
    expect(p.isActive('video')).toBe(false)
    // auch eine ausgeblendete, aktive Funktion
    p.onBarClick('video', { detail: 1 })
    p.hidePopover('video')
    p.onBarClick('video', { detail: 2 })
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
