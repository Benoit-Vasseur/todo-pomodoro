import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { getDb, type Session, type Task } from '@/db'

export interface TaskCounts {
  /** Sessions pomodoro `complétées` rattachées (propres + sous-tâches). */
  pomodoroCount: number
  /** Toutes sessions démarrées (propres + sous-tâches), tous statuts finaux. */
  attemptCount: number
}

/**
 * Une session est rattachée à une tâche si son `taskId` OU son `subTaskId`
 * pointe vers elle (PRD : `taskId | subTaskId`). On évite le double compte
 * si une session mal formée référencerait la même tâche via les deux champs.
 */
function sessionRefersToTask(session: Session, taskId: number): boolean {
  if (session.taskId === taskId && session.subTaskId === taskId) return true
  return session.taskId === taskId || session.subTaskId === taskId
}

/**
 * Calcule les compteurs dérivés (`pomodoroCount` = sessions complétées,
 * `attemptCount` = toutes sessions démarrées) pour chaque tâche.
 *
 * Le compteur d'un parent englobe les sessions de ses sous-tâches
 * (héritage ascendant). Une sous-tâche n'hérite pas des sessions de son
 * parent (sens descendant uniquement). Les sessions sans rattachement
 * connu (tâche supprimée — ADR #0006 sessions immortelles) sont ignorées.
 *
 * Pure function testable avec fixtures de sessions fictives (#4 : la table
 * `sessions` est vide tant que le timer #5 n'existe pas).
 */
export function computeCounts(
  tasks: Task[],
  sessions: Session[],
): Map<number, TaskCounts> {
  const counts = new Map<number, TaskCounts>()

  // Index des sous-tâches par parentId (une seule occurrence par parent
  // suffit — la récursion est interdite, donc pas de sous-tâche de sous-tâche).
  const childrenOf = new Map<number, Task[]>()
  for (const t of tasks) {
    if (t.parentId != null && t.id != null) {
      const list = childrenOf.get(t.parentId) ?? []
      list.push(t)
      childrenOf.set(t.parentId, list)
    }
  }

  for (const t of tasks) {
    if (t.id == null) continue
    const id = t.id

    // Sessions propres à cette tâche.
    let ownTotal = 0
    let ownCompleted = 0
    for (const s of sessions) {
      if (sessionRefersToTask(s, id)) {
        ownTotal++
        if (s.status === 'completed') ownCompleted++
      }
    }

    // Sessions héritées des sous-tâches (parent uniquement).
    let childTotal = 0
    let childCompleted = 0
    const children = childrenOf.get(id) ?? []
    for (const child of children) {
      if (child.id == null) continue
      for (const s of sessions) {
        if (sessionRefersToTask(s, child.id)) {
          childTotal++
          if (s.status === 'completed') childCompleted++
        }
      }
    }

    counts.set(id, {
      pomodoroCount: ownCompleted + childCompleted,
      attemptCount: ownTotal + childTotal,
    })
  }

  return counts
}

/**
 * Composable exposant les compteurs dérivés par tâche. Charge les sessions
 * depuis IndexedDB et recalcule réactivement quand `tasks` ou `sessions`
 * changent. En #4 la table `sessions` est vide → tous les compteurs valent 0
 * (cohérent : le timer #5 n'existe pas encore).
 */
export function usePomodoroCounts(tasks: Ref<Task[]>): {
  counts: ComputedRef<Map<number, TaskCounts>>
  sessions: Ref<Session[]>
  loadSessions: () => Promise<void>
} {
  const sessions: Ref<Session[]> = ref([])

  async function loadSessions() {
    const db = await getDb()
    sessions.value = (await db.getAll('sessions')) as Session[]
  }

  const counts = computed(() => computeCounts(tasks.value, sessions.value))

  return { counts, sessions, loadSessions }
}
