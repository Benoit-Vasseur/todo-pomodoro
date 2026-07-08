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

describe('addSubTask — sous-tâches nobles', () => {
  it('crée une sous-tâche avec parentId, status "todo" et order propre', async () => {
    const { addTask, addSubTask, loadTasks, tasks } = useTasks()
    const parent = await addTask('Parent')
    assertDefined(parent)
    assertDefined(parent.id)
    await addSubTask(parent.id, 'Sous-tâche')

    await loadTasks()
    const sub = tasks.value.find((t) => t.title === 'Sous-tâche')
    assertDefined(sub)
    assertDefined(sub.id)
    expect(sub.parentId).toBe(parent.id)
    expect(sub.status).toBe('todo')
    expect(sub.order).toBe(0)
  })

  it('assigne un order croissant aux sous-tâches d’un même parent', async () => {
    const { addTask, addSubTask, loadTasks, tasks } = useTasks()
    const parent = await addTask('Parent')
    assertDefined(parent)
    assertDefined(parent.id)
    await addSubTask(parent.id, 'Sous A')
    await addSubTask(parent.id, 'Sous B')

    await loadTasks()
    const subs = tasks.value.filter((t) => t.parentId === parent.id)
    expect(subs.map((t) => t.title)).toEqual(['Sous A', 'Sous B'])
    expect(subs.map((t) => t.order)).toEqual([0, 1])
  })

  it('refuse de créer une sous-tâche d’une sous-tâche (non-récursion)', async () => {
    const { addTask, addSubTask } = useTasks()
    const parent = await addTask('Parent')
    assertDefined(parent)
    assertDefined(parent.id)
    const sub = await addSubTask(parent.id, 'Sous-tâche')
    assertDefined(sub)
    assertDefined(sub.id)

    // Créer une sous-tâche de la sous-tâche → refus (récursion interdite).
    await expect(addSubTask(sub.id, 'Sous-sous-tâche')).rejects.toThrow(
      /récursion/i,
    )
  })

  it("l'order des sous-tâches est indépendant de l'order des racines", async () => {
    const { addTask, addSubTask, loadTasks, tasks } = useTasks()
    await addTask('Racine A') // order 0
    const parent = await addTask('Racine B') // order 1
    assertDefined(parent)
    assertDefined(parent.id)
    await addSubTask(parent.id, 'Sous B1') // order 0 (scope siblings)
    await addSubTask(parent.id, 'Sous B2') // order 1

    await loadTasks()
    const roots = tasks.value.filter((t) => t.parentId == null)
    const subs = tasks.value.filter((t) => t.parentId === parent.id)
    expect(roots.map((t) => t.order)).toEqual([0, 1])
    expect(subs.map((t) => t.order)).toEqual([0, 1])
  })
})

describe('reorderTask — ordonnancement à deux niveaux', () => {
  it('réordonne les racines entre elles sans toucher aux sous-tâches', async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const a = await addTask('A')
    await addTask('B')
    assertDefined(a)
    assertDefined(a.id)
    await addSubTask(a.id, 'A1')
    await addSubTask(a.id, 'A2')
    await loadTasks()

    const b = tasks.value.find((t) => t.title === 'B')
    assertDefined(b)
    assertDefined(b.id)
    // B avant A.
    await reorderTask(b.id, a.id!)
    await loadTasks()

    const roots = tasks.value
      .filter((t) => t.parentId == null)
      .sort((x, y) => x.order - y.order)
    expect(roots.map((t) => t.title)).toEqual(['B', 'A'])
    const subs = tasks.value
      .filter((t) => t.parentId === a.id)
      .sort((x, y) => x.order - y.order)
    expect(subs.map((t) => t.title)).toEqual(['A1', 'A2'])
  })

  it('réordonne les sous-tâches d’un même parent (drag intra-niveau)', async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const parent = await addTask('Parent')
    assertDefined(parent)
    assertDefined(parent.id)
    await addSubTask(parent.id, 'S1')
    const s2 = await addSubTask(parent.id, 'S2')
    await addSubTask(parent.id, 'S3')
    await loadTasks()

    const s1 = tasks.value.find((t) => t.title === 'S1')
    const s3 = tasks.value.find((t) => t.title === 'S3')
    assertDefined(s1)
    assertDefined(s3)
    assertDefined(s1.id)
    assertDefined(s3.id)
    assertDefined(s2?.id)
    // Glisser S3 avant S1.
    await reorderTask(s3.id, s1.id)
    await loadTasks()

    const subs = tasks.value
      .filter((t) => t.parentId === parent.id)
      .sort((x, y) => x.order - y.order)
    expect(subs.map((t) => t.title)).toEqual(['S3', 'S1', 'S2'])
  })

  it('isolation : refuse de dragger une racine sur une sous-tâche (inter-niveau)', async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const a = await addTask('A')
    await addTask('B')
    assertDefined(a)
    assertDefined(a.id)
    const sub = await addSubTask(a.id, 'A1')
    assertDefined(sub)
    assertDefined(sub.id)
    await loadTasks()

    const b = tasks.value.find((t) => t.title === 'B')
    assertDefined(b)
    assertDefined(b.id)
    // Drag B (racine) sur A1 (sous-tâche) → no-op.
    await reorderTask(b.id, sub.id)
    await loadTasks()

    const roots = tasks.value
      .filter((t) => t.parentId == null)
      .sort((x, y) => x.order - y.order)
    // L'ordre des racines est inchangé.
    expect(roots.map((t) => t.title)).toEqual(['A', 'B'])
  })

  it('isolation : refuse de dragger une sous-tâche sur une racine (inter-niveau)', async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const a = await addTask('A')
    await addTask('B')
    assertDefined(a)
    assertDefined(a.id)
    const sub = await addSubTask(a.id, 'A1')
    assertDefined(sub)
    assertDefined(sub.id)
    await loadTasks()

    const b = tasks.value.find((t) => t.title === 'B')
    assertDefined(b)
    assertDefined(b.id)
    // Drag A1 (sous-tâche) sur B (racine) → no-op.
    await reorderTask(sub.id, b.id)
    await loadTasks()

    const subs = tasks.value
      .filter((t) => t.parentId === a.id)
      .sort((x, y) => x.order - y.order)
    expect(subs.map((t) => t.title)).toEqual(['A1'])
  })

  it("isolation : ne mélange pas les sous-tâches de parents différents", async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const a = await addTask('A')
    const b = await addTask('B')
    assertDefined(a)
    assertDefined(b)
    assertDefined(a.id)
    assertDefined(b.id)
    await addSubTask(a.id, 'A1')
    await addSubTask(b.id, 'B1')
    await loadTasks()

    const a1 = tasks.value.find((t) => t.title === 'A1')
    const b1 = tasks.value.find((t) => t.title === 'B1')
    assertDefined(a1)
    assertDefined(b1)
    assertDefined(a1.id)
    assertDefined(b1.id)
    // Drag A1 sur B1 (parents différents) → no-op.
    await reorderTask(a1.id, b1.id)
    await loadTasks()

    const subsA = tasks.value
      .filter((t) => t.parentId === a.id)
      .sort((x, y) => x.order - y.order)
    const subsB = tasks.value
      .filter((t) => t.parentId === b.id)
      .sort((x, y) => x.order - y.order)
    expect(subsA.map((t) => t.title)).toEqual(['A1'])
    expect(subsB.map((t) => t.title)).toEqual(['B1'])
  })

  it('le drag d’une racine déplace son groupe (sous-tâches attachées en bloc)', async () => {
    const { addTask, addSubTask, reorderTask, loadTasks, tasks } = useTasks()
    const a = await addTask('A')
    assertDefined(a)
    assertDefined(a.id)
    await addSubTask(a.id, 'A1')
    await addSubTask(a.id, 'A2')
    const b = await addTask('B')
    assertDefined(b)
    assertDefined(b.id)
    await loadTasks()

    // Ordre initial : A, A1, A2, B. On glisse B avant A.
    await reorderTask(b.id, a.id!)
    await loadTasks()

    // Nouvel ordre attendu : B, A, A1, A2 (groupe A+A1+A2 déplacé en bloc).
    const roots = tasks.value
      .filter((t) => t.parentId == null)
      .sort((x, y) => x.order - y.order)
    expect(roots.map((t) => t.title)).toEqual(['B', 'A'])
    // Les sous-tâches restent rattachées à A et ordonnées.
    const subs = tasks.value
      .filter((t) => t.parentId === a.id)
      .sort((x, y) => x.order - y.order)
    expect(subs.map((t) => t.title)).toEqual(['A1', 'A2'])
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
