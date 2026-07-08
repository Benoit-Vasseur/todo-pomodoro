# ADR 0006 : Compteurs de pomodoros dérivés des sessions, pas stockés sur la tâche

## Contexte

Le PRD initial §4 listait `pomodoroCount` comme champ direct de `Tâche`. En travaillant l'issue #4 (sous-tâches nobles avec héritage du compteur vers le parent) puis #7 (sessions interrompues/abandonnées) et #10 (stats journalières), on s'est aperçu qu'un compteur stocké sur la tâche entraîne des double écritures (champ + session) risquant de diverger, masque les tentatives échouées, et complique l'héritage parent/sous-tâche. L'arrivée des sous-tâches nobles force à trancher le modèle maintenant — une seule migration plutôt que deux.

## Décision

La source de vérité est la table `sessions` (`id`, `taskId` | `subTaskId`, `startTime`, `endTime`, `status`). `Task` ne porte **pas** de champ `pomodoroCount` : tout compteur (par tâche, par sous-tâche, héritage vers parent, stats journalières) est calculé par agrégation à la lecture. Pour distinguer l'effort investi du succès, on exposera `pomodoroCount` (sessions `complétées`) et `attemptCount` (toutes sessions démarrées) comme vues dérivées. L'issue #4 pose le schéma `sessions` dès maintenant ; l'issue #5 viendra y écrire les vraies sessions via le timer.

## Options considérées

- **Compteur stocké sur la tâche, incrémenté à chaque pomodoro complété** — direct, mais double écriture avec `sessions` et oblige une re-migration à #7 pour distinguer les états finaux.
- **Compteur stocké couvrant tous les états finaux** — simple, mais ne distingue pas « réussis » de « tentés », et #10 devra re-dériver les stats à partir des sessions de toute façon.
- **Hybride (compteur stocké + sessions pour le détail)** — pire des deux : deux sources de vérité.

## Conséquences

- Pas de désynchronisation possible entre compteur et sessions : une seule source.
- Stats #10 quasi gratuites (requêtes d'agrégation sur `sessions`).
- Compatible avec un futur modèle sync CRDT (PRD §3) : on logge des événements, pas des counts qui divergent.
- Coût d'une agrégation indexée (`by_taskId`) à chaque affichage du backlog — négligeable en mono-utilisateur IndexedDB.
- #4 doit introduire la table `sessions` alors que le timer (#5) n'existe pas encore ; en attendant, les compteurs afficheront `0` partout, ce qui est cohérent.
- Surprendra un lecteur qui s'attend à trouver `pomodoroCount` sur `Task` — justifié par cet ADR.
- **Sessions immortelles** : supprimer une tâche ou sous-tâche ne supprime pas ses sessions. Les `taskId`/`subTaskId` deviennent des références mortes, mais les sessions restent en base pour les stats journalières (#10 agrège par date, pas par tâche). Un récap historique ne change jamais rétroactivement quand une tâche vivante est supprimée plus tard.