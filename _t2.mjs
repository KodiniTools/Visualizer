import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 200))
})

await page.addInitScript(() => {
  localStorage.setItem(
    'visualizer_ticker_settings',
    JSON.stringify({
      enabled: true,
      text: 'TESTTICKER',
      fontSize: 60,
      fontFamily: 'Arial',
      bold: true,
      letterSpacing: 0,
      color: '#ff0000',
      bgColor: '#00ff00',
      bgOpacity: 100,
      speed: 100,
      direction: 'left',
      positionY: 100,
      audioReactive: false,
      beatIntensity: 60,
    }),
  )
})
await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)

async function sample(label, mutate) {
  const out = await page.evaluate(
    ({ mutate }) => {
      const root = document.querySelector('#app') || document.body.firstElementChild
      const app = root && root.__vue_app__
      const pinia = app?.config?.globalProperties?.$pinia
      const st = pinia?.state?.value
      if (!st) return { err: 'no pinia' }
      if (mutate === 'vizOff') {
        st.visualizer.showVisualizer = false
        st.player.isPlaying = true
      }
      if (mutate === 'vizOn') {
        st.visualizer.showVisualizer = true
        st.player.isPlaying = true
      }
      return {
        ok: true,
        showVisualizer: st.visualizer.showVisualizer,
        isPlaying: st.player.isPlaying,
      }
    },
    { mutate },
  )
  await page.waitForTimeout(1200)
  const px = await page.evaluate(() => {
    const c = document.querySelector('.canvas-wrapper canvas')
    const ctx = c.getContext('2d')
    const bandH = Math.round(60 * 1.6)
    const y = Math.max(0, c.height - bandH) + Math.floor(bandH / 2)
    const d = ctx.getImageData(0, y, c.width, 1).data
    let green = 0,
      red = 0,
      other = 0
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
      if (g > 200 && r < 80 && b < 80) green++
      else if (r > 200 && g < 80 && b < 80) red++
      else other++
    }
    return { green, red, other }
  })
  console.log(label, JSON.stringify(out), '=> pixels', JSON.stringify(px))
}

await sample('BASE (no mutation)     ', null)
await sample('VISUALIZER OFF+playing ', 'vizOff')
await sample('VISUALIZER ON +playing ', 'vizOn')
console.log('ERRORS:', errs.slice(0, 5).join(' | ') || '(none)')
await browser.close()
