<script setup lang="ts">
import { ref, useId } from 'vue'
import { GripVertical } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Task, TaskPatch } from '@/db'

const props = withDefaults(
  defineProps<{ task: Task; depth?: number }>(),
  { depth: 0 },
)
const emit = defineEmits<{
  toggle: []
  update: [patch: TaskPatch]
  delete: []
  dragStarted: [id: number]
  dropped: [targetId: number]
  addSubTask: [title: string]
}>()

const editing = ref(false)
const draftTitle = ref('')
const draftDescription = ref('')

const addingSubTask = ref(false)
const subTaskTitle = ref('')

const titleId = useId()
const descriptionId = useId()
const subTaskTitleId = useId()

const isRoot = props.depth === 0

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

function startAddSubTask() {
  subTaskTitle.value = ''
  addingSubTask.value = true
}

function cancelAddSubTask() {
  addingSubTask.value = false
  subTaskTitle.value = ''
}

function submitSubTask() {
  const title = subTaskTitle.value.trim()
  if (!title) return
  emit('addSubTask', title)
  addingSubTask.value = false
  subTaskTitle.value = ''
}

function onDragStart(event: DragEvent) {
  if (props.task.id === undefined) return
  emit('dragStarted', props.task.id)
  // dataTransfer uniquement pour le drag natif réel (image de glisse).
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', String(props.task.id))
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  if (props.task.id === undefined) return
  emit('dropped', props.task.id)
}
</script>

<template>
  <li
    :data-depth="props.depth"
    class="flex items-start gap-3 rounded-md border border-border bg-card p-3"
    :class="props.depth > 0 ? 'ml-6' : ''"
    @dragover.prevent
    @drop="onDrop"
  >
    <template v-if="!editing">
      <span
        data-testid="drag-handle"
        draggable="true"
        aria-hidden="true"
        class="mt-1 cursor-grab text-muted-foreground"
        @dragstart="onDragStart"
      >
        <GripVertical class="size-4" />
      </span>
      <input
        type="checkbox"
        class="mt-1 size-4"
        :checked="task.status === 'done'"
        :aria-label="`${task.status === 'done' ? 'Réactiver' : 'Terminer'} « ${task.title} »`"
        @change="emit('toggle')"
      />
      <div class="flex-1">
        <p
          class="font-medium"
          :class="{ 'text-muted-foreground line-through': task.status === 'done' }"
        >
          {{ task.title }}
        </p>
        <p v-if="task.description" class="text-sm text-muted-foreground">
          {{ task.description }}
        </p>

        <form
          v-if="addingSubTask"
          class="mt-2 space-y-2"
          @submit.prevent="submitSubTask"
        >
          <div class="space-y-1">
            <label :for="subTaskTitleId" class="text-sm font-medium"
              >Titre de la sous-tâche</label
            >
            <Input
              :id="subTaskTitleId"
              v-model="subTaskTitle"
              type="text"
              placeholder="Titre de la sous-tâche"
              required
            />
          </div>
          <div class="flex gap-1">
            <Button type="submit" size="sm">Ajouter la sous-tâche</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              @click="cancelAddSubTask"
              >Annuler</Button
            >
          </div>
        </form>
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-if="isRoot"
          variant="ghost"
          size="sm"
          :aria-label="`Ajouter une sous-tâche à « ${task.title} »`"
          @click="startAddSubTask"
          >+ Sous-tâche</Button
        >
        <Button
          variant="ghost"
          size="sm"
          :aria-label="`Éditer « ${task.title} »`"
          @click="startEdit"
          >Éditer</Button
        >
        <Button
          variant="destructive"
          size="sm"
          :aria-label="`Supprimer « ${task.title} »`"
          @click="emit('delete')"
          >Supprimer</Button
        >
      </div>
    </template>

    <form v-else class="flex-1 space-y-2" @submit.prevent="save">
      <div class="space-y-1">
        <label :for="titleId" class="text-sm font-medium">Modifier le titre</label>
        <Input
          :id="titleId"
          v-model="draftTitle"
          type="text"
          required
        />
      </div>
      <div class="space-y-1">
        <label :for="descriptionId" class="text-sm font-medium"
          >Modifier la description</label
        >
        <Textarea :id="descriptionId" v-model="draftDescription" />
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
