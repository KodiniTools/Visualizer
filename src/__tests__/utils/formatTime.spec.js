import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatTimePrecise,
  parseTimeInput,
  roundToHundredths,
} from '../../utils/formatTime.js'

describe('formatTime (unverändert, ganze Sekunden)', () => {
  it('formatiert M:SS', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(18.5)).toBe('0:18')
    expect(formatTime(90)).toBe('1:30')
    expect(formatTime(NaN)).toBe('0:00')
  })
})

describe('formatTimePrecise', () => {
  it('formatiert M:SS.hh mit Hundertsteln', () => {
    expect(formatTimePrecise(0)).toBe('0:00.00')
    expect(formatTimePrecise(18)).toBe('0:18.00')
    expect(formatTimePrecise(18.5)).toBe('0:18.50')
    expect(formatTimePrecise(90.25)).toBe('1:30.25')
    expect(formatTimePrecise(5.004)).toBe('0:05.00')
    expect(formatTimePrecise(5.005)).toBe('0:05.01')
    expect(formatTimePrecise(3599.99)).toBe('59:59.99')
  })

  it('bleibt bei Rundung an der Minutengrenze konsistent', () => {
    expect(formatTimePrecise(59.999)).toBe('1:00.00')
  })

  it('liefert 0:00.00 für ungültige oder negative Werte', () => {
    expect(formatTimePrecise(NaN)).toBe('0:00.00')
    expect(formatTimePrecise(-1)).toBe('0:00.00')
  })
})

describe('parseTimeInput', () => {
  it('parst ganze Sekunden und M:SS wie bisher', () => {
    expect(parseTimeInput('90')).toBe(90)
    expect(parseTimeInput('1:30')).toBe(90)
    expect(parseTimeInput(' 0:18 ')).toBe(18)
  })

  it('parst Hundertstel mit Punkt oder Komma', () => {
    expect(parseTimeInput('18.5')).toBe(18.5)
    expect(parseTimeInput('18,5')).toBe(18.5)
    expect(parseTimeInput('1:30.25')).toBe(90.25)
    expect(parseTimeInput('1:30,25')).toBe(90.25)
    expect(parseTimeInput('0:18.00')).toBe(18)
  })

  it('rundet auf Hundertstel und akzeptiert H:MM:SS', () => {
    expect(parseTimeInput('1.239')).toBe(1.24)
    expect(parseTimeInput('1:02:03.5')).toBe(3723.5)
  })

  it('ergibt 0 bei leeren oder ungültigen Eingaben', () => {
    expect(parseTimeInput('')).toBe(0)
    expect(parseTimeInput(null)).toBe(0)
    expect(parseTimeInput('abc')).toBe(0)
    expect(parseTimeInput('1:')).toBe(0)
    expect(parseTimeInput('1:3x')).toBe(0)
  })

  it('ist die Umkehrung von formatTimePrecise', () => {
    for (const s of [0, 0.01, 18.37, 59.99, 60, 125.5, 3599.99]) {
      expect(parseTimeInput(formatTimePrecise(s))).toBe(s)
    }
  })
})

describe('roundToHundredths', () => {
  it('rundet ohne Float-Rauschen', () => {
    expect(roundToHundredths(0.1 + 0.2)).toBe(0.3)
    expect(roundToHundredths(18.004999)).toBe(18)
  })
})
