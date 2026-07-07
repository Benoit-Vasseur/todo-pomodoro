import { describe, it, expect, beforeEach } from 'vitest'
import { useTasks } from '@/composables/useTasks'
import { getDb } from '@/db'

function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined()
}

beforeEach(async () => {
  const db = await getDb()
  const stores = Array.from(db.objectStoreNames)
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) {
    tx.objectStore(store).clear()
  }
  await tx.done
})

describe('useTasks', () => {
  it('ajoute une tâche et la retourne dans la liste', async () => {
    const { addTask, loadTasks, tasks } = useTasks()

    await addTask('Faire les courses')
    await loadTasks()

    expect(tasks.value).toHaveLength(1)
    const task = tasks.value[0]
    assertDefined(task)
    expect(task.title).toBe('Faire les courses')
    expect(task.done).toBe(false)
  })

  it('bascule le statut done', async () => {
    const { addTask, toggleTask, loadTasks, tasks } = useTasks()

    await addTask('Apprendre Vitest')
    await loadTasks()

    const firstTask = tasks.value[0]
    assertDefined(firstTask)
    assertDefined(firstTask.id)
    await toggleTask(firstTask.id)

    await loadTasks()
    const toggledTask = tasks.value[0]
    assertDefined(toggledTask)
    expect(toggledTask.done).toBe(true)
  })

  it('supprime une tâche', async () => {
    const { addTask, removeTask, loadTasks, tasks } = useTasks()

    await addTask('À supprimer')
    await loadTasks()

    const taskToRemove = tasks.value[0]
    assertDefined(taskToRemove)
    assertDefined(taskToRemove.id)
    await removeTask(taskToRemove.id)
    await loadTasks()

    expect(tasks.value).toHaveLength(0)
  })

  it('assigne un ordre croissant et liste les tâches par ordre', async () => {
    const { addTask, loadTasks, tasks } = useTasks()

    await addTask('Première')
    await addTask('Deuxième')
    await addTask('Troisième')
    await loadTasks()

    expect(tasks.value.map((t) => t.title)).toEqual([
      'Première',
      'Deuxième',
      'Troisième',
    ])
    expect(tasks.value.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('persiste la description optionnelle', async () => {
    const { addTask, loadTasks, tasks } = useTasks()

    await addTask('Avec description', 'Détails importants')
    await loadTasks()

    const task = tasks.value[0]
    assertDefined(task)
    expect(task.description).toBe('Détails importants')
  })

  it('persiste les tâches entre deux instances du composable', async () => {
    const first = useTasks()
    await first.addTask('Persistée')

    const second = useTasks()
    await second.loadTasks()

    expect(second.tasks.value.map((t) => t.title)).toEqual(['Persistée'])
  })

  it('met à jour une tâche et persiste le résultat', async () => {
    const { addTask, updateTask, loadTasks, tasks } = useTasks()

    await addTask('Titre initial', 'Desc initiale')
    await loadTasks()

    const task = tasks.value[0]
    assertDefined(task)
    assertDefined(task.id)
    await updateTask(task.id, {
      title: 'Titre édité',
      description: 'Desc éditée',
    })
    await loadTasks()

    const updated = tasks.value[0]
    assertDefined(updated)
    expect(updated.title).toBe('Titre édité')
    expect(updated.description).toBe('Desc éditée')
  })

  it('réordonne les tâches et persiste le nouvel ordre', async () => {
    const { addTask, reorderTask, loadTasks, tasks } = useTasks()

    await addTask('A')
    await addTask('B')
    await addTask('C')
    await loadTasks()

    // Ordre initial : A, B, C. On glisse C avant A.
    const a = tasks.value[0]
    const c = tasks.value[2]
    assertDefined(a)
    assertDefined(c)
    assertDefined(a.id)
    assertDefined(c.id)
    await reorderTask(c.id, a.id)
    await loadTasks()

    expect(tasks.value.map((t) => t.title)).toEqual(['C', 'A', 'B'])
    expect(tasks.value.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('déplace une tâche vers le bas (dernière position)', async () => {
    const { addTask, reorderTask, loadTasks, tasks } = useTasks()

    await addTask('A')
    await addTask('B')
    await addTask('C')
    await loadTasks()

    // On glisse A sur C : A doit passer après C (dernière position).
    const a = tasks.value[0]
    const c = tasks.value[2]
    assertDefined(a)
    assertDefined(c)
    assertDefined(a.id)
    assertDefined(c.id)
    await reorderTask(a.id, c.id)
    await loadTasks()

    expect(tasks.value.map((t) => t.title)).toEqual(['B', 'C', 'A'])
  })

  it("n'entre pas en collision d'ordre après une suppression", async () => {
    const { addTask, removeTask, loadTasks, tasks } = useTasks()

    await addTask('A')
    await addTask('B')
    await addTask('C')
    await loadTasks()

    const b = tasks.value[1]
    assertDefined(b)
    assertDefined(b.id)
    await removeTask(b.id) // reste A(order 0), C(order 2)

    await addTask('D') // doit obtenir order 3 (max+1), pas 2
    await loadTasks()

    expect(tasks.value.map((t) => t.title)).toEqual(['A', 'C', 'D'])
    const d = tasks.value[2]
    assertDefined(d)
    expect(d.order).toBe(3)
  })
})
