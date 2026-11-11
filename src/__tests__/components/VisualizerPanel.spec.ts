import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizerPanel from '../../components/VisualizerPanel.vue'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { useLayerPresetStore } from '../../stores/layerPresetStore'
import {
  FAVORITES_STORAGE_KEY,
  useVisualizerFavoritesStore,
} from '../../stores/visualizerFavoritesStore'

// Schwere Nachbar-Panels und das Bild-Picker-Widget werden gestubbt; getestet
// wird das Zusammenspiel von VisualizerPanel mit seinen Sektionen.
const stubs = {
  HelpTooltip: true,
  VisualizerImagePicker: true,
}

let wrapper: VueWrapper
let store: ReturnType<typeof useVisualizerStore>
let popover: { isOpen: Mock; togglePopover: Mock }

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  store = useVisualizerStore()
  popover = { isOpen: vi.fn(() => false), togglePopover: vi.fn() }
  wrapper = mount(VisualizerPanel, { global: { stubs, provide: { playerBar: { popover } } } })
})

afterEach(() => wrapper?.unmount())

describe('VisualizerPanel (aufgeteilt in Sektionen)', () => {
  it('rendert Schnellzugriff und Suche im festen, die Liste im scrollbaren Bereich', () => {
    const fixed = wrapper.find('.panel-fixed')
    expect(fixed.find('.controls-link').exists()).toBe(true)
    expect(fixed.find('.search-input').exists()).toBe(true)
    // Die Steuerung (Ein/Aus, Farbe, Regler, Reaktion, Position) liegt im
    // eigenen Popover der Player-Leiste, nicht mehr im Visualizer-Panel.
    expect(fixed.find('.switch').exists()).toBe(false)
    expect(fixed.find('.intensity-slider').exists()).toBe(false)
    expect(fixed.find('.react-select').exists()).toBe(false)
    expect(fixed.find('.position-section').exists()).toBe(false)

    const scroll = wrapper.find('.panel-scroll')
    const categories = Object.keys(store.categorizedVisualizers)
    expect(scroll.findAll('.category')).toHaveLength(categories.length)
    expect(scroll.text()).toContain(`(${store.availableVisualizers.length}`)
  })

  it('enthält Multi-Layer und Effekte nicht mehr (eigene Popover)', () => {
    expect(wrapper.find('.layer-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Multi-Layer')
    expect(wrapper.find('.fx-section').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Post-Processing')
  })

  it('öffnet die Visualizer-Steuerung über den Schnellzugriff', async () => {
    await wrapper.find('.controls-link').trigger('click')
    expect(popover.togglePopover).toHaveBeenCalledWith('visualizerControls')
  })

  it('zeigt den Status-Hinweis, wenn der Visualizer aus ist', async () => {
    expect(wrapper.find('.status-hint').exists()).toBe(false)
    store.toggleVisualizer()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.status-hint').exists()).toBe(true)
  })

  it('kommt ohne Player-Leiste aus (kein Schnellzugriff, Rest bleibt)', () => {
    const solo = mount(VisualizerPanel, { global: { stubs } })
    expect(solo.find('.controls-link').exists()).toBe(false)
    expect(solo.find('.search-input').exists()).toBe(true)
    solo.unmount()
  })

  it('zeigt die LED-Buchstaben als eigene, standardmäßig eingeklappte Sektion', async () => {
    const section = wrapper
      .findAll('.category')
      .find((c) => c.find('.category-name').text() === 'LED-Buchstaben')
    expect(section).toBeDefined()
    expect(section!.attributes('open')).toBeUndefined()
    // LED-Text (ganze Wörter) + A–Z
    expect(section!.find('.category-count').text()).toBe('27')

    await section!.find('.category-header').trigger('click')
    expect(section!.attributes('open')).toBeDefined()
    const names = section!.findAll('.visualizer-btn').map((b) => b.text())
    expect(names[0]).toBe('LED-Text (Wörter)')
    expect(names[1]).toBe('LED-Buchstabe A (GPU)')
    expect(names[26]).toBe('LED-Buchstabe Z (GPU)')
  })

  it('zeigt alle Laser-Effekte als eigene, eingeklappte Sektion', async () => {
    const section = wrapper
      .findAll('.category')
      .find((c) => c.find('.category-name').text() === 'Laser')
    expect(section).toBeDefined()
    expect(section!.attributes('open')).toBeUndefined()
    expect(section!.find('.category-count').text()).toBe('16')
    const names = section!.findAll('.visualizer-btn').map((b) => b.text())
    expect(names).toContain('Laser-Tunnel (GPU)')
    expect(names).toContain('Laser-Smiley Fröhlich (GPU)')
    expect(names.every((n) => n.startsWith('Laser'))).toBe(true)
  })

  it('zeigt die LED-Ziffern als eigene, eingeklappte Sektion', () => {
    const section = wrapper
      .findAll('.category')
      .find((c) => c.find('.category-name').text() === 'LED-Ziffern')
    expect(section).toBeDefined()
    expect(section!.attributes('open')).toBeUndefined()
    // LED-Zahlen (Zahl, Uhrzeit, Countdown) + 0–9
    expect(section!.find('.category-count').text()).toBe('11')
    const names = section!.findAll('.visualizer-btn').map((b) => b.text())
    expect(names[0]).toBe('LED-Zahlen (Uhr, Countdown)')
    expect(names[1]).toBe('LED-Ziffer 0 (GPU)')
    expect(names[10]).toBe('LED-Ziffer 9 (GPU)')
  })

  it('zeigt die LED-Rahmen als eigene, eingeklappte Sektion', () => {
    const section = wrapper
      .findAll('.category')
      .find((c) => c.find('.category-name').text() === 'LED-Rahmen')
    expect(section).toBeDefined()
    expect(section!.attributes('open')).toBeUndefined()
    expect(section!.find('.category-count').text()).toBe('5')
    const names = section!.findAll('.visualizer-btn').map((b) => b.text())
    expect(names).toEqual([
      'LED-Rahmen Lauflicht (GPU)',
      'LED-Rahmen Spektrum (GPU)',
      'LED-Rahmen VU-Meter (GPU)',
      'LED-Rahmen Beat-Puls (GPU)',
      'LED-Rahmen Regenbogen (GPU)',
    ])
  })

  it('verhält sich als Akkordeon: nur eine Kategorie ist offen', async () => {
    const byName = (name: string) =>
      wrapper.findAll('.category').find((c) => c.find('.category-name').text() === name)
    expect(byName('GPU-Presets')!.attributes('open')).toBeDefined()
    expect(byName('Laser')!.attributes('open')).toBeUndefined()

    await byName('Laser')!.find('.category-header').trigger('click')
    expect(byName('Laser')!.attributes('open')).toBeDefined()
    expect(byName('GPU-Presets')!.attributes('open')).toBeUndefined()
    expect(wrapper.findAll('.category[open]')).toHaveLength(1)

    await byName('LED-Buchstaben')!.find('.category-header').trigger('click')
    expect(byName('LED-Buchstaben')!.attributes('open')).toBeDefined()
    expect(byName('Laser')!.attributes('open')).toBeUndefined()
    expect(wrapper.findAll('.category[open]')).toHaveLength(1)

    // Eigene Presets gehören zum Akkordeon
    const presets = useLayerPresetStore()
    store.addLayer('bars')
    presets.saveCurrentLayersAsPreset('Set')
    store.clearAllLayers()
    await wrapper.vm.$nextTick()
    await wrapper.find('.category-presets .category-header').trigger('click')
    expect(wrapper.find('.category-presets').attributes('open')).toBeDefined()
    expect(byName('LED-Buchstaben')!.attributes('open')).toBeUndefined()
    expect(wrapper.findAll('.category[open]')).toHaveLength(1)
  })

  it('klappt Kategorien per Klick auf und zu', async () => {
    const headers = wrapper.findAll('.category-header')
    const gpu = headers[0]
    expect(gpu!.classes()).toContain('open')

    await gpu!.trigger('click')
    expect(gpu!.classes()).not.toContain('open')
    expect(wrapper.findAll('.category')[0]!.attributes('open')).toBeUndefined()
  })

  it('zeigt bei Suche eine Trefferliste statt Kategorien und wählt per Klick aus', async () => {
    const target = store.availableVisualizers.find((v) => v.id !== store.selectedVisualizer)
    await wrapper.find('.search-input').setValue(target!.id)

    expect(wrapper.find('.category-list').exists()).toBe(false)
    const hits = wrapper.findAll('.visualizer-buttons .visualizer-btn')
    expect(hits.length).toBeGreaterThan(0)

    const hit = hits.find((b) => b.text() === target!.name)
    await hit!.trigger('click')
    expect(store.selectedVisualizer).toBe(target!.id)
    expect(hit!.classes()).toContain('active')
  })

  it('meldet keine Treffer bei unbekanntem Suchbegriff', async () => {
    await wrapper.find('.search-input').setValue('xyz-gibt-es-nicht')
    expect(wrapper.find('.no-results').exists()).toBe(true)
    expect(wrapper.findAll('.visualizer-buttons .visualizer-btn')).toHaveLength(0)
  })

  it('zeigt gespeicherte Layer-Presets als Kategorie "Eigene Presets" und wendet sie an', async () => {
    expect(wrapper.find('.category-presets').exists()).toBe(false)

    const presets = useLayerPresetStore()
    store.addLayer('bars')
    store.addLayer('waveform')
    const preset = presets.saveCurrentLayersAsPreset('Drop-Set')
    store.clearAllLayers()
    await wrapper.vm.$nextTick()

    const category = wrapper.find('.category-presets')
    expect(category.exists()).toBe(true)
    expect(category.find('.category-name').text()).toBe('Eigene Presets')
    expect(category.find('.category-count').text()).toBe('1')

    const btn = category.find('.preset-btn')
    expect(btn.text()).toContain('Drop-Set')
    expect(btn.classes()).not.toContain('active')
    await btn.trigger('click')
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers).toHaveLength(2)
    expect(presets.isLayerPresetActive(preset)).toBe(true)
    expect(wrapper.find('.category-presets .preset-btn').classes()).toContain('active')
  })

  it('kehrt vom eigenen Preset per Klick zu einem einzelnen Visualizer zurück', async () => {
    const presets = useLayerPresetStore()
    store.addLayer('bars')
    store.addLayer('waveform')
    const preset = presets.saveCurrentLayersAsPreset('Drop-Set')
    await wrapper.vm.$nextTick()
    expect(store.multiLayerMode).toBe(true)

    // Im Multi-Layer-Modus ist kein einzelner Visualizer als aktiv markiert
    const gpuButtons = wrapper.findAll('.category:not(.category-presets) .visualizer-btn')
    expect(gpuButtons.some((b) => b.classes().includes('active'))).toBe(false)

    const target = gpuButtons.find((b) => b.text() !== '')
    await target!.trigger('click')

    expect(store.multiLayerMode).toBe(false)
    expect(target!.classes()).toContain('active')
    expect(wrapper.find('.category-presets .preset-btn').classes()).not.toContain('active')
    expect(presets.isLayerPresetActive(preset)).toBe(false)
    // Layer bleiben erhalten: erneutes Anwenden des Presets funktioniert
    await wrapper.find('.category-presets .preset-btn').trigger('click')
    expect(store.multiLayerMode).toBe(true)
    expect(store.visualizerLayers).toHaveLength(2)
  })

  it('findet Layer-Presets auch über die Suche', async () => {
    const presets = useLayerPresetStore()
    store.addLayer('bars')
    presets.saveCurrentLayersAsPreset('Sonnenaufgang')
    store.clearAllLayers()

    await wrapper.find('.search-input').setValue('sonnen')
    const hits = wrapper.findAll('.visualizer-buttons .preset-btn')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.text()).toContain('Sonnenaufgang')
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  describe('Favoriten', () => {
    const rowOf = (name: string) =>
      wrapper.findAll('.viz-row').find((r) => r.find('.visualizer-btn').text() === name)

    it('hat pro Visualizer einen Stern, der Favoriten hinzufügt und entfernt', async () => {
      const fav = useVisualizerFavoritesStore()
      const first = Object.values(store.categorizedVisualizers)[0]![0]!
      const selectedBefore = store.selectedVisualizer
      const row = rowOf(first.name)!
      const star = row.find('.fav-toggle')
      expect(star.attributes('aria-pressed')).toBe('false')
      expect(star.attributes('aria-label')).toBe('Zu Favoriten hinzufügen')

      await star.trigger('click')
      expect(fav.isFavorite(first.id)).toBe(true)
      expect(star.attributes('aria-pressed')).toBe('true')
      expect(star.attributes('aria-label')).toBe('Aus Favoriten entfernen')
      // Der Stern wählt den Visualizer nicht aus
      expect(store.selectedVisualizer).toBe(selectedBefore)

      await star.trigger('click')
      expect(fav.isFavorite(first.id)).toBe(false)
    })

    it('zeigt im Bereich Favoriten nur die gemerkten Visualizer und wählt per Klick aus', async () => {
      const fav = useVisualizerFavoritesStore()
      const [a, b] = store.availableVisualizers.filter((v) => v.id !== store.selectedVisualizer)
      fav.addFavorite(b!.id)
      fav.addFavorite(a!.id)
      fav.addFavorite('entfernter-visualizer')
      await wrapper.vm.$nextTick()

      const toggle = wrapper.find('.favorites-toggle')
      expect(toggle.text()).toContain('Favoriten')
      expect(toggle.attributes('aria-pressed')).toBe('false')
      await toggle.trigger('click')
      expect(toggle.attributes('aria-pressed')).toBe('true')

      expect(wrapper.find('.category-list').exists()).toBe(false)
      const names = wrapper.findAll('.favorites-list .visualizer-btn').map((x) => x.text())
      // Reihenfolge des Merkens, unbekannte IDs ausgelassen
      expect(names).toEqual([b!.name, a!.name])
      expect(wrapper.find('.panel-scroll .section-label').text()).toBe('Favoriten (2)')

      await wrapper.findAll('.favorites-list .visualizer-btn')[1]!.trigger('click')
      expect(store.selectedVisualizer).toBe(a!.id)

      // Entfernen im Favoriten-Bereich nimmt den Eintrag sofort heraus
      await wrapper.findAll('.favorites-list .fav-toggle')[0]!.trigger('click')
      expect(wrapper.findAll('.favorites-list .visualizer-btn').map((x) => x.text())).toEqual([
        a!.name,
      ])

      await toggle.trigger('click')
      expect(wrapper.find('.category-list').exists()).toBe(true)
    })

    it('führt über "Alle anzeigen" aus den Favoriten zurück zum ganzen Verzeichnis', async () => {
      useVisualizerFavoritesStore().addFavorite(store.availableVisualizers[0]!.id)
      const toggle = wrapper.find('.favorites-toggle')
      expect(wrapper.find('.show-all-btn').exists()).toBe(false)
      await toggle.trigger('click')
      const showAll = wrapper.find('.show-all-btn')
      expect(showAll.text()).toBe('Alle anzeigen')

      await showAll.trigger('click')
      expect(wrapper.find('.category-list').exists()).toBe(true)
      expect(wrapper.find('.favorites-list').exists()).toBe(false)
      expect(toggle.attributes('aria-pressed')).toBe('false')
    })

    it('zeigt einen Hinweis, wenn es noch keine Favoriten gibt', async () => {
      await wrapper.find('.favorites-toggle').trigger('click')
      expect(wrapper.find('.favorites-empty').exists()).toBe(true)
      expect(wrapper.findAll('.favorites-list .visualizer-btn')).toHaveLength(0)
    })

    it('filtert Favoriten mit dem Suchbegriff', async () => {
      const fav = useVisualizerFavoritesStore()
      const [a, b] = store.availableVisualizers
      fav.addFavorite(a!.id)
      fav.addFavorite(b!.id)
      await wrapper.find('.favorites-toggle').trigger('click')
      await wrapper.find('.search-input').setValue(b!.id)
      const names = wrapper.findAll('.favorites-list .visualizer-btn').map((x) => x.text())
      expect(names).toContain(b!.name)
      expect(names).not.toContain(a!.name)

      await wrapper.find('.search-input').setValue('xyz-gibt-es-nicht')
      expect(wrapper.find('.favorites-list .no-results').exists()).toBe(true)
      expect(wrapper.find('.favorites-empty').exists()).toBe(false)
    })

    it('lädt gespeicherte Favoriten aus dem localStorage', async () => {
      wrapper.unmount()
      const id = store.availableVisualizers[3]!.id
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([id]))
      setActivePinia(createPinia())
      const s = useVisualizerStore()
      wrapper = mount(VisualizerPanel, { global: { stubs } })
      expect(wrapper.find('.favorites-count').text()).toBe('1')
      await wrapper.find('.favorites-toggle').trigger('click')
      expect(wrapper.find('.favorites-list .visualizer-btn').text()).toBe(
        s.availableVisualizers.find((v) => v.id === id)!.name,
      )
    })
  })
})
