# Suivi du projet Twitch Overlap

État au **25/11/2026**. Ce fichier est la référence de suivi : la mémoire de Claude y renvoie. À mettre à jour à chaque PR fusionnée ou décision prise.

## 1. État en bref

- **Collecteur (PC)** : en marche, version 1.6.13. Une lecture de `collector_status` le 25/11 indique une API Twitch « ok ».
- **Base** : 271 Mo sur 500 Mo (palier gratuit). Le collecteur alerte au-delà de 400 Mo.
- **Rollups** : les crons `daily-overlap-rollup` (03 h 30 UTC) et `daily-hll` (03 h 40 UTC) sont actifs ; leurs derniers passages ont réussi le 25/11. Journées agrégées : 23/11 et 24/11 (1 915 lignes de chevauchement ; esquisses HyperLogLog pour le 24/11 seul).
- **Historique 30 et 90 jours, viewers uniques, historique du réseau** : en production (PR #11, #12, #13). Les trois fonctions répondent sur la base (testé le 25/11). Sur deux journées, les courbes restent courtes : voir §6.
- **Raid Recommender** : fait, section « Recommandations de raid » dans Par chaîne.
- **Barre latérale** : quatre groupes selon le plan (Observatoire, Analyse et flux, Exploration, Configuration), fusionnée le 25/11 (PR #24).
- **Export PDF et CSV, Net Reach des rosters, onglet Flux** : faits (PR #10, #8, #7).
- **Nouveautés du 25/11** : page d'accueil (une fois par navigateur), fidélité du chat (Sticky-Factor, comparée aux chaînes de taille voisine), comparaison de 2 à 4 chaînes (Rosters), alertes de rythme (Vue d'ensemble), « Son univers » et 5 indicateurs de tête (Par chaîne), filtre de la Carte par jeu principal. Détail : §13.
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
| #43 | `vue-ensemble-spatiale` | Vue d'ensemble spatiale : ciel étoilé, cartes console, avatars en planètes, constellation des recoupements (choix de l'utilisateur, DESIGN.md mis à jour) | ouverte le 25/11 |
| #42 | `agences-validation-et-clients` | Direction agences : kit de validation, dossier client, rapport mensuel (§12) | fusionnée le 25/11, sur demande |

Le 25/11, l'utilisateur a demandé de fusionner dans l'ordre #20, #21, #22, #24, puis #23 : c'est fait. Claude ne fusionne que sur demande explicite.

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
| Fonctionnalité 3 : Sticky-Factor | Fait (PR #25), fonction déployée | Score sur 100 dans Par chaîne → Historique, comparé aux quartiles des chaînes suivies : les seuils du plan (70 et 40) colorieraient tout en vert (minimum observé le 24/11 : 72). L'alerte « fuite pendant les pubs » est impossible sans jeton du diffuseur. |
| §3 : barre latérale | Fait (PR #24) | Observatoire, Analyse et flux, Exploration, Configuration. La Carte est en tête. « Par jeu » est rangé dans Exploration, que le plan ne prévoyait pas. |
| §4 : landing page | Fait (PR #26) | Posée par-dessus le tableau de bord, une seule fois (drapeau `to2-landing-seen`, `?accueil` la rouvre). Texte du plan mis au tutoiement, sans chiffre ni fonction inventés. |
| Roadmap « Complet », §4 et §5 | Non commencé | Reporté par l'utilisateur. |

## 4. Décisions prises (ne pas reposer)

- **Carte, critique n°7 (25/11)** : 28/40, rien à changer. Reste en « Explorer seulement ».
- **Vue d'ensemble, critique n°7** : 27/40. Seul le bug Phase 3 (P1) est traité (PR #22). Non retenus : boutons des Recoupements, grille de chaînes et tri de Participation, pulse du bouton Analyses, état de chargement de Phase 3.
- **Plan V2, à ne pas appliquer tel quel** : sel quotidien (il casserait les viewers sur plusieurs jours), purge à 48 h dans le rollup, raids via Helix ou EventSub, Client View, alerte pendant les pubs, spec Dockerfile (obsolète).
- **Viewers uniques** : esquisses HyperLogLog (erreur d'environ 2,3 %). Pas d'exclusifs ni de paires en estimation.
- **Hash `u` raccourci (≈ −45 Mo)** : déconseillé pour l'instant (271 Mo sur 500).
- **Téléphone** : hors usage, ordinateur seulement.
- **Critiques** : l'utilisateur accepte qu'elles remettent en cause ses choix passés ; ces choix sont signalés « [ton choix] ».

## 5. Décisions prises le 25/11, sur délégation de l'utilisateur

1. **Sticky-Factor** : la fonction `channel_stickiness` est déployée en base (ajout seul) et la PR #25 est fusionnée.
2. **Landing page** : lancée à la demande de l'utilisateur, PR #26 fusionnée. Elle s'affiche une fois par navigateur ; `?accueil` la rouvre.
3. **Deux copies du collecteur** : `collecteur.mjs` (racine) fait foi pour le PC. La copie `collecteur/` n'est pas touchée tant que le VPS est de côté. Avant de le relancer, y reporter les réglages de la racine (délai de `sb()` à 60 s) et vérifier la file de relance, le `/metrics` et le compteur global propres à la copie Docker. Dette notée, aucun changement de code.
4. **Permissions** : les refus de lecture sont versionnés (`.claude/settings.json`), les autorisations `git push` et `gh pr create` restent en local (`.claude/settings.local.json`).
5. **`.hallmark/run.txt`** : ignoré (ajouté au `.gitignore`).

Plus rien n'attend l'utilisateur.

## 6. Vérifications à refaire

- **Chaque matin, après 03 h 40 UTC** : `select d, count(*) from daily_overlap_matrix group by d order by d;` doit gagner une journée par nuit. Les crons se lisent dans `cron.job_run_details`.
- **Historique 30 jours** : à juger quand 7 journées sont agrégées (vers le 30/11). **90 jours** : pas avant environ 90 jours de données ; on ne peut vérifier que la cohérence des totaux.
- **Phase 3 (Top des chaînes, communautés investies)** : le rendu réel n'a pas été vu, les données de démo sont vides. À regarder dans votre navigateur (#22 est fusionnée).
- **Alertes de rythme** : vers le 8/12 (14 journées agrégées), vérifier que les alertes sont plausibles et ajuster `lib/rhythm.ts`.
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

- **25/11** : PR #11 à #14 fusionnées (historique 30 et 90 jours, viewers uniques, historique du réseau, accessibilité) ; PR #16 à #19 fusionnées (Carte, Vue d'ensemble, critique n°6). Critiques n°7 : Carte 28/40, Vue d'ensemble 27/40. PR #20, #21, #22 et #24 fusionnées à 11 h 31 UTC sur demande de l'utilisateur, puis #23 (ce suivi). Sticky-Factor : fonction déployée, PR #25 fusionnée. Landing page : PR #26 fusionnée. Puis #27 à #36 : direction agences et streamers, comparaison de chaînes, fidélité (voisines, petites chaînes), alertes de rythme (fonction déployée), son univers, essentiel de Par chaîne, filtre de la Carte par jeu. Hook de build local. Puis #37 à #41 (règle de build, documentation, menu de la Carte et lecture protégée, pastilles retirées) et #42 : kit de validation des agences, `scripts/nouveau-client.mjs` et `scripts/rapport-mensuel.mjs`.
- **24/11** : collecteur 1.6.13 (doublons, PR #3), tableau de bord de nouveau affiché (PR #4), Docker (PR #5), stockage et rollups (PR #6), onglet Flux (PR #7), Net Reach (PR #8), notes de plan (PR #9), export (PR #10).
- **23/11** : Raid Recommender implémenté, build OK.

## 11. Idées pour la suite (lecture de `Prompt.txt`, 25/11)

Le texte décrit un cockpit spatial pour agences, marques et streameurs. La Carte en est déjà la moitié : planètes, taille, liens, système d'une chaîne choisie. Tri fait le 25/11.

**À développer, dans cet ordre** (tout repose sur des données qu'on a déjà) :
1. **Alertes de rythme** : une chaîne qui stagne ou qui décolle, calculée sur les rollups quotidiens (`daily_streamer_rollup`). À montrer dans la Vue d'ensemble et sur la planète. Il faut d'abord 14 journées agrégées pour que le signal compte (vers le 8/12).
2. **Comparaison de 2 à 4 chaînes côte à côte** : viewers, messages, fidélité du chat, croissance, recoupement entre elles. N'existe pas encore (les Rosters comparent des groupes, pas des chaînes).
3. **Trajectoire simple** : la tendance sur 30 jours, dite comme une tendance (pente, écart à la moyenne), pas comme une prédiction. À faire quand l'historique a 30 jours (vers le 23/12).
4. **Moins de chiffres au premier regard** : 3 à 5 indicateurs en tête de « Par chaîne », le reste replié. À passer par une critique de design.
5. **Filtres de la Carte par langue et par jeu principal** : les langues sont déjà connues ; la Carte a déjà des groupes.

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
| Fidélité du chat (Sticky-Factor) | Par chaîne → Historique | Score dès 30 viewers actifs, fragile sous 200. Comparée aux 8 chaînes de taille voisine (sinon au réseau). Vert dans le quart haut, ambre dans le quart bas |
| Alertes de rythme | Vue d'ensemble → « Rythme des chaînes » | Écart ≥ 15 % et hors variations habituelles (2 erreurs types), 30 viewers actifs par jour minimum. Il faut 14 journées agrégées : premières alertes vers le 8/12. Seuils dans `app/src/lib/rhythm.ts` |
| Son univers | Par chaîne | Voisines autour de la chaîne, rang par taille, 3 chaînes juste au-dessus. `app/src/lib/universe.ts` |
| L'essentiel de Par chaîne | Par chaîne | 5 indicateurs de tête ; « Communauté et événements » replié (`to2-ch-more`) |
| Filtre par jeu principal | Carte → menu de filtres | Jeu le plus relevé de chaque chaîne sur la période ; 8 jeux proposés ; `cfg.mapGame`. Clic non testé au rendu |
| Page d'accueil | Au premier chargement | Posée par-dessus le tableau de bord (`to2-landing-seen`, `?accueil` la rouvre, jamais en démo) |

**Reste** : trajectoire à 30 jours (vers le 23/12, il faut l'historique) ; comparer le résultat des alertes de rythme aux vraies chaînes quand elles apparaîtront (vers le 8/12) et ajuster les seuils ; critique de design de « Par chaîne » (non lancée, coût) ; essayer le filtre par jeu de la Carte dans un vrai navigateur.
**Piège de fusion** : une PR dont la base est une autre branche déjà fusionnée (#33) est fusionnée dans cette branche, pas dans `main`. Viser `main`, ou fusionner la PR de base en dernier avant de retarder la suivante.

## 14. Reconstruction automatique

Après toute modification de `app/src`, Claude lance `npm run build` dans `app/` (règle de `CLAUDE.md`, PR #37). Un hook git local (`.git/hooks/post-merge`, non versionné) le fait aussi après un `git pull` qui change `app/`. À recréer si le dépôt est cloné ailleurs.

## 15. Chantiers du 25/11 (après-midi), fusionnés (PR #39)

- **Menu de la Carte** : la colonne de filtres est remplacée par un menu façon jeu vidéo (`app/src/components/map/menu.tsx`), ouvert par le bouton « Menu » (touche M), premier bouton de la colonne de droite (pause, globe, zoom, aide) ; le panneau s'ouvre à gauche de cette colonne, l'aide et le menu ne s'ouvrent pas ensemble, et le bouton reste là quand les filtres vident la carte. La carte garde toute sa largeur. Emplacement choisi par l'utilisateur le 25/11 (après un premier essai en haut à gauche). Rubriques : Filtres, Vue (modes, chaînes cochées, groupes), Aller à (recherche), Journal, Outils. Les filtres actifs sont comptés sur la rubrique Filtres du menu (les pastilles posées sur la carte ont été retirées à la demande de l'utilisateur le 25/11). Nouveau filtre « Audience minimale » (10+, 50+, 200+, seulement les seuils qui laissent 3 chaînes ou plus) ; effectifs par langue comptés sur les chaînes actives de la période ; action `reset`. Démo : `?demo=map&menu=filtres|vue|aller|journal|outils` (dev seulement).
- **Vue d'ensemble** : Phase 3 sortie du repli, rebaptisée « Classements · audience et communautés » (deux onglets, 10 lignes visibles), placée après la Participation ; barre « Aller à » en tête de page.
- **Lecture protégée par le code du tableau** : `schema.sql` (et `migration_lecture_protegee.sql`) remplacent les politiques `read_all using (true)` par `board_ok()`, qui compare l'en-tête `x-board-code` à l'empreinte `board_code` de `private_settings`. Testé le 25/11 sur la base réelle dans une transaction annulée : bon code, toutes les lignes ; mauvais code ou aucun, zéro ligne. Le tableau envoie l'en-tête (`sbH`) et dit « Code du tableau manquant ou incorrect » si la base le refuse. Réglages → Source des données a de nouveau les champs URL, clé publique et code. **Appliquée en base le 25/11 à 13 h 20 UTC**, sur accord de l'utilisateur : 19 politiques, `board_ok` et `forget_user` créées, deux fonctions avec chemin de recherche fixé. Vérifié de l'extérieur : clé publique sans code ou avec un mauvais code, 0 ligne ; `forget_user` refusée à la clé publique ; collecteur toujours vu à jour. Le bon code a été essayé par l'utilisateur dans son navigateur le 25/11 : le tableau affiche « Connecté ». Retour : `migration_lecture_protegee_retour.sql`.
- **Effacement** : `node oublier.mjs pseudo` (fonction SQL `forget_user`, avec la même migration).
- **Conformité** : `CONFORMITE.md` (données, mesures, points à faire valider par un juriste, règle de 24 h de Twitch à vérifier).
- **Stockage** (25/11) : 285 Mo (272 MB affichés), `presence` 145 Mo, `events` 40 Mo, `minutes` 33 Mo. Rollups : 23/11 et 24/11, 958 et 957 lignes, crons réussis à 03 h 30 et 03 h 40 UTC.
