import { describe, it, expect } from 'vitest'
import { formatBytes } from '../../utils/formatBytes.js'

describe('formatBytes', () => {
  it('formatiert passend zur Sprache', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536, 'de')).toBe('1,5 KB')
    expect(formatBytes(1536, 'en')).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 ** 2)).toBe('5 MB')
    expect(formatBytes(2.25 * 1024 ** 3, 'en')).toBe('2.3 GB')
    expect(formatBytes(NaN)).toBe('0 B')
  })
})
