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
    // Scope : racines seulement (les sous-tâches ont leur propre order).
    const roots = all.filter((t) => t.parentId == null)
    const order = roots.reduce((max, t) => Math.max(max, t.order), -1) + 1
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

  async function addSubTask(
    parentId: number,
    title: string,
    description?: string,
  ) {
    const db = await getDb()
    const parent = await db.get('tasks', parentId)
    if (!parent) {
      throw new Error(`Parent introuvable (id=${parentId})`)
    }
    // Non-récursion : un parent qui a déjà un parentId est une sous-tâche.
    // Interdiction de créer une sous-tâche d'une sous-tâche.
    if (parent.parentId != null) {
      throw new Error(
        'Récursion interdite : une sous-tâche ne peut pas avoir de sous-tâche',
      )
    }
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const siblings = all.filter((t) => t.parentId === parentId)
    const order = siblings.reduce((max, t) => Math.max(max, t.order), -1) + 1
    const id = await db.add('tasks', {
      title,
      description,
      status: 'todo',
      parentId,
      order,
      createdAt: new Date(),
    })
    const task = await db.get('tasks', id)
    if (task) tasks.value.push(task)
    return task
  }

  async function toggleTask(id: number) {
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const task = all.find((t) => t.id === id)
    if (!task) return

    // Décocher : done → todo.
    if (task.status === 'done') {
      const updated = { ...task, status: 'todo' as const }
      await db.put('tasks', updated)
      // Invariant maintenu : si la tâche décochée est une sous-tâche et que
      // son parent était terminé, le parent ne peut plus l'être (une sous-
      // tâche n'est plus terminée) → il retombe à todo.
      const parent = updated.parentId != null
        ? all.find((t) => t.id === updated.parentId)
        : undefined
      if (parent && parent.status === 'done') {
        const parentUpdated = { ...parent, status: 'todo' as const }
        await db.put('tasks', parentUpdated)
        tasks.value = all.map((t) =>
          t.id === id ? updated : t.id === parent.id ? parentUpdated : t,
        )
      } else {
        tasks.value = all.map((t) => (t.id === id ? updated : t))
      }
      return
    }

    // Cocher : todo|doing → done (court-circuite doing). Blocage parent :
    // un parent ne peut pas être terminé tant qu'une sous-tâche ne l'est pas.
    const children = all.filter((t) => t.parentId === id)
    const incomplete = children.filter((t) => t.status !== 'done')
    if (incomplete.length > 0) {
      throw new Error(
        `Il reste ${incomplete.length} sous-tâche(s) non terminée(s)`,
      )
    }

    const updated = { ...task, status: 'done' as const }
    await db.put('tasks', updated)
    tasks.value = all.map((t) => (t.id === id ? updated : t))
  }

  async function startTask(id: number) {
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const target = all.find((t) => t.id === id)
    if (!target) return

    // Ancêtres de la cible (chaîne parentId — profondeur max 2, pas de
    // récursion). Une sous-tâche propage 'doing' à son parent.
    const ancestorIds = new Set<number>()
    if (target.parentId != null) {
      ancestorIds.add(target.parentId)
    }

    // Invariant « une seule en cours » : la cible + ses ancêtres passent à
    // 'doing', toutes les autres tâches 'doing' repassent à 'todo'. Les
    // tâches 'done' et 'todo' non concernées sont préservées.
    const tx = db.transaction('tasks', 'readwrite')
    const updated: Task[] = []
    for (const t of all) {
      if (t.id == null) continue
      if (t.id === id || ancestorIds.has(t.id)) {
        const next = { ...t, status: 'doing' as const }
        await tx.store.put(next)
        updated.push(next)
      } else if (t.status === 'doing') {
        const next = { ...t, status: 'todo' as const }
        await tx.store.put(next)
        updated.push(next)
      } else {
        updated.push(t)
      }
    }
    await tx.done
    tasks.value = updated
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
    // Cascade : supprime aussi les sous-tâches du parent. Les sessions sont
    // immortelles (ADR #0006) — on ne touche pas à la table `sessions`
    // (les références mortes sont conservées pour les stats journalières #10).
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const children = all.filter((t) => t.parentId === id)
    const tx = db.transaction('tasks', 'readwrite')
    await tx.store.delete(id)
    await Promise.all(
      children
        .filter((t) => t.id !== undefined)
        .map((t) => tx.store.delete(t.id!)),
    )
    await tx.done
    const removedIds = new Set([id, ...children.map((t) => t.id!)])
    tasks.value = tasks.value.filter((t) => !removedIds.has(t.id!))
  }

  async function reorderTask(draggedId: number, targetId: number) {
    if (draggedId === targetId) return
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]
    const dragged = all.find((t) => t.id === draggedId)
    const target = all.find((t) => t.id === targetId)
    if (!dragged || !target) return

    // Isolation intra-niveau : on ne drague qu'au sein du même niveau.
    //   - racines (parentId == null) entre elles
    //   - sous-tâches d'un même parent entre elles
    // Pas de drag inter-niveau, pas de mélange entre fratries.
    const draggedIsRoot = dragged.parentId == null
    const targetIsRoot = target.parentId == null
    if (draggedIsRoot !== targetIsRoot) return
    if (!draggedIsRoot && dragged.parentId !== target.parentId) return

    const level = draggedIsRoot
      ? all.filter((t) => t.parentId == null)
      : all.filter((t) => t.parentId === dragged.parentId)

    const fromIdx = level.findIndex((t) => t.id === draggedId)
    if (fromIdx === -1) return
    const removed = level.splice(fromIdx, 1)
    const draggedItem = removed[0]
    if (!draggedItem) return
    const toIdx = level.findIndex((t) => t.id === targetId)
    if (toIdx === -1) return
    // Sémantique « déposer sur la cible » : l'élément prend la place de la
    // cible — inséré avant si on remonte, après si on descend (permet
    // d'atteindre la dernière position).
    const insertAt = fromIdx <= toIdx ? toIdx + 1 : toIdx
    level.splice(insertAt, 0, draggedItem)
    const reordered = level.map((task, index) => ({ ...task, order: index }))
    const tx = db.transaction('tasks', 'readwrite')
    await Promise.all(
      reordered
        .filter((t) => t.id !== undefined)
        .map((t) => tx.store.put(t)),
    )
    await tx.done
    // Reconstruit la liste réactive en préservant toutes les tâches : seules
    // les tâches du niveau réordonné voient leur `order` changer. L'affichage
    // hiérarchique (côté vue) regroupe racines + sous-tâches par parent.
    tasks.value = all.map((t) => reordered.find((r) => r.id === t.id) ?? t)
  }

  return {
    tasks,
    loading,
    loadTasks,
    addTask,
    addSubTask,
    toggleTask,
    startTask,
    updateTask,
    removeTask,
    reorderTask,
  }
}
