<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useColorMode } from '@/composables/useColorMode'

const { isDark, toggle } = useColorMode()
</script>

<template>
  <Button
    variant="outline"
    size="icon"
    :aria-label="isDark ? 'Activer le mode clair' : 'Activer le mode sombre'"
    @click="toggle"
  >
    <Sun v-if="isDark" class="size-4" />
    <Moon v-else class="size-4" />
  </Button>
</template>
