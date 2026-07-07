import { ref, type Ref } from 'vue'
import { getDb, type Task } from '@/db'

export function useTasks() {
  const tasks: Ref<Task[]> = ref([])
  const loading: Ref<boolean> = ref(false)

  async function loadTasks() {
    loading.value = true
    try {
      const db = await getDb()
      tasks.value = await db.getAllFromIndex('tasks', 'by_order')
    } finally {
      loading.value = false
    }
  }

  async function addTask(title: string, description?: string) {
    const db = await getDb()
    const all = await db.getAllFromIndex('tasks', 'by_order')
    const order = all.length
    const id = await db.add('tasks', {
      title,
      description,
      done: false,
      order,
      createdAt: new Date(),
    })
    const task = await db.get('tasks', id)
    if (task) tasks.value.push(task)
    return task
  }

  async function toggleTask(id: number) {
    const db = await getDb()
    const task = await db.get('tasks', id)
    if (!task) return
    task.done = !task.done
    await db.put('tasks', task)
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = task
  }

  async function updateTask(
    id: number,
    patch: Partial<Pick<Task, 'title' | 'description'>>,
  ) {
    const db = await getDb()
    const task = await db.get('tasks', id)
    if (!task) return
    const updated = { ...task, ...patch }
    await db.put('tasks', updated)
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
  }

  async function removeTask(id: number) {
    const db = await getDb()
    await db.delete('tasks', id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  async function reorderTask(draggedId: number, targetId: number) {
    if (draggedId === targetId) return
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const fromIdx = all.findIndex((t) => t.id === draggedId)
    if (fromIdx === -1) return
    const removed = all.splice(fromIdx, 1)
    const dragged = removed[0]
    if (!dragged) return
    const toIdx = all.findIndex((t) => t.id === targetId)
    if (toIdx === -1) return
    all.splice(toIdx, 0, dragged)
    const reordered = all.map((task, index) => ({ ...task, order: index }))
    const tx = db.transaction('tasks', 'readwrite')
    await Promise.all(
      reordered
        .filter((t) => t.id !== undefined)
        .map((t) => tx.store.put(t)),
    )
    await tx.done
    tasks.value = reordered
  }

  return { tasks, loading, loadTasks, addTask, toggleTask, updateTask, removeTask, reorderTask }
}
