# TODOs — code review PR #12

## Standards

### Hard violations

1. **ADR-0003 (Tailwind CSS)** — Install `tailwindcss` et intégrer Tailwind. Actuellement, tous les composants utilisent du `<style scoped>` brut. Le `package.json` n'a pas de dépendance `tailwindcss`.

### Baseline smells (judgement calls)

2. **Speculative Generality** — Nettoyer les composants générés par `vue create` qui ne servent à rien pour le scope actuel : `TheWelcome.vue`, `WelcomeItem.vue`, les 5 icônes SVG (`IconDocumentation`, `IconTooling`, `IconEcosystem`, `IconCommunity`, `IconSupport`), `HelloWorld.vue`, `AboutView.vue` (avec sa route lazy), le plugin `vueJsx()` dans les deux configs, et la nav `RouterLink`/`RouterView` dans `App.vue`.

3. **Duplicated Code** — Mutualiser la config entre `vite.config.ts` et `vitest.config.ts` : les deux déclarent `vue()`, `vueJsx()` et l'alias `@` à l'identique. `vitest.config.ts` pourrait `extends` la config Vite.

4. **Mysterious Name** — Renommer ou documenter `useTasksFresh` dans `src/composables/__tests__/useTasks.spec.ts` pour clarifier qu'elle fait un import dynamique pour bypasser le cache de module.

5. **`index.html`** — Corriger `<html lang="">` (attribut `lang` vide) et `<meta lang="FR" charset="UTF-8">` (`lang` n'est pas valide sur `<meta>`).

## Spec

### (a) Missing requirements

6. **`pnpm test`** — Ajouter un script `test` dans `package.json`. L'AC dit "`pnpm test` lance les tests unitaires" mais seuls `test:unit` et `test:component` existent.

### (b) Scope creep

7. **Couche IDB complète** — La PR #1 demande seulement d'installer `idb` comme dépendance. Le diff ajoute `src/db/index.ts` (schéma DB, singleton, interface `Task`), `src/composables/useTasks.ts` (4 opérations CRUD, ref réactive) et 78 lignes de tests. Sortir du scope du scaffold.

8. **ADR 0003** — `docs/adr/0003-composants-tailwind-pas-de-lib.md` est une décision d'architecture, pas un livrable du scaffold.

### (c) Implementation concerns

9. **Dual-write dans useTasks** — Les tests appellent `addTask` puis `loadTasks` séquentiellement, mais `addTask` écrit déjà dans IndexedDB ET pousse dans `tasks.value`. La redondance suggère un doute sur quelle moitié du pattern fonctionne. Simplifier ou clarifier.

10. **Schéma Task prématuré** — Le type `Task` (`id`, `title`, `done`, `createdAt`) sera à jeter : le PRD décrit `status`, `description`, `order`, `parentId`, `pomodoroCount`. Persister un schéma avant d'avoir figé le modèle garantit une migration douloureuse dans la PR suivante.
