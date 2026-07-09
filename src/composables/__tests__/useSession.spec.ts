import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from '@/db'
import { useSession } from '@/composables/useSession'

describe('useSession', () => {
  beforeEach(async () => {
    const db = await getDb()
    const stores = Array.from(db.objectStoreNames)
    const tx = db.transaction(stores, 'readwrite')
    for (const store of stores) {
      tx.objectStore(store).clear()
    }
    await tx.done
  })

  it('crée une session dans IndexedDB', async () => {
    const { createSession } = useSession()
    const now = new Date()
    const id = await createSession({
      taskId: 1,
      status: 'completed',
      startTime: now,
    })
    expect(id).toBeGreaterThan(0)

    const db = await getDb()
    const session = await db.get('sessions', id)
    expect(session).toBeDefined()
    expect(session?.taskId).toBe(1)
    expect(session?.status).toBe('completed')
    expect(session?.startTime.getTime()).toBe(now.getTime())
  })

  it('crée une session avec subTaskId', async () => {
    const { createSession } = useSession()
    const now = new Date()
    const id = await createSession({
      subTaskId: 5,
      status: 'abandoned',
      startTime: now,
    })
    expect(id).toBeGreaterThan(0)

    const db = await getDb()
    const session = await db.get('sessions', id)
    expect(session?.subTaskId).toBe(5)
    expect(session?.endTime).toBeUndefined()
  })

  it('peut créer une session avec endTime', async () => {
    const { createSession } = useSession()
    const start = new Date('2025-01-01T10:00:00')
    const end = new Date('2025-01-01T10:25:00')
    const id = await createSession({
      taskId: 1,
      status: 'completed',
      startTime: start,
      endTime: end,
    })

    const db = await getDb()
    const session = await db.get('sessions', id)
    expect(session?.startTime.getTime()).toBe(start.getTime())
    expect(session?.endTime?.getTime()).toBe(end.getTime())
  })
})
