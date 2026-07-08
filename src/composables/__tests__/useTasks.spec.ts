import { describe, it, expect, beforeEach } from 'vitest'
import { openDB } from 'idb'
import { useTasks } from '@/composables/useTasks'
import {
  getDb,
  __resetDbForTests,
  DB_NAME,
  backfillStatus,
  type Task,
  type TaskPatch,
} from '@/db'

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
    expect(task.status).toBe('todo')
    expect(task.done).toBeUndefined()
  })

  it('bascule le statut d’une tâche (todo ↔ done)', async () => {
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
    expect(toggledTask.status).toBe('done')
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

describe('backfillStatus (migration v2 → v3)', () => {
  it('transforme done:true en status "done"', () => {
    expect(backfillStatus({ done: true })).toBe('done')
  })

  it('transforme done:false en status "todo"', () => {
    expect(backfillStatus({ done: false })).toBe('todo')
  })

  it('transforme l’absence de done en status "todo"', () => {
    expect(backfillStatus({})).toBe('todo')
  })
})

describe('migration IndexedDB v2 → v3', () => {
  it('backfill status depuis done, supprime done, ne backfill pas parentId', async () => {
    await __resetDbForTests()

    // Ouverture d'une base v2 avec le schéma legacy (champ `done`).
    const v2 = await openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('by_created', 'createdAt')
          store.createIndex('by_order', 'order')
        }
      },
    })
    await v2.put('tasks', {
      title: 'Fait',
      done: true,
      order: 0,
      createdAt: new Date(),
    })
    await v2.put('tasks', {
      title: 'À faire',
      done: false,
      order: 1,
      createdAt: new Date(),
    })
    v2.close()

    // Réouverture via getDb() → déclenche la migration v2 → v3.
    const db = await getDb()
    const all = (await db.getAllFromIndex('tasks', 'by_order')) as Task[]

    expect(all).toHaveLength(2)
    const fait = all[0]
    const aFaire = all[1]
    assertDefined(fait)
    assertDefined(aFaire)
    expect(fait).toMatchObject({ title: 'Fait', status: 'done' })
    expect(fait.done).toBeUndefined()
    expect(fait.parentId).toBeUndefined()
    expect(aFaire).toMatchObject({ title: 'À faire', status: 'todo' })
    expect(aFaire.done).toBeUndefined()
    expect(aFaire.parentId).toBeUndefined()
  })

  it('crée la table sessions (vide) avec index by_taskId et by_status', async () => {
    const db = await getDb()
    expect(db.objectStoreNames.contains('sessions')).toBe(true)
    const store = db.transaction('sessions').store
    expect(store.indexNames.contains('by_taskId')).toBe(true)
    expect(store.indexNames.contains('by_status')).toBe(true)
    const count = await store.count()
    expect(count).toBe(0)
  })
})

describe('fuse à la lecture dans loadTasks', () => {
  it('rétablit status depuis done pour les enregistrements non migrés (cache navigateur pourri)', async () => {
    const db = await getDb()
    // Insertion brute d’enregistrements v2 (sans `status`) pour simuler
    // un cache navigateur qui servirait des données pré-migration.
    await db.put('tasks', {
      id: 1,
      title: 'Fait (stale)',
      done: true,
      order: 0,
      createdAt: new Date(),
    })
    await db.put('tasks', {
      id: 2,
      title: 'À faire (stale)',
      done: false,
      order: 1,
      createdAt: new Date(),
    })

    const { loadTasks, tasks } = useTasks()
    await loadTasks()

    expect(tasks.value).toHaveLength(2)
    const fait = tasks.value[0]
    const aFaire = tasks.value[1]
    assertDefined(fait)
    assertDefined(aFaire)
    expect(fait.status).toBe('done')
    expect(aFaire.status).toBe('todo')
  })

  it('rétablit status "todo" quand done est absent et status absent', async () => {
    const db = await getDb()
    await db.put('tasks', {
      id: 1,
      title: 'Stale sans done',
      order: 0,
      createdAt: new Date(),
    })

    const { loadTasks, tasks } = useTasks()
    await loadTasks()

    const task = tasks.value[0]
    assertDefined(task)
    expect(task.status).toBe('todo')
  })
})

describe('TaskPatch', () => {
  it('accepte un patch title/description', () => {
    const patch: TaskPatch = { title: 'Nouveau', description: 'Nouvelle desc' }
    expect(patch.title).toBe('Nouveau')
  })
})
