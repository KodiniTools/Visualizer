// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import TextNewForm from '../../components/text-manager/TextNewForm.vue'

/**
 * Minimaler Canvas-Manager-Stub: addText liefert das erzeugte Text-Objekt,
 * damit geprüft werden kann, ob eine Animation gesetzt wurde oder nicht.
 */
function createCanvasManagerStub() {
  return {
    canvas: { width: 960, height: 540 },
    addText: vi.fn((text, options) => ({ text, ...options })),
    setTextPositionPreview: vi.fn(),
    clearTextPositionPreview: vi.fn(),
    startTextSelectionMode: vi.fn(),
    cancelTextSelectionMode: vi.fn(),
  }
}

// Kind-Sektionen stubben: Stil-Sektion ohne Font-Logik, Typewriter-Sektion
// mit Toggle + Add-Button, damit der Effekt-Pfad vergleichbar getestet werden kann.
const TextStyleSectionStub = {
  props: ['settings'],
  emits: ['update:settings', 'save', 'reset'],
  setup() {
    return { populateNewTextFontDropdown: vi.fn() }
  },
  template: '<div class="style-stub" />',
}

const TypewriterSectionStub = {
  props: ['settings', 'canAdd'],
  emits: ['update:settings', 'add'],
  template: `
    <div class="typewriter-stub">
      <button class="tw-enable" @click="settings.enabled = true" />
      <button class="tw-add" :disabled="!canAdd" @click="$emit('add')" />
    </div>`,
}

const EmptySectionStub = { template: '<div />' }

let wrapper
let canvasManager

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  canvasManager = ref(createCanvasManagerStub())
})

afterEach(() => wrapper?.unmount())

async function mountForm() {
  wrapper = mount(TextNewForm, {
    global: {
      provide: { canvasManager, fontManager: ref(null) },
      stubs: {
        TextStyleSection: TextStyleSectionStub,
        TypewriterSection: TypewriterSectionStub,
        FadeSection: EmptySectionStub,
        ScaleSection: EmptySectionStub,
        SlideSection: EmptySectionStub,
        PositionSection: EmptySectionStub,
      },
    },
  })
  // In den "Neuer Text"-Modus wechseln
  await wrapper.find('.btn-primary.full-width').trigger('click')
  return wrapper
}

function plainAddButton(w) {
  return w.find('.add-plain-group button')
}

describe('TextNewForm – Text ohne Effekt hinzufügen', () => {
  it('zeigt den Button und deaktiviert ihn ohne Textinhalt', async () => {
    const w = await mountForm()
    const btn = plainAddButton(w)
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Ohne Effekt zum Canvas hinzufügen')
    expect(btn.attributes('disabled')).toBeDefined()

    await w.find('textarea').setValue('Hallo Welt')
    expect(plainAddButton(w).attributes('disabled')).toBeUndefined()
  })

  it('legt den Text ohne animation an und emittiert created', async () => {
    const w = await mountForm()
    await w.find('textarea').setValue('Hallo Welt')
    await plainAddButton(w).trigger('click')

    expect(canvasManager.value.addText).toHaveBeenCalledTimes(1)
    const [text, options] = canvasManager.value.addText.mock.calls[0]
    expect(text).toBe('Hallo Welt')
    expect(options.fontFamily).toBe('Arial')

    const created = w.emitted('created')
    expect(created).toHaveLength(1)
    expect(created[0][0].animation).toBeUndefined()
    // Formular wird geschlossen
    expect(w.find('textarea').exists()).toBe(false)
  })

  it('ignoriert aktivierte Effekte beim einfachen Hinzufügen, Effekt-Button setzt sie weiterhin', async () => {
    const w = await mountForm()
    await w.find('textarea').setValue('Mit Effekt?')
    await w.find('.tw-enable').trigger('click')

    // Einfach hinzufügen → keine Animation, obwohl Typewriter aktiviert ist
    await plainAddButton(w).trigger('click')
    expect(w.emitted('created')[0][0].animation).toBeUndefined()

    // Erneut: über den Effekt-Button → Typewriter-Animation gesetzt
    await w.find('.btn-primary.full-width').trigger('click')
    await w.find('textarea').setValue('Mit Effekt!')
    await w.find('.tw-enable').trigger('click')
    await w.find('.tw-add').trigger('click')

    const created = w.emitted('created')
    expect(created).toHaveLength(2)
    expect(created[1][0].animation?.typewriter?.enabled).toBe(true)
    expect(created[1][0].animation?.type).toBe('typewriter')
  })
})
