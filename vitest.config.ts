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
    reporters: process.env.CI
      ? ['default', ['html', { outputFile: 'vitest-html/index.html' }]]
      : ['default'],
    // Coverage agrégée pour les projets unit + component.
    // Héritée par chaque project via `extends: true`.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
      reportsDirectory: fileURLToPath(new URL('./coverage', import.meta.url)),
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/router/index.ts',
      ],
    },
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
