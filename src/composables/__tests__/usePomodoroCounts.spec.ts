import { describe, it, expect } from 'vitest'
import { computeCounts } from '@/composables/usePomodoroCounts'
import type { Task, Session } from '@/db'

// L'agrégation est testée sur fixtures de sessions fictives : la table
// `sessions` est vide en #4 (le timer #5 n'existe pas encore). On valide
// donc la logique de comptage et l'héritage parent↔sous-tâche isolément.

function task(partial: Partial<Task> & { title: string }): Task {
  return {
    status: 'todo',
    order: 0,
    createdAt: new Date(),
    ...partial,
  }
}

function session(partial: Partial<Session>): Session {
  return {
    startTime: new Date(),
    status: 'completed',
    ...partial,
  }
}

describe('computeCounts', () => {
  it('retourne 0 partout quand il n’y a aucune session', () => {
    const tasks = [
      task({ id: 1, title: 'A' }),
      task({ id: 2, title: 'B', parentId: 1 }),
    ]
    const counts = computeCounts(tasks, [])
    expect(counts.get(1)).toEqual({ pomodoroCount: 0, attemptCount: 0 })
    expect(counts.get(2)).toEqual({ pomodoroCount: 0, attemptCount: 0 })
  })

  it('compte les sessions complétées sur une tâche racine', () => {
    const tasks = [task({ id: 1, title: 'A' })]
    const sessions = [
      session({ id: 1, taskId: 1, status: 'completed' }),
      session({ id: 2, taskId: 1, status: 'completed' }),
      session({ id: 3, taskId: 1, status: 'interrupted' }),
    ]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(1)).toEqual({ pomodoroCount: 2, attemptCount: 3 })
  })

  it('distingue pomodoroCount (complétées) de attemptCount (toutes démarrées)', () => {
    const tasks = [task({ id: 1, title: 'A' })]
    const sessions = [
      session({ id: 1, taskId: 1, status: 'completed' }),
      session({ id: 2, taskId: 1, status: 'interrupted' }),
      session({ id: 3, taskId: 1, status: 'abandoned' }),
    ]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(1)?.pomodoroCount).toBe(1)
    expect(counts.get(1)?.attemptCount).toBe(3)
  })

  it('compte les sessions rattachées via subTaskId sur une sous-tâche', () => {
    const tasks = [
      task({ id: 1, title: 'Parent' }),
      task({ id: 2, title: 'Sous', parentId: 1 }),
    ]
    const sessions = [
      session({ id: 1, subTaskId: 2, status: 'completed' }),
      session({ id: 2, subTaskId: 2, status: 'interrupted' }),
    ]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(2)).toEqual({ pomodoroCount: 1, attemptCount: 2 })
  })

  it('le compteur du parent englobe les sessions de ses sous-tâches (héritage)', () => {
    const tasks = [
      task({ id: 1, title: 'Parent' }),
      task({ id: 2, title: 'Sous A', parentId: 1 }),
      task({ id: 3, title: 'Sous B', parentId: 1 }),
    ]
    const sessions = [
      // Propres au parent
      session({ id: 1, taskId: 1, status: 'completed' }),
      // Propres à la sous-tâche A
      session({ id: 2, subTaskId: 2, status: 'completed' }),
      session({ id: 3, subTaskId: 2, status: 'interrupted' }),
      // Propres à la sous-tâche B
      session({ id: 4, subTaskId: 3, status: 'completed' }),
    ]
    const counts = computeCounts(tasks, sessions)

    // Parent = 1 propre (completed) + sous-A (1 completed, 1 interrupted)
    //        + sous-B (1 completed)
    //   pomodoroCount = 1 + 1 + 1 = 3
    //   attemptCount  = 1 + 2 + 1 = 4
    expect(counts.get(1)).toEqual({ pomodoroCount: 3, attemptCount: 4 })
    expect(counts.get(2)).toEqual({ pomodoroCount: 1, attemptCount: 2 })
    expect(counts.get(3)).toEqual({ pomodoroCount: 1, attemptCount: 1 })
  })

  it('une sous-tâche n’hérite pas des sessions de son parent (sens descendant seulement)', () => {
    const tasks = [
      task({ id: 1, title: 'Parent' }),
      task({ id: 2, title: 'Sous', parentId: 1 }),
    ]
    const sessions = [
      session({ id: 1, taskId: 1, status: 'completed' }),
      session({ id: 2, subTaskId: 2, status: 'completed' }),
    ]
    const counts = computeCounts(tasks, sessions)
    // La sous-tâche ne compte que sa propre session.
    expect(counts.get(2)).toEqual({ pomodoroCount: 1, attemptCount: 1 })
  })

  it('ignore les sessions sans rattachement connu (références mortes)', () => {
    const tasks = [task({ id: 1, title: 'A' })]
    const sessions = [
      session({ id: 1, taskId: 1, status: 'completed' }),
      // sessionId 99 → tâche supprimée (sessions immortelles, ADR #0006)
      session({ id: 2, taskId: 99, status: 'completed' }),
    ]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(1)).toEqual({ pomodoroCount: 1, attemptCount: 1 })
    // Pas d’entrée pour la tâche 99 (inexistante dans `tasks`).
    expect(counts.get(99)).toBeUndefined()
  })

  it('ne compte pas deux fois une session référencée à la fois par taskId et subTaskId', () => {
    // Cas défensif : une session mal formée pointerait vers la même tâche
    // via taskId et subTaskId. On la compte une seule fois.
    const tasks = [task({ id: 1, title: 'A' })]
    const sessions = [
      session({ id: 1, taskId: 1, subTaskId: 1, status: 'completed' }),
    ]
    const counts = computeCounts(tasks, sessions)
    expect(counts.get(1)).toEqual({ pomodoroCount: 1, attemptCount: 1 })
  })
})
