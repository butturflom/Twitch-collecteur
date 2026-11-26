# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Projet en français (docs, interface, commentaires) : écrire dans la même langue. Le guide utilisateur est `LISEZMOI.md`, l'historique des versions `CHANGELOG.md`, l'état des chantiers `SUIVI.md`. Le tableau de bord a son propre guide technique dans `app/LISEZMOI.md`. La liste complète est dans « Documentation », en fin de fichier.

## Hiérarchie des sources

Quand deux documents se contredisent, le plus haut gagne ; corrige ensuite le plus bas.

1. **Décisions de l'utilisateur** : ce qu'il demande dans la session, et ce qui est consigné dans `SUIVI.md` §4 et §5 (« ne pas reposer »).
2. **Produit et design** : `PRODUCT.md` pour le produit, `DESIGN.md` pour l'apparence. Les suggestions de `ui-ux-pro-max` et des autres skills de design viennent après.
3. **Règles et invariants** : ce fichier, et `app/CLAUDE.md` pour le tableau de bord.
4. **Procédures** : `.claude/CLAUDE.md`, `.claude/agents/`, `.claude/skills/`. Elles disent comment faire, pas ce qui est vrai ; elles ne redéfinissent aucune règle des niveaux 1 à 3.
5. **Copies** : texte des hooks (`.claude/hooks/`), mémoire personnelle. Une copie ne fait jamais autorité : elle renvoie à sa source. Le routage est dans `orchestrateur.md`, le barème de modèles dans `SUIVI.md` §7, la rétention dans `SUIVI.md` §8. La mémoire reflète ce qui a été dit à une date ; si elle contredit le dépôt, c'est elle qu'il faut corriger.

`SUIVI.md` décrit l'état à une date (PR, chantiers) : il ne tranche que pour les décisions qu'il consigne.

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

# Agences : dossier d'un client (clients/, non versionné) et rapport mensuel PDF/CSV
node scripts/nouveau-client.mjs "Agence" chaine1 chaine2
node scripts/rapport-mensuel.mjs clients/<agence> [jours]

# Audit du dépôt : liens, réglages, worktrees, branches (lecture seule ; skill /audit)
node scripts/audit-projet.mjs

# Docker (app sur le port 9500 via app/server.js + collecteur, config.json monté en lecture seule)
docker compose up -d
```

Pas de tests ni de lint. La seule vérification automatique est le contrôle de types `tsc --noEmit` lancé par `npm run build`. Les scripts racine `diagnostic_phase1.mjs`, `test_charge.mjs` et `calculate_limit.mjs` sont des outils de diagnostic et de charge lancés à la main avec `node`. Ce ne sont pas des suites de tests. `scripts/rapport-mensuel.mjs` (rapport d'un client) recopie les chiffres et le style de `app/src/components/rosters/roster-report.ts` : les garder alignés.

## Lancer Claude Code en orchestrateur

`lancer-orchestrateur.bat`, à la racine, ouvre Claude Code dans ce dossier avec l'agent `orchestrateur` (`.claude/agents/orchestrateur.md`). Il lit `SUIVI.md`, découpe le travail et délègue aux autres agents. Équivalent manuel, depuis la racine : `claude --agent orchestrateur`.

## Architecture

**Flux de données :** collecteur (PC ou Docker) → RPC Supabase → tableau de bord HTML (une seule page, lit Supabase avec la clé publique).

### Collecteur — `collecteur.mjs`
- Il lit le chat IRC Twitch en anonyme et interroge l'API Helix toutes les 2 min (`POLL_MS`). Helix demande `twitchClientId` et `twitchClientSecret` dans `config.json`.
- Il bufferise (`emptyBuf` / `mergeBuf` / `bufToPayload`) et envoie toutes les 30 s (`FLUSH_MS`) vers la RPC `ingest(p jsonb)`. Les raids passent par `ingest_raid`.
- Chaque lot a un id. L'idempotence est assurée côté SQL via `ingested_batches`. Les lots non envoyés sont persistés dans `en-attente.json` et renvoyés plus tard.
- Il n'accepte qu'une seule instance, via le verrou `collecteur.pid` (pid:heartbeat). L'arrêt propre se demande en créant `arreter.flag`.
- La liste des chaînes vient de la table `channels`, resynchronisée toutes les 60 s (max 100). Elle est modifiée depuis le tableau de bord, pas dans config.json.
- La rétention est réglée dans config (`joursDetailMinute`, `joursPresence`, `joursEvenements`, `joursReleves`) et appliquée par la fonction SQL `cleanup`. Défauts du code : 14, 21, 60 et 30 jours. Valeurs recommandées à 86 chaînes : 2, 1, 2 et 2 (`CHANGELOG.md`, 1.6.11). Les valeurs réelles de `config.json` ne sont pas relues ici. Une alerte se déclenche au-delà de 400 Mo (palier gratuit Supabase : 500 Mo).
- Le fuseau horaire est Europe/Paris partout. `collecteur.log` tourne à 5 Mo.
- `collecteur/` contient une **autre copie** du collecteur, utilisée par l'image Docker (`collecteur/Dockerfile`, avec metrics, retry-handler et task-queue). Une modification du collecteur doit être reportée dans les deux copies, ou alors il faut préciser laquelle est visée.

**Invariants de confidentialité :** les pseudos sont hachés en SHA-256 de `sel + ':' + user` (`hashUser`). Le texte des messages n'est jamais stocké. La clé secrète Supabase reste sur le PC, dans le collecteur.

### Base — `schema.sql`
- Le script est idempotent. Après chaque mise à jour, on le relance en entier dans le SQL Editor de Supabase, sans rien supprimer. Toute modification doit donc rester rejouable (`create … if not exists`, `create or replace`).
- Il contient les tables brutes (presence, minutes, snaps, events, words, switches…), les rollups quotidiens (`daily_*_rollup`, `daily_overlap_matrix`), les rosters, `raid_events` et `collector_status`.
- Les migrations ponctuelles sont dans `migration_*.sql`, `schema_phase2_indexes.sql` et `scripts/cron_rollup.sql`.
- Sécurité : la clé publique du tableau de bord n'est pas secrète, mais depuis le 25/11 la lecture des tables passe par `board_ok()` (en-tête `x-board-code` = `codeTableau`) : ne jamais remettre `using (true)` dans `schema.sql`, il rouvrirait la lecture à tous. Voir `CONFORMITE.md`. Les modifications de la liste de chaînes passent par `add_channels(code, list)` et `remove_channels(code, list)`, protégées par `codeTableau` (`set_board_code` / `check_board_code`).
- Problème connu, résolu le 24/11 (plus de 57014 depuis 01 h UTC, 21000 arrêtées avec le collecteur 1.6.13) : `ON CONFLICT` touchant deux fois la même ligne dans un lot trop gros. Garder les requêtes et les lots d'insertion petits et indexés.

### Tableau de bord — `app/`
- `twitch-overlap.html` (racine) est **généré** par `npm run build` dans `app/` : ne jamais l'éditer à la main.
- Le pont legacy, le moteur de la Carte, les pièges et le mode démo sont décrits dans `app/CLAUDE.md` (chargé quand on travaille dans `app/`).

### Lancement Windows
- `installer-demarrage.bat` ajoute le démarrage automatique et la tâche planifiée « TwitchOverlapCollecteur » toutes les 5 min, qui relance le collecteur s'il est tombé. `desinstaller-demarrage.bat` les retire.

## Suivi, lecture économe et vérification

- État des chantiers, PR et décisions : `SUIVI.md`, à relire au début de chaque chantier. Le plan V2 d'origine est archivé dans `archives/plan-v2.md.txt` ; `SUIVI.md` §3 en donne l'état.
- Modèle et effort : `SUIVI.md`, §7. Un chantier = une session (`/clear`).
- Lectures : `app/src/legacy/legacy.js` fait 2 562 lignes (229 Ko). Le chercher avec `grep -n`, puis le lire par plages (`offset` et `limit`). Ne pas relire un fichier déjà lu dans la session. `.claude/settings.json` refuse la lecture des fichiers générés, des journaux, des lockfiles, de `config.json` et des `node_modules`.
- Vérifier un rendu : `npm run build` dans `app/`, puis capture Chrome headless (méthode dans `SUIVI.md`, §9), puis lecture du PNG. Le navigateur intégré ne déroule pas les animations.
- Reconstruction automatique : après toute modification de `app/src` (code, CSS, démo), Claude lance `npm run build` dans `app/` sans qu'on le lui demande, pour que `twitch-overlap.html` (fichier généré) soit à jour ; si le build échoue, il le dit. Un hook git (copie de `scripts/hooks/post-merge`, versionné, à copier une fois dans `.git/hooks/` après un clone) fait de même après un `git pull` ou une fusion qui change `app/`.
- Idées et planification : l'orchestrateur (`.claude/agents/orchestrateur.md`, section « Idées et plans ») range les idées dans `IDEES.md`, les évalue (plus-value, coût, verdict) et planifie en déléguant aux modèles les moins chers capables (barème de `SUIVI.md`, §7).
- Outils 3D et design (`SUIVI.md` §16) : skills `three-js`, `react-three-fiber`, `ui-ux-pro-max` (seul skill de critique de design depuis le 26/11 : Impeccable est archivé) ; connecteur Higgsfield (génération et scènes 3D, flux Blender) ; serveurs MCP `playwright` et `spline` (`.mcp.json`). Le moteur de la Carte reste impératif dans `legacy.js` ; depuis le 25/11 (décision de l'utilisateur), Three.js est un complément autorisé à modifier le code, et les évaluations de ces outils comptent comme légitimes. Sur une surface neuve, prototype isolé avec critère go/no-go d'abord. `DESIGN.md` prime sur les suggestions de `ui-ux-pro-max`.

## Documentation

Un fichier, un rôle. Quand un fait change, mets à jour le fichier qui le porte, et un seul.

- `LISEZMOI.md` : guide utilisateur (installer, tableau de bord, mise à jour, conservation).
- `CHANGELOG.md` : notes de version, de la plus ancienne à la plus récente. Une entrée par version du collecteur ou du tableau de bord ; dire si `schema.sql` doit être rejoué.
- `SUIVI.md` : état des chantiers, PR, décisions. À mettre à jour à chaque PR fusionnée ou décision prise.
- `CLAUDE.md` (ce fichier) et `.claude/CLAUDE.md` : repères pour Claude Code.
- `app/CLAUDE.md` et `app/LISEZMOI.md` : tableau de bord (code, ponts, mode démo).
- `DOCKER.md` : conteneurs. La copie `collecteur/` est en retard sur la racine ; la racine fait foi.
- `DESIGN.md` et `PRODUCT.md` (racine) : design et produit, ils font foi. `.impeccable/` garde les anciens rapports de l'outil Impeccable (retiré le 26/11) : historique seulement, ne pas s'y fier sans comparaison.
- `IDEES.md` : boîte à idées et plans, tenue par l'orchestrateur.
- `CONFORMITE.md`, `COUTS-CLIENTS.md`, `VALIDATION-AGENCES.md` : vie privée et conditions Twitch, coûts par client, kit de validation des agences.
- `ROADMAP-COMPLET.txt` : analyses prévues. Les sections 4 et 5 ne sont pas commencées.
- `archives/` : anciens plans et ancienne copie de la mémoire. Historique seulement, à ne pas mettre à jour.
