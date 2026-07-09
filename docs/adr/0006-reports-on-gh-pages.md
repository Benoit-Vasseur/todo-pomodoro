# ADR 0006 : Déploiement des rapports de tests et de coverage sur `gh-pages`

## Contexte

L'ADR 0004 a établi l'hébergement multi-dossiers sur `gh-pages` pour les *Production preview* et *Pull-request previews* de l'app. La CI (`ci.yml`) produit déjà des rapports de coverage (Vitest fusionné unit+component dans `coverage/`, E2E instrumenté dans `coverage-e2e/`) mais ne les déploie nulle part — ils restent en artefacts téléchargeables, peu découvrables. On veut que les **rapports de tests** (quels tests ont tourné, pass/fail) et les **rapports de coverage** (quel code a été exécuté) soient consultables via URL stable, sur `main` comme sur chaque PR.

## Décision

Déployer **4 rapports** sous `…/reports/` sur la même branche `gh-pages` que l'app, en réutilisant l'infrastructure existante (ADR 0004) :

| Rapport                       | Source                          | Cible `gh-pages`                     |
|-------------------------------|---------------------------------|--------------------------------------|
| Rapport de tests Vitest       | Vitest reporter HTML (unit+component fusionnés) | `…/reports/vitest/` |
| Rapport de coverage Vitest   | Vitest coverage HTML             | `…/reports/coverage-vitest/`        |
| Rapport de tests Playwright   | Playwright reporter HTML         | `…/reports/playwright/`             |
| Rapport de coverage Playwright | E2E instrumenté (`COVERAGE_E2E=1`) | `…/reports/coverage-e2e/`        |

### Séparation des rôles entre workflows

- **`ci.yml`** reste le *gate* de la PR. Le job `validate` (lint + build + tests unit + component, sans coverage) doit être rapide et bloquer la PR en cas d'échec. Le job `coverage` produit les 4 rapports en artefacts. Il uploade aussi `dist/` (build de l'app) comme 5ᵉ artefact, évitant un rebuild dans `pages.yml`.
- **`pages.yml`** ne build rien. Il attend la fin de `ci.yml` via un job `wait-ci` qui poll l'API GitHub (`GET /actions/runs?head_sha=$SHA&event=$EVENT`) jusqu'à completion (timeout 20 min, 5 min pour qu'un run apparaisse). Il récupère `validate.conclusion` et `coverage.conclusion` séparément via `GET /actions/runs/$RUN_ID/jobs`. Il download les 5 artefacts, clone `gh-pages`, copie les rapports toujours, copie l'app seulement si `validate.conclusion == 'success'`.

### Targets

- `push: [main]` → `/main/app/` + `/main/reports/<x>/`
- `pull_request` → `/pr-<n>/app/` + `/pr-<n>/reports/<x>/`

### Index hub à 2 étages

- Index racine `index.html` : liste les targets actives (`main/`, `pr-<n>/`), un lien par target vers `…/app/`.
- Sous-index `…/index.html` par target : liste `app/` + 4 liens rapports.
- Le workflow `pages-gc.yml` régénère l'index racine après suppression d'un dossier `pr-<n>/`.

### Commentaire collant de PR

Le commentaire existant (`marocchino/sticky-pull-request-comment`) garde son tableau de coverage + delta. On y ajoute 4 liens cliquables vers les rapports déployés, générés par convention d'URL prédictible (`https://benoit-vasseur.github.io/todo-pomodoro/pr-<n>/reports/<x>/`).

## Options considérées

- **`workflow_run` trigger** : plus idiomatique GitHub Actions, mais perd le numéro de PR directement (nécessite un lookup `gh pr list --head`) et exécute toujours sur `main` du repo. Écarté au profit d'un `wait-ci` explicite qui garde le trigger `pull_request` existant.
- **Un seul job `ci.yml` fusionné** (validate + coverage + rapports) : écarté car on perd la gate fail-fast et le feedback rapide sur PR.
- **Rebuild de l'app dans `pages.yml`** : écarté au profit d'un artefact `dist` depuis `validate`, pour éviter la duplication du build (~1-2 min gagnés par PR).
- **Index hub énumératif racine** : écarté au profit d'un index à 2 étages, pour éviter l'explosion combinatoire avec 5+ PRs actives.

## Conséquences

- `pages.yml` dépend de `ci.yml` via polling API REST. Si `ci.yml` est renommé ou restructuré, le script `wait-ci` doit être mis à jour.
- Sur PR, 2× invocations Vitest (1× rapide dans `validate`, 1× coverage+HTML dans `coverage`) — pattern standard, coût acceptable.
- Un seul run Playwright instrumenté (`test:e2e:coverage`) produit les 2 rapports E2E. Les E2E ne tournent plus dans `validate`.
- Si `validate` fail mais `coverage` success : rapports publiés (debug), app non publiée (stakeholders ne voient pas un truc cassé).
- L'index racine peut référencer des PRs supprimées transitoirement entre GC et prochaine publication — acceptable, le GC régénère l'index.
- Pas de gestion des forks : les PRs doivent provenir de branches internes (le `GITHUB_TOKEN` par défaut n'a pas les droits sur les forks). Confirmé par le modèle déjà assumé par `pages-gc.yml`.