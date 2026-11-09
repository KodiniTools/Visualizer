import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShapeAnimation from '../../components/shapes/ShapeAnimation.vue'
import SliderControl from '../../components/ui/SliderControl.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { useShapeStore } from '../../stores/shapeStore'
import de from '../../lib/i18n/de'

describe('ShapeAnimation', () => {
  let store: ReturnType<typeof useShapeStore>
  let shape: ReturnType<typeof store.addShape>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useShapeStore()
    shape = store.addShape('rect', 1920, 1080)
  })

  const mountIt = () => mount(ShapeAnimation, { props: { shape: store.selectedShape } })
  const sliders = (w: VueWrapper) => w.findAllComponents(SliderControl).map((c) => c.props('label'))

  it('startet ohne Animation und bietet alle Typen gruppiert an', () => {
    const w = mountIt()
    const select = w.findComponent(UiSelect)
    expect(select.props('modelValue')).toBe('none')
    const labels = w.findAll('option').map((o) => o.text())
    expect(labels).toContain(de.shapes.animation.types.pulse)
    expect(labels).toContain(de.shapes.animation.types.fadeIn)
    expect(w.findAll('optgroup')).toHaveLength(2)
    expect(w.findAllComponents(SliderControl)).toHaveLength(0)
  })

  it('Typ wählen legt die Konfiguration an und meldet einen Verlaufsschritt', async () => {
    const w = mountIt()
    await w.find('select').setValue('pulse')
    expect(store.shapes[0]!.animation).toEqual({
      type: 'pulse',
      duration: 1,
      intensity: 40,
      delay: 0,
    })
    expect(w.emitted('commit')).toHaveLength(1)
    await w.setProps({ shape: store.selectedShape })
    expect(sliders(w)).toEqual([de.shapes.animation.cycle, de.shapes.animation.intensity])
  })

  it('einmalige Animation zeigt Dauer und Verzögerung, keine Stärke', async () => {
    store.updateShape(shape!.id, {
      animation: { type: 'fadeIn', duration: 1, intensity: 100, delay: 0 },
    })
    const w = mountIt()
    expect(sliders(w)).toEqual([de.shapes.animation.duration, de.shapes.animation.delay])
    expect(w.text()).toContain(de.shapes.animation.oneShotHint)
  })

  it('Regler ändern begrenzt den Wert; commit erst bei change', async () => {
    store.updateShape(shape!.id, {
      animation: { type: 'pulse', duration: 1, intensity: 40, delay: 0 },
    })
    const w = mountIt()
    const intensity = w.findAllComponents(SliderControl)[1]
    intensity!.vm.$emit('update:modelValue', 250)
    expect((store.shapes[0]!.animation as { intensity: number }).intensity).toBe(100)
    expect(w.emitted('commit')).toBeUndefined()
    intensity!.vm.$emit('change')
    expect(w.emitted('commit')).toHaveLength(1)
  })

  it('„Keine“ entfernt die Animation, Neustart setzt die Uhr zurück', async () => {
    store.updateShape(shape!.id, {
      animation: { type: 'blink', duration: 1, intensity: 100, delay: 0 },
    })
    store.getAnimationElapsed(shape!.id, 1000)
    const w = mountIt()
    await w.find('[data-animation-restart]').trigger('click')
    expect(store.getAnimationElapsed(shape!.id, 5000)).toBe(0)
    await w.find('select').setValue('none')
    expect(store.shapes[0]!.animation).toBeNull()
  })
})
