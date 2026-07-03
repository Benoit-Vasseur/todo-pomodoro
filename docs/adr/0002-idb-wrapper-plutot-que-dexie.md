# idb (Jake Archibald) plutôt que Dexie pour IndexedDB

Le projet a besoin d'IndexedDB pour le stockage local offline-first. Dexie est le choix évident dans l'écosystème Vue, mais il apporte un DSL propriétaire et ~30KB pour un modèle de données de seulement 5-6 entités.

On utilise le wrapper [`idb`](https://github.com/jakearchibald/idb) de Jake Archibald (~1KB) — une couche Promises minimale qui ne cache pas IndexedDB. Les composables Vue 3 (`useTasks()`, `useSessions()`, etc.) construiront les abstractions applicatives par-dessus.

**Considéré** : Dexie (plus de fonctionnalités, live queries, migrations automatiques — mais overkill pour ce périmètre). **Écarté** car la complexité supplémentaire n'est pas justifiée pour un petit modèle de données, et `idb` facilitera une éventuelle migration CRDT.
