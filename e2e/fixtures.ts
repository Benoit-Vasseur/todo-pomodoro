import { test as base, expect as baseExpect } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Déclaré globalement par vite-plugin-istanbul dans le bundle instrumenté.
// On le redéclare localement pour le typage côté tests E2E sans dépendre
// de la présence du plugin à ce moment.
declare global {
   
  var __coverage__: Record<string, unknown> | undefined
}

/**
 * Auto-fixture qui, après chaque test, récupère `window.__coverage__` (injecté par
 * vite-plugin-istanbul lors du build instrumenté via COVERAGE_E2E=1) et l'écrit sur disque
 * dans `.coverage-e2e-cache/<file>.json`. Le reporter Playwright de fin de run
 * (e2e/reporters/coverage-reporter.mjs) agrège ces fichiers via monocart-coverage-reports.
 *
 * When COVERAGE_E2E is unset, the fixture is a no-op so `pnpm test:e2e` stays untouched.
 */

const COVERAGE_E2E = !!process.env.COVERAGE_E2E
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const CACHE_DIR = resolve(repoRoot, '.coverage-e2e-cache')

let cacheDirReady = false
async function ensureCacheDir() {
  if (cacheDirReady) return
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  cacheDirReady = true
}

export const test = base.extend<{
  /** Auto-collecte la coverage E2E après chaque test (no-op hors COVERAGE_E2E). */
  collectCoverage: void
}>({
  collectCoverage: [
    async ({ page }, use) => {
      await use()
      if (!COVERAGE_E2E) return
      try {
        const cov = await page.evaluate<
          Record<string, unknown> | undefined
        >(() => window.__coverage__)
        if (!cov) return
        await ensureCacheDir()
        await writeFile(
          resolve(
            CACHE_DIR,
            `${Buffer.from(page.url()).toString('base64url').slice(0, 40)}-${Date.now()}.json`,
          ),
          JSON.stringify(cov),
        )
      } catch {
        // page déjà fermée ou non-applicables (e.g. test skip) — ignore.
      }
    },
    { auto: true },
  ],
})

export const expect = baseExpect