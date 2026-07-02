# PRD : Pomodoro + Backlog — App de cadencement personnel

## 1. Vision

Une application web todo-list couplée à une mécanique Pomodoro, conçue pour organiser et rythmer une journée de travail. L'utilisateur gère son backlog de tâches, lance des sessions pomodoro, et des tâches récurrentes (bien-être ou à-la-carte) s'intercalent naturellement entre les sessions. Pas de contrainte Gantt — l'utilisateur va à son rythme.

Usage mono-utilisateur. Offline-first à terme ; dans un premier temps SPA sans backend.

## 2. Fonctionnalités

### 2.1 Backlog de tâches

- CRUD complet d'une tâche : titre, description (optionnelle), statut (à faire / en cours / terminée)
- Ordre par drag & drop indicatif (l'utilisateur peut démarrer n'importe quelle tâche, pas forcément la première)
- Une tâche reste dans le backlog tant qu'elle n'est pas marquée "terminée"
- Compteur de pomodoros par tâche (nombre de sessions complétées)
- Les tâches terminées restent visibles (archivées) pour les stats

### 2.2 Sous-tâches

Deux types :

- **Checklist décorative** : liste à plat simple, sans vie propre, sans compteur
- **Sous-tâche noble** : tâche à part entière avec un `parentId`. Possède titre, description, ordre, statut, compteur de pomodoros. Ne peut pas avoir elle-même de sous-tâche. Un pomodoro sur une sous-tâche incrémente son compteur ET celui du parent.

### 2.3 Sessions Pomodoro

- Durée configurable (temps de travail, temps de pause, nombre de cycles avant grande pause)
- Lancement sur une tâche ou une sous-tâche noble
- 3 états finaux :
  - **Complété** — le temps de travail est allé à son terme
  - **Interrompu** — arrêté en cours, comptabilisé comme interrompu dans les stats
  - **Abandonné** — annulé très tôt (à définir : seuil ?)
- Affichage du timer avec contrôle (démarrer, pause, arrêter)

### 2.4 Tâches récurrentes

Deux catégories :

- **Bien-être** (planifiées) : proposées systématiquement ou à intervalle (ex: boire de l'eau, se lever, pause)
- **À-la-carte** : suggérées aléatoirement parmi la liste configurée

Chaque récurrente a une configuration :

- **Mode durée par défaut** : durée fixe (avec valeur par défaut) OU durée indéterminée
- Dérogeable au moment du lancement

**Flow post-pomodoro :**

1. Pomodoro terminé → proposition de récurrentes
2. Plusieurs récurrentes mises en avant aléatoirement, mais on peut en choisir une autre dans la liste complète
3. On peut enchainer plusieurs récurrentes
4. Si on enchaine, l'app demande confirmation en affichant le nombre déjà fait et le temps passé dans l'interlude
5. On peut reporter une récurrente (alimente les stats de reports)

### 2.5 Stats & recap journalier

- Vue stats par jour (pomodoros complétés / interrompus / abandonnés, récurrentes faites/reportées, temps total)
- Si l'utilisateur revient après un saut temporel (ex: lendemain), l'app propose :
  - Un récap de la veille
  - De démarrer une récurrente
  - D'aller au backlog

### 2.6 Raccourcis clavier & palette de commandes

- Raccourcis vim-like pour les actions courantes
- Palette de commandes pour tout faire sans souris

## 3. Stack technique (v1)

- SPA (framework au choix : React/Vue/Svelte — pas de backend)
- Stockage local : IndexedDB (Dexie ou similaire)
- Design offline-first, avec prévision d'un modèle de données compatible sync CRDT à terme

## 4. Modèle de données (premier draft)

```
Tâche
  id, parentId (optionnel), title, description, order, status,
  pomodoroCount, createdAt

Sous-tâche décorative
  id, taskId, title, checked (bool), order

Tâche récurrente
  id, title, category (bien-etre | a-la-carte),
  defaultDurationMode (fixed | indefinite), defaultDuration (optionnel)

Session pomodoro
  id, taskId (ou subTaskId), startTime, endTime,
  plannedDuration, actualDuration, status (completed | interrupted | abandoned)

Stat journalier
  (dérivé des sessions, pas de table dédiée dans un premier temps)
```

## 5. Non-périmètre (v1)

- Pas d'authentification
- Pas de synchronisation multi-appareil
- Pas de backend
- Pas de notifications push
- Pas de partage / collaboratif
- Pas de sous-tâche de sous-tâche

## 6. Contraintes UX

- Le backlog est l'écran central, le timer est secondaire
- Navigation au clavier
- Pas de notion d'interruption imposée — l'utilisateur contrôle son flow
