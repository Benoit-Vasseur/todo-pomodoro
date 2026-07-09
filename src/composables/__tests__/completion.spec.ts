import { describe, it, expect, beforeEach } from 'vitest'
import { getDb } from '@/db'
import { useTimer } from '@/composables/useTimer'
import { useSession } from '@/composables/useSession'
import { computeCounts } from '@/composables/usePomodoroCounts'
import type { Task } from '@/db'

describe('completion du timer', () => {
  beforeEach(async () => {
    const db = await getDb()
    const stores = Array.from(db.objectStoreNames)
    const tx = db.transaction(stores, 'readwrite')
    for (const store of stores) {
      tx.objectStore(store).clear()
    }
    await tx.done
  })

  it('la complétion crée une session completed dans IndexedDB', async () => {
    const timer = useTimer(1)
    const { createSession } = useSession()
    const startTime = new Date()

    timer.onComplete(async () => {
      await createSession({
        taskId: 1,
        status: 'completed',
        startTime,
        endTime: new Date(),
      })
    })

    timer.start()
    await new Promise((r) => setTimeout(r, 1500))

    const db = await getDb()
    const sessions = await db.getAll('sessions')
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.status).toBe('completed')
    expect(sessions[0]?.taskId).toBe(1)
  })

  it('le compteur pomodoro s’incrémente après complétion', async () => {
    const timer = useTimer(1)
    const { createSession } = useSession()
    const tasks: Task[] = [
      {
        id: 1,
        title: 'A',
        status: 'todo',
        order: 0,
        createdAt: new Date(),
      },
    ]
    const startTime = new Date()

    timer.onComplete(async () => {
      await createSession({
        taskId: 1,
        status: 'completed',
        startTime,
        endTime: new Date(),
      })
    })

    timer.start()
    await new Promise((r) => setTimeout(r, 1500))

    const db = await getDb()
    const sessions = (await db.getAll('sessions')) as import('@/db').Session[]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(1)?.pomodoroCount).toBe(1)
    expect(counts.get(1)?.attemptCount).toBe(1)
  })
})
