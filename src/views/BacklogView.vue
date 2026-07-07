<script setup lang="ts">
import { onMounted } from 'vue'
import { useTasks } from '@/composables/useTasks'

const { tasks, loading, loadTasks } = useTasks()

onMounted(loadTasks)
</script>

<template>
  <main class="mx-auto w-full max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-semibold">Backlog</h1>

    <p v-if="loading" class="mt-4 text-muted-foreground">Chargement…</p>

    <p v-else-if="tasks.length === 0" class="mt-4 text-muted-foreground">
      Le backlog est vide.
    </p>

    <ul v-else class="mt-4 space-y-2">
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
