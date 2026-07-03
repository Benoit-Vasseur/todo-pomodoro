import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['fake-indexeddb/auto'],
          include: ['src/**/*.spec.ts'],
          exclude: ['src/components/**'],
          root: fileURLToPath(new URL('./', import.meta.url)),
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
          include: ['src/components/**/*.spec.ts'],
          root: fileURLToPath(new URL('./', import.meta.url)),
        },
      },
    ],
  },
})
