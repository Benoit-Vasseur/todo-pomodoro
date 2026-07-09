<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TaskItem from '@/components/TaskItem.vue'
import TimerDisplay from '@/components/TimerDisplay.vue'
import { useTasks } from '@/composables/useTasks'
import { usePomodoroCounts } from '@/composables/usePomodoroCounts'
import { useTimer } from '@/composables/useTimer'
import { useSession } from '@/composables/useSession'
import type { Task, TaskPatch } from '@/db'

const POMODORO_DURATION = 1500 // 25 minutes

const {
  tasks,
  loading,
  loadTasks,
  addTask,
  addSubTask,
  toggleTask,
  startTask,
  updateTask,
  removeTask,
  reorderTask,
} = useTasks()

// Compteurs dérivés des sessions (ADR #0006).
const { counts, loadSessions } = usePomodoroCounts(tasks)
const { createSession } = useSession()

const timer = useTimer(POMODORO_DURATION)
const timerTaskId = ref<number | null>(null)
const timerStartTime = ref<Date | null>(null)

const title = ref('')
const description = ref('')
const draggedId = ref<number | null>(null)
const statusError = ref<string | null>(null)

interface DisplayRow {
  task: Task
  depth: number
  pomodoroCount: number
}

// Affichage hiérarchique : racines (par order) suivies de leurs sous-tâches
// (par order), indentées. Calculé à partir de la liste plate `tasks`.
const displayRows = computed<DisplayRow[]>(() => {
  const rows: DisplayRow[] = []
  const roots = tasks.value
    .filter((t) => t.parentId == null)
    .sort((a, b) => a.order - b.order)
  for (const root of roots) {
    rows.push({
      task: root,
      depth: 0,
      pomodoroCount: counts.value.get(root.id ?? -1)?.pomodoroCount ?? 0,
    })
    const children = tasks.value
      .filter((t) => t.parentId === root.id)
      .sort((a, b) => a.order - b.order)
    for (const child of children) {
      rows.push({
        task: child,
        depth: 1,
        pomodoroCount: counts.value.get(child.id ?? -1)?.pomodoroCount ?? 0,
      })
    }
  }
  return rows
})

async function onSubmit() {
  const trimmed = title.value.trim()
  if (!trimmed) return
  await addTask(trimmed, description.value.trim() || undefined)
  title.value = ''
  description.value = ''
}

async function toggle(task: Task) {
  if (task.id === undefined) return
  statusError.value = null
  try {
    await toggleTask(task.id)
  } catch (e) {
    statusError.value = e instanceof Error ? e.message : String(e)
    // Le statut n'a pas changé (blocage), mais le DOM de la checkbox a été
    // modifié par le geste utilisateur. On crée de nouvelles références de
    // tâches pour forcer Vue à réévaluer le binding :checked (one-way) et
    // ramener la checkbox à son état réel (non cochée).
    tasks.value = tasks.value.map((t) => ({ ...t }))
  }
}

async function start(task: Task) {
  if (task.id === undefined) return
  statusError.value = null
  await startTask(task.id)
  timer.reset()
  timerTaskId.value = task.id
  timerStartTime.value = new Date()
  timer.onComplete(async () => {
    const id = timerTaskId.value
    const start = timerStartTime.value
    if (id == null || start == null) return
    // Détermine si la tâche est racine ou sous-tâche
    const t = tasks.value.find((t) => t.id === id)
    if (!t) return
    await createSession({
      taskId: t.parentId ? undefined : id,
      subTaskId: t.parentId ? id : undefined,
      status: 'completed',
      startTime: start,
      endTime: new Date(),
    })
    await loadSessions()
  })
  timer.start()
}

function pauseTimer() {
  timer.pause()
}

function resumeTimer() {
  timer.resume()
}

async function update(task: Task, patch: TaskPatch) {
  if (task.id === undefined) return
  await updateTask(task.id, patch)
}

async function remove(task: Task) {
  if (task.id === undefined) return
  // Confirmation en cascade : un parent avec sous-tâches demande une
  // validation explicite (« Cette tâche a N sous-tâche(s). Tout supprimer ? »).
  // Une tâche sans sous-tâche se supprime directement.
  const subCount = tasks.value.filter((t) => t.parentId === task.id).length
  if (subCount > 0) {
    const ok = window.confirm(
      `Cette tâche a ${subCount} sous-tâche(s). Tout supprimer ?`,
    )
    if (!ok) return
  }
  await removeTask(task.id)
}

async function onAddSubTask(task: Task, subTitle: string) {
  if (task.id === undefined) return
  await addSubTask(task.id, subTitle)
}

function onDragStarted(id: number) {
  draggedId.value = id
}

async function onDropped(targetId: number) {
  const from = draggedId.value
  draggedId.value = null
  if (from === null || from === targetId) return
  await reorderTask(from, targetId)
}

onMounted(async () => {
  await loadTasks()
  await loadSessions()
})
</script>

<template>
  <main class="mx-auto w-full max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-semibold">Backlog</h1>

    <TimerDisplay
      v-if="timerTaskId != null"
      :remaining="timer.remaining.value"
      :is-running="timer.isRunning.value"
      :is-paused="timer.isPaused.value"
      class="mt-4"
      @start-timer="timer.start()"
      @pause-timer="pauseTimer"
      @resume-timer="resumeTimer"
    />

    <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
      <div class="space-y-1">
        <label for="title" class="text-sm font-medium">Titre</label>
        <Input id="title" v-model="title" name="title" type="text" required />
      </div>
      <div class="space-y-1">
        <label for="description" class="text-sm font-medium">Description</label>
        <Textarea id="description" v-model="description" name="description" />
      </div>
      <Button type="submit">Ajouter</Button>
    </form>

    <p v-if="loading" class="mt-6 text-muted-foreground">Chargement…</p>

    <p v-else-if="tasks.length === 0" class="mt-6 text-muted-foreground">
      Le backlog est vide.
    </p>

    <TransitionGroup
      v-else
      tag="ul"
      name="task-list"
      class="mt-6 space-y-2"
    >
      <TaskItem
        v-for="row in displayRows"
        :key="row.task.id"
        :task="row.task"
        :depth="row.depth"
        :pomodoro-count="row.pomodoroCount"
        :is-timer-task="row.task.id != null && row.task.id === timerTaskId"
        :timer-running="
          row.task.id != null &&
          row.task.id === timerTaskId &&
          timer.isRunning.value
        "
        :timer-paused="
          row.task.id != null &&
          row.task.id === timerTaskId &&
          timer.isPaused.value
        "
        @toggle="toggle(row.task)"
        @start="start(row.task)"
        @pause-timer="pauseTimer"
        @resume-timer="resumeTimer"
        @update="(patch) => update(row.task, patch)"
        @delete="remove(row.task)"
        @add-sub-task="(subTitle: string) => onAddSubTask(row.task, subTitle)"
        @drag-started="onDragStarted"
        @dropped="onDropped"
      />
    </TransitionGroup>

    <p
      v-if="statusError"
      role="alert"
      data-testid="status-error"
      class="mt-2 text-sm text-destructive"
    >
      {{ statusError }}
    </p>
  </main>
</template>

<style scoped>
/* Transition FLIP : déplace visuellement les items (et les groupes de
 * sous-tâches attachées) lors d'un réordonnancement par drag & drop. */
.task-list-move {
  transition: transform 200ms ease;
}
</style>
