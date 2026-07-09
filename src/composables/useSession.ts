import { getDb, type Session, type SessionStatus } from '@/db'

export interface CreateSessionParams {
  taskId?: number
  subTaskId?: number
  status: SessionStatus
  startTime: Date
  endTime?: Date
}

export function useSession() {
  async function createSession(params: CreateSessionParams): Promise<number> {
    const db = await getDb()
    const session: Session = {
      taskId: params.taskId,
      subTaskId: params.subTaskId,
      status: params.status,
      startTime: params.startTime,
      endTime: params.endTime,
    }
    return (await db.add('sessions', session)) as number
  }

  return { createSession }
}
