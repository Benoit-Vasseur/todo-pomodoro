import { test, expect } from './fixtures'

test('visite la racine de l’application', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#app')).toBeAttached()
})
