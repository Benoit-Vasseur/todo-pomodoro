# Glossaire

## Production preview

Déploiement persistant de la branche `main`. URL stable, longue durée de vie, mise à jour à chaque merge sur `main`.

## Pull-request preview

Déploiement temporaire, un par PR, qui reflète le code exact de la PR à un instant t. Jetable : détruit quand la PR est fermée/mérgée.

## Langage

**Tâche**:
Unité de travail du backlog, identifiée, au statut propre (`à faire` / `en cours` / `terminée`). Peut porter un `parentId` pour devenir une sous-tâche.
_Éviter_: todo, item, ticket

**Sous-tâche noble**:
Tâche à part entière qui référence un parent via `parentId`. Possède son propre statut et son propre compteur de pomodoros. Ne peut pas avoir elle-même de sous-tâche (pas de récursion).
_Éviter_: sous-item, checklist, sous-tâche décorative

**Statut**:
Étape de vie d'une tâche ou sous-tâche dans l'enum `à faire` / `en cours` / `terminée`. `en cours` est posé automatiquement au démarrage d'un pomodoro et propagé au parent. **Invariant : exactement une seule tâche ou sous-tâche `en cours` à la fois, globalement** — démarrer une nouvelle cible repasse toutes les autres à `à faire`, sauf les ancêtres de la cible (qui remontent à `en cours` par transitivité). Un parent `terminé` n'est possible que si toutes ses sous-tâches sont `terminées`.
_Éviter_: state, done flag

**Session pomodoro**:
Enregistrement d'un démarrage de timer sur une tâche ou une sous-tâche. Porte un statut terminal `complétée` / `interrompue` / `abandonnée`. Source de vérité des compteurs de pomodoros : toute agrégation (compteur par tâche, héritage vers le parent, stats journalières) se calcule à partir des sessions.
_Éviter_: pomodoro (l'ambiguïté avec la durée de travail), entry, log

**Compteur de pomodoros**:
Nombre de sessions pomodoro `complétées` rattachées à une tâche ou sous-tâche. Valeur *dérivée* des sessions, jamais stockée sur la tâche. Le compteur d'un parent englobe les sessions de ses sous-tâches.
_Éviter_: pomodoroCount (champ stocké), attempts

## Rapport de tests Vitest

Document HTML qui liste les tests lancés (projets `unit` et `component` fusionnés) et leur résultat (pass/fail/durée). Produit par le reporter HTML builtin de Vitest (`test.reporter: ['html']`).

## Rapport de tests Playwright

Document HTML qui liste les tests E2E lancés et leur résultat (pass/fail/durée), avec screenshots et traces. Produit par Playwright dans `playwright-report/index.html`.

## Rapport de coverage Vitest

Document HTML qui montre quelles lignes de `src/**/*.{ts,vue}` ont été exécutées par les tests unit + component fusionnés. Vitest écrit `coverage/index.html`.

## Rapport de coverage Playwright

Document HTML qui montre quelles lignes de source ont été exécutées par l'E2E instrumentée. Écrit dans `coverage-e2e/index.html` via un build Vite instrumenté (`COVERAGE_E2E=1`).