import { test, expect } from './fixtures'

test('abandon : démarrer une tâche B abandonne la session de A', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()

  // Créer la tâche A.
  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche A')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('Tâche A')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('')

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Tâche A' })
    .getByRole('button', { name: /Démarrer/ })
    .click()

  await expect(page.getByTestId('timer-display')).toBeVisible()
  await expect(page.getByTestId('timer-display')).toHaveText('25:00')

  // Créer la tâche B.
  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche B')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('Tâche B')).toBeVisible()

  // Démarrer B → le timer passe sur B, session A abandonnée.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Tâche B' })
    .getByRole('button', { name: /Démarrer/ })
    .click()

  // Le timer est toujours visible (sur B maintenant).
  await expect(page.getByTestId('timer-display')).toBeVisible()
  await expect(page.getByTestId('timer-display')).toHaveText('25:00')

  // Vérifier que la session de A est abandonnée dans IndexedDB.
  const sessions = await page.evaluate(async () => {
    const db = await new Promise<any>((resolve, reject) => {
      const req = indexedDB.open('pomodoro-backlog', 3)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('sessions', 'readonly')
    const store = tx.objectStore('sessions')
    const all = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return all.map((s: any) => ({ taskId: s.taskId, status: s.status }))
  })

  const abandonedA = sessions.find(
    (s: any) => s.taskId === 1 && s.status === 'abandoned',
  )
  expect(abandonedA).toBeDefined()
})
