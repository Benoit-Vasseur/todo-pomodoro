<script setup lang="ts">
import { RouterView } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <div class="flex justify-end p-2">
      <ThemeToggle />
    </div>
    <RouterView />
  </div>
</template>
