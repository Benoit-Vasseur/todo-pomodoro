import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(async () => {
  const dbModule = await import('@/db')
  dbModule._resetDb()
  await dbModule._clearAll()
})

async function useTasksFresh() {
  const m = await import('@/composables/useTasks')
  return m.useTasks()
}

describe('useTasks', () => {
  it('ajoute une tâche et la retourne dans la liste', async () => {
    const { addTask, loadTasks, tasks } = await useTasksFresh()

    await addTask('Faire les courses')
    await loadTasks()

    expect(tasks.value).toHaveLength(1)
    expect(tasks.value[0].title).toBe('Faire les courses')
    expect(tasks.value[0].done).toBe(false)
  })

  it('bascule le statut done', async () => {
    const { addTask, toggleTask, loadTasks, tasks } = await useTasksFresh()

    await addTask('Apprendre Vitest')
    await loadTasks()
    await toggleTask(tasks.value[0].id!)

    await loadTasks()
    expect(tasks.value[0].done).toBe(true)
  })

  it('supprime une tâche', async () => {
    const { addTask, removeTask, loadTasks, tasks } = await useTasksFresh()

    await addTask('À supprimer')
    await loadTasks()
    await removeTask(tasks.value[0].id!)
    await loadTasks()

    expect(tasks.value).toHaveLength(0)
  })

  it('retourne les tâches triées par date de création', async () => {
    const { addTask, loadTasks, tasks } = await useTasksFresh()

    await addTask('Première')
    await addTask('Deuxième')
    await loadTasks()

    expect(tasks.value.map((t) => t.title)).toEqual(['Première', 'Deuxième'])
  })
})
