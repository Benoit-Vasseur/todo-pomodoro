// Custom Playwright reporter qui, en fin de run, agrège la coverage Istanbul
// collectée par e2e/fixtures.ts (cache disque `.coverage-e2e-cache/`) via
// monocart-coverage-reports et génère le rapport séparé dans `coverage-e2e/`.
//
// Ne fait rien si COVERAGE_E2E n'est pas défini (run normal `pnpm test:e2e`).
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CoverageReport } from 'monocart-coverage-reports'

const COVERAGE_E2E = !!process.env.COVERAGE_E2E

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..', '..')
const CACHE_DIR = resolve(repoRoot, '.coverage-e2e-cache')
const OUT_DIR = resolve(repoRoot, 'coverage-e2e')

class CoverageReporter {
  constructor(options = {}) {
    this.options = options
  }

  printsToStdio() {
    return false
  }

  onBegin() {}

  onTestBegin() {}

  onTestEnd() {}

  onEnd() {}

  async onExit() {
    if (!COVERAGE_E2E) return

    if (!existsSync(CACHE_DIR) || readdirSync(CACHE_DIR).length === 0) {
       
      console.warn(
        '[coverage-reporter] Aucune coverage E2E collectée — `.coverage-e2e-cache/` vide. ' +
          "Vérifiez que le build a été lancé avec COVERAGE_E2E=1 et qu'une page instrumentée a été visitée.",
      )
      return
    }

    const mcr = new CoverageReport({
      name: 'todo-pomodoro E2E Coverage',
      outputDir: OUT_DIR,
      reports: [
        ['html', { subdir: 'html' }],
        ['lcovonly', { file: 'lcov.info' }],
        ['text-summary', { file: 'summary.txt' }],
        ['json-summary', { file: 'coverage-summary.json' }],
      ],
      sourceFilter: {
        include: ['**/src/**'],
        exclude: [
          '**/src/**/__tests__/**',
          '**/src/**/*.spec.ts',
          '**/src/**/*.d.ts',
          '**/node_modules/**',
          '**/dist/**',
        ],
      },
    })

    const files = readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => resolve(CACHE_DIR, f))

    for (const file of files) {
      const content = await readFile(file, 'utf8').catch(() => null)
      if (!content) continue
      let coverage
      try {
        coverage = JSON.parse(content)
      } catch {
        continue
      }
       
      console.log(`[coverage-reporter] Adding ${file.slice(-20)}…`)
      await mcr.add(coverage)
    }

    await mcr.generate()

    // Nettoyage du cache disque (les rapports sont déjà générés).
    rmSync(CACHE_DIR, { recursive: true, force: true })

     
    console.log(`[coverage-reporter] Rapport généré dans ${OUT_DIR}/`)
  }
}

export default CoverageReporter