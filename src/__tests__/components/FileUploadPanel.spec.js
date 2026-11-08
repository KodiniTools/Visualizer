// @vitest-environment jsdom
// Audio-Upload: Dateiauswahl, Drag & Drop (Dateien und Ordner), Einfügen per
// Strg+V. Nur Audiodateien landen in der Playlist, mit Toast als Rückmeldung.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FileUploadPanel from '../../components/FileUploadPanel.vue'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useToastStore } from '../../stores/toastStore'
import { useI18n } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

let wrapper
let player
let addTracks
let success

beforeEach(() => {
  setActivePinia(createPinia())
  player = usePlayerStore()
  addTracks = vi.spyOn(player, 'addTracks').mockImplementation(() => {})
  success = vi.spyOn(useToastStore(), 'success')
  wrapper = mount(FileUploadPanel, { attachTo: document.body })
})

afterEach(() => {
  wrapper.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const audio = (name, type = 'audio/mpeg') => new File(['x'], name, { type })
const text = (name) => new File(['x'], name, { type: 'text/plain' })
const added = () => addTracks.mock.calls.flatMap(([files]) => files.map((f) => f.name))
const toastFor = (n) => de.toast.tracksAdded.replace('{count}', n)

/** Datei-Input füllen und change auslösen (jsdom: files per defineProperty). */
async function select(input, files) {
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

describe('FileUploadPanel – Dateiauswahl', () => {
  it('nimmt nur Audio (MIME oder Endung) und meldet die Anzahl', async () => {
    const input = wrapper.find('input[type="file"]:not([webkitdirectory])')
    await select(input, [audio('a.mp3'), text('notiz.txt'), audio('b.flac', '')])
    expect(added()).toEqual(['a.mp3', 'b.flac'])
    expect(success).toHaveBeenCalledWith(toastFor(2))
  })

  it('ohne Audio keine Änderung und kein Toast', async () => {
    const input = wrapper.find('input[type="file"]:not([webkitdirectory])')
    await select(input, [text('a.txt')])
    expect(addTracks).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

  it('Knöpfe öffnen Datei- bzw. Ordnerauswahl', async () => {
    const [fileInput, folderInput] = wrapper.findAll('input[type="file"]')
    const fileClick = vi.spyOn(fileInput.element, 'click')
    const folderClick = vi.spyOn(folderInput.element, 'click')
    const buttons = wrapper.findAll('.upload-area button')
    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(fileClick).toHaveBeenCalled()
    expect(folderClick).toHaveBeenCalled()
    expect(folderInput.attributes()).toHaveProperty('webkitdirectory')
  })
})

describe('FileUploadPanel – Drag & Drop', () => {
  it('markiert die Zone beim Ziehen', async () => {
    const zone = wrapper.find('.upload-area')
    await zone.trigger('dragover')
    expect(zone.classes()).toContain('drag-over')
    await zone.trigger('dragleave')
    expect(zone.classes()).not.toContain('drag-over')
  })

  it('Fallback über dataTransfer.files', async () => {
    await wrapper
      .find('.upload-area')
      .trigger('drop', { dataTransfer: { files: [audio('x.wav', 'audio/wav'), text('y.txt')] } })
    await flushPromises()
    expect(added()).toEqual(['x.wav'])
  })

  it('durchsucht abgelegte Ordner rekursiv', async () => {
    const fileEntry = (f) => ({ isFile: true, file: (ok) => ok(f) })
    const dirEntry = (children) => {
      let done = false
      return {
        isDirectory: true,
        createReader: () => ({
          readEntries: (ok) => {
            const batch = done ? [] : children
            done = true
            ok(batch)
          },
        }),
      }
    }
    const tree = dirEntry([
      fileEntry(audio('1.mp3')),
      fileEntry(text('cover.txt')),
      dirEntry([fileEntry(audio('2.ogg', 'audio/ogg'))]),
    ])
    const items = [
      { webkitGetAsEntry: () => tree },
      { webkitGetAsEntry: () => null, getAsFile: () => audio('3.m4a', '') },
    ]
    const ev = new Event('drop', { cancelable: true })
    ev.dataTransfer = { items }
    wrapper.find('.upload-area').element.dispatchEvent(ev)
    await flushPromises()
    expect(added().sort()).toEqual(['1.mp3', '2.ogg', '3.m4a'])
    expect(success).toHaveBeenCalledWith(toastFor(3))
  })
})

describe('FileUploadPanel – Einfügen', () => {
  it('Strg+V mit Audiodatei fügt sie hinzu, Text wird ignoriert', () => {
    const paste = (items) => {
      const ev = new Event('paste')
      ev.clipboardData = { items }
      document.dispatchEvent(ev)
    }
    paste([{ kind: 'string', type: 'text/plain' }])
    expect(addTracks).not.toHaveBeenCalled()
    paste([{ kind: 'file', type: 'audio/mpeg', getAsFile: () => audio('clip.mp3') }])
    expect(added()).toEqual(['clip.mp3'])
  })

  it('nach dem Entfernen kein Einfügen mehr', () => {
    wrapper.unmount()
    const ev = new Event('paste')
    ev.clipboardData = {
      items: [{ kind: 'file', type: 'audio/mpeg', getAsFile: () => audio('x.mp3') }],
    }
    document.dispatchEvent(ev)
    expect(addTracks).not.toHaveBeenCalled()
    wrapper = mount(FileUploadPanel)
  })
})

describe('FileUploadPanel – Anzeige', () => {
  it('zeigt die Anzahl der Titel, sobald welche geladen sind', async () => {
    expect(wrapper.find('.tracks-info').exists()).toBe(false)
    player.playlist.push({ name: 'a' }, { name: 'b' })
    await flushPromises()
    expect(wrapper.find('.tracks-info').text()).toContain('2')
    expect(wrapper.find('.upload-area').text()).toContain('2')
  })
})

describe('FileUploadPanel – Sprache und Ui-Bausteine', () => {
  it('Texte aus i18n, Knöpfe als UiButton', async () => {
    const { setLocale } = useI18n()
    const buttons = () => wrapper.findAll('.upload-area button')
    expect(buttons().map((b) => b.text())).toEqual([de.fileUpload.files, de.fileUpload.folder])
    expect(buttons().every((b) => b.classes('ui-button'))).toBe(true)
    expect(wrapper.text()).toContain(de.fileUpload.dragHint)
    await setLocale('en')
    try {
      await flushPromises()
      expect(buttons().map((b) => b.text())).toEqual([en.fileUpload.files, en.fileUpload.folder])
      expect(wrapper.text()).toContain(en.fileUpload.pasteHint)
    } finally {
      await setLocale('de')
    }
  })
})
