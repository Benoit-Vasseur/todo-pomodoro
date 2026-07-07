<script setup lang="ts">
import { ref, useId } from 'vue'
import { Button } from '@/components/ui/button'
import type { Task } from '@/db'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{
  toggle: []
  update: [patch: { title: string; description?: string }]
  delete: []
}>()

const editing = ref(false)
const draftTitle = ref('')
const draftDescription = ref('')

const titleId = useId()
const descriptionId = useId()

function startEdit() {
  draftTitle.value = props.task.title
  draftDescription.value = props.task.description ?? ''
  editing.value = true
}

function cancel() {
  editing.value = false
}

function save() {
  const title = draftTitle.value.trim()
  if (!title) return
  emit('update', {
    title,
    description: draftDescription.value.trim() || undefined,
  })
  editing.value = false
}
</script>

<template>
  <li
    class="flex items-start gap-3 rounded-md border border-border bg-card p-3"
  >
    <template v-if="!editing">
      <input
        type="checkbox"
        class="mt-1 size-4"
        :checked="task.done"
        :aria-label="`${task.done ? 'Réactiver' : 'Terminer'} « ${task.title} »`"
        @change="emit('toggle')"
      />
      <div class="flex-1">
        <p
          class="font-medium"
          :class="{ 'text-muted-foreground line-through': task.done }"
        >
          {{ task.title }}
        </p>
        <p v-if="task.description" class="text-sm text-muted-foreground">
          {{ task.description }}
        </p>
      </div>
      <div class="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          :aria-label="`Éditer « ${task.title} »`"
          @click="startEdit"
          >Éditer</Button
        >
      </div>
    </template>

    <form v-else class="flex-1 space-y-2" @submit.prevent="save">
      <div class="space-y-1">
        <label :for="titleId" class="text-sm font-medium">Modifier le titre</label>
        <input
          :id="titleId"
          v-model="draftTitle"
          type="text"
          required
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1">
        <label :for="descriptionId" class="text-sm font-medium"
          >Modifier la description</label
        >
        <textarea
          :id="descriptionId"
          v-model="draftDescription"
          class="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div class="flex gap-1">
        <Button type="submit" size="sm">Enregistrer</Button>
        <Button type="button" variant="ghost" size="sm" @click="cancel"
          >Annuler</Button
        >
      </div>
    </form>
  </li>
</template>
