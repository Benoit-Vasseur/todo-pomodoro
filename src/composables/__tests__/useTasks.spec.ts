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
})
