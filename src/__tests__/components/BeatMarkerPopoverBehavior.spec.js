// @vitest-environment jsdom
// Charakterisierung des Beat-Marker-Popovers über sichtbare Texte, Labels,
// Titel und Optionen – nicht über CSS-Klassen –, damit die Tests den Wechsel
// von nativen Controls auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, provide, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BeatMarkerPopover from '../../components/sticky-player-bar/BeatMarkerPopover.vue'
import SliderField from '../../components/ui/SliderField.vue'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import de from '../../lib/i18n/de.js'

const P = de.player
let wrapper
let api
let playerStore
let markerStore
let closePopover

const Host = defineComponent({
  setup() {
    api = useBeatMarkers(() => {})
    provide('playerBar', {
      popover: { closePopover, cascadeOffset: () => ({ x: 0, y: 0 }) },
      markers: api,
    })
    return () => h(BeatMarkerPopover)
  },
})

function mountPopover() {
  wrapper = mount(Host, {
    attachTo: document.body,
    global: { provide: { canvasManager: ref(null) } },
  })
  return wrapper
}

const body = () => document.body

/** Klick auf das Label mit genau diesem Text (Checkbox bzw. Schalter). */
async function clickLabel(text) {
  const label = [...body().querySelectorAll('label')].find((l) => l.textContent.trim() === text)
  expect(label, `Label „${text}“`).toBeTruthy()
  label.click()
  await flushPromises()
}

/** Knopf mit diesem sichtbaren Text, Titel oder aria-label. */
function button(textOrTitle) {
  const el = [...body().querySelectorAll('button')].find(
    (b) =>
      b.textContent.replace(/\s+/g, ' ').trim() === textOrTitle ||
      b.getAttribute('title') === textOrTitle ||
      b.getAttribute('aria-label') === textOrTitle,
  )
  expect(el, `Knopf „${textOrTitle}“`).toBeTruthy()
  return el
}

async function click(textOrTitle) {
  button(textOrTitle).click()
  await flushPromises()
}

/** Das <select>, das eine Option mit diesem Text enthält. */
function selectWith(optionText) {
  const el = [...body().querySelectorAll('select')].find((s) =>
    [...s.options].some((o) => o.textContent.trim() === optionText),
  )
  expect(el, `Auswahl mit „${optionText}“`).toBeTruthy()
  return el
}

/** Schalter für „Marker an/aus“ in der Kopfzeile. */
const markersToggle = () =>
  body().querySelector('.marker-controls [role="switch"], .marker-controls .btn-toggle')

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  setActivePinia(createPinia())
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  playerStore.duration = 300
  playerStore.currentTime = 12.5
  closePopover = vi.fn()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

describe('Beat-Marker-Popover – Kopfzeile', () => {
  it('zeigt die Anzahl und schaltet Marker an/aus', async () => {
    markerStore.addMarker(5, {}, 'A')
    mountPopover()
    expect(body().textContent).toContain(`${P.beatMarkers} (1)`)
    expect(markerStore.markersEnabled).toBe(true)
    markersToggle().click()
    await flushPromises()
    expect(markerStore.markersEnabled).toBe(false)
    markersToggle().click()
    await flushPromises()
    expect(markerStore.markersEnabled).toBe(true)
  })

  it('„+“ öffnet das Formular zur aktuellen Zeit, Schließen ruft closePopover', async () => {
    mountPopover()
    expect(body().textContent).not.toContain(P.addMarkerTitle + P.time)
    await click(P.beatMarker)
    expect(api.showMarkerPanel.value).toBe(true)
    expect(api.pendingMarkerTimeInput.value).toBe('0:12.50')
    expect(body().querySelector('.marker-add-form')).toBeTruthy()
    await click(de.common.close)
    expect(closePopover).toHaveBeenCalledWith('markers')
  })

  it('Alle löschen fragt nach und leert die Liste', async () => {
    markerStore.addMarker(5, {}, 'A')
    markerStore.addMarker(9, {}, 'B')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountPopover()
    await click(P.deleteAllMarkers)
    expect(window.confirm).toHaveBeenCalled()
    expect(markerStore.markerCount).toBe(0)
  })
})

describe('Beat-Marker-Popover – Übergang', () => {
  it('Crossfade schaltet den Store, Dauer-Regler erscheint und setzt die Dauer', async () => {
    const tr = useMarkerTransitionStore()
    mountPopover()
    expect(tr.enabled).toBe(false)
    expect(wrapper.findAllComponents(SliderField)).toHaveLength(0)
    await clickLabel(P.transition)
    expect(tr.enabled).toBe(true)
    const slider = wrapper.findAllComponents(SliderField)
    expect(slider).toHaveLength(1)
    slider[0].vm.$emit('update:modelValue', 3)
    await flushPromises()
    expect(tr.duration).toBe(3)
    expect(wrapper.findComponent(SliderField).props('modelValue')).toBe(3)
  })
})

describe('Beat-Marker-Popover – Formular', () => {
  it('Neuer Marker: Label, Visualizer aus, Farbe ändern → Speichern legt ihn an', async () => {
    mountPopover()
    await click(P.beatMarker)
    expect(body().textContent).toContain(P.addMarkerTitle)
    const labelInput = [...body().querySelectorAll('input')].find((i) => i.value === 'Drop 1')
    expect(labelInput).toBeTruthy()
    labelInput.value = 'Refrain'
    labelInput.dispatchEvent(new Event('input'))

    await clickLabel(P.visualizerVisible)
    expect(api.newMarkerShowVisualizer.value).toBe(false)
    expect(selectWith(P.noChange).disabled).toBe(true)

    await clickLabel(P.change)
    expect(api.newMarkerChangeColor.value).toBe(true)

    await click(de.common.add)
    expect(markerStore.markerCount).toBe(1)
    const m = markerStore.markers[0]
    expect(m.label).toBe('Refrain')
    expect(m.time).toBeCloseTo(12.5)
    expect(m.action.visualizerVisible).toBe(false)
    expect(m.action.color).toBe(api.newMarkerColor.value)
    expect(api.showMarkerPanel.value).toBe(false)
  })

  it('Auswahlfelder: Visualizer, Hintergrund, Bild, Text, Form mit Platzhaltern', async () => {
    mountPopover()
    await click(P.beatMarker)
    const viz = selectWith(P.noChange)
    expect(viz.querySelectorAll('optgroup').length).toBeGreaterThan(0)
    const vizOption = [...viz.options].find((o) => o.value !== '')
    viz.value = vizOption.value
    viz.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(api.newMarkerVisualizer.value).toBe(vizOption.value)

    const bgSelects = [...body().querySelectorAll('select')].filter((s) =>
      [...s.querySelectorAll('optgroup')].some((g) => g.label === P.backgroundTemplates),
    )
    expect(bgSelects).toHaveLength(1)
    const bg = bgSelects[0]
    const bgOption = [...bg.options].find((o) => o.value !== '')
    bg.value = bgOption.value
    bg.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(api.newMarkerBackgroundKey.value).toBe(bgOption.value)

    const img = selectWith(P.noBackgroundImage)
    expect([...img.options].map((o) => o.textContent.trim())).toContain(P.emptyImageGallery)
    expect(selectWith(P.noText)).toBeTruthy()
    const shape = selectWith(P.noShape)
    const galleryOpt = [...shape.options].find((o) => o.value.startsWith('gallery:'))
    shape.value = galleryOpt.value
    shape.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(body().textContent).toContain(P.newShapeHint)
  })

  it('Zeit: Schrittweite wählen, +/− und Eingabe übernehmen', async () => {
    mountPopover()
    await click(P.beatMarker)
    const stepGroup = body().querySelector('[role="radiogroup"]')
    const steps = [...stepGroup.querySelectorAll('[role="radio"]')]
    expect(steps.map((s) => s.textContent.trim())).toEqual(['0.01s', '0.1s', '1s'])
    expect(steps[0].getAttribute('aria-checked')).toBe('true')
    steps[2].click()
    await flushPromises()
    expect(api.markerTimeStep.value).toBe(1)

    const fwd = button(P.timeStepForward)
    fwd.dispatchEvent(new Event('pointerdown'))
    fwd.dispatchEvent(new Event('pointerup'))
    await flushPromises()
    expect(api.pendingMarkerTimeInput.value).toBe('0:13.50')

    const timeInput = body().querySelector('.marker-time-input')
    timeInput.value = '1:30.25'
    timeInput.dispatchEvent(new Event('input'))
    timeInput.dispatchEvent(new Event('blur'))
    await flushPromises()
    await click(de.common.add)
    expect(markerStore.markers[0].time).toBeCloseTo(90.25)
  })

  it('Abbrechen schließt das Formular ohne Marker', async () => {
    mountPopover()
    await click(P.beatMarker)
    await click(de.common.cancel)
    expect(api.showMarkerPanel.value).toBe(false)
    expect(markerStore.markerCount).toBe(0)
  })
})

describe('Beat-Marker-Popover – Liste', () => {
  it('zeigt Zeit, Label und Aktionen; Bearbeiten, Springen, Löschen', async () => {
    markerStore.addMarker(5, { visualizerVisible: false }, 'Intro')
    markerStore.addMarker(65.5, { backgroundLabel: 'Blau', background: {} }, 'Drop')
    const seek = vi.spyOn(playerStore, 'seekTo').mockImplementation(() => {})
    mountPopover()
    const text = body().textContent
    expect(text).toContain('0:05.00')
    expect(text).toContain('1:05.50')
    expect(text).toContain('Intro')
    expect(text).toContain(`🚫 ${P.visualizer}`)
    expect(text).toContain('🎨 Blau')
    ;[...body().querySelectorAll('span')].find((s) => s.textContent === '1:05.50').click()
    expect(seek).toHaveBeenCalledWith(65.5)

    const editButtons = [...body().querySelectorAll('button')].filter(
      (b) =>
        b.getAttribute('title') === P.editMarker || b.getAttribute('aria-label') === P.editMarker,
    )
    expect(editButtons).toHaveLength(2)
    editButtons[1].click()
    await flushPromises()
    expect(body().textContent).toContain(P.editMarkerTitle)
    expect(api.editingMarkerId.value).toBe(markerStore.sortedMarkers[1].id)
    await click(de.common.save)
    expect(markerStore.markerCount).toBe(2)

    const deleteButtons = [...body().querySelectorAll('button')].filter(
      (b) =>
        b.getAttribute('title') === de.common.delete ||
        b.getAttribute('aria-label') === de.common.delete,
    )
    deleteButtons[0].click()
    await flushPromises()
    expect(markerStore.markerCount).toBe(1)
    expect(markerStore.markers[0].label).toBe('Drop')
  })

  it('ohne Marker erscheint der Hinweis', () => {
    mountPopover()
    expect(body().querySelector('.spb-empty-hint').textContent).toBe(P.addMarkerTitle)
  })
})

describe('Beat-Marker-Popover – Ui-Bausteine', () => {
  it('Schalter, Schrittweite und Auswahlfelder sind zugängliche Ui-Controls', async () => {
    mountPopover()
    await click(P.beatMarker)
    const switches = [...body().querySelectorAll('[role="switch"]')]
    // Marker aktiv, Crossfade, Visualizer anzeigen, Farbe ändern
    expect(switches).toHaveLength(4)
    expect(switches[0].getAttribute('aria-label')).toBe(P.markersActive)
    expect(button(P.beatMarker).getAttribute('aria-pressed')).toBe('true')
    expect(body().querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe(
      P.timeStepLabel,
    )
    expect(body().querySelector('.marker-time-input').getAttribute('placeholder')).toBe(
      P.timePlaceholder,
    )
    const labelField = [...body().querySelectorAll('input')].find((i) => i.value === 'Drop 1')
    expect(body().querySelector(`label[for="${labelField.id}"]`).textContent.trim()).toBe(P.label)
    expect(labelField.getAttribute('placeholder')).toBe(P.labelPlaceholder)
    // Jedes Auswahlfeld hat ein sichtbares Label
    for (const select of body().querySelectorAll('select')) {
      expect(body().querySelector(`label[for="${select.id}"]`)).toBeTruthy()
    }
    expect(body().querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
  })
})
