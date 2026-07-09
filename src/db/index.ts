import { openDB, type IDBPDatabase } from 'idb'

export type TaskStatus = 'todo' | 'doing' | 'done'

export type SessionStatus = 'completed' | 'interrupted' | 'abandoned'

export interface Task {
  id?: number
  title: string
  description?: string
  status: TaskStatus
  parentId?: number
  order: number
  createdAt: Date
  /**
   * @deprecated Champ legacy `done: boolean` de la v2. Conservé uniquement
   * pour le fuse à la lecture dans `useTasks.loadTasks()` (anti-cache
   * navigateur pourri). Les nouvelles tâches ne le portent pas.
   */
  done?: boolean
}

export interface Session {
  id?: number
  taskId?: number
  subTaskId?: number
  startTime: Date
  endTime?: Date
  status: SessionStatus
}

/** Champs d'une tâche modifiables par l'utilisateur (édition). */
export type TaskPatch = Partial<Pick<Task, 'title' | 'description'>>

export const DB_NAME = 'pomodoro-backlog'
const DB_VERSION = 3

/**
 * Calcule le `status` v3 à partir du champ legacy `done` v2.
 * `done === true` → `'done'`, tout le reste (false, absent) → `'todo'`.
 * Utilisé par la migration IndexedDB v2 → v3 et par le fuse à la lecture.
 */
export function backfillStatus(task: { done?: boolean }): TaskStatus {
  return task.done === true ? 'done' : 'todo'
}

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        // Création fraîche (v0 → v3) : stores + indexes d'un coup.
        if (oldVersion < 1) {
          const tasksStore = db.createObjectStore('tasks', {
            keyPath: 'id',
            autoIncrement: true,
          })
          tasksStore.createIndex('by_created', 'createdAt')
          tasksStore.createIndex('by_order', 'order')
        }

        // Migration v1 → v2 : backfill de `order` (ordre d'insertion).
        if (oldVersion < 2) {
          const tasksStore = transaction.objectStore('tasks')
          if (!tasksStore.indexNames.contains('by_order')) {
            tasksStore.createIndex('by_order', 'order')
          }
          let next = 0
          let cursor = await tasksStore.openCursor()
          while (cursor) {
            const value = cursor.value as Task
            if (value.order === undefined) {
              await cursor.update({ ...value, order: next })
            }
            next++
            cursor = await cursor.continue()
          }
        }

        // Migration v2 → v3 : `done: boolean` → `status: TaskStatus`,
        // `parentId` NON backfillé (laissé `undefined` = racine),
        // création de la table `sessions` (vide — #5 viendra y écrire).
        if (oldVersion < 3) {
          const tasksStore = transaction.objectStore('tasks')
          let cursor = await tasksStore.openCursor()
          while (cursor) {
            const value = cursor.value as Task
            const { done: _done, ...rest } = value
            await cursor.update({
              ...rest,
              status: backfillStatus(value),
            })
            cursor = await cursor.continue()
          }

          if (!db.objectStoreNames.contains('sessions')) {
            const sessionsStore = db.createObjectStore('sessions', {
              keyPath: 'id',
              autoIncrement: true,
            })
            sessionsStore.createIndex('by_taskId', 'taskId')
            sessionsStore.createIndex('by_status', 'status')
          }
        }
      },
    })
  }
  return dbPromise
}

/**
 * Réinitialise la connexion IndexedDB et supprime la base. Utilitaire
 * réservé aux tests pour simuler une migration depuis une version antérieure.
 */
export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
