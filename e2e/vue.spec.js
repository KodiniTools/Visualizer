import { test, expect } from '@playwright/test'

// E2E-Smoke-Tests für die Routen der App. Bewusst ohne hartkodierte
// Übersetzungstexte, damit die Tests bei Textänderungen stabil bleiben.

test('Landing-Page rendert die Hero-Überschrift', async ({ page }) => {
  await page.goto('/')
  const title = page.locator('h1.hero-title')
  await expect(title).toBeVisible()
  await expect(title).not.toHaveText('')
})

test('Hero-Button öffnet den Visualizer unter /app', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-actions a[href="/app"]').click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.locator('#app-container')).toBeVisible()
})

test('Direktaufruf von /app lädt den Visualizer', async ({ page }) => {
  await page.goto('/app')
  await expect(page.locator('#app-container')).toBeVisible()
})

test('Landing mit source=audiokonverter leitet zum Visualizer weiter', async ({ page }) => {
  await page.goto('/?source=audiokonverter')
  await expect(page).toHaveURL(/\/app\?source=audiokonverter$/)
  await expect(page.locator('#app-container')).toBeVisible()
})
