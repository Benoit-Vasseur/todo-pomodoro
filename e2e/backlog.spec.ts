import { test, expect } from './fixtures'

// Parcours complet du backlog : couvre l'ensemble des tâches de l'issue #2
// (créer, lister, éditer, supprimer, marquer terminée, persistance, drag & drop).
// Écrit avant l'implémentation — vert à la fin de toutes les tâches.

test('parcours complet CRUD backlog avec persistance', async ({ page }) => {
  await page.goto('/')

  // Le backlog est l'écran central.
  await expect(page.getByRole('heading', { name: 'Backlog' })).toBeVisible()

  // État initial : backlog vide.
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()

  // Créer une tâche (titre + description optionnelle).
  await page.getByRole('textbox', { name: 'Titre' }).fill('Écrire un brief')
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Définir le périmètre')
  await page.getByRole('button', { name: 'Ajouter' }).click()

  // Lister : la tâche apparaît dans le backlog.
  await expect(page.getByText('Écrire un brief', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Définir le périmètre', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Le backlog est vide.')).toBeHidden()

  // Persistance IndexedDB : la tâche survit à un reload.
  await page.reload()
  await expect(page.getByText('Écrire un brief', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Définir le périmètre', { exact: true }),
  ).toBeVisible()

  // Éditer la tâche (titre + description).
  await page.getByRole('button', { name: /Éditer/ }).click()
  await page
    .getByRole('textbox', { name: 'Modifier le titre' })
    .fill('Écrire un brief complet')
  await page
    .getByRole('textbox', { name: 'Modifier la description' })
    .fill('Périmètre et user stories')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(
    page.getByText('Écrire un brief complet', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Périmètre et user stories', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Écrire un brief', { exact: true })).toBeHidden()

  // Marquer comme terminée.
  const checkbox = page.getByRole('checkbox', { name: /Écrire un brief complet/ })
  await checkbox.check()
  await expect(checkbox).toBeChecked()

  // Supprimer la tâche.
  await page.getByRole('button', { name: /Supprimer/ }).click()
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()
})

test('réordonne les tâches par drag & drop', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()

  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche A')
  await page.getByRole('button', { name: 'Ajouter' }).click()
  // On attend que le formulaire soit réinitialisé avant de saisir la suivante
  // (addTask est asynchrone : sans cela, la 2e saisie peut écraser le reset).
  await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('')

  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche B')
  await page.getByRole('button', { name: 'Ajouter' }).click()
  await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('')

  // Ordre initial : A puis B.
  await expect(page.getByRole('listitem').nth(0)).toContainText('Tâche A')
  await expect(page.getByRole('listitem').nth(1)).toContainText('Tâche B')

  // Glisser B au-dessus de A (HTML5 DnD — on délègue les événements
  // dragstart/dragover/drop pour la fiabilité headless cross-browser).
  const itemA = page.getByRole('listitem').filter({ hasText: 'Tâche A' })
  const handleB = page
    .getByRole('listitem')
    .filter({ hasText: 'Tâche B' })
    .getByTestId('drag-handle')
  await handleB.dispatchEvent('dragstart')
  await itemA.dispatchEvent('dragover')
  await itemA.dispatchEvent('drop')

  // Nouvel ordre : B puis A.
  await expect(page.getByRole('listitem').nth(0)).toContainText('Tâche B')
  await expect(page.getByRole('listitem').nth(1)).toContainText('Tâche A')

  // L'ordre persiste après reload.
  await page.reload()
  await expect(page.getByRole('listitem').nth(0)).toContainText('Tâche B')
  await expect(page.getByRole('listitem').nth(1)).toContainText('Tâche A')
})
