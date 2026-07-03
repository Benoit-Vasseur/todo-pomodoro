# Composants UI faits maison avec Tailwind CSS, pas de librairie de composants

## Contexte

Issue #2 (Backlog CRUD) — besoin d'une UI simple : liste de tâches, formulaire titre + description, drag & drop natif. Le projet avait trois options : librairie de composants (PrimeVue, Naive UI, etc.), template existant avec UI intégré, ou from scratch.

## Décision

On part **from scratch avec Tailwind CSS** pour les composants UI. Aucune librairie de composants, aucun template préfabriqué.

## Conséquences

**Positives :**
- **Pas de frottement entre systèmes de design** — Tailwind est le seul langage CSS ; pas de conflit avec les styles d'une lib
- **Bundle minimal** — uniquement ce qu'on écrit
- **Drag & drop natif** — contrôle total, pas de contournement d'une implémentation DnD propriétaire
- **Apprentissage concentré sur la logique métier** — composables, store idb, tests — c'est là que l'effort va
- **Flexibilité** — on peut itérer le design sans dépendre d'une mise à jour de lib

**Négatives :**
- On doit coder nous-mêmes les rares composants UI (bouton, input, textarea, card, modal si besoin)
- Pas de « look pro » instantané — nécessite un minimum de soin Tailwind
- Pas de filet d'accessibilité fourni par une lib

## Alternatives considérées

| Alternative | Raison de l'écart |
|---|---|
| **PrimeVue (unstyled + Tailwind)** | Trop de composants inutilisés ; courbe d'apprentissage du `passThrough` pour un gain marginal sur une liste + formulaire |
| **Template Vue avec UI intégré** | Rigidité ; on passe du temps à désapprendre / contourner les choix du template |
| **Naive UI / Vuetify** | Système CSS propriétaire en conflit avec Tailwind ; bundle size |

## État

Acceptée.
