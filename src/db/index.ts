import { openDB, type IDBPDatabase } from 'idb'

export interface Task {
  id?: number
  title: string
  description?: string
  done: boolean
  order: number
  createdAt: Date
}

/** Champs d'une tâche modifiables par l'utilisateur (édition). */
export type TaskPatch = Partial<Pick<Task, 'title' | 'description'>>

const DB_NAME = 'pomodoro-backlog'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        // Création fraîche (v2) : store + indexes d'un coup.
        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('by_created', 'createdAt')
          store.createIndex('by_order', 'order')
          return
        }

        // Migration v1 → v2 : ajout de l'index by_order et backfill de
        // `order` pour les enregistrements existants (ordre = ordre d'insertion).
        const store = transaction.objectStore('tasks')
        if (!store.indexNames.contains('by_order')) {
          store.createIndex('by_order', 'order')
        }
        if (oldVersion < 2) {
          let next = 0
          let cursor = await store.openCursor()
          while (cursor) {
            const value = cursor.value as Task
            if (value.order === undefined) {
              await cursor.update({ ...value, order: next })
            }
            next++
            cursor = await cursor.continue()
          }
        }
      },
    })
  }
  return dbPromise
}
