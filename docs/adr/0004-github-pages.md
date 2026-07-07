# ADR 0004 : Hébergement GitHub Pages multi-dossiers pour Production preview et Pull-request previews

## Contexte

L'app est une SPA Vue 3/Vite (fichiers statiques) hébergée sur un repo GitHub public (`Benoit-Vasseur/todo-pomodoro`). On veut deux types de déploiements consultables : un *Production preview* (persitant, branche `main`) et plusieurs *Pull-request previews* (éphémères, une par PR). Vercel/Netlify offrent ces previews nativement et gratuitement, mais on a choisi de rester dans GitHub uniquement.

## Décision

Héberger via GitHub Pages sur une branche `gh-pages` unique, strukturée en multi-dossiers : `/main/` et `/pr-<n>/`. Un workflow GitHub Actions « tout-en-un » build par ref, puis un job `publish` sérialisé via `concurrency: gh-pages-publish` agrège les Preview bundles sur la branche `gh-pages`. Un workflow séparé sur `pull_request: [closed]` supprime le dossier `/pr-<n>/` (garbage collection).

Base Vite en `'./'` (relative) + `createWebHistory(import.meta.env.BASE_URL)`, un seul artefact de build servi depuis n'importe quel sous-dossier. Pas de fallback 404 SPA (deep-link assumé). Refresh du Production preview sur `push: [main]`. Fenêtre de vide entre merge et publication acceptée (best-effort).

## Options considérées

- **Vercel previews natifs** — config zéro, previews de PR automatiques, mais sortie de l'écosystème GitHub-only voulu par l'auteur.
- **Netlify** — quasi équivalent à Vercel, écarté pour la même raison.
- **GitHub Pages + branche par PR** — non supporté par Pages (un seul site par repo en version gratuite).
- **Hybride Pages + bucket externe pour les PRs** — contradictoire avec l'objectif GitHub-only.

## Conséquences

- Pas de preview automatique « clef en main » : maintenance de 2 workflows GitHub Actions (publish + GC).
- Deep-links `/pr-12/tasks/123` retournent 404 sur hard refresh ou partage direct — usage in-app uniquement.
- Latence possible de ~2 min entre merge d'une PR et mise à jour de `/main/`.
- La branche `gh-pages` peut accumuler des dossiers morts si un event `pull_request: closed` est manqué ; un cron de rattrapage pourra être ajouté plus tard sans conflit.
- Reste portable : basculer vers Vercel plus tard reste possible sans toucher au code (juste `base` à repasser en absolu).