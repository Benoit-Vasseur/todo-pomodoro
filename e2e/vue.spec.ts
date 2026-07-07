import { test, expect } from './fixtures'

test('visite la racine de l’application', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#app')).toBeAttached()
  // Le toggle de thème (et donc ses icônes lucide) doit rendre sans crash.
  await expect(
    page.getByRole('button', { name: /mode (sombre|clair)/ }),
  ).toBeVisible()
})
