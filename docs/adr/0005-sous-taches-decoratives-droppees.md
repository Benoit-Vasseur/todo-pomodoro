# Sous-tâches décoratives droppées de la v1

Le PRD distinguait deux types de sous-tâches : « checklist décorative » (liste à plat sans vie propre, sans compteur) et « sous-tâche noble » (tâche à part entière avec `parentId`, statut, compteur pomodoro — issue #4). La v1 ne livrera que les nobles.

Une checklist cochable vois de ~80% du plumbing des nobles (store dédié, CRUD, UI dans le détail de tâche, tests) sans le `parentId` — deux modèles mentaux et deux tables pour des sous-tâches « sans vie propre ». Une liste à tirets dans le champ `description` (déjà éditable via `Textarea`) couvre l'essentiel du besoin perçu, au prix d'un Manuel edit. #4 (nobles) couvre le besoin structurel d'arborescence et de compteur hérité ; il n'a pas besoin de #3 pour exister.

**Considéré** : livrer les deux mécanismes comme prévu dans le PRD initial. **Écarté** car le coût de maintenance de deux modèles de sous-tâches n'est pas justifié pour un MVP mono-utilisateur, et le nom même « décorative » signale l'optionnalité. L'issue #3 est close en `wontfix`.