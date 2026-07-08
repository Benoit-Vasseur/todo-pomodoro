import { ref, type Ref } from 'vue'
import { getDb, backfillStatus, type Task, type TaskPatch } from '@/db'

export function useTasks() {
  const tasks: Ref<Task[]> = ref([])
  const loading: Ref<boolean> = ref(false)

  async function loadTasks() {
    loading.value = true
    try {
      const db = await getDb()
      const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
      // Fuse anti-cache navigateur pourri : un enregistrement pré-migration
      // (sans `status`) se voit réattribuer un statut à partir du champ
      // legacy `done`. Coût nul si `status` est déjà présent.
      tasks.value = all.map((task) =>
        task.status === undefined
          ? { ...task, status: backfillStatus(task) }
          : task,
      )
    } finally {
      loading.value = false
    }
  }

  async function addTask(title: string, description?: string) {
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    // max+1 plutôt que length : après suppressions, length peut entrer en
    // collision avec un ordre existant (trous dans la séquence).
    const order = all.reduce((max, t) => Math.max(max, t.order), -1) + 1
    const id = await db.add('tasks', {
      title,
      description,
      status: 'todo',
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
    // T1 : bascule binaire todo ↔ done. T6 affinera la sémantique
    // (cocher depuis `doing` → `done`, déclencheur « Démarrer » explicite).
    const next = task.status === 'done' ? 'todo' : 'done'
    const updated = { ...task, status: next }
    await db.put('tasks', updated)
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
  }

  async function updateTask(id: number, patch: TaskPatch) {
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
    // Sémantique « déposer sur la cible » : l'élément prend la place de la
    // cible — inséré avant si on remonte, après si on descend (permet
    // d'atteindre la dernière position).
    const insertAt = fromIdx <= toIdx ? toIdx + 1 : toIdx
    all.splice(insertAt, 0, dragged)
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
