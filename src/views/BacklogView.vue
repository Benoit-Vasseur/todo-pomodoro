<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/composables/useTasks'

const { tasks, loading, loadTasks, addTask } = useTasks()

const title = ref('')
const description = ref('')

async function onSubmit() {
  const trimmed = title.value.trim()
  if (!trimmed) return
  await addTask(trimmed, description.value.trim() || undefined)
  title.value = ''
  description.value = ''
}

onMounted(loadTasks)
</script>

<template>
  <main class="mx-auto w-full max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-semibold">Backlog</h1>

    <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
      <div class="space-y-1">
        <label for="title" class="text-sm font-medium">Titre</label>
        <input
          id="title"
          v-model="title"
          name="title"
          type="text"
          required
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1">
        <label for="description" class="text-sm font-medium">Description</label>
        <textarea
          id="description"
          v-model="description"
          name="description"
          class="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit">Ajouter</Button>
    </form>

    <p v-if="loading" class="mt-6 text-muted-foreground">Chargement…</p>

    <p v-else-if="tasks.length === 0" class="mt-6 text-muted-foreground">
      Le backlog est vide.
    </p>

    <ul v-else class="mt-6 space-y-2">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="rounded-md border border-border bg-card p-3"
      >
        <p class="font-medium">{{ task.title }}</p>
        <p v-if="task.description" class="text-sm text-muted-foreground">
          {{ task.description }}
        </p>
      </li>
    </ul>
  </main>
</template>
