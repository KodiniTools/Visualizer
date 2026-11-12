import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const main = readFileSync(join(__dirname, '..', 'main.ts'), 'utf8')

describe('main.ts', () => {
  // Landing/Blog werden lazy geladen; das Theme darf nicht davon abhängen,
  // dass eine dieser Seiten lib/theme importiert (Direktaufruf von /app).
  it('initialisiert das Theme unabhängig von der Start-Route', () => {
    expect(main).toMatch(/^import '\.\/lib\/theme'$/m)
  })

  it('mountet in einem eigenen Task (nicht im Bundle-Auswertungs-Task)', () => {
    expect(main).toMatch(/setTimeout\(\(\) => app\.mount\('#app'\), 0\)/)
  })
})
