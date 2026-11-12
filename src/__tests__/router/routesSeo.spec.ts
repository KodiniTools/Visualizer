import { describe, it, expect, vi } from 'vitest'

// Schwere Seitenkomponenten werden für den Meta-Check nicht gebraucht.
vi.mock('../../components/LandingPage.vue', () => ({ default: {} }))
vi.mock('../../components/InternalLandingPage.vue', () => ({ default: {} }))
vi.mock('../../components/BlogPage.vue', () => ({ default: {} }))
vi.mock('../../VisualizerApp.vue', () => ({ default: {} }))

const { routes } = await import('../../router/index')

const metaOf = (path: string) =>
  routes.find((r) => r.path === path)!.meta as Record<string, unknown>

describe('Route-Meta: Indexierung', () => {
  it.each(['/', '/blog', '/app'])('%s ist indexierbar', (path) => {
    expect(metaOf(path).robots).toBe('index, follow')
  })

  it('/internal bleibt von der Indexierung ausgeschlossen', () => {
    expect(metaOf('/internal').robots).toBe('noindex, nofollow')
  })

  it('/app hat Titel und Beschreibung in DE und EN', () => {
    const meta = metaOf('/app') as {
      title: string
      description: string
      en: { title: string; description: string }
    }
    expect(meta.title).toMatch(/Audio Visualizer Pro/)
    expect(meta.description.length).toBeGreaterThan(50)
    expect(meta.en.title).toMatch(/Audio Visualizer Pro/)
    expect(meta.en.description.length).toBeGreaterThan(50)
  })
})

describe('Route-Komponenten: Code-Splitting', () => {
  it('Landing, Blog und Interner Bereich werden erst bei Bedarf geladen', () => {
    for (const path of ['/', '/blog', '/internal']) {
      expect(typeof routes.find((r) => r.path === path)!.component).toBe('function')
    }
  })

  it('/app bleibt statisch eingebunden (kein zusätzlicher Request)', () => {
    expect(typeof routes.find((r) => r.path === '/app')!.component).toBe('object')
  })
})
