<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  remaining: number
  isRunning: boolean
  isPaused: boolean
}>()

const emit = defineEmits<{
  startTimer: []
  pauseTimer: []
  resumeTimer: []
}>()

const display = computed(() => {
  const m = Math.floor(props.remaining / 60)
  const s = props.remaining % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <div
    class="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
  >
    <span
      class="font-mono text-4xl tabular-nums tracking-tight"
      data-testid="timer-display"
    >
      {{ display }}
    </span>
    <Button
      v-if="!isRunning && !isPaused"
      data-testid="timer-start"
      size="sm"
      @click="emit('startTimer')"
    >
      Démarrer
    </Button>
    <Button
      v-else-if="isRunning"
      data-testid="timer-pause"
      size="sm"
      @click="emit('pauseTimer')"
    >
      Pause
    </Button>
    <Button
      v-else
      data-testid="timer-resume"
      size="sm"
      @click="emit('resumeTimer')"
    >
      Reprendre
    </Button>
  </div>
</template>
