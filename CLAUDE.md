# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Projet en français (docs, interface, commentaires) : écrire dans la même langue. Le guide utilisateur réel est `LISEZMOI.md` (le `README.md` est vide) ; le tableau de bord a son propre guide technique dans `app/LISEZMOI.md`.

## Commandes

```bash
# Collecteur (Node 22+, aucune dépendance — WebSocket natif)
node collecteur.mjs          # ou lancer.bat (crée config.json depuis config.exemple.json si absent)

# Tableau de bord (React)
cd app
npm install
npm run dev                  # Vite, avec mode démo : http://localhost:5173/?demo
npm run build                # tsc --noEmit + vite build + scripts/publier.mjs → ../twitch-overlap.html
npm run preview

# Docker (app sur le port 9500 via app/server.js + collecteur, config.json monté en lecture seule)
docker compose up -d
```

Pas de tests ni de lint. La seule vérification automatique est le contrôle de types `tsc --noEmit` lancé par `npm run build`. Les scripts racine `diagnostic_phase1.mjs`, `test_charge.mjs` et `calculate_limit.mjs` sont des outils de diagnostic et de charge lancés à la main avec `node`. Ce ne sont pas des suites de tests.

## Architecture

**Flux de données :** collecteur (PC ou Docker) → RPC Supabase → tableau de bord HTML (une seule page, lit Supabase avec la clé publique).

### Collecteur — `collecteur.mjs`
- Il lit le chat IRC Twitch en anonyme et interroge l'API Helix toutes les 2 min (`POLL_MS`). Helix demande `twitchClientId` et `twitchClientSecret` dans `config.json`.
- Il bufferise (`emptyBuf` / `mergeBuf` / `bufToPayload`) et envoie toutes les 30 s (`FLUSH_MS`) vers la RPC `ingest(p jsonb)`. Les raids passent par `ingest_raid`.
- Chaque lot a un id. L'idempotence est assurée côté SQL via `ingested_batches`. Les lots non envoyés sont persistés dans `en-attente.json` et renvoyés plus tard.
- Il n'accepte qu'une seule instance, via le verrou `collecteur.pid` (pid:heartbeat). L'arrêt propre se demande en créant `arreter.flag`.
- La liste des chaînes vient de la table `channels`, resynchronisée toutes les 60 s (max 100). Elle est modifiée depuis le tableau de bord, pas dans config.json.
- La rétention est réglée dans config (`joursDetailMinute`, `joursPresence`, `joursEvenements`, `joursReleves`) et appliquée par la fonction SQL `cleanup`. Une alerte se déclenche au-delà de 400 Mo (palier gratuit Supabase : 500 Mo).
- Le fuseau horaire est Europe/Paris partout. `collecteur.log` tourne à 5 Mo.
- `collecteur/` contient une **autre copie** du collecteur, utilisée par l'image Docker (`collecteur/Dockerfile`, avec metrics, retry-handler et task-queue). Une modification du collecteur doit être reportée dans les deux copies, ou alors il faut préciser laquelle est visée.

**Invariants de confidentialité :** les pseudos sont hachés en SHA-256 de `sel + ':' + user` (`hashUser`). Le texte des messages n'est jamais stocké. La clé secrète Supabase reste sur le PC, dans le collecteur.

### Base — `schema.sql`
- Le script est idempotent. Après chaque mise à jour, on le relance en entier dans le SQL Editor de Supabase, sans rien supprimer. Toute modification doit donc rester rejouable (`create … if not exists`, `create or replace`).
- Il contient les tables brutes (presence, minutes, snaps, events, words, switches…), les rollups quotidiens (`daily_*_rollup`, `daily_overlap_matrix`), les rosters, `raid_events` et `collector_status`.
- Les migrations ponctuelles sont dans `migration_*.sql`, `schema_phase2_indexes.sql` et `scripts/cron_rollup.sql`.
- Sécurité : la clé publique du tableau de bord n'est pas secrète. Les modifications de la liste de chaînes passent par `add_channels(code, list)` et `remove_channels(code, list)`, protégées par `codeTableau` (`set_board_code` / `check_board_code`).
- Problème connu : timeouts 57014 et conflits 21000 (`ON CONFLICT` touchant deux fois la même ligne dans un lot trop gros). Il faut garder les requêtes et les lots d'insertion petits et indexés.

### Tableau de bord — `app/`
- `twitch-overlap.html` (racine) est **généré** par `npm run build` dans `app/` : ne jamais l'éditer à la main.
- Le pont legacy, le moteur de la Carte, les pièges et le mode démo sont décrits dans `app/CLAUDE.md` (chargé quand on travaille dans `app/`).

### Lancement Windows
- `installer-demarrage.bat` ajoute le démarrage automatique et la tâche planifiée « TwitchOverlapCollecteur » toutes les 5 min, qui relance le collecteur s'il est tombé. `desinstaller-demarrage.bat` les retire.
