// @vitest-environment jsdom
// Charakterisierung des Zurücksetzen-Bereichs im Canvas-Panel (Hintergründe
// zurücksetzen, Canvas löschen mit Bestätigung). Zugriff über Texte, Namen und
// Rollen statt CSS-Klassen, damit die Tests den Wechsel auf die Ui-Bausteine
// unverändert überstehen.
import { describe, it, expect, afterEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, type Ref } from 'vue'
import ResetSection from '../../components/canvas-control/ResetSection.vue'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const C = de.canvasControl
let wrapper: VueWrapper | null
/** Attrappe der bereitgestellten Hintergrund-Einstellungen */
interface FakeBgSettings {
  hasImageBackground: Ref<boolean>
  hasVideoBackground: Ref<boolean>
  hasWorkspaceBackground: Ref<boolean>
  hasWorkspaceVideoBackground: Ref<boolean>
  isCanvasEmpty: Ref<boolean>
  resetNormalBackground: Mock
  resetWorkspaceBackgroundOnly: Mock
  resetAllBackgrounds: Mock
  confirmReset: Mock
}
let bg: FakeBgSettings

function mountSection(state: Record<string, boolean> = {}) {
  bg = {
    hasImageBackground: ref(false),
    hasVideoBackground: ref(false),
    hasWorkspaceBackground: ref(false),
    hasWorkspaceVideoBackground: ref(false),
    isCanvasEmpty: ref(false),
    resetNormalBackground: vi.fn(),
    resetWorkspaceBackgroundOnly: vi.fn(),
    resetAllBackgrounds: vi.fn(),
    confirmReset: vi.fn(),
  }
  for (const [k, v] of Object.entries(state))
    (bg[k as keyof FakeBgSettings] as Ref<boolean>).value = v
  wrapper = mount(
    { components: { ResetSection }, template: '<div><ResetSection /></div>' },
    {
      attachTo: document.body,
      global: { provide: { bgSettings: bg } },
    },
  )
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const body = () => document.body
const text = () => body().textContent!.replace(/\s+/g, ' ')
const buttons = () => [...body().querySelectorAll('button')]
const button = (name: string) => buttons().find((b) => b.textContent!.trim() === name)
/** Bestätigungs-Knopf „Löschen“ im Dialog (nicht „Alles löschen“). */
const confirmButton = () => button(de.common.delete)

describe('Zurücksetzen – Hintergründe', () => {
  it('Überschrift, Hinweis und drei Knöpfe', () => {
    mountSection()
    expect(text()).toContain(C.resetBackground)
    expect(text()).toContain(C.selectWhatToReset)
    expect(button(C.normalBackground)).toBeTruthy()
    expect(button(C.workspaceBackground)).toBeTruthy()
    expect(button(C.resetAll)).toBeTruthy()
  })

  it('ohne Hintergründe sind die Einzel-Knöpfe gesperrt, „Alle“ nicht', () => {
    mountSection()
    expect(button(C.normalBackground)!.disabled).toBe(true)
    expect(button(C.workspaceBackground)!.disabled).toBe(true)
    expect(button(C.resetAll)!.disabled).toBe(false)
  })

  it('Bild- oder Video-Hintergrund gibt den passenden Knopf frei', () => {
    mountSection({ hasVideoBackground: true, hasWorkspaceBackground: true })
    expect(button(C.normalBackground)!.disabled).toBe(false)
    expect(button(C.workspaceBackground)!.disabled).toBe(false)
  })

  it('Knöpfe haben eine Erklärung und rufen das Zurücksetzen auf', () => {
    mountSection({ hasImageBackground: true, hasWorkspaceVideoBackground: true })
    expect(button(C.normalBackground)!.getAttribute('title')).toBe(C.resetNormalBg)
    expect(button(C.workspaceBackground)!.getAttribute('title')).toBe(C.resetWorkspaceBg)
    button(C.normalBackground)!.click()
    button(C.workspaceBackground)!.click()
    button(C.resetAll)!.click()
    expect(bg.resetNormalBackground).toHaveBeenCalledTimes(1)
    expect(bg.resetWorkspaceBackgroundOnly).toHaveBeenCalledTimes(1)
    expect(bg.resetAllBackgrounds).toHaveBeenCalledTimes(1)
  })
})

describe('Zurücksetzen – Canvas löschen', () => {
  it('leerer Canvas: Knopf gesperrt, Hinweis sichtbar', () => {
    mountSection({ isCanvasEmpty: true })
    expect(text()).toContain(C.clearCanvas)
    expect(text()).toContain(C.removesAll)
    expect(button(C.deleteAll)!.disabled).toBe(true)
    expect(text()).toContain(C.canvasEmpty)
  })

  it('Löschen fragt nach, Bestätigen löscht und schließt', async () => {
    mountSection()
    expect(text()).not.toContain(C.canvasEmpty)
    expect(text()).not.toContain(C.confirmClearText)
    button(C.deleteAll)!.click()
    await nextTick()
    expect(text()).toContain(C.confirmClear)
    expect(text()).toContain(C.confirmClearText)
    expect(bg.confirmReset).not.toHaveBeenCalled()
    confirmButton()!.click()
    await nextTick()
    expect(bg.confirmReset).toHaveBeenCalledTimes(1)
    expect(text()).not.toContain(C.confirmClearText)
  })

  it('Abbrechen und Klick auf den Hintergrund schließen ohne Löschen', async () => {
    mountSection()
    button(C.deleteAll)!.click()
    await nextTick()
    button(de.common.cancel)!.click()
    await nextTick()
    expect(text()).not.toContain(C.confirmClearText)
    button(C.deleteAll)!.click()
    await nextTick()
    const dialogText = [...body().querySelectorAll('p')].find(
      (p) => p.textContent!.trim() === C.confirmClearText,
    )
    dialogText!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(text()).toContain(C.confirmClearText)
    const backdrop =
      body().querySelector('[role="dialog"]')?.parentElement ??
      dialogText!.parentElement!.parentElement
    backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(text()).not.toContain(C.confirmClearText)
    expect(bg.confirmReset).not.toHaveBeenCalled()
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      mountSection()
      expect(text()).toContain(en.canvasControl.resetBackground)
      expect(button(en.canvasControl.deleteAll)).toBeTruthy()
    } finally {
      await setLocale('de')
    }
  })
})

describe('Zurücksetzen – Ui-Bausteine', () => {
  it('Knöpfe sind Ui-Buttons, „Alles löschen“ danger', () => {
    mountSection({ hasImageBackground: true })
    for (const n of [C.normalBackground, C.workspaceBackground, C.resetAll, C.deleteAll]) {
      expect(button(n)!.classList.contains('ui-button'), n).toBe(true)
    }
    expect(button(C.deleteAll)!.classList.contains('ui-button--danger')).toBe(true)
  })

  it('Bestätigung als Dialog mit Titel und Beschreibung, Escape schließt', async () => {
    mountSection()
    button(C.deleteAll)!.click()
    await nextTick()
    const dialog = body().querySelector('[role="dialog"]')
    expect(document.getElementById(dialog!.getAttribute('aria-labelledby')!)!.textContent).toBe(
      C.confirmClear,
    )
    expect(
      document.getElementById(dialog!.getAttribute('aria-describedby')!)!.textContent!.trim(),
    ).toBe(C.confirmClearText)
    expect(confirmButton()!.classList.contains('ui-button--danger')).toBe(true)
    dialog!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(body().querySelector('[role="dialog"]')).toBeNull()
    expect(bg.confirmReset).not.toHaveBeenCalled()
  })
})
