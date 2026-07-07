<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { useColorMode } from '@/composables/useColorMode'

const { isDark, toggle } = useColorMode()
</script>

<template>
  <button
    type="button"
    class="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent"
    :aria-label="isDark ? 'Activer le mode clair' : 'Activer le mode sombre'"
    @click="toggle"
  >
    <Sun v-if="isDark" class="size-4" />
    <Moon v-else class="size-4" />
  </button>
</template>
