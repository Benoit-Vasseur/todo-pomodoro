import { ref, type Ref } from 'vue'
import { getDb, type Task } from '@/db'

export function useTasks() {
  const tasks: Ref<Task[]> = ref([])
  const loading: Ref<boolean> = ref(false)

  async function loadTasks() {
    loading.value = true
    try {
      const db = await getDb()
      tasks.value = await db.getAllFromIndex('tasks', 'by_created')
    } finally {
      loading.value = false
    }
  }

  async function addTask(title: string) {
    const db = await getDb()
    const id = await db.add('tasks', {
      title,
      done: false,
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

  async function removeTask(id: number) {
    const db = await getDb()
    await db.delete('tasks', id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  return { tasks, loading, loadTasks, addTask, toggleTask, removeTask }
}
