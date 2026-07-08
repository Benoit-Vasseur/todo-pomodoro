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
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

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
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  // On attend que le formulaire soit réinitialisé avant de saisir la suivante
  // (addTask est asynchrone : sans cela, la 2e saisie peut écraser le reset).
  await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('')

  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche B')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
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

test('crée une sous-tâche noble et l’affiche indentée sous son parent', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()

  // Créer une tâche parent.
  await page.getByRole('textbox', { name: 'Titre' }).fill('Tâche parent')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('Tâche parent', { exact: true })).toBeVisible()

  // Déplier le champ inline « + Sous-tâche » sur le parent.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Tâche parent' })
    .getByRole('button', { name: /sous-tâche/i })
    .click()

  // Saisir le titre de la sous-tâche et valider.
  await page
    .getByRole('textbox', { name: /Titre de la sous-tâche/i })
    .fill('Première sous-tâche')
  await page.getByRole('button', { name: /Ajouter la sous-tâche/i }).click()

  // La sous-tâche apparaît sous le parent, indentée (data-testid sur l'item).
  const subItem = page
    .getByRole('listitem')
    .filter({ hasText: 'Première sous-tâche' })
  await expect(subItem).toBeVisible()
  await expect(subItem).toHaveAttribute('data-depth', '1')

  // Le parent précède la sous-tâche dans l'ordre d'affichage.
  const items = page.getByRole('listitem')
  await expect(items.nth(0)).toContainText('Tâche parent')
  await expect(items.nth(1)).toContainText('Première sous-tâche')

  // La sous-tâche n'expose pas de bouton « + Sous-tâche » (récursion interdite).
  await expect(
    subItem.getByRole('button', { name: /Ajouter une sous-tâche/i }),
  ).toHaveCount(0)

  // Persistance : la hiérarchie survit au reload.
  await page.reload()
  await expect(page.getByText('Tâche parent', { exact: true })).toBeVisible()
  await expect(page.getByText('Première sous-tâche', { exact: true })).toBeVisible()
  const subItemAfterReload = page
    .getByRole('listitem')
    .filter({ hasText: 'Première sous-tâche' })
  await expect(subItemAfterReload).toHaveAttribute('data-depth', '1')
})

test('le drag d’une racine déplace son groupe de sous-tâches en bloc', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('Le backlog est vide.')).toBeVisible()

  // Parent A + deux sous-tâches, puis parent B.
  await page.getByRole('textbox', { name: 'Titre' }).fill('Parent A')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('')

  // Sous-tâche A1.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Parent A' })
    .getByRole('button', { name: /sous-tâche/i })
    .click()
  await page
    .getByRole('textbox', { name: /Titre de la sous-tâche/i })
    .fill('A1')
  await page.getByRole('button', { name: /Ajouter la sous-tâche/i }).click()
  await expect(page.getByText('A1', { exact: true })).toBeVisible()

  // Sous-tâche A2.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Parent A' })
    .getByRole('button', { name: /sous-tâche/i })
    .click()
  await page
    .getByRole('textbox', { name: /Titre de la sous-tâche/i })
    .fill('A2')
  await page.getByRole('button', { name: /Ajouter la sous-tâche/i }).click()

  // Parent B (racine suivante).
  await page.getByRole('textbox', { name: 'Titre' }).fill('Parent B')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

  // Ordre initial : Parent A, A1, A2, Parent B.
  const items = page.getByRole('listitem')
  await expect(items.nth(0)).toContainText('Parent A')
  await expect(items.nth(1)).toContainText('A1')
  await expect(items.nth(2)).toContainText('A2')
  await expect(items.nth(3)).toContainText('Parent B')

  // Glisser B avant A : le groupe A+A1+A2 descend en bloc.
  const handleB = page
    .getByRole('listitem')
    .filter({ hasText: 'Parent B' })
    .getByTestId('drag-handle')
  const itemA = page.getByRole('listitem').filter({ hasText: 'Parent A' })
  await handleB.dispatchEvent('dragstart')
  await itemA.dispatchEvent('dragover')
  await itemA.dispatchEvent('drop')

  // Nouvel ordre : Parent B, Parent A, A1, A2 (groupe déplacé en bloc).
  await expect(items.nth(0)).toContainText('Parent B')
  await expect(items.nth(1)).toContainText('Parent A')
  await expect(items.nth(2)).toContainText('A1')
  await expect(items.nth(3)).toContainText('A2')

  // L'ordre persiste après reload.
  await page.reload()
  await expect(items.nth(0)).toContainText('Parent B')
  await expect(items.nth(1)).toContainText('Parent A')
  await expect(items.nth(2)).toContainText('A1')
  await expect(items.nth(3)).toContainText('A2')
})
