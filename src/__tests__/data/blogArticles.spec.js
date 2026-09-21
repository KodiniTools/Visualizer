import { describe, it, expect } from 'vitest'
import { blogArticles, getBlogArticlesNewestFirst } from '../../data/blogArticles.js'

const LOCALES = ['de', 'en']
const LOCALIZED_FIELDS = ['tag', 'url', 'image', 'title', 'description']

describe('blogArticles (Daten für die Landing-Page)', () => {
  it('enthält beide Visualizer-Beiträge aus kodinitools.com/blog', () => {
    const ids = blogArticles.map((a) => a.id)
    expect(ids).toContain('visualizer-effekte')
    expect(ids).toContain('musik-video-tiktok')
  })

  it('hat eindeutige IDs', () => {
    const ids = blogArticles.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hat für jeden Beitrag ein gültiges ISO-Datum und eine positive Lesezeit', () => {
    for (const article of blogArticles) {
      expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(`${article.date}T00:00:00`).getTime())).toBe(false)
      expect(article.minutes).toBeGreaterThan(0)
    }
  })

  it('liefert alle lokalisierten Felder in de und en als absolute URLs bzw. nicht-leere Texte', () => {
    for (const article of blogArticles) {
      for (const field of LOCALIZED_FIELDS) {
        for (const lang of LOCALES) {
          const value = article[field][lang]
          expect(typeof value, `${article.id}.${field}.${lang}`).toBe('string')
          expect(value.length, `${article.id}.${field}.${lang}`).toBeGreaterThan(0)
        }
      }
      for (const lang of LOCALES) {
        expect(article.url[lang]).toMatch(/^https:\/\/kodinitools\.com\/.+\/$/)
        expect(article.image[lang]).toMatch(
          /^https:\/\/kodinitools\.com\/image\/.+\.(png|webp|jpg)$/,
        )
      }
      // EN-Beiträge liegen unter /en/blog/, DE-Beiträge unter /blog/
      expect(article.url.de).toMatch(/^https:\/\/kodinitools\.com\/blog\//)
      expect(article.url.en).toMatch(/^https:\/\/kodinitools\.com\/en\/blog\//)
    }
  })

  it('sortiert nach Datum absteigend, ohne das Original-Array zu verändern', () => {
    const original = blogArticles.map((a) => a.id)
    const sorted = getBlogArticlesNewestFirst()
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].date >= sorted[i].date).toBe(true)
    }
    expect(sorted[0].id).toBe('visualizer-effekte')
    expect(blogArticles.map((a) => a.id)).toEqual(original)
  })
})
