# Composants UI : shadcn-vue + Tailwind v4

> Révision de la décision initiale « Tailwind seul, pas de lib de composants ».
> La décision précédente (composants faits maison avec Tailwind, sans librairie)
> est **supersédée** — voir le bloc Historique.

## Contexte

La décision initiale (#3) avait posé « Tailwind seul, pas de lib de composants »
pour garder le focus sur la logique métier. En codant l'issue #2 (Backlog CRUD)
et en approchant #11 (Raccourcis clavier et palette de commandes), la motivation
change : **avancer vite côté visuel, bénéficier d'une accessibilité out-of-the-box,
et réutiliser des composants complexes (command palette, modal trap-focus) sans
les coder maison**.

shadcn-vue est retenue plutôt que Nuxt UI pour sa distribution « source copiée
dans le repo » : les composants vivent dans `src/components/ui/*` et s'éditent
comme n'importe quel composant du projet — plus ai-friendly pour la
customisation.

## Décision

On adopte **shadcn-vue** (base Reka UI + Tailwind) comme librairie de composants,
distribuée par copie de source via le CLI `shadcn-vue`.

Paramètres retenus (issue #16) :

- **Base de composants** : Reka UI (primitives headless accessibles).
- **Tailwind v4** (CSS-first, `@import "tailwindcss"`, plugin `@tailwindcss/vite`).
  Pas de `tailwind.config.js`, pas de `postcss.config.js`.
- **Base color** : `zinc` (défaut shadcn-vue, échelle de gris neutre).
- **Style** : preset `reka-vega` du CLI (équivalent Tailwind v4 du style
  `new-york` historique — le CLI a migré vers des presets nommés).
- **Icônes** : `@lucide/vue` (défaut du CLI, tree-shakeable).
- **Dark mode** : classe `.dark` sur `<html>` (convention shadcn-vue), toggle
  manuel persisté via `@vueuse/core` `useColorMode` (wrapper
  `src/composables/useColorMode.ts`).
- **Couleurs d'accent** (`--primary`, `--destructive`, …) : **valeurs par défaut
  de shadcn-vue**, sans surcharge. Le rouge Zenika pourra être revisé plus tard
  via une surcharge de `--primary` — non bloquant pour l'init.
- `@vueuse/core` devient dépendance runtime stratégique (au-delà du dark mode :
  `onClickOutside`, `useStorage`, etc.).

## Conséquences

**Positives :**

- **Vitesse visuelle + accessibilité** : composants complexes (Command, Dialog
  trap-focus, etc.) prêts à l'emploi et accessibles via Reka UI.
- **Source copiée dans le repo** : `src/components/ui/*` est éditable comme
  n'importe quel composant ; pas de dépendance runtime opaque à patcher.
- **AI-friendly** : le CLI `shadcn-vue add` et les fichiers en clair facilitent
  l'édition/customisation par un agent.
- **Dark mode persistant** out-of-the-box via `@vueuse/core`.
- **Tailwind v4 CSS-first** : pas de config JS, variables oklch dans
  `src/assets/index.css`.

**Négatives :**

- **Duplication de source** : chaque composant copié vit dans le repo
  (maintenance locale, mais pas de magie noire).
- **Couleurs par défaut** : le rouge Zenika n'est pas encore appliqué (remise à
  plus tard, indolore via `--primary`).
- `@vueuse/core` ajouté en dépendance runtime (compensé par son utilité
  transverse).

## Alternatives considérées

| Alternative | Raison de l'écart |
| --- | --- |
| **From scratch + Tailwind (décision initiale #3)** | Recoder Command palette, Dialog trap-focus, etc. est coûteux et sans filet d'accessibilité ; la motivation a changé. |
| **Nuxt UI** | Distribution par package (pas par copie de source) ; moins ai-friendly pour l'édition/customisation. |
| **PrimeVue (unstyled + Tailwind)** | Beaucoup de composants inutilisés ; courbe du `passThrough` pour un gain marginal. |
| **Naive UI / Vuetify** | Système CSS propriétaire en conflit avec Tailwind ; bundle size. |

## Historique

Décision initiale : « Composants UI faits maison avec Tailwind CSS, pas de
librairie de composants » — acceptée pour garder le focus métier. **Supersédée**
par la présente décision : la motivation a évolué (vitesse visuelle + composants
complexes + accessibilité). Conformément à l'issue #16, l'ADR conserve le numéro
0003 et révise le contenu en place.

## État

Acceptée (révision de l'ADR #3 — issue #16).

## Dépendances

- Prérequis pour #11 (Raccourcis clavier et palette de commandes) : le composant
  `Command` shadcn-vue est la fondation de la palette.
- Impacte #2 (Backlog CRUD) : `Button`, `Input`, `Textarea`, `Dialog` shadcn-vue
  seront utilisés.
