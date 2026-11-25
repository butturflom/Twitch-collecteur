# Suivi du projet Twitch Overlap

État au **25/11/2026**. Ce fichier est la référence de suivi : la mémoire de Claude y renvoie. À mettre à jour à chaque PR fusionnée ou décision prise.

## 1. État en bref

- **Collecteur (PC)** : en marche, version 1.6.13. Une lecture de `collector_status` le 25/11 indique une API Twitch « ok ».
- **Base** : 271 Mo sur 500 Mo (palier gratuit). Le collecteur alerte au-delà de 400 Mo.
- **Rollups** : les crons `daily-overlap-rollup` (03 h 30 UTC) et `daily-hll` (03 h 40 UTC) sont actifs ; leurs derniers passages ont réussi le 25/11. Journées agrégées : 23/11 et 24/11 (1 915 lignes de chevauchement ; esquisses HyperLogLog pour le 24/11 seul).
- **Historique 30 et 90 jours, viewers uniques, historique du réseau** : en production (PR #11, #12, #13). Les trois fonctions répondent sur la base (testé le 25/11). Sur deux journées, les courbes restent courtes : voir §6.
- **Raid Recommender** : fait, section « Recommandations de raid » dans Par chaîne.
- **Barre latérale** : quatre groupes selon le plan (Observatoire, Analyse et flux, Exploration, Configuration). PR #24 ouverte, à valider.
- **Export PDF et CSV, Net Reach des rosters, onglet Flux** : faits (PR #10, #8, #7).
- **Docker** : build réparé (PR #5). **VPS** : mis de côté par l'utilisateur.
- **Carte** : critique n°7 à 28/40, aucune modification retenue. **Vue d'ensemble** : critique n°7 à 27/40, seul le bug Phase 3 traité (PR #22).

**Incidents passés** : timeouts 57014 et conflits 21000 (`ON CONFLICT`) corrigés le 24/11 (PR #3 pour les doublons, PR #6 pour les index et les rollups). Aucun 57014 depuis le 24/11 à 01 h UTC ; les 21000 se sont arrêtés le 24/11 à 22 h 06 UTC. La page « Par chaîne » noire et la vue d'ensemble bloquée sont revenues avec la PR #4.

## 2. Pull requests

| PR | Branche | Objet | État |
|---|---|---|---|
| #20 | `carte-noms-masques` | Carte : noms masqués dits dans le bandeau | ouverte : à fusionner en premier |
| #21 | `hallmark-redesign` | Retrait du carré violet devant les titres de section | ouverte : après #20 (elle contient son commit) |
| #22 | `vue-ensemble-critique-7` | Phase 3 : noms de chaîne et croissance moyenne corrigés | ouverte, indépendante |
| #23 | `suivi-2026-11-25` | Ce fichier, règles de lecture, permissions | ouverte (cette PR) |
| #24 | `sidebar-plan-3` | Barre latérale : groupes selon le plan V2 (§3) | ouverte : à fusionner si l'ordre convient, sinon fermer |

Les fusions sont décidées par l'utilisateur. Claude ne fusionne pas.

## 3. Plan V2 (`plan.md.txt`)

| Élément | État | Note |
|---|---|---|
| Étape 1 : base et rollups | Fait (PR #6) | Les brutes sont purgées par `cleanup()`, pas à 48 h (choix voulu). |
| Étape 2 : raids | Partiel | Raids reçus par IRC (USERNOTICE), 279 lignes dans `raid_events`. EventSub non utilisé (webhook public requis). Le marquage `is_raid` à ±10 min n'est pas faisable : `switches` est agrégé par jour. |
| Étape 3 : Flux (Sankey) | Fait (PR #7) | Bug de hooks corrigé. |
| Étape 4 : Rosters et Net Reach | Fait (PR #8) | Rosters encore dans le navigateur (localStorage), pas en base. |
| Étape 5 : export | Fait (PR #10) | PDF par impression du navigateur ; CSV compatible Excel français. |
| Étape 6 : Docker | Fait pour le build (PR #5) | VPS non déployé. |
| Fonctionnalité 1 : Raid Recommender | Fait | Score = passages organiques A→B × (1 + réciprocité B→A / total). |
| Fonctionnalité 2 : Client View | Abandonnée | Il faudrait des rosters côté serveur et une authentification. |
| Fonctionnalité 3 : Sticky-Factor | Non fait | Définition à valider (§5). L'alerte « fuite pendant les pubs » est impossible sans jeton du diffuseur. |
| §3 : barre latérale | Aligné, PR #24 | Observatoire, Analyse et flux, Exploration, Configuration. La Carte est en tête. « Par jeu » est rangé dans Exploration, que le plan ne prévoyait pas. |
| §4 : landing page | Non fait | Texte et visuel à valider (§5). |
| Roadmap « Complet », §4 et §5 | Non commencé | Reporté par l'utilisateur. |

## 4. Décisions prises (ne pas reposer)

- **Carte, critique n°7 (25/11)** : 28/40, rien à changer. Reste en « Explorer seulement ».
- **Vue d'ensemble, critique n°7** : 27/40. Seul le bug Phase 3 (P1) est traité (PR #22). Non retenus : boutons des Recoupements, grille de chaînes et tri de Participation, pulse du bouton Analyses, état de chargement de Phase 3.
- **Plan V2, à ne pas appliquer tel quel** : sel quotidien (il casserait les viewers sur plusieurs jours), purge à 48 h dans le rollup, raids via Helix ou EventSub, Client View, alerte pendant les pubs, spec Dockerfile (obsolète).
- **Viewers uniques** : esquisses HyperLogLog (erreur d'environ 2,3 %). Pas d'exclusifs ni de paires en estimation.
- **Hash `u` raccourci (≈ −45 Mo)** : déconseillé pour l'instant (271 Mo sur 500).
- **Téléphone** : hors usage, ordinateur seulement.
- **Critiques** : l'utilisateur accepte qu'elles remettent en cause ses choix passés ; ces choix sont signalés « [ton choix] ».

## 5. À décider

1. **Sticky-Factor : définition.** Proposition : part des viewers actifs de A qui n'ont été voir aucune autre chaîne suivie sur la période. Sources : `daily_switches_rollup` (passages a→b par jour) et `daily_streamer_rollup` (agrégat quotidien par chaîne). Limite : un viewer qui part vers deux chaînes compte deux fois, donc le score est une estimation basse. Il faut une fonction SQL : vous la relancez dans le SQL Editor, ou je l'applique après votre accord.
2. **Landing page (§4).** Faire maintenant, ou plus tard ? Elle demande un texte validé (celui du plan, ou un autre) et une capture à contrôler avant fusion.
3. **Barre latérale (§3).** PR #24 applique l'ordre du plan. À fusionner si elle convient ; sinon, la fermer et garder l'ordre actuel.
4. **Deux copies du collecteur.** `collecteur.mjs` (PC) et `collecteur/collecteur.mjs` (Docker) ont divergé, avec la même version 1.6.13 : délai de `sb()` de 60 s contre 30 s ; file de relance et `/metrics` seulement dans la copie Docker ; compteur global seulement dans la copie Docker. Proposition : une seule source avant de remettre le VPS en service.
5. **Fusion des PR** : #20, puis #21, puis #22 (ou #22 seule, si la correction Phase 3 doit partir tout de suite).
6. **Permissions** : `.claude/settings.json` (versionné) ne contient que les refus de lecture. Les autorisations `git push` et `gh pr create` sont dans `.claude/settings.local.json` (non versionné). À confirmer.
7. **`.hallmark/run.txt`** : sortie d'audit non suivie. La versionner comme `.hallmark/audit-2026-11-21/`, ou l'ignorer ?

## 6. Vérifications à refaire

- **Chaque matin, après 03 h 40 UTC** : `select d, count(*) from daily_overlap_matrix group by d order by d;` doit gagner une journée par nuit. Les crons se lisent dans `cron.job_run_details`.
- **Historique 30 jours** : à juger quand 7 journées sont agrégées (vers le 30/11). **90 jours** : pas avant environ 90 jours de données ; on ne peut vérifier que la cohérence des totaux.
- **Phase 3 (Top des chaînes, communautés investies)** : le rendu réel n'a pas été vu, les données de démo sont vides. À regarder dans votre navigateur après la fusion de #22.
- **Stockage** : suivre les 271 Mo. Alerte à 400 Mo.

## 7. Modèles, effort et tokens

Ce qui compte : un modèle par type de tâche, un effort par difficulté, une session par chantier.

| Tâche | Modèle | Effort |
|---|---|---|
| Lire, chercher, répondre, petite retouche (un texte, une valeur) | Haiku 5.5 | low ou medium |
| Modifier du code, corriger un bug, écrire une fonction | Sonnet 5.5 | medium ou high |
| Décider d'un design, critiquer une page, refactoriser un gros fichier | Opus 5.5 | high |
| Problème difficile resté sans solution | Opus 5.5 | xhigh ; max seulement en dernier recours |

**Ce qui coûte le plus cher ici**
- L'effort `max` : beaucoup de réflexion à chaque réponse.
- Les critiques Impeccable : deux sous-agents, plus les lectures de fichiers, à chaque lancement.
- Les sous-agents en général : chacun repart de zéro et relit le contexte.
- Les gros fichiers : `legacy.js` (2 562 lignes, 229 Ko), `map.tsx` (38 Ko), `legacy.css` (31 Ko), `demo.ts` (30 Ko).
- `/fast` : peut faire basculer la session sur Opus si le modèle courant ne le prend pas en charge.

**Réflexes**
1. Un chantier, une session : `/clear` ou nouvelle session.
2. Changer de modèle (`/model`) au moment où la tâche change, pas au milieu d'une réflexion.
3. `/compact` quand une longue lecture a rempli la session et que le chantier continue.
4. `/cost` pour le coût d'une session, `/context` pour voir ce qui remplit la fenêtre.
5. Agents du projet : `analyste`, `app-developer` et `optimizer` en Sonnet, `monitor` en Haiku. Les lancer seulement pour un travail indépendant et volumineux.

**Réglages actuels**
- Défaut : Haiku 5.5 (choisi le 25/11 pour les nouvelles sessions). Bon pour les lectures et les petites retouches. Pour le code de l'application, Sonnet est le minimum conseillé.
- `.claude/settings.json` refuse la lecture des fichiers générés (`twitch-overlap*.html`), des journaux, des lockfiles, de `config.json` et des `node_modules`.
- Piste à tester avant d'appliquer : `skillOverrides` (valeur `name-only`) pour alléger la liste des skills chargée à chaque session.

## 8. Rétention et données

- Valeurs notées le 24/11 (`config.json` non relu le 25/11, lecture refusée) : détail minute 7 j, présence 1 j, événements et relevés 3 j. Les brutes `switches` suivent la présence.
- `cleanup()` ne supprime pas les rollups quotidiens (`daily_*`) : c'est ce qui permet l'historique sur 30 et 90 jours.
- Paliers : alerte du collecteur au-delà de 400 Mo ; palier gratuit Supabase à 500 Mo.

## 9. Méthode de vérification

- **Mise en page** (testée le 25/11, après `npm run build` dans `app/`) : capture du fichier construit, sans données.
  `chrome.exe --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1000 --virtual-time-budget=6000 --screenshot=<png> "file:///C:/Users/User/Documents/twitch-collecteur/twitch-overlap.html"`
  Puis lire le PNG avec l'outil Read. Sans base, la page affiche « Les données n'arrivent pas » après environ 10 s : c'est normal.
- **Données fictives** : `?demo` n'existe que dans le serveur de développement (`import.meta.env.DEV`, voir `app/src/main.tsx`). Lancer `npm run dev` dans `app/`, puis capturer `http://localhost:5173/?demo` (ou `?demo=<onglet>`). Non vérifié le 25/11.
- Limites : pas de données réelles (la configuration vit dans le navigateur de l'utilisateur). Le navigateur intégré ne déroule pas les animations (`requestAnimationFrame`) : préférer la capture Chrome.

## 10. Journal

- **25/11** : PR #11 à #14 fusionnées (historique 30 et 90 jours, viewers uniques, historique du réseau, accessibilité) ; PR #16 à #19 fusionnées (Carte, Vue d'ensemble, critique n°6). Ouvertes : #20, #21, #22. Critiques n°7 : Carte 28/40, Vue d'ensemble 27/40. PR #23 (ce suivi) et PR #24 (barre latérale) ouvertes.
- **24/11** : collecteur 1.6.13 (doublons, PR #3), tableau de bord de nouveau affiché (PR #4), Docker (PR #5), stockage et rollups (PR #6), onglet Flux (PR #7), Net Reach (PR #8), notes de plan (PR #9), export (PR #10).
- **23/11** : Raid Recommender implémenté, build OK.
