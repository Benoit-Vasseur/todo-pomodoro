// Génère le markdown de commentaire de PR résumant les deux rapports de coverage
// (unit+component fusionnée via Vitest, et E2E séparée via monocart).
//
// Lecture :
//   - coverage/coverage-summary.json        (Vitest unit+component)
//   - coverage-e2e/coverage-summary.json    (E2E, optionnel)
//   - base-coverage/coverage-summary.json   (delta vs base, Vitest seulement — optionnel)
//
// Sortie : imprime le markdown sur stdout. Utilisé par le workflow CI pour
//   - `marocchino/sticky-pull-request-comment` (header `coverage`)
//   - `$GITHUB_STEP_SUMMARY`
//
// Tolérant : si un fichier manque, la section est marquée "non disponible".
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.env.COVERAGE_ROOT || process.cwd()

function readJson(p) {
  try {
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch (e) {
    console.error(`[coverage-comment] Impossible de lire ${p}: ${e.message}`)
    return null
  }
}

// coverage-summary.json (V8/Istanbul json-summary) :
// { total: {lines:{total,covered,pct}, statements:..., functions:..., branches:...}, files: { "path": {...} } }
function pct(n) {
  if (n == null || Number.isNaN(n)) return 'n/a'
  return `${Number(n).toFixed(2)}%`
}
function fmt(n) {
  if (n == null) return 'n/a'
  return `${n.covered}/${n.total}`
}
function delta(a, b) {
  if (a == null || b == null) return null
  const d = Number(a) - Number(b)
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(2)}`
}

const vitest = readJson(resolve(ROOT, 'coverage/coverage-summary.json'))
const e2e = readJson(resolve(ROOT, 'coverage-e2e/coverage-summary.json'))
const baseVitest = readJson(resolve(ROOT, 'base-coverage/coverage-summary.json'))

// `json-summary` Istanbul/V8 : les fichiers sont des clés top-level (à côté de `total`).
function fileEntries(summary) {
  if (!summary) return []
  return Object.entries(summary).filter(([k]) => k !== 'total')
}

function metricRow(name, summary, baseSummary) {
  if (!summary?.total) return `| ${name} | n/a | n/a | n/a | n/a | n/a |`
  const t = summary.total
  const b = baseSummary?.total
  return `| ${name} | ${fmt(t.lines)} (${pct(t.lines.pct)}) | ${fmt(t.statements)} (${pct(t.statements.pct)}) | ${fmt(t.functions)} (${pct(t.functions.pct)}) | ${fmt(t.branches)} (${pct(t.branches.pct)}) | ${delta(t.lines.pct, b?.lines?.pct) ?? 'n/a'} |`
}

const lines = []
lines.push('### 📊 Couverture de tests')
lines.push('')
lines.push('#### Unit + Component (fusionnée — Vitest)')
if (vitest?.total) {
  lines.push(
    '| Métrique | Lignes | Statements | Fonctions | Branches | Δ vs base (lignes) |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- |')
  lines.push(metricRow('**Total**', vitest, baseVitest))
  // Détail par dossier majeur de src/
  const files = fileEntries(vitest)
  if (files.length) {
    const byDir = new Map()
    for (const [file, data] of files) {
      const norm = file.replace(/\\/g, '/')
      const m = norm.match(/\/src\/([^/]+)\//)
      const dir = m ? `src/${m[1]}/` : 'src (root)'
      const acc = byDir.get(dir) ?? { lines: 0, linesCovered: 0 }
      acc.lines += data.lines.total
      acc.linesCovered += data.lines.covered
      byDir.set(dir, acc)
    }
    lines.push('')
    lines.push('<details><summary>Par dossier</summary>')
    lines.push('')
    lines.push('| Dossier | Lignes couvertes | % lignes |')
    lines.push('| --- | --- | --- |')
    const sorted = [...byDir.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    for (const [dir, acc] of sorted) {
      const p = acc.lines ? (acc.linesCovered / acc.lines) * 100 : 0
      lines.push(`| \`${dir}\` | ${acc.linesCovered}/${acc.lines} | ${pct(p)} |`)
    }
    lines.push('')
    lines.push('</details>')
  }
} else {
  lines.push('_Rapport Vitest non disponible._')
}
lines.push('')

lines.push('#### E2E (séparée — monocart)')
if (e2e?.total) {
  lines.push(
    '| Métrique | Lignes | Statements | Fonctions | Branches |',
  )
  lines.push('| --- | --- | --- | --- | --- |')
  const t = e2e.total
  lines.push(
    `| **Total** | ${fmt(t.lines)} (${pct(t.lines.pct)}) | ${fmt(t.statements)} (${pct(t.statements.pct)}) | ${fmt(t.functions)} (${pct(t.functions.pct)}) | ${fmt(t.branches)} (${pct(t.branches.pct)}) |`,
  )
} else {
  lines.push('_Rapport E2E non disponible (voir artifact `coverage-e2e-report` si présent)._')
}
lines.push('')
lines.push('')
lines.push('>_Rapports HTML complets disponibles en artifacts de workflow (`coverage-report`, `coverage-e2e-report`), conservation 7 jours._')

process.stdout.write(lines.join('\n') + '\n')