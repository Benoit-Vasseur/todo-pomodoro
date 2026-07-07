import { test, expect } from './fixtures'

test('le dark mode se toggle et persiste après reload', async ({ page }) => {
  await page.goto('/')

  // Initialement en mode clair : pas de classe .dark sur <html>.
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

  // Active le mode sombre.
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)

  // Le choix persiste après reload (localStorage).
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)

  // Désactive le mode sombre.
  await page.getByRole('button', { name: 'Activer le mode clair' }).click()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})
