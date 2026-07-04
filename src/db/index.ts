import { openDB, type IDBPDatabase } from 'idb'

export interface Task {
  id?: number
  title: string
  done: boolean
  createdAt: Date
}

const DB_NAME = 'pomodoro-backlog'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('by_created', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

