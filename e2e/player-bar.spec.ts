import { test, expect } from './helpers/app'

// Die Player-Leiste muss auf üblichen Fensterbreiten vollständig bedienbar sein:
// kein Button außerhalb des Fensters, Fortschrittsbalken breit genug zum Spulen,
// und die Leiste verdeckt den Inhalt nicht.

const sizes = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
]

for (const size of sizes) {
  test(`Player-Leiste ist bei ${size.width}×${size.height} vollständig bedienbar`, async ({
    app,
  }) => {
    await app.setViewportSize(size)

    const layout = await app.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('.spb-bar')
      const progress = document.querySelector<HTMLElement>('.progress-bar-container')
      const container = document.querySelector<HTMLElement>('#app-container')
      if (!bar || !progress || !container) return null
      const buttons = [...bar.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
      return {
        buttons: buttons.length,
        outside: buttons.filter(
          (r) => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight,
        ).length,
        progressWidth: progress.offsetWidth,
        barHeight: bar.offsetHeight,
        reserved: parseFloat(getComputedStyle(container).paddingBottom),
      }
    })

    expect(layout).not.toBeNull()
    expect(layout?.buttons).toBeGreaterThan(20)
    expect(layout?.outside).toBe(0)
    expect(layout?.progressWidth).toBeGreaterThanOrEqual(200)
    expect(layout?.reserved).toBeGreaterThanOrEqual(layout?.barHeight ?? Infinity)
  })
}
