import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig(() => {
  // Instrumentation du build pour la coverage E2E.
  // Gated par COVERAGE_E2E=1 pour ne pas polluer le build normal.
  const instrumentForE2E = !!process.env.COVERAGE_E2E

  return {
    base: './',
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      instrumentForE2E &&
        istanbul({
          include: 'src/*',
          exclude: ['src/**/__tests__/**', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
          forceBuildInstrument: true,
          checkProd: true,
        }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})