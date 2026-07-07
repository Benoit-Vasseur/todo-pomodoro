<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TaskItem from '@/components/TaskItem.vue'
import { useTasks } from '@/composables/useTasks'
import type { Task, TaskPatch } from '@/db'

const {
  tasks,
  loading,
  loadTasks,
  addTask,
  toggleTask,
  updateTask,
  removeTask,
  reorderTask,
} = useTasks()

const title = ref('')
const description = ref('')
const draggedId = ref<number | null>(null)

async function onSubmit() {
  const trimmed = title.value.trim()
  if (!trimmed) return
  await addTask(trimmed, description.value.trim() || undefined)
  title.value = ''
  description.value = ''
}

async function toggle(task: Task) {
  if (task.id === undefined) return
  await toggleTask(task.id)
}

async function update(task: Task, patch: TaskPatch) {
  if (task.id === undefined) return
  await updateTask(task.id, patch)
}

async function remove(task: Task) {
  if (task.id === undefined) return
  await removeTask(task.id)
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

onMounted(loadTasks)
</script>

<template>
  <main class="mx-auto w-full max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-semibold">Backlog</h1>

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

    <ul v-else class="mt-6 space-y-2">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @toggle="toggle(task)"
        @update="(patch) => update(task, patch)"
        @delete="remove(task)"
        @drag-started="onDragStarted"
        @dropped="onDropped"
      />
    </ul>
  </main>
</template>
