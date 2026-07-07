import { test, expect } from './fixtures'

test('visite la racine de l’application', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#app')).toBeAttached()
  // Le toggle de thème (et donc ses icônes lucide) doit rendr sans crash.
  await expect(page.getByRole('button')).toBeVisible()
})
