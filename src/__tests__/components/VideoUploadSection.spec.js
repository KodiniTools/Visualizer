// @vitest-environment jsdom
// Charakterisierung des Video-Uploads im Video-Panel (Upload-Fläche, Galerie,
// Aktionen). Zugriff über sichtbare Texte und Labels statt CSS-Klassen, damit
// die Tests den Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import VideoUploadSection from '../../components/video-panel/VideoUploadSection.vue'
import { setLocale } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'

let wrapper
let vp

function makePanel(count, locale) {
  const fileInputRef = ref(null)
  return {
    locale: ref(locale),
    fileInputRef,
    videoGallery: ref(
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `clip-${i + 1}`,
        src: `blob:clip-${i + 1}`,
        duration: 65 + i,
      })),
    ),
    selectedVideoIndex: ref(null),
    triggerFileInput: vi.fn(() => fileInputRef.value?.click()),
    handleDrop: vi.fn(),
    handleVideoUpload: vi.fn(),
    generateThumbnail: vi.fn(),
    selectVideo: vi.fn(function (i) {
      vp.selectedVideoIndex.value = i
    }),
    deleteVideo: vi.fn(),
    clearAllVideos: vi.fn(),
    formatDuration: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    addVideoToCanvas: vi.fn(),
    setVideoAsBackground: vi.fn(),
    setVideoAsWorkspaceBackground: vi.fn(),
  }
}

async function mountSection(count = 2, locale = 'de') {
  await setLocale(locale)
  vp = makePanel(count, locale)
  wrapper = mount(VideoUploadSection, {
    attachTo: document.body,
    global: { provide: { videoPanel: vp } },
  })
  await flushPromises()
}

const body = () => document.body
const text = () => body().textContent.replace(/\s+/g, ' ')
function button(name) {
  const el = [...body().querySelectorAll('button')].find(
    (b) =>
      b.textContent.replace(/\s+/g, ' ').trim() === name ||
      b.getAttribute('aria-label') === name ||
      b.getAttribute('title') === name,
  )
  expect(el, `Knopf „${name}“`).toBeTruthy()
  return el
}
/** Element mit genau diesem Namen (Galerie-Kachel) */
const tile = (name) =>
  [...body().querySelectorAll('*')]
    .filter((el) => el.textContent.includes(name) && el.querySelector('video'))
    .pop()

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setLocale('de')
})

describe('Video-Upload', () => {
  it('Upload-Fläche: Formate, Klick öffnet die Dateiauswahl, Drop wird weitergereicht', async () => {
    await mountSection(0)
    expect(text()).toContain('MP4, WebM, MOV')
    const input = body().querySelector('input[type="file"]')
    expect(input.getAttribute('accept')).toBe('video/mp4,video/webm,video/ogg,video/quicktime')
    const area = [...body().querySelectorAll('*')]
      .filter((el) => el.textContent.includes('MP4, WebM, MOV') && el.children.length > 1)
      .pop()
    area.click()
    expect(vp.triggerFileInput).toHaveBeenCalled()
    area.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    expect(vp.handleDrop).toHaveBeenCalled()
    input.dispatchEvent(new Event('change'))
    expect(vp.handleVideoUpload).toHaveBeenCalled()
    expect(text()).not.toContain('Alle löschen')
  })

  it('Galerie: Anzahl, Name, Dauer; Auswahl und Löschen je Video', async () => {
    await mountSection(2)
    expect(text()).toContain('Videos (2)')
    expect(text()).toContain('clip-1')
    expect(text()).toContain('1:05')
    expect(text()).toContain('1:06')
    expect(body().querySelectorAll('video')).toHaveLength(2)

    tile('clip-2').click()
    await flushPromises()
    expect(vp.selectVideo).toHaveBeenCalledWith(1)

    const deletes = [...body().querySelectorAll('button')].filter(
      (b) =>
        b.textContent.trim() === '✕' || b.getAttribute('aria-label') === de.videoPanel.deleteVideo,
    )
    expect(deletes).toHaveLength(2)
    deletes[0].click()
    expect(vp.deleteVideo).toHaveBeenCalledWith(0)
    expect(vp.selectVideo).toHaveBeenCalledTimes(1)
  })

  it('„Alle löschen“', async () => {
    await mountSection(2)
    button('Alle löschen').click()
    expect(vp.clearAllVideos).toHaveBeenCalled()
  })

  it('Aktionen erscheinen erst nach Auswahl und rufen die Funktionen', async () => {
    await mountSection(1)
    expect(text()).not.toContain('Auf Canvas platzieren')
    vp.selectedVideoIndex.value = 0
    await flushPromises()
    button('Auf Canvas platzieren').click()
    button('Als Hintergrund').click()
    button('Workspace-Hintergrund').click()
    expect(vp.addVideoToCanvas).toHaveBeenCalled()
    expect(vp.setVideoAsBackground).toHaveBeenCalled()
    expect(vp.setVideoAsWorkspaceBackground).toHaveBeenCalled()
  })

  it('Englisch', async () => {
    await mountSection(1, 'en')
    vp.selectedVideoIndex.value = 0
    await flushPromises()
    expect(button('Delete all')).toBeTruthy()
    expect(button('Place on Canvas')).toBeTruthy()
    expect(button('As Background')).toBeTruthy()
    expect(button('Workspace Background')).toBeTruthy()
  })
})

describe('Video-Upload – Ui-Bausteine und Tastatur', () => {
  it('Upload-Fläche ist ein Knopf, Kacheln sind per Tastatur wählbar', async () => {
    await mountSection(2)
    const area = [...body().querySelectorAll('button')].find((b) =>
      b.textContent.includes(de.videoPanel.uploadFormats),
    )
    expect(area.textContent).toContain(de.videoPanel.uploadVideo)
    expect(area.querySelector('input')).toBeNull()

    const tiles = [...body().querySelectorAll('[role="button"][aria-pressed]')]
    expect(tiles.map((el) => el.getAttribute('aria-label'))).toEqual(['clip-1', 'clip-2'])
    tiles[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(vp.selectVideo).toHaveBeenCalledWith(1)
    expect(tiles[1].getAttribute('aria-pressed')).toBe('true')
    expect(body().textContent).not.toContain('✕')
  })
})
