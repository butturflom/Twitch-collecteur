# Suivi du projet Twitch Overlap

État au **26/11/2026**. Ce fichier est la référence de suivi : la mémoire de Claude y renvoie. À mettre à jour à chaque PR fusionnée ou décision prise.

## 0. Pour reprendre (mis à jour le 27/11)

**Review de l'utilisateur (27/11)** : points rangés, notés et planifiés dans `IDEES.md` (« Review du 27/11 »). Décisions : constellation des Recoupements centrée au-dessus du texte ; Chevauchement et Flux réunis dans un onglet « Audiences » ; la Carte doit refléter le direct ; viewers max dans « Les chaînes » et « Par chaîne » ; les 96 % à mettre en avant. Un chantier à la fois, sur « lance ».

**R0 livré (27/11, tableau de bord 2.0.4)** : les raids ne s'affichaient plus en mode collecteur (lus dans `events`, écrits dans `raid_events`). Vérifié contre une fausse base ; **à confirmer par l'utilisateur sur ses données**. **R1 livré (27/11)** : audit des calculs dans `CALCULS.md`. Les plus graves : heures de stream environ ×3, jours différents sous « Tout », raids qui dominent les « interactions » (conséquence de la 2.0.4), trois comptages des migrations. 

**R1 corr livré (27/11, 2.0.5)**, décisions de `CALCULS.md` §4 acceptées par l'utilisateur. **Fidélité du chat (2.0.6)** : corrigée dans `schema.sql`, accord de l'utilisateur ; testée sur la base dans une transaction annulée (26/11 : 85 chaînes, médiane 93,5), **appliquée en base le 27/11 vers 16 h 10** (migration `fidelite_partants_distincts`, sur « applique »). Journée du 26/11 recalculée : mêmes totaux qu'avant, 5 068 partants ; 23 au 25/11 gardent l'ancienne estimation. À confirmer par l'utilisateur sur ses données.

**Carte en direct livrée (27/11, 2.0.7)** : chaînes en direct seulement (hors ligne sur demande, endormies), taille = viewers en direct, filtres sur le direct, plus de période ; liens et groupes sur tout le détail. Vérifiée en démo seulement : **à regarder sur les vraies données** (fluidité, carte aux heures creuses, planètes de 12 à 26 px de rayon). Prochain : R2.

**R2 livré (27/11, 2.0.8, PR #79 fusionnée)** : « Aujourd'hui » par défaut, viewers max, bandeau des raids, constellation centrée, onglet Clip, rangement de Par chaîne, Chat, Par jeu, Réglages, légende de la Carte dans l'aide. Vérifié en démo et avec le vrai code sur une base locale fictive : **à regarder sur les vraies données** (écrans après minuit, bandeau, carte des migrations sur « Aujourd'hui »). « Avec ou sans pub » replié sur tout le détail : pas testé avec des données. **Reste hors plan** : le bloc « En ce moment ». Prochain : R3 (onglet Audiences), maquette avec Opus.
**R3 livré (27/11, tableau de bord 2.0.9, PR #81 fusionnée)** : onglet « Audiences » (Chevauchement et Flux réunis, diagramme supprimé) ; Vue d'ensemble avec activité en tête, « Jour par jour » et « En ce moment » (jeux du moment, « Les streamers montants ») ; seules les chaînes suivies comptent. Vérifié en démo, sur des données fictives et en base mémoire : **à regarder sur les vraies données**. **Base à jour le 27/11 au soir** (migration `r3_actifs_et_pic_par_jour`, sur « applique » ; relevés conservés 3 jours) : actifs du 24 au 26/11, pic des 25 et 26/11, fonctions identiques à `schema.sql`, aucune alerte de sécurité nouvelle. Constat noté dans `IDEES.md` : sur une base neuve, `schema.sql` échoue (à corriger avant le premier client). Prochain : R4 (résumé du live du jour).

**R4 livré (27/11, tableau de bord 2.0.10)** : bloc « Live du jour » en tête de « Par chaîne » (viewers max et son heure, début, fin, moyenne, minimum après 10 min, jeux) ; lives précédents repliés ; ce qui n’est pas observé est écrit. Historique en base : table `lives`, `build_lives`, `channel_lives` (environ 0,75 Mo par mois à 100 chaînes). Vérifié en démo, sur base fictive et en base mémoire. PR #84 fusionnée. **Base à jour le 27/11 vers 21 h 25** (migration `r4_historique_des_lives`, sur « applique ») : 212 lives sur 82 chaînes depuis le 24/11 à 20 h 57, dont 134 avec début et fin observés ; fonctions identiques à `schema.sql`, aucune alerte de sécurité nouvelle ; base à 320 Mo avant l’ajout. Avec `joursReleves` à 1 ou 2, une nuit sans calcul fait aussi perdre des lives. **À regarder sur les vraies données** (début et fin d’un vrai live). Prochain : R5 (prototype des planètes), devis avant génération.

**Correctif 2.0.11 (27/11 au soir)** : « Par chaîne » était entièrement vide dès que la chaîne choisie était en direct (`shown is not a function`, présent depuis l’import du 24/11), et « Recommandations de raid » restait toujours vide. Signalé par l’utilisateur, vérifié sur une fausse base avec tous les onglets. Leçon : une vérification sur base fictive doit comporter une chaîne en direct AVEC des présences, des passages et des raids. **À regarder sur les vraies données** ; une erreur 401 vue en console reste à identifier par son adresse. Petits restes : `CLOUD_OPTIONAL` jamais utilisé.

**2.0.12 (27/11)** : l’utilisateur confirme que « Par chaîne » marche chez lui. Bloc raid : message propre hors direct et sans API, boutons de copie à la taille de leur texte. Restent à contrôler : lives du soir ajoutés par le calcul de nuit (lecture seule, le 28/11) et début et fin d’un live réel (utilisateur). Avant un premier client : `CLOUD_OPTIONAL`, `schema.sql` sur base neuve. Vu à 390 px : barres du bloc raid très courtes (téléphone hors usage).

**Deux constats du 26/11 au soir (lecture seule en base)** : (1) la liste suivie est à **100 chaînes sur 100** ; (2) `raid_events` contient **47 doublons** sur 365 lignes (même paire, même nombre de viewers, souvent à 1 ms), entre le 23/11 et le 25/11 à 16 h 07, aucun ensuite, cause non cherchée. Le bloc des raids les écarte à l'affichage, mais la part « raid » des passages (`daily_switches_rollup`, Flux et carte des migrations) additionne les viewers des raids : elle peut être **surestimée sur ces jours-là**. Rien n'a été modifié en base.

**Ajout de streamer réparé (26/11, tableau de bord 2.0.1, PR #70 fusionnée)** : la recherche des Réglages ne partait jamais et l'API n'avait plus de champs de saisie (panneau incomplet depuis le portage React). Le **chantier F est livré** (2.0.2, PR #71 fusionnée) : liste entière filtrable, retrait confirmé, ajout en bloc, résultats avec viewers et langue. **Sans bouton** : changement de mode local / nuage, reprise des chaînes locales, collage d'un jeton. **Chantier G livré** (2.0.3, PR #72 fusionnée) : bloc « Elles ont raidé tes chaînes ». À vérifier par l'utilisateur : recherche avec la vraie API, retrait sur la vraie base.

**Où on en est** : PR #62 à #66 (organisation des outils, audit du dépôt, restes d'Impeccable, hiérarchie des documents, orchestrateur et contremaître fusionnés) fusionnées le 26/11. PR #67 (entrées du tableau de bord numérotées en 2.0.0) fusionnée le 26/11. Fusion désormais autorisée en permanence par l'utilisateur. Avant elles, tout est fusionné dans `main` jusqu'à la PR #59 (documentation et seuil de fidélité, fusionnée le 26/11 sur demande). La PR #60 (petits défauts d'affichage) est fusionnée le 26/11, sur demande. La PR #61 (notes de cadrage, sans code) est fusionnée le 26/11, sur demande. **Pause ensuite** ; à la reprise : chantier E, prototype des planètes, à lancer seulement sur « lance le prototype ». La #45 est fermée sans fusion, son contenu est repris ici et dans `CHANGELOG.md`. La direction agences est préparée sans rien engager (§12). L'utilisateur veut **1 à 2 mois d'amélioration des analyses**, le temps d'accumuler des données, puis la vraie prospection (fin décembre à janvier).

**Calendrier des données** (les rollups ne gagnent qu'une journée par nuit)

| Quand | Quoi |
|---|---|
| Chaque matin | `select d, count(*) from daily_overlap_matrix group by d order by d;` doit gagner une journée (§6) |
| Vers le 30/11 | juger l'historique 30 jours (7 journées agrégées) |
| Vers le 8/12 | alertes de rythme sur de vraies chaînes (ajuster `app/src/lib/rhythm.ts`) ; carte des migrations sur 14 journées |
| Vers le 23/12 | trajectoire à 30 jours (pente, écart à la moyenne, jamais une prédiction), à ajouter aussi au rapport mensuel |
| Quand les données seront là | tester `scripts/rapport-mensuel.mjs` sur une vraie base (jamais fait : seulement un faux serveur) |

**Ce que seul l'utilisateur peut faire**
- Carte des migrations : ouvrir l'onglet Flux avec le bon code. La fonction `flows_by_day` est en base, identique à `schema.sql`, et un mauvais code renvoie 0 ligne (vérifié le 26/11).
- Intro : déposer idées et inspirations dans `IDEES.md` (« Inspirations pour l'intro »). Planètes : cadrer le chantier E.
- Regarder avec les vraies données : le Sankey, la Vue d'ensemble spatiale, les classements, le filtre de la Carte par jeu. Claude n'a vu que le mode démo.
- Confirmer les durées de rétention de `config.json` (§8).
- Prendre les rendez-vous avec 3 à 5 agences (`VALIDATION-AGENCES.md`) ; décider d'un projet Supabase pour un premier client (coût, RGPD de `CONFORMITE.md`).

**Fidélité du chat (tranché le 26/11)** : le score n'est donné qu'à partir de 200 viewers actifs partout, tableau de bord, comparaison de chaînes et rapport mensuel (PR #59). Conséquence : les petites chaînes n'ont plus de score (§12 bis, point 1).

**Chantiers possibles ensuite** : trajectoire (après le 23/12) ; critique de design de « Par chaîne » (coûteuse, sur demande) ; étendre les analyses neuves au rapport mensuel. L'hébergement et les comptes clients (chantier D) attendent un premier contrat.

**Pièges à ne pas oublier**
- Après toute modification de `app/src` : `npm run build` dans `app/`. Après un `git pull`, le hook fait le build (et `npm install` si les dépendances changent) : `scripts/hooks/post-merge`, à copier une fois dans `.git/hooks/` (§14).
- Une PR dont la base est une branche déjà fusionnée se fusionne dans cette branche : viser `main` (§13). Fusions : autorisation permanente (§4) ; déployer reste sur demande.
- Deux copies du collecteur (`collecteur.mjs` fait foi) ; le dossier d'un client en contient une troisième, figée (`scripts/nouveau-client.mjs`).
- `scripts/rapport-mensuel.mjs` et `roster-report.ts` recopient les mêmes chiffres et le même style : les garder alignés.
- `DESIGN.md` : règle des « deux niveaux de lueur » (§17). Ne pas la durcir sans l'utilisateur, il l'a voulue.

**Réglage de session** : un chantier à la fois ; l'orchestrateur délègue et choisit le modèle (§7). Lire ce §0 puis le §6 en début de session.

## 1. État en bref

- **Collecteur (PC)** : en marche, version 1.6.13. Une lecture de `collector_status` le 25/11 indique une API Twitch « ok ».
- **Base** : 285 Mo sur 500 Mo le 25/11 (§15, palier gratuit). Le collecteur alerte au-delà de 400 Mo.
- **Rollups** : les crons `daily-overlap-rollup` (03 h 30 UTC) et `daily-hll` (03 h 40 UTC) sont actifs ; leurs derniers passages ont réussi le 25/11. Journées agrégées : 23/11 et 24/11 (1 915 lignes de chevauchement ; esquisses HyperLogLog pour le 24/11 seul).
- **Historique 30 et 90 jours, viewers uniques, historique du réseau** : en production (PR #11, #12, #13). Les trois fonctions répondent sur la base (testé le 25/11). Sur deux journées, les courbes restent courtes : voir §6.
- **Raid Recommender** : fait, section « Recommandations de raid » dans Par chaîne.
- **Barre latérale** : quatre groupes selon le plan (Observatoire, Analyse et flux, Exploration, Configuration), fusionnée le 25/11 (PR #24).
- **Export PDF et CSV, Net Reach des rosters, onglet Flux** : faits (PR #10, #8, #7).
- **Nouveautés du 25/11** : page d'accueil (une fois par navigateur), fidélité du chat (Sticky-Factor, comparée aux chaînes de taille voisine), comparaison de 2 à 4 chaînes (Rosters), alertes de rythme (Vue d'ensemble), « Son univers » et 5 indicateurs de tête (Par chaîne), filtre de la Carte par jeu principal. Détail : §13.
- **Soir du 25/11 et nuit du 26/11** (PR #46 à #58) : intro animée de l'accueil, planètes peintes à la place des photos, carte des migrations dans Flux, corrections de justesse, outils et skills, documentation nettoyée.
- **Aspect** : ambiance spatiale sur toutes les pages sauf la Carte (ciel étoilé, panneaux « console », avatars en planètes, constellation des recoupements), PR #43 et #44. Voir §17.
- **Fonctions SQL déployées en base le 25/11** : `channel_stickiness` et `channels_rhythm` (ajouts seuls). Elles sont aussi dans `schema.sql`, à rejouer sur toute nouvelle base.
- **Agences** : étape 1 (kit d'entretien) et étape 2 (dossier client, rapport mensuel PDF/CSV) préparées le 25/11, PR #42 ; rien n'est créé chez Supabase. Voir §12.
- **Docker** : build réparé (PR #5). **VPS** : mis de côté par l'utilisateur.
- **Carte** : critique n°7 à 28/40, aucune modification retenue. **Vue d'ensemble** : critique n°7 à 27/40, seul le bug Phase 3 traité (PR #22, fusionnée).

**Incidents passés** : timeouts 57014 et conflits 21000 (`ON CONFLICT`) corrigés le 24/11 (PR #3 pour les doublons, PR #6 pour les index et les rollups). Aucun 57014 depuis le 24/11 à 01 h UTC ; les 21000 se sont arrêtés le 24/11 à 22 h 06 UTC. La page « Par chaîne » noire et la vue d'ensemble bloquée sont revenues avec la PR #4.

## 2. Pull requests

| PR | Branche | Objet | État |
|---|---|---|---|
| #20 | `carte-noms-masques` | Carte : noms masqués dits dans le bandeau | fusionnée le 25/11 |
| #21 | `hallmark-redesign` | Retrait du carré violet devant les titres de section | fusionnée le 25/11 |
| #22 | `vue-ensemble-critique-7` | Phase 3 : noms de chaîne et croissance moyenne corrigés | fusionnée le 25/11 |
| #23 | `suivi-2026-11-25` | Ce fichier, règles de lecture, permissions | fusionnée le 25/11 (après #24) |
| #24 | `sidebar-plan-3` | Barre latérale : groupes selon le plan V2 (§3) | fusionnée le 25/11 |
| #25 | `sticky-factor` | Fidélité du chat (Sticky-Factor) | fusionnée le 25/11 |
| #26 | `landing-page` | Page d'accueil (plan §4) | fusionnée le 25/11 |
| #27 | `suivi-landing-fusionnee` | Direction agences et streamers (PRODUCT.md, §12) | fusionnée le 25/11 |
| #28, #29 | `comparer-chaines`, `fidelite-petites-chaines` | Comparer 2 à 4 chaînes ; fidélité dès 30 viewers actifs | fusionnées le 25/11 |
| #30 à #35 | `alertes-rythme`, `mon-univers`, `par-chaine-essentiel`, `fidelite-voisines`, suivi | Alertes de rythme, son univers, l'essentiel de Par chaîne, fidélité comparée aux voisines (#33 est passée par #35) | fusionnées le 25/11 |
| #36 | `carte-filtre-jeu` | Carte : filtre par jeu principal | fusionnée le 25/11 |
| #37 | `regle-build-auto` | CLAUDE.md : reconstruction automatique du tableau de bord | fusionnée le 25/11 |
| #38 | `docs-maj-25-11` | Cette mise à jour de la documentation | fusionnée le 25/11 (après #37) |
| #39 | `carte-menu-lecture-protegee` | Menu de la Carte, classements, lecture protégée par code, effacement, CONFORMITE.md | fusionnée le 25/11 (§15) |
| #40, #41 | `suivi-39-fusionnee`, `carte-sans-pastilles` | Suivi de #39 ; Carte : retrait des pastilles de filtres actifs | fusionnées le 25/11 |
| #43 | `vue-ensemble-spatiale` | Vue d'ensemble spatiale : ciel étoilé, cartes console, avatars en planètes, constellation des recoupements (choix de l'utilisateur, DESIGN.md mis à jour) | fusionnée le 25/11, sur demande (la règle des lueurs de DESIGN.md est devenue « deux niveaux ») |
| #44 | `ciel-toutes-pages` | Ciel étoilé étendu à toutes les pages sauf la Carte (`SKY_TABS`) | fusionnée le 25/11, sur demande |
| #42 | `agences-validation-et-clients` | Direction agences : kit de validation, dossier client, rapport mensuel (§12) | fusionnée le 25/11, sur demande |
| #45 | `suivi-pause-25-11` | Documentation : reprise après la pause | fermée sans fusion le 26/11, contenu repris par #59 |
| #46, #47 | `worktree-skills-3d-hud-contremaitre` (comme les suivantes) | Skills 3D et HUD, `/contremaitre`, `IDEES.md`, coûts clients, écran vide | fusionnées le 25/11 |
| #48 à #50 | | Page d'accueil : corrections de la critique | fusionnées le 25/11 |
| #51 | | Chantier A : planète partout | fusionnée le 25/11 |
| #52 | | Chantier B : intro d'accueil (Three.js) | fusionnée le 25/11 |
| #53 | | Chantier C : fonction `flows_by_day` et carte des migrations dans Flux | fusionnée le 26/11 ; fonction vérifiée en base |
| #54 | | Chantier C3 abandonné (documentation) | fusionnée le 26/11 |
| #55 | | Planètes peintes et corrections de justesse | fusionnée le 26/11 |
| #56, #57 | | Hook post-merge versionné, skill `/verifier` | fusionnées le 26/11 |
| #58 | | Documentation nettoyée, agent et lanceur orchestrateur | fusionnée le 26/11 |
| #59 | `docs-26-11` | Documentation à jour ; rapport mensuel : fidélité à partir de 200 viewers actifs | fusionnée le 26/11, sur demande |
| #60 | `corrections-affichage` | Rosters : un seul titre et tutoiement ; « 1 000 » insécable dans Par chaîne | fusionnée le 26/11, sur demande |
| #61 | `idees-intro-planetes` | Notes : intro prototype, cadrage des planètes low-poly, règle des deux temps de la Carte | fusionnée le 26/11, sur demande |
| #62 | `organisation-agents` | Organisation des outils : rappels de session (hooks), Impeccable archivé (`ui-ux-pro-max` pour le design), skills Vercel et agents morts archivés, routage de l'orchestrateur, Higgsfield et Spline pour la 3D | fusionnée le 26/11, sur demande |
| #63 | `worktree-audit-projet` | Audit du dépôt (`scripts/audit-projet.mjs`), skill `/audit`, archivage des agents `analyste` et `app-developer` et des skills `web-design-guidelines` et `writing-guidelines`, liens corrigés | fusionnée le 26/11, sur demande |
| #64 | `worktree-supprime-impeccable-restes` | Suppression des cinq fichiers de configuration Impeccable restants | fusionnée le 26/11, sur demande |
| #65 | `worktree-hierarchie-docs` | Hiérarchie des sources dans `CLAUDE.md`, copies renvoyées à leur source, pointeurs corrigés | fusionnée le 26/11, sur demande |
| #66 | `worktree-fusion-orchestrateur-contremaitre` | Orchestrateur et contremaître fusionnés en un seul agent ; skill `contremaitre` archivé | fusionnée le 26/11, sur demande |
| #67 | `worktree-changelog-version-tableau` | Entrées du tableau de bord numérotées en 2.0.0 ; règle de numérotation dans `CLAUDE.md` | fusionnée le 26/11, sur demande |
| #68 | `suivi-pr67-fusionnee` | Suivi : statut de la PR #67 | fusionnée le 26/11 |
| #69 | `worktree-regle-fusions` | Règle des fusions : copies alignées sur le §4 | fusionnée le 26/11, sur demande |
| #73 | `raids-affichage` | R0 : raids de nouveau affichés (2.0.4) ; review du 27/11 rangée dans `IDEES.md` | fusionnée le 27/11 |
| #74 | `audit-calculs` | R1 : audit des calculs (`CALCULS.md`), documentation seule | fusionnée le 27/11 |
| #75 | `calculs-corriges` | R1 corr : calculs corrigés (2.0.5) | fusionnée le 27/11 |
| #76 | `fidelite-partants` | Fidélité du chat : partants distincts (2.0.6, appliquée en base) | fusionnée le 27/11 |
| #78 | `carte-direct` | Carte en direct (2.0.7) | fusionnée le 27/11 |

Le 25/11, l'utilisateur a demandé de fusionner dans l'ordre #20, #21, #22, #24, puis #23 : c'est fait. La règle actuelle des fusions est au §4 (autorisation permanente du 26/11).

## 3. Plan V2 (archivé : `archives/plan-v2.md.txt`)

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
| Fonctionnalité 3 : Sticky-Factor | Fait (PR #25), fonction déployée | Score sur 100 dans Par chaîne → Historique, comparé aux quartiles des chaînes suivies : les seuils du plan (70 et 40) colorieraient tout en vert (minimum observé le 24/11 : 72). L'alerte « fuite pendant les pubs » est impossible sans jeton du diffuseur. |
| §3 : barre latérale | Fait (PR #24) | Observatoire, Analyse et flux, Exploration, Configuration. La Carte est en tête. « Par jeu » est rangé dans Exploration, que le plan ne prévoyait pas. |
| §4 : landing page | Fait (PR #26) | Posée par-dessus le tableau de bord, une seule fois (drapeau `to2-landing-seen`, `?accueil` la rouvre). Texte du plan mis au tutoiement, sans chiffre ni fonction inventés. |
| `ROADMAP-COMPLET.txt`, §4 et §5 | Non commencé | Reporté par l'utilisateur. |

## 4. Décisions prises (ne pas reposer)

- **Carte, critique n°7 (25/11)** : 28/40, rien à changer. Reste en « Explorer seulement ».
- **Vue d'ensemble, critique n°7** : 27/40. Seul le bug Phase 3 (P1) est traité (PR #22). Non retenus : boutons des Recoupements, grille de chaînes et tri de Participation, pulse du bouton Analyses, état de chargement de Phase 3.
- **Plan V2, à ne pas appliquer tel quel** : sel quotidien (il casserait les viewers sur plusieurs jours), purge à 48 h dans le rollup, raids via Helix ou EventSub, Client View, alerte pendant les pubs, spec Dockerfile (obsolète).
- **Atmosphère hors Carte (25/11, décision de l'utilisateur)** : `DESIGN.md` ne réserve plus l'atmosphère à la Carte. Le ciel étoilé la porte sur toutes les pages ; les nouvelles surfaces (intro, Flux) peuvent la reprendre si la lisibilité suit. Les outils 3D et de design (Three.js, Spline, Higgsfield, `ui-ux-pro-max`, Playwright) servent à améliorer les analyses futures, avec la même valeur d'évaluation que les autres avis.
- **Viewers uniques** : esquisses HyperLogLog (erreur d'environ 2,3 %). Pas d'exclusifs ni de paires en estimation.
- **Hash `u` raccourci (≈ −45 Mo)** : déconseillé pour l'instant (271 Mo sur 500).
- **Téléphone** : hors usage, ordinateur seulement.
- **Planètes peintes (26/11)** : elles remplacent les photos de profil, y compris au centre des planètes à facettes de la Carte. Les couleurs de la Carte suivent désormais le rang de palette : choix signalé dans la PR #55 comme restant à valider à l'écran.
- **Intro d'accueil (26/11, décision de l'utilisateur)** : gardée en place, considérée comme un prototype ; il apportera idées et inspirations.
- **Planètes à redéfinir (26/11, demande de l'utilisateur)** : forme, texture et pose de la photo de profil. La décision « planètes peintes sans photo » est rouverte (chantier E de `IDEES.md`, prototype d'abord). Décidé ensuite : style **low-poly** sans décors, planète Twitch comprise, photo en pin's, taille = viewers en direct ; couleur de la chaîne.
- **Carte, règle des deux temps (26/11, validée)** : la planète dit le présent (taille = viewers en direct, hors live petite et éteinte) ; les liens et les groupes portent sur tout le détail disponible, date de début en légende. Le sélecteur de période disparaît de la Carte seulement. Codé le 27/11 (2.0.7).
- **Outils (26/11, décisions de l'utilisateur)** : Impeccable retiré (rendu jugé trop « AI slop ») ; `ui-ux-pro-max` est le skill de design. Les connecteurs Higgsfield et Spline servent à approfondir la 3D (génération, scènes, flux Blender). Supabase reste en lecture seule sans « oui » explicite. Rappels automatiques au démarrage et à chaque prompt (`.claude/hooks/`), sans lancer de skill. Skills Vercel et agents morts déplacés dans `archives/outils-claude/`.
- **Orchestrateur et contremaître fusionnés (26/11, demande de l'utilisateur)** : un seul agent, `orchestrateur`, tient le routage, les idées (`IDEES.md`), les plans et la délégation. Le skill `contremaitre` est archivé. Raison : deux outils qui tenaient chacun un suivi se contredisaient.
- **Numérotation (26/11, décision de l'utilisateur)** : les entrées du tableau de bord portent un numéro, celui de `app/package.json` (2.0.0 depuis le 24/11, non modifié depuis). Les entrées du 25/11 et du 26/11 sont donc sous 2.0.0. Une modification du tableau de bord donne lieu à un nouveau numéro.
- **Fusions (26/11, autorisation permanente de l'utilisateur)** : Claude peut fusionner les PR pour toutes les fois où c'est nécessaire, sans redemander. Confirmé le même jour. Le reste est inchangé : déploiement, écriture en base et action irréversible sur demande, pas de commit direct sur `main`, pas de `git push --force`.
- **Modèles et contexte (27/11, demande de l'utilisateur)** : l'orchestrateur choisit seul le modèle et délègue d'office chaque tâche d'un chantier à un sous-agent au modèle du §7, sans qu'on ait à le demander. Tout ce qui exige l'intervention de l'utilisateur reste écrit dans « Commande à lancer ». `/clear` ne peut pas être lancé par Claude.
- **Critiques** : l'utilisateur accepte qu'elles remettent en cause ses choix passés ; ces choix sont signalés « [ton choix] ».

## 5. Décisions prises le 25/11, sur délégation de l'utilisateur

1. **Sticky-Factor** : la fonction `channel_stickiness` est déployée en base (ajout seul) et la PR #25 est fusionnée.
2. **Landing page** : lancée à la demande de l'utilisateur, PR #26 fusionnée. Elle s'affiche une fois par navigateur ; `?accueil` la rouvre.
3. **Deux copies du collecteur** : `collecteur.mjs` (racine) fait foi pour le PC. La copie `collecteur/` n'est pas touchée tant que le VPS est de côté. Avant de le relancer, y reporter les réglages de la racine (délai de `sb()` à 60 s) et vérifier la file de relance, le `/metrics` et le compteur global propres à la copie Docker. Dette notée, aucun changement de code.
4. **Permissions** : les refus de lecture sont versionnés (`.claude/settings.json`), les autorisations `git push` et `gh pr create` restent en local (`.claude/settings.local.json`).
5. **`.hallmark/run.txt`** : ignoré (ajouté au `.gitignore`).

Ce qui attend aujourd'hui l'utilisateur est dans le §0.

## 6. Vérifications à refaire

- **Chaque matin, après 03 h 40 UTC** : `select d, count(*) from daily_overlap_matrix group by d order by d;` doit gagner une journée par nuit. Les crons se lisent dans `cron.job_run_details`.
- **Historique 30 jours** : à juger quand 7 journées sont agrégées (vers le 30/11). **90 jours** : pas avant environ 90 jours de données ; on ne peut vérifier que la cohérence des totaux.
- **Phase 3 (Top des chaînes, communautés investies)** : le rendu réel n'a pas été vu, les données de démo sont vides. À regarder dans votre navigateur (#22 est fusionnée).
- **Alertes de rythme** : vers le 8/12 (14 journées agrégées), vérifier que les alertes sont plausibles et ajuster `lib/rhythm.ts`.
- **Stockage** : suivre les 285 Mo (relevé du 25/11). Alerte à 400 Mo.
- **Carte des migrations** : vérifier que l'onglet Flux l'affiche avec le bon code et que le Sankey est inchangé. Vers le 8/12, juger sur 14 journées : si elle ne dit rien de plus que le Sankey, la retirer (critère de `IDEES.md`).
- **Intro d'accueil** : fluidité avec le tableau de bord qui charge dessous, et cas réel avec des chaînes en direct.

## 7. Modèles, effort et tokens

Ce qui compte : un modèle par type de tâche, un effort par difficulté, un chantier à la fois.

L'effort suit la difficulté et le risque de chaque tâche, pas seulement le modèle (demande de l'utilisateur, 27/11). On part du niveau le plus bas raisonnable, on ne monte que si le résultat ne suffit pas, et chaque choix est annoncé en une ligne avec sa raison. Un fork garde l'effort de la session.

| Tâche | Modèle | Effort |
|---|---|---|
| Lire, chercher, répondre, petite retouche (un texte, une valeur) | Haiku 5.5 | low |
| La même chose sur plusieurs fichiers, mise à jour de documents | Haiku 5.5 | medium |
| Code cadré : affichage, rangement, démo | Sonnet 5.5 | medium |
| Code risqué : calculs, `schema.sql`, `legacy.js`, moteur de la Carte | Sonnet 5.5 | high |
| Décider d'un design, critiquer une page, refactoriser un gros fichier | Opus 5.5 | high |
| Problème resté sans solution après un essai | Opus 5.5 | xhigh ; max seulement en dernier recours |

**Ce qui coûte le plus cher ici**
- L'effort `max` : beaucoup de réflexion à chaque réponse.
- Les relectures de design en sous-agent : à la demande seulement (`ui-ux-pro-max` se lit comme un outil, sans agent).
- Les sous-agents en général : chacun repart de zéro et relit le contexte.
- Les gros fichiers : `legacy.js` (2 562 lignes, 229 Ko), `map.tsx` (38 Ko), `legacy.css` (31 Ko), `demo.ts` (30 Ko).
- `/fast` : peut faire basculer la session sur Opus si le modèle courant ne le prend pas en charge.

**Réflexes** (27/11 : c'est l'orchestrateur qui les applique, pas l'utilisateur)
1. Un chantier à la fois ; chaque tâche dans un sous-agent au modèle du tableau, donc avec un contexte neuf.
2. La session principale garde les comptes rendus, pas les gros fichiers.
3. `/clear` seulement quand l'orchestrateur le demande. `/compact` automatique : réglage « Auto-compact » de `/config` (désactivé au 27/11, au choix de l'utilisateur).
4. `/cost` pour le coût d'une session, `/context` pour voir ce qui remplit la fenêtre.
5. Agent du projet : `orchestrateur` en session (les gabarits inutilisés sont dans `archives/outils-claude/`).

**Réglages actuels**
- Session d'orchestration (`lancer-orchestrateur.bat`, agent `orchestrateur`) : Sonnet 5.5. Le design part en sous-agent Opus 5.5.
- Défaut : Haiku 5.5 (choisi le 25/11 pour les nouvelles sessions). Bon pour les lectures et les petites retouches. Pour le code de l'application, Sonnet est le minimum conseillé.
- `.claude/settings.json` refuse la lecture des fichiers générés (`twitch-overlap*.html`), des journaux, des lockfiles, de `config.json` et des `node_modules`.
- Piste à tester avant d'appliquer : `skillOverrides` (valeur `name-only`) pour alléger la liste des skills chargée à chaque session.

## 8. Rétention et données

- Défauts du code (`collecteur.mjs`) : détail minute 14 j, présence 21 j, événements 60 j, relevés 30 j. Valeurs recommandées à 86 chaînes (collecteur 1.6.11) : 2, 1, 2 et 2 j.
- **Valeurs réellement en place dans `config.json` : inconnues ici** (lecture refusée). Les notes du 24/11 donnaient 7 j de détail et 3 j d'événements et de relevés : ce qui ne correspond ni aux défauts ni à la série de la 1.6.11. **À confirmer par le propriétaire du dossier.**
- Les brutes `switches` suivent la présence.
- `cleanup()` ne supprime pas les rollups quotidiens (`daily_*`) : c'est ce qui permet l'historique sur 30 et 90 jours.
- Paliers : alerte du collecteur au-delà de 400 Mo ; palier gratuit Supabase à 500 Mo.

## 9. Méthode de vérification

- **Mise en page** (testée le 25/11, après `npm run build` dans `app/`) : capture du fichier construit, sans données.
  `chrome.exe --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1000 --virtual-time-budget=6000 --screenshot=<png> "file:///C:/Users/User/Documents/twitch-collecteur/twitch-overlap.html"`
  Puis lire le PNG avec l'outil Read. Sans base, la page affiche « Les données n'arrivent pas » après environ 10 s : c'est normal.
- **Données fictives** : `?demo` n'existe que dans le serveur de développement (`import.meta.env.DEV`, voir `app/src/main.tsx`). Lancer `npm run dev` dans `app/`, puis capturer `http://localhost:5173/?demo` (ou `?demo=<onglet>`). Vérifié le 26/11 : le skill `/verifier` enchaîne build, diff et captures sur le serveur de développement.
- Limites : pas de données réelles (la configuration vit dans le navigateur de l'utilisateur). Le navigateur intégré ne déroule pas les animations (`requestAnimationFrame`) : préférer la capture Chrome.

## 10. Journal

- **26/11** : documentation nettoyée. `LISEZMOI.md` ne garde que le guide ; l'historique des versions passe dans `CHANGELOG.md`. Les anciens plans (`archives/plan-v2.md.txt`, `archives/phase2-architecture.md`) et l'ancienne copie de la mémoire (`memory/`, liens morts) passent dans `archives/`, sans suppression. La roadmap devient `ROADMAP-COMPLET.txt`. `CLAUDE.md`, `.claude/CLAUDE.md`, `DOCKER.md` et `README.md` (encodé en UTF-16, illisible) sont réécrits ; `app/CLAUDE.md` perd les renvois à des fichiers qui n'existent plus. Ajout de l'agent `orchestrateur` (`.claude/agents/orchestrateur.md`) et du lanceur `lancer-orchestrateur.bat`. Chantier C3 abandonné (§16, `IDEES.md`).
- **26/11 (nuit)** : #53 (carte des migrations), #54 (C3 abandonné), #55 (planètes peintes, justesse), #56 et #57 (hook, `/verifier`), #58 (documentation).
- **26/11 (journée)** : documentation remise à jour, #45 fermée, rapport mensuel aligné sur le seuil de 200 viewers actifs pour la fidélité (#59). Build vérifié ; le rapport n'a pas été relancé sur des données.
- **25/11 (soir)** : #43 (Vue d'ensemble spatiale, constellation) et #44 (ciel sur toutes les pages sauf la Carte) fusionnées sur demande ; règle des lueurs de `DESIGN.md` modifiée. Puis #46 à #52 : skills 3D, `/contremaitre`, page d'accueil, planète partout, intro animée.
- **25/11** : PR #11 à #14 fusionnées (historique 30 et 90 jours, viewers uniques, historique du réseau, accessibilité) ; PR #16 à #19 fusionnées (Carte, Vue d'ensemble, critique n°6). Critiques n°7 : Carte 28/40, Vue d'ensemble 27/40. PR #20, #21, #22 et #24 fusionnées à 11 h 31 UTC sur demande de l'utilisateur, puis #23 (ce suivi). Sticky-Factor : fonction déployée, PR #25 fusionnée. Landing page : PR #26 fusionnée. Puis #27 à #36 : direction agences et streamers, comparaison de chaînes, fidélité (voisines, petites chaînes), alertes de rythme (fonction déployée), son univers, essentiel de Par chaîne, filtre de la Carte par jeu. Hook de build local. Puis #37 à #41 (règle de build, documentation, menu de la Carte et lecture protégée, pastilles retirées) et #42 : kit de validation des agences, `scripts/nouveau-client.mjs` et `scripts/rapport-mensuel.mjs`.
- **24/11** : collecteur 1.6.13 (doublons, PR #3), tableau de bord de nouveau affiché (PR #4), Docker (PR #5), stockage et rollups (PR #6), onglet Flux (PR #7), Net Reach (PR #8), notes de plan (PR #9), export (PR #10).
- **23/11** : Raid Recommender implémenté, build OK.

## 11. Idées pour la suite (lecture de `Prompt.txt`, 25/11)

Le texte décrit un cockpit spatial pour agences, marques et streameurs. La Carte en est déjà la moitié : planètes, taille, liens, système d'une chaîne choisie. Tri fait le 25/11.

**À développer, dans cet ordre** (tout repose sur des données qu'on a déjà) :
1. **Alertes de rythme** (fait, §13) : une chaîne qui stagne ou qui décolle, calculée sur les rollups quotidiens (`daily_streamer_rollup`). À montrer dans la Vue d'ensemble et sur la planète. Il faut d'abord 14 journées agrégées pour que le signal compte (vers le 8/12).
2. **Comparaison de 2 à 4 chaînes côte à côte** (fait, §13) : viewers, messages, fidélité du chat, croissance, recoupement entre elles. N'existe pas encore (les Rosters comparent des groupes, pas des chaînes).
3. **Trajectoire simple** : la tendance sur 30 jours, dite comme une tendance (pente, écart à la moyenne), pas comme une prédiction. À faire quand l'historique a 30 jours (vers le 23/12).
4. **Moins de chiffres au premier regard** : 3 à 5 indicateurs en tête de « Par chaîne », le reste replié. À passer par une critique de design.
5. **Filtres de la Carte par langue et par jeu principal** (le filtre par jeu est fait, §13) : les langues sont déjà connues ; la Carte a déjà des groupes.

**À retenir comme direction, sans l'appliquer tel quel** :
- « Rendre la donnée désirable » : c'est le rôle de la Carte, qui doit rester lisible avant d'être spectaculaire (principe 2 de `PRODUCT.md`). Les anneaux de croissance et les lunes de collabs ne se rajoutent que si la lecture n'en souffre pas, et après un prototype.
- Le mode « agence » rejoint la Client View, abandonnée le 24/11 : il faudrait des rosters côté serveur et une authentification.

**À écarter, faute de données ou contre les principes** :
- **Sponsors, deals, historique de deals, brand safety, audience démographique** : on ne les collecte pas et Twitch ne les donne pas. Un score inventé contredit « honnête sur ses limites ».
- **Découverte pour marques** (« Affiliates ouverts aux deals ») : c'est un produit multi-utilisateurs avec comptes, hors du périmètre actuel (« une seule personne »).
- **Prédiction à 90 jours** : trop de bruit sur des données vieilles de quelques semaines.


## 12. Direction : viser les agences (décidée par l'utilisateur le 25/11)

**Ce qu'on a déjà et que les agences n'ont pas ailleurs** : l'audience réellement unique d'un groupe de chaînes (Net Reach par esquisses HyperLogLog), le chevauchement et la cannibalisation entre créateurs, les flux de viewers entre chaînes, la fidélité du chat, des rapports PDF et CSV. Les sites publics ne donnent pas cela. C'est le point d'entrée.

**Conseil, dans l'ordre**
1. **Valider la demande avant de construire.** Montrer le rapport de roster (PDF) à 3 à 5 agences ou talent managers, avec des données réelles de leurs créateurs, et noter ce qu'ils demandent en plus. Un bon test : « ce rapport vous ferait-il payer ou changer une décision ? » C'est le chantier le moins cher et il évite de bâtir un SaaS sans client.
2. **Commencer en service, pas en SaaS.** Pour un premier client : une base Supabase dédiée (une par agence), son roster, un rapport mensuel livré par vous. Pas de comptes ni de multi-utilisateur au départ : le code actuel reste valable.
3. **Ne passer au multi-utilisateur que sur demande réelle**, avec ce qu'il faut : authentification, rosters côté serveur, une base ou un schéma par client, hébergement 24/24 du collecteur (le VPS mis de côté redevient nécessaire), sauvegardes.

**Blocages à lever avant tout partage** (dans l'état actuel du code)
- **La clé publique lit toutes les tables** : donner l'accès à quelqu'un, c'est lui donner tout. À remplacer par des droits par client (RLS, ou une base par client).
- **Vie privée** : les pseudos sont remplacés par une empreinte avec un sel fixe, ce qui est de la donnée pseudonymisée, pas anonyme. Suivre des chaînes tierces au profit d'un client commercial demande de vérifier le cadre RGPD (base légale, information, durées) avec un juriste.
- **Conditions de Twitch** : relire les conditions du programme développeur sur le stockage, l'agrégation et la redistribution des données avant de vendre un service qui s'appuie dessus.
- **Coûts et limites** : le palier gratuit Supabase (500 Mo) ne tient pas plusieurs clients ; l'API Twitch a des quotas ; un collecteur par client ou une base commune partitionnée.
- **Positionnement** : ne pas promettre ce qu'on ne mesure pas (sponsors, deals, brand safety, démographie). Promettre l'audience unique, la cannibalisation, les flux et la fidélité.

**Effet sur les chantiers** : les alertes de rythme, la comparaison de chaînes et le rapport de roster servent déjà les agences. Les filtres de Carte et la trajectoire aussi. Les comptes et le multi-utilisateur attendent le résultat de l'étape 1.

**État (25/11)** : étape 1 lancée. Le kit est dans `VALIDATION-AGENCES.md` (quoi montrer, préparation du rapport, déroulé d'entretien, grille de suivi, critères de décision). Les rendez-vous restent à prendre par l'utilisateur ; il faut aussi ajouter les chaînes de l'agence et attendre 7 jours de données avant de montrer un rapport. Étape 2 préparée sans rien engager (25/11) : `node scripts/nouveau-client.mjs "Agence" chaine1 chaine2 …` crée `clients/<agence>/` (config avec sel et code du tableau propres au client, roster, copie du collecteur, schéma, `INSTALLATION.md`) ; `node scripts/rapport-mensuel.mjs clients/<agence> [jours]` écrit `rapport.pdf`, `.html` et `.csv` (Net Reach, cannibalisation, détail par chaîne avec évolution, fidélité, alertes de rythme, passages entre chaînes). Testé le 25/11 contre un faux serveur de données fictives, pas contre une vraie base : la création du projet Supabase du client reste à faire à la main et à décider (coût, cadre RGPD). `clients/` est ignoré par git (secrets). L'étape 3 (multi-utilisateur) attend une demande réelle.

**Priorité décidée par l'utilisateur le 25/11** : continuer à améliorer les fonctionnalités et les capacités d'analyse pendant 1 à 2 mois, le temps d'accumuler des données sur une période significative, puis intégrer ces analyses au rapport mensuel et commencer la vraie prospection (fin décembre à janvier). Toute nouvelle analyse se demande si elle doit aussi entrer dans `scripts/rapport-mensuel.mjs` (même rendu que le rapport de roster du tableau de bord, `app/src/components/rosters/roster-report.ts` : les deux copient les mêmes chiffres et le même style, à garder alignés).

### 12 bis. Les streamers, des petits aux gros (précision de l'utilisateur, 25/11)

Les conseils du §12 étaient écrits pour les agences seules : c'était incomplet. Les streamers sont une seconde cible, avec d'autres besoins et d'autres freins.

**Ce qui change selon la taille**
- **Gros et moyens streamers** : se situer face à leurs concurrents directs et à leurs collabs, voir où vont leurs viewers à la fin d'un live, choisir une cible de raid. Déjà couvert : Recommandations de raid, Flux, fidélité du chat, comparaison de chaînes.
- **Petits streamers** : comprendre où ils en sont et quoi améliorer. Ce qui leur parle : rétention (fidélité du chat), part de viewers qui reviennent, distance aux chaînes un cran au-dessus, chaînes proches où chercher des raids. Même base de données, mais lecture simplifiée.

**Trois trous réels**
1. **Seuils trop hauts pour les petites chaînes.** La fidélité du chat exige 200 viewers actifs sur la période (`STICKY_MIN`) et se compare au quart du réseau suivi : une petite chaîne n'a donc aucun score. Les alertes et la trajectoire auront le même défaut. À prévoir : seuils qui s'adaptent à la taille, et une comparaison « chaînes de taille voisine » plutôt qu'avec tout le réseau.
2. **Une vue « mon univers ».** La Carte et Par chaîne montrent les chaînes suivies. Il manque un point d'entrée « ma chaîne » : elle au centre, ses voisines, les chaînes un peu plus grosses, une progression lisible.
3. **Installation impossible pour un non-technicien.** Aujourd'hui, il faut une base Supabase à soi, une clé Twitch et un collecteur qui tourne sur un PC. Un petit streamer n'y arrivera pas. Il faudrait un service hébergé : on entre sa chaîne et quelques chaînes voisines, rien à installer.

**Ordre conseillé (mis à jour)**
1. **Agences d'abord, en service** (§12 : valider la demande, une base par client). Elles tolèrent l'installation, payent, et sont peu nombreuses à servir à la main.
2. **Streamers ensuite, sur un service hébergé**, quand il existe : un collecteur et une base partagés, des droits par utilisateur. C'est le même chantier de fond que le multi-utilisateur des agences (authentification, droits par client, hébergement 24/24, RGPD). Le faire une fois pour les deux cibles.
3. **En attendant**, rendre le produit lisible pour une petite chaîne : seuils adaptés, vue « mon univers ». Cela se code sans attendre l'hébergement et sert aussi aux gros.
4. **Gratuit ou payant** : à décider avec la demande. Les streamers payent peu : l'outil des agences peut financer le service, les streamers en bénéficient en version simple.

## 13. Chantiers du 25/11 après le tri de `Prompt.txt` (tous fusionnés)

| Chantier | Où | Notes |
|---|---|---|
| Comparer 2 à 4 chaînes | Rosters → « Comparer des chaînes » | Audience nette du groupe, doublons, tableau côte à côte, recoupements deux à deux. `?compare=a,b` en démo |
| Fidélité du chat (Sticky-Factor) | Par chaîne → Historique | Score affiché à partir de 200 viewers actifs depuis le 26/11 (#55 ; avant : dès 30, fragile sous 200). Comparée aux 8 chaînes de taille voisine (sinon au réseau). Vert dans le quart haut, ambre dans le quart bas |
| Alertes de rythme | Vue d'ensemble → « Rythme des chaînes » | Écart ≥ 15 % et hors variations habituelles (2 erreurs types), 30 viewers actifs par jour minimum. Il faut 14 journées agrégées : premières alertes vers le 8/12. Seuils dans `app/src/lib/rhythm.ts` |
| Son univers | Par chaîne | Voisines autour de la chaîne, rang par taille, 3 chaînes juste au-dessus. `app/src/lib/universe.ts` |
| L'essentiel de Par chaîne | Par chaîne | 5 indicateurs de tête ; « Communauté et événements » replié (`to2-ch-more`) |
| Filtre par jeu principal | Carte → menu de filtres | Jeu le plus relevé de chaque chaîne sur la période ; 8 jeux proposés ; `cfg.mapGame`. Clic non testé au rendu |
| Page d'accueil | Au premier chargement | Posée par-dessus le tableau de bord (`to2-landing-seen`, `?accueil` la rouvre, jamais en démo) |

**Reste** : trajectoire à 30 jours (vers le 23/12, il faut l'historique) ; comparer le résultat des alertes de rythme aux vraies chaînes quand elles apparaîtront (vers le 8/12) et ajuster les seuils ; critique de design de « Par chaîne » (non lancée, coût) ; essayer le filtre par jeu de la Carte dans un vrai navigateur.
**Piège de fusion** : une PR dont la base est une autre branche déjà fusionnée (#33) est fusionnée dans cette branche, pas dans `main`. Viser `main`, ou fusionner la PR de base en dernier avant de retarder la suivante.

## 14. Reconstruction automatique

Après toute modification de `app/src`, Claude lance `npm run build` dans `app/` (règle de `CLAUDE.md`, PR #37). Un hook git le fait aussi après un `git pull` qui change `app/`, et lance `npm install` si les dépendances changent. Il est versionné dans `scripts/hooks/post-merge` (#56) et s'installe une fois : `Copy-Item "scripts\hooks\post-merge" ".git\hooks\post-merge" -Force`. Installé sur le PC de l'utilisateur le 26/11.

## 15. Chantiers du 25/11 (après-midi), fusionnés (PR #39)

- **Menu de la Carte** : la colonne de filtres est remplacée par un menu façon jeu vidéo (`app/src/components/map/menu.tsx`), ouvert par le bouton « Menu » (touche M), premier bouton de la colonne de droite (pause, globe, zoom, aide) ; le panneau s'ouvre à gauche de cette colonne, l'aide et le menu ne s'ouvrent pas ensemble, et le bouton reste là quand les filtres vident la carte. La carte garde toute sa largeur. Emplacement choisi par l'utilisateur le 25/11 (après un premier essai en haut à gauche). Rubriques : Filtres, Vue (modes, chaînes cochées, groupes), Aller à (recherche), Journal, Outils. Les filtres actifs sont comptés sur la rubrique Filtres du menu (les pastilles posées sur la carte ont été retirées à la demande de l'utilisateur le 25/11). Nouveau filtre « Audience minimale » (10+, 50+, 200+, seulement les seuils qui laissent 3 chaînes ou plus) ; effectifs par langue comptés sur les chaînes actives de la période ; action `reset`. Démo : `?demo=map&menu=filtres|vue|aller|journal|outils` (dev seulement).
- **Vue d'ensemble** : Phase 3 sortie du repli, rebaptisée « Classements · audience et communautés » (deux onglets, 10 lignes visibles), placée après la Participation ; barre « Aller à » en tête de page.
- **Lecture protégée par le code du tableau** : `schema.sql` (et `migration_lecture_protegee.sql`) remplacent les politiques `read_all using (true)` par `board_ok()`, qui compare l'en-tête `x-board-code` à l'empreinte `board_code` de `private_settings`. Testé le 25/11 sur la base réelle dans une transaction annulée : bon code, toutes les lignes ; mauvais code ou aucun, zéro ligne. Le tableau envoie l'en-tête (`sbH`) et dit « Code du tableau manquant ou incorrect » si la base le refuse. Réglages → Source des données a de nouveau les champs URL, clé publique et code. **Appliquée en base le 25/11 à 13 h 20 UTC**, sur accord de l'utilisateur : 19 politiques, `board_ok` et `forget_user` créées, deux fonctions avec chemin de recherche fixé. Vérifié de l'extérieur : clé publique sans code ou avec un mauvais code, 0 ligne ; `forget_user` refusée à la clé publique ; collecteur toujours vu à jour. Le bon code a été essayé par l'utilisateur dans son navigateur le 25/11 : le tableau affiche « Connecté ». Retour : `migration_lecture_protegee_retour.sql`.
- **Effacement** : `node oublier.mjs pseudo` (fonction SQL `forget_user`, avec la même migration).
- **Conformité** : `CONFORMITE.md` (données, mesures, points à faire valider par un juriste, règle de 24 h de Twitch à vérifier).
- **Stockage** (25/11) : 285 Mo (272 MB affichés), `presence` 145 Mo, `events` 40 Mo, `minutes` 33 Mo. Rollups : 23/11 et 24/11, 958 et 957 lignes, crons réussis à 03 h 30 et 03 h 40 UTC.

## 16. Outils 3D, HUD et contremaître (25/11, soir)

| Outil | Rôle | Installé comme | Points d'attention |
|---|---|---|---|
| `three-js` (Mindrally) | Conseils Three.js et React Three Fiber | skill, `.claude/skills/three-js` | Court et générique (suppose Tailwind, TypeScript). `three` est dans `app/package.json` depuis #52 (intro) ; `@react-three/fiber` n'y est pas |
| `react-three-fiber` (freshtechbro) | R3F, drei, shaders, projet de départ | skill, `.claude/skills/react-three-fiber` | Contient un `starter_r3f/` et deux scripts Python de génération |
| `ui-ux-pro-max` (nextlevelbuilder) | Typographie, palettes, glassmorphism, accessibilité, base de règles interrogeable | skill, `.claude/skills/ui-ux-pro-max` | Demande Python 3 (testé : `search.py` répond). Tests retirés (387 Ko). Ses sorties sont des suggestions : `DESIGN.md` prime |
| Playwright MCP | Piloter un vrai navigateur pour vérifier un rendu | `.mcp.json`, `npx @playwright/mcp@latest --browser chrome` | À viser sur `npm run dev` (`?demo=`), pas sur le HTML en `file://`. Premier lancement : Claude demande d'approuver le serveur |
| Spline MCP | Sculpter une scène 3D dans Spline | `.mcp.json`, serveur hébergé `https://mcp.spline.design/mcp` | Compte Spline requis, authentification par `/mcp` → spline → Authenticate. Produit un fichier Spline, pas du code ; à tester pour le chargement depuis `file://` avant de s'y fier |
| Orchestrateur, section « Idées et plans » (ex-`/contremaitre`, fusionné le 26/11) | Boîte à idées (`IDEES.md`), évaluation de la plus-value, plan et délégation par modèle | agent `.claude/agents/orchestrateur.md` (plus de skill) | Plus-value /25, coût S, M, L, verdict faire, planifier, prototype ou écarter |
| Connecteur Higgsfield | Génération et scènes 3D (`generate_3d`, `scene_builder_3d_*`), flux Blender | connecteur claude.ai (rien dans le dépôt) | Charger les instructions du preset (`get_preset_instructions` ; `/3d-jutsu` hors Blender Studio) avant le premier appel. Devis avant chaque génération (crédits) |

**Décision de l'utilisateur, 25/11 (soir)** : Three.js est un **complément** autorisé à modifier le code ; ses conseils, ceux de Spline et des derniers skills (`three-js`, `react-three-fiber`, `ui-ux-pro-max`, Playwright, Higgsfield) comptent comme des évaluations légitimes. Le moteur de la Carte reste impératif dans `legacy.js` (Three.js ne s'y substitue pas sans nouvelle décision). Sur une surface neuve, un prototype isolé avec critère go/no-go (poids dans le HTML unique, images par seconde sur le PC de l'utilisateur, chargement depuis `file://`) précède l'intégration. Ancienne règle (« décision à prendre avant tout code 3D ») levée.

**Idées déposées le 25/11 (évaluées dans `IDEES.md`)**. État au 26/11 : A livré (#51, puis planètes peintes #55), B livré (#52, gardé comme prototype), C livré (#53, fonction en base), C3 abandonné, D dormant. Détail d'origine :
- **Chantier A, planète partout** (plus-value 18/25, S) : le texte collé (fond, cartes console, avatars en planètes, Recoupements) est déjà livré par les PR #43 et #44. Reste : `av()` de `legacy.js` (info-bulle de la Carte, légendes) et les pastilles de moins de 20 px.
- **Chantier B, intro d'accueil** (plus-value 18/25, M) : séquence façon générique de jeu, galaxie des chaînes en direct puis révélation du nom, avec prototype Three.js isolé et critères go/no-go.
- **Chantier C, carte des migrations de l'onglet Flux** (19/25, M) : planifié au 8/12, prototype C0 par Opus. Variante tuyaux A→B→C avec planètes (C3, 17/25, L) : prototype d'abord, calcul nocturne à deux sauts avant la purge des brutes. **C3 abandonné le 26/11** : prototype illisible, arcs de C2 conservés ; travail archivé sur la branche locale `archive/c3-trajets-deux-sauts`.
- **Chantier D, hébergement 24 h/24 et comptes clients** (16/25, L) : planifié après le premier contrat signé. Décisions de l'utilisateur, 25/11 : base commune avec droits sur un plan Supabase payant ; secret Twitch chez l'opérateur, seul maître des données ; collecteur 24 h/24 dimensionné par conseil. Le détail des paliers et des coûts est dans `COUTS-CLIENTS.md` (prix Supabase à vérifier sur la page officielle, serveur non chiffré).
- **Écran vide du tableau de bord** : « Les données n'arrivent pas » propose de revoir la page d'accueil (événement `to2:landing`, sans toucher au drapeau « déjà vue »). Build et types vérifiés ; rendu visuel non vérifié.

## 17. Ambiance spatiale du 25/11 (soir), PR #43 et #44

L'utilisateur a collé un texte « DESIGN.md univers spatial » et demandé de faire évoluer la Vue d'ensemble.
- **Pas adopté tel quel** : palette bleutée, police Orbitron, flou sur les cartes, suppression des couleurs d'alerte. Les jetons du `DESIGN.md` du dépôt restent la référence.
- **Adopté** : ciel étoilé (`.to2-sky`, CSS pur, statique, onglets de `SKY_TABS` dans `App.tsx`, tous sauf la Carte) ; cartes « console » (`shadow-console`, légèrement translucides, sans flou) ; avatars en planètes (remplacés le 26/11 par les planètes peintes de `lib/planet.ts`) ; constellation en tête de « Recoupements » (`recoup.tsx`, 7 chaînes au plus, masquée aux lecteurs d'écran).
- **Règle modifiée à la demande de l'utilisateur** : « une lueur n'est jamais décorative » est devenue « deux niveaux de lueur » (vive pour l'action, ambiante pour l'ambiance).
- **Non fait** : anneaux de croissance et lunes de collabs (prototype d'abord, §11) ; boutons « Tout le chevauchement… » sans marge à gauche dans Recoupements (écarté par la critique n°7).
