/**
 * Am Raster ausrichten: Schalter im Raster-Bereich, Einrasten beim Verschieben
 * (Kanten oder Mitte bei Bildern, Ankerpunkt bei Texten), ohne am Raster
 * „kleben“ zu bleiben; nur bei sichtbarem Raster.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { GridManager } from '../../lib/gridManager.js'
import { DragDropHandler } from '../../lib/canvasManager/interaction/DragDropHandler.js'
import { useGridStore } from '../../stores/gridStore.js'
import ControlsPanel from '../../components/ControlsPanel.vue'

// Canvas 1000×500 px, dargestellt in voller Größe (Toleranz = 10 px)
function setup({ visible = true, snap = true } = {}) {
  const canvas = { width: 1000, height: 500, clientWidth: 1000 }
  const grid = new GridManager(canvas) // Raster 50 px
  grid.setVisibility(visible)
  grid.setSnapToGrid(snap)
  const manager = { canvas, gridManager: grid, selectedObjects: [] }
  return { handler: new DragDropHandler(manager), grid, manager, canvas }
}
// Bild 200×100 px an Position (x, y) px
const image = (x, y) => ({
  type: 'image',
  relX: x / 1000,
  relY: y / 500,
  relWidth: 0.2,
  relHeight: 0.2,
})
const px = (obj) => ({
  x: Math.round(obj.relX * 1000 * 100) / 100,
  y: Math.round(obj.relY * 500 * 100) / 100,
})

describe('GridManager – Einrasten', () => {
  it('snapAxis: Anfang, Mitte oder Ende auf die nächste Linie innerhalb der Toleranz', () => {
    const g = new GridManager({ width: 1000, height: 500 })
    expect(g.snapAxis(47, 0)).toBe(50) // Punkt
    expect(g.snapAxis(60, 0)).toBe(50) // genau an der Toleranzgrenze (10 px)
    expect(g.snapAxis(62, 0)).toBe(62) // außerhalb der Toleranz
    expect(g.snapAxis(142, 200)).toBe(150) // Anfang 142 → 150
    expect(g.snapAxis(123, 170)).toBe(130) // Ende 293 → 300 (näher als Mitte 208 → 200)
    expect(g.snapAxis(71, 60)).toBe(70) // Mitte 101 → 100
    expect(g.snapAxis(142, 200, 5)).toBe(142) // eigene Toleranz
  })

  it('isSnapActive nur bei sichtbarem Raster', () => {
    const g = new GridManager({ width: 1, height: 1 })
    g.setSnapToGrid(true)
    expect(g.isSnapActive()).toBe(false)
    g.setVisibility(true)
    expect(g.isSnapActive()).toBe(true)
    g.setSnapToGrid(false)
    expect(g.isSnapActive()).toBe(false)
  })
})

describe('DragDropHandler – Einrasten beim Verschieben', () => {
  it('Bild rastet mit der linken/oberen Kante ein', () => {
    const { handler } = setup()
    const obj = image(100, 100)
    handler.moveObject(obj, 46, 47) // 146/147 → 150/150
    expect(px(obj)).toEqual({ x: 150, y: 150 })
  })

  it('bleibt nicht kleben: kleine Schritte führen aus dem Einrastbereich heraus', () => {
    const { handler } = setup()
    const obj = image(150, 150) // liegt auf der Linie
    const xs = []
    for (let i = 0; i < 8; i++) {
      handler.moveObject(obj, 3, 0)
      xs.push(px(obj).x)
    }
    // +3 … +9 px: eingerastet; ab +12 px (> Toleranz 10) frei
    expect(xs).toEqual([150, 150, 150, 162, 165, 168, 171, 174])
  })

  it('ohne sichtbares Raster oder ohne Schalter: freie Bewegung wie bisher', () => {
    for (const opts of [{ visible: false }, { snap: false }]) {
      const { handler } = setup(opts)
      const obj = image(100, 100)
      handler.moveObject(obj, 46, 47)
      expect(px(obj)).toEqual({ x: 146, y: 147 })
    }
  })

  it('Text rastet mit dem Ankerpunkt ein; mitgewählte Texte folgen derselben Verschiebung', () => {
    const { handler, manager } = setup()
    const text = { type: 'text', relX: 0.1, relY: 0.2 } // 100/100 px
    const other = { type: 'text', relX: 0.5, relY: 0.5 }
    manager.selectedObjects = [text, other]
    handler.moveObject(text, 48, 3) // 148/103 → 150/100
    expect(px(text)).toEqual({ x: 150, y: 100 })
    expect(px(other)).toEqual({ x: 550, y: 250 }) // +50/+0 px wie das gezogene Objekt
  })

  it('Toleranz gilt in Bildschirm-Pixeln (verkleinert dargestellter Canvas)', () => {
    const { handler, canvas } = setup()
    canvas.clientWidth = 500 // halbe Größe → Toleranz 20 Canvas-Pixel
    const obj = image(100, 100)
    handler.moveObject(obj, 32, 0) // 132 → 150 (Abstand 18)
    expect(px(obj).x).toBe(150)
  })

  it('bleibt innerhalb des Canvas', () => {
    const { handler } = setup()
    const obj = image(795, 0)
    handler.moveObject(obj, 10, 0)
    expect(obj.relX + obj.relWidth).toBeLessThanOrEqual(1)
  })
})

describe('Raster-Einstellungen – Schalter „Am Raster ausrichten“', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('nur bei eingeschaltetem Raster sichtbar und schaltet den Store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGridStore()
    const w = mount(ControlsPanel, { global: { plugins: [pinia] } })
    expect(w.find('.grid-snap-checkbox').exists()).toBe(false)
    store.setGridVisibility(true)
    await w.vm.$nextTick()
    const box = w.find('.grid-snap-checkbox')
    expect(box.element.checked).toBe(false)
    expect(w.find('.grid-snap-toggle').text()).toBe('Am Raster ausrichten')
    await box.setValue(true)
    expect(store.snapToGrid).toBe(true)
    await box.setValue(false)
    expect(store.snapToGrid).toBe(false)
    w.unmount()
  })
})
