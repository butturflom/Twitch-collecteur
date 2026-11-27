# Boîte à idées

Dépose ici tes idées en vrac, sans te censurer : une ligne chacune. L'orchestrateur les range, les évalue (plus-value sur 25, coût S, M ou L, verdict) et en tire un plan. Méthode et règles : `.claude/agents/orchestrateur.md`, section « Idées et plans » (fusion du skill `contremaitre` le 26/11). Décisions déjà prises : `SUIVI.md` §4, §5 et §11.

## En vrac

- 2026-11-25 · « Pour la landing page, entrer avec une animation de la carte : une galaxie des streamers en live, comme les premières secondes d'un jeu vidéo, jusqu'au titre du film. À la fin, le nom de l'application apparaît avec un effet adapté au style et à l'ambiance du site. » → (Intro animée de la page d'accueil : galaxie des chaînes en direct, puis révélation du titre.)
- 2026-11-25 · « Pour la Vue d'ensemble et toutes les statistiques et analyses, les icônes des streamers sont toujours représentées par leur planète. » (avec le texte collé : fond spatial, cartes console, avatars en planètes, Recoupements cosmiques) → (Planète partout, y compris les petits formats et les avatars encore dessinés par `legacy.js`. Le reste du texte collé est déjà livré, voir ci-dessous.)
- 2026-11-25 · Décision sur les outils 3D : Three.js complémentaire (pas un remplaçant de la Carte), autorisé à modifier le code ; ses conseils, ceux de Spline et des derniers skills comptent comme des évaluations légitimes. → (Rangée dans `SUIVI.md` §16 et dans le skill, §3.)
- 2026-11-25 · « Pour la partie flux, construire l'onglet comme une map de flux qui représente les migrations des viewers actifs. » → (Carte animée des passages de viewers entre chaînes, jour par jour, à côté du Sankey existant.)
- 2026-11-25 · « Je voyais la map comme un réseau de tuyaux ou de conduits qui représente les déplacements d'un point A à B, ou C, ou plus encore, avec les planètes des streamers. » → (Variante du chantier C : trajets à plusieurs sauts, dessinés en tuyaux, nœuds = planètes.)
- 2026-11-25 · « Plus tard, l'application sera à télécharger ou consultable sur un site. Après la création d'un contrat, je donne accès à un compte que je prédéfinis avec le client ID et le secret. Le collecteur tourne 24 h/24 en ligne, et la base Supabase reste identique. » → (Hébergement du collecteur et du tableau de bord, comptes par client. Reprend la Client View abandonnée le 24/11 et l'étape 3 du §12.)
- 2026-11-26 · « J'ai déjà regardé l'intro. Pour le moment, je la laisse et la considère comme prototype. J'ajouterai des idées et des inspirations à suivre pour cette animation. » → (L'intro reste en place, au rang de prototype, en attente d'inspirations. Voir « Inspirations pour l'intro ».)
- 2026-11-26 · « Pour les planètes, je pense qu'il faut qu'on revoie comment on définit le design d'une planète comme sa forme ou sa texture, et comment l'icône de profil du streamer se colle à la planète. » → (Redéfinir la planète d'une chaîne : forme, texture, et pose de la photo de profil.)
- 2026-11-26 · « J'aimerais que la recherche de streamers à suivre soit améliorée. » → (Trois pistes, hypothèse faute de précision : gérer la liste suivie, résultats plus parlants, suggestions de chaînes à suivre.)
- 2026-11-27 · Review, général : « J'aimerais que la période affichée soit « Aujourd'hui » pour toutes les informations de l'application. » → (Période par défaut : aujourd'hui.)
- 2026-11-27 · Review, calculs : « Un agent ou un skill pour revoir les calculs des analyses, et la hiérarchie des infos qu'on a et qu'on utilise. » → (Audit des calculs et des sources de données.)
- 2026-11-27 · Review, Carte : « Enlever la légende entourée en rouge ; revoir le fonctionnement des filtres ; générer des modèles 3D des planètes avec Blender et Higgsfield. » → (Légende, filtres (à préciser), planètes 3D.)
- 2026-11-27 · Review, menu : « Fusionner Chevauchement et Flux dans la Vue d'ensemble, retirer les onglets du menu, réutiliser le rangement par chaîne et par jeu. » → (Menu plus court.)
- 2026-11-27 · Review, Vue d'ensemble : « Réutiliser les modèles 3D ; modifier l'emplacement montré sur capture ; afficher « les jeux du moment » et « les streamers du moment ». » → (Nouveaux blocs du présent (capture manquante).)
- 2026-11-27 · Review, Vue d'ensemble : « Remonter le « Tout » et le montrer par jour, en différenciant viewers et viewers actifs. » → (Bloc d'activité en haut, jour par jour.)
- 2026-11-27 · Review, Vue d'ensemble : « Réduire et simplifier « Les chaînes » ; clic sur une planète : détails du streamer avec animation. » → (Chaînes compactes et fiche animée.)
- 2026-11-27 · Review, Vue d'ensemble : « Hors ligne : 5 par défaut puis déroulé ; animation de planète endormie. » → (Liste courte et planète endormie.)
- 2026-11-27 · Review, Vue d'ensemble : « Viewers max à la place de « viewers » ; tableaux de détail à dérouler ou ouvrir au clic. » → (Pic d'abord, détail replié.)
- 2026-11-27 · Review, Vue d'ensemble : « Participation du chat : mettre en avant les communautés les plus impliquées ; classement à mettre dans « Par chaîne ». » → (Classement d'implication.)
- 2026-11-27 · Review, Chevauchement : « Une mascotte (le viewer actif) qui va de planète en planète sur un fond de mini-galaxies ; la ligne « 96 % écrivent sur 1 chat » ; animer le parcours entre chaînes. » → (Parcours animé.)
- 2026-11-27 · Review, Flux : « La carte des migrations dit la même chose que Chevauchement : en garder une ; supprimer le diagramme ; migrations en viewers actifs seulement, avec animation. » → (Une seule lecture des déplacements.)
- 2026-11-27 · Review, Flux : « Bilan par chaîne en carte à collectionner (TCG) animée. » → (Fiche résumé d'un streamer.)
- 2026-11-27 · Review, Raids : « Afficher les raids de la plateforme en global pour en tirer des analyses ; bandeau défilant des raids dans la Vue d'ensemble. » → (Analyse et bandeau des raids.)
- 2026-11-27 · Review, Par chaîne : « Données du jour en priorité ; messages par minute en machine qui produit de l'énergie ; début et fin du live, viewers moyens, pic et minimum ; jeux en badges. » → (Résumé du live du jour.)
- 2026-11-27 · Review, Par chaîne : « « Où vont ses viewers » et « d'où ils viennent » réservés à l'abonnement agences et streamers. » → (Fonction payante.)
- 2026-11-27 · Review, Par jeu : « Modèles 3D de planètes pour les jeux ; une carte des jeux, taille selon les viewers de la catégorie ; retirer « Trouver des streamers ». » → (Carte des jeux.)
- 2026-11-27 · Review, Chat : « Animation de remplissage à la place des tableaux ; types de messages et ambiance par chaîne dans « Par chaîne » ; podium des 3 emotes. » → (Chat lisible.)
- 2026-11-27 · Review, Clip : « « Moments à clipper » dans un onglet à part nommé Clip. » → (Onglet Clip.)
- 2026-11-27 · Review, Réglages : « Source des données visible seulement par moi ; trouver la limite de chaînes suivies et l'afficher. » → (Réglages pour futurs utilisateurs.)

### Inspirations pour l'intro

À remplir par l'utilisateur : liens, captures, films, jeux, avec une ligne sur ce qui plaît dans chacun.

## Évaluées

| Idée | Valeur | Cohérence | Faisabilité | Risque | Plus-value /25 | Coût | Verdict | Raison |
|---|---|---|---|---|---|---|---|---|
| Intro animée de la page d'accueil (galaxie en direct puis titre) | 3 : première impression pour la prospection de fin décembre, mais n'ajoute aucune analyse | 4 : lisible avant spectaculaire (`PRODUCT.md` principe 2) si l'intro se passe d'un clic, ne joue qu'une fois et respecte `prefers-reduced-motion` ; « en live » exige de vraies données, sinon on retombe sur l'illustration actuelle, sans nom ni chiffre inventé | 4 : la page d'accueil est une surface neuve posée par-dessus, Three.js y est autorisé ; poids dans le HTML unique à mesurer | 4 : ne touche ni `schema.sql` ni le moteur de la Carte ; le seul risque est le poids et la fluidité | **18** | M (2 à 3 sessions) | **Faire** | Bonne plus-value pour un coût moyen. Première étape = un prototype isolé avec critère go/no-go écrit (plan ci-dessous). |
| Carte des migrations de viewers actifs (onglet Flux, animée) | 4 : répond à « où vont les viewers » par jour, un axe que le Sankey de période ne montre pas ; sert raids et agences | 4 : honnête si libellée « viewers actifs qui écrivent, jour par jour » ; ne change aucune décision de données | 3 : `daily_switches_rollup` existe et n'est jamais purgé, mais il faut une fonction SQL par jour et 14 journées (vers le 8/12) pour que la lecture temporelle vaille quelque chose | 4 : fonction SQL additive et rejouable, composant neuf ; ne touche ni la Carte ni `legacy.js` si on ne réutilise pas son moteur | **19** | M (2 à 3 sessions) | **Planifier à une date (8/12)** | Précision : la rétention des passages bruts est d'un jour, donc l'animation avance par journée, pas en temps réel. Un prototype isolé peut démarrer avant, sur les données actuelles, pour juger la lisibilité. |
| Réseau de tuyaux des déplacements A→B→C, nœuds en planètes (variante du chantier C) | 5 : les trajets à plusieurs sauts montrent où les viewers vont après un passage, donc où un raid ou une collab a le plus de chances de marcher | 2 : `DESIGN.md` réserve l'atmosphère à la Carte (l. 321, état du 25/11 avant la décision levée, voir SUIVI §17) ; les tuyaux lumineux risquent d'être du spectacle qui cache la donnée (`PRODUCT.md` principe 2). À réconcilier avec la règle du ciel étoilé posée par #43 et #44 | 2 : `daily_switches_rollup` donne des paires par jour, pas le parcours d'un viewer. Un trajet A→B→C exige un calcul quotidien sur les passages bruts, qui ne sont gardés qu'un jour : nouvelle étape de la tâche de nuit, à valider contre les délais de purge | 3 : une tâche de nuit de plus touche le pipeline des rollups, déjà source d'incidents (57014, 21000) | **17** | L (plusieurs sessions, une décision de design et une tâche de nuit) | **Prototype d'abord** | Le prototype n'a pas besoin de la nouvelle tâche : il part des paires par jour déjà agrégées (2 à 3 journées aujourd'hui). Critère de réussite : sans survol, on lit les 5 trajets les plus forts et leur sens ; sinon, on garde la carte à plat du chantier C. |
| Application en ligne 24 h/24, comptes clients après contrat (reprend la Client View et l'étape 3 du §12) | 5 : supprime la dépendance au PC et l'installation pour un non-technicien (§12 bis, point 3), ce qui ouvre agences et petits streamers | 2 : remet en cause la Client View abandonnée le 24/11 et renvoie le multi-utilisateur à une demande réelle (§12, étape 3) ; le VPS a été mis de côté (§5) | 2 : hébergement permanent, authentification, isolation des données par client, sauvegardes, et une base Supabase gratuite de 500 Mo qui ne tient pas plusieurs clients (§12) | 1 : le client secret Twitch ne doit jamais sortir du serveur ; `board_ok()` ne suffit pas comme droit par utilisateur ; données personnelles à cadrer (RGPD, `CONFORMITE.md`) et conditions Twitch à relire | **16** | L (plusieurs mois de travail, avec juriste) | **Planifier à une date** : après le premier contrat signé, pas avant janvier | Voir « Chantier D » ci-dessous. Ne pas remettre le secret au client : il reste chez l'opérateur, seul l'accès au tableau de bord est donné. |
| Planète partout (petits formats et avatars de `legacy.js`) | 2 : cohérence visuelle voulue, ne change aucune décision | 5 : prolonge `DESIGN.md` et la règle des deux niveaux de lueur | 5 : `ChannelAvatar` fait déjà la planète dès 20 px et couvre 17 composants | 4 : touche `legacy.js` (3 appels de `av()`) et `legacy.css`, sans toucher au moteur de la Carte | **18** | S (1 session) | **Faire** | Il reste très peu à faire (voir « Ce qui est déjà livré »). |
| Intro d'accueil, suite (prototype) | 3 : première impression pour la prospection, aucune analyse | 4 : lisible avant spectaculaire à vérifier sur chaque inspiration | 4 : le calque Three.js existe | 4 : isolée dans `components/intro/` | **18** | M | **Planifier** : quand les inspirations sont là | [ton choix] Elle reste prototype mais joue déjà une fois chez tout nouveau visiteur : à décider avant de montrer l'outil à une agence (fin décembre). |
| Redéfinir les planètes (forme, texture, pose de la photo) | 3 : reconnaître une chaîne d'un coup d'œil, utile devant une agence, aucune analyse nouvelle | 4 : revient sur la décision du 26/11 qui retirait la photo [ton choix] ; `DESIGN.md` (« Avatar-planète ») est à réécrire | 5 : photos déjà récupérées, source unique `lib/planet.ts` | 3 : touche `planetSvg` dans `legacy.js` et la fluidité de la Carte (une centaine de planètes avec images) | **18** | M (2 sessions) | **Prototype d'abord** | Le design n'est pas encore défini : comparer des pistes côte à côte avant de toucher à l'existant. |
| Gérer les chaînes suivies (liste entière, filtre, retrait avec confirmation, ajout en bloc) | 3 : sans retrait, la limite de 100 chaînes bloque ; aucune analyse nouvelle | 5 : rétablit ce que `app/LISEZMOI.md` décrit déjà | 5 : les actions existent dans `legacy.js` | 4 : le retrait modifie la liste du collecteur, donc confirmation obligatoire | **20** | S (1 session) | **Faire** | Régression du portage React, à traiter en premier. |
| Suggestions « à suivre » d'après les raids reçus | 4 : montre qui amène déjà des viewers vers le réseau suivi sans être mesuré ; aide à choisir les chaînes pour une agence | 4 : à libeller « a raidé une de tes chaînes », rien de plus | 4 : `raid_events` est déjà rempli, lisible et jamais purgé ; volume réel à compter avant | 4 : lecture seule, pas de `schema.sql` ; ne voit que les raids reçus par les chaînes suivies | **20** | M (1 à 2 sessions) | **Faire** | La piste la plus intéressante. D'abord compter les chaînes candidates dans la base. |
| Résultats de recherche plus parlants (viewers en direct, langue, en direct d'abord, clavier) | 2 : confort | 5 | 4 : un appel `streams` de plus, seulement avec l'API | 4 : quota Twitch négligeable | **17** | S (même session que la gestion) | **Faire**, en second | Utile seulement si l'API est configurée dans le navigateur. |
| Audit des calculs et hiérarchie des données (27/11) | 5 : tout chiffre montré à une agence en dépend | 5 : « honnête sur ses limites » | 4 : code et schéma disponibles | 5 : lecture seule | **24** | M (1 session) | **Faire**, en premier | Un document de référence, pas un agent. |
| Raids sortis des migrations (viewers actifs seulement) | 4 : corrige un chiffre faux | 5 : même unité partout | 4 : séparation déjà stockée | 3 : touche les rollups | **20** | S | **Faire** | Part raid surestimée du 23 au 25/11 (`SUIVI.md` §0). |
| Période « Aujourd'hui » par défaut | 4 : on voit le présent | 3 : fidélité (200 actifs) et rythme ne vivent pas sur un jour | 5 : réglage existant | 3 : écrans presque vides après minuit | **19** | S | **Faire** | Les blocs d'historique gardent leur échelle ; pas sur la Carte [ton choix, règle des deux temps]. |
| Rangement : onglet Clip, retrait de « Trouver des streamers », hors ligne à 5, types et ambiance dans Par chaîne, jeux en badges, limite mise en avant, podium d'emotes | 3 : pages plus lisibles | 4 : aucune décision remise en cause | 5 : données présentes | 5 : affichage seul | **20** | M (1 à 2 sessions) | **Faire** | Rapport effet/coût le plus haut. |
| Légende de la Carte déplacée dans l'aide | 3 : Carte dégagée | 4 : seulement si la légende reste accessible | 5 : l'aide existe | 4 : lecture moins immédiate | **19** | S | **Faire** (déplacer, pas supprimer) | Sans elle, taille, étoile et liens ne se lisent plus. |
| Pic de viewers mis en avant, détails repliés | 3 : chiffre plus parlant | 5 : à libeller « pic » | 5 : donnée relevée | 5 : affichage seul | **21** | S | **Faire** (bloc à confirmer) | Capture ou nom du bloc attendu. |
| Onglet « Audiences » unique (Chevauchement + Flux, diagramme retiré) | 4 : une question, une page | 4 : direction et chevauchement restent distincts | 4 : données présentes | 3 : refonte de deux pages | **19** | M (2 sessions) | **Faire** | Contre-proposition à la fusion dans la Vue d'ensemble. |
| Tout fusionner dans la Vue d'ensemble | 3 : un seul écran | 2 : contredit la demande de simplifier | 4 : données présentes | 3 : page très lourde | **15** | L | **Écarter** (sauf avis contraire) | Page interminable. On perd un seul écran pour tout. |
| Activité jour par jour en haut, viewers distincts des actifs | 4 : tendance lisible | 5 : deux unités nommées | 4 : rollups quotidiens, peu de journées | 4 : lecture seule | **21** | M | **Faire** | Sert aussi la trajectoire. |
| Raids : bandeau défilant dans la Vue d'ensemble | 3 : signal du moment | 3 : pause obligatoire, arrêt si mouvements réduits | 5 : `raid_events` déjà lu | 4 : mouvement permanent | **18** | S | **Faire** | Raids reçus par les chaînes suivies. |
| Raids de toute la plateforme | 3 : analyse neuve | 2 : on ne voit que les raids reçus par les chaînes suivies | 1 : non collecté | 3 : quotas Twitch | **12** | L | **Écarter** sous ce nom | On analyse les raids reçus par le réseau suivi. |
| Résumé du live du jour (début, fin, moyen, pic, minimum) | 5 : lecture d'un live | 5 : mesures directes | 3 : relevés gardés peu de jours, un toutes les 2 min | 3 : `schema.sql` pour garder l'historique | **21** | M (2 sessions) | **Faire** | Minimum mesuré après les 10 premières minutes. |
| Classement des communautés impliquées | 3 : déjà en partie là | 3 : « Communautés investies » existe ; Par chaîne ne montre qu'une chaîne | 5 : calculé | 5 : affichage seul | **19** | S | **Faire** en fusionnant avec l'existant | Rang de la chaîne dans Par chaîne. |
| Fiche « carte à collectionner » (clic sur planète, bilan Flux) | 4 : résumé partageable | 4 : si les chiffres restent lisibles | 4 : données présentes | 4 : composant isolé | **20** | M | **Prototype d'abord** | Un seul composant pour les deux demandes. |
| Planètes 3D Blender (chaînes, jeux, endormie) | 3 : identité forte | 4 : style low-poly du chantier E | 3 : crédits Higgsfield | 2 : poids du HTML unique, fluidité à 100 planètes | **15** | L | **Prototype d'abord** | Images pré-rendues dans Blender, moteur de la Carte inchangé. |
| Animation de remplissage à la place des tableaux du Chat | 3 : plus lisible | 3 : valeurs exactes à garder au clic | 5 : données présentes | 4 : affichage seul | **18** | M | **Prototype d'abord** | Forme à définir. |
| Mascotte qui suit les parcours | 2 : plaisir, aucune analyse | 3 : mouvement qui peut cacher la donnée | 3 : parcours bruts d'un seul jour | 3 : poids et fluidité | **13** | L | **Prototype d'abord**, en dernier | Un seul parcours réel à la fois. |
| Machine à énergie pour les messages par minute | 1 : même chiffre, moins lisible | 2 : la courbe doit rester | 5 : donnée présente | 4 : affichage seul | **13** | M | **Écarter** pour l'instant | On perd un effet, pas une information. |
| Carte des jeux | 3 : vue neuve | 3 : viewers des chaînes suivies seulement, pas de la catégorie Twitch | 3 : liens entre jeux existants | 2 : moteur de `legacy.js` | **14** | L | **Planifier** après les planètes | Pas de logos ni de personnages de jeux (droits). |
| Flux par chaîne et source des données réservés (abonnement) | 4 : modèle payant | 2 : pas de comptes | 1 : droits à construire | 1 : un masquage dans un HTML ne protège rien | **12** | L | **Planifier** avec le chantier D | Après un premier contrat. |

### Ce qui est déjà livré du texte collé (PR #43 et #44)

1. Fond spatial, étoiles discrètes : fait, ciel étoilé sur toutes les pages sauf la Carte (`SKY_TABS`).
2. Cartes « console spatiale » : fait.
3. Avatars en planètes : fait pour les 17 composants React via `app/src/components/channel-avatar.tsx` (atmosphère et relief dès 20 px).
4. Recoupements cosmiques : fait (constellation des recoupements).
5. Densité conservée : oui.

**Ce qui n'était pas planète le 25/11** (livré depuis, PR #51 et #55) :
- `av()` dans `app/src/legacy/legacy.js:57`, appelée ligne 444 (légende des graphiques), ligne 1459 (info-bulle de la Carte, taille `md`) et ligne 1462 (lignes de l'info-bulle). Rendu en CSS plat (`legacy.css:126-136`).
- Les pastilles de moins de 20 px de `ChannelAvatar` (légende de `line-chart.tsx`, menu de la Carte) : sans relief ni halo par choix de lisibilité. Ce choix peut rester, avec un relief léger sans halo.

## Plan en cours

### Review du 27/11 (proposé, rien de lancé)

Captures reçues le 27/11 : légende de la Carte (en bas à droite, elle masque une planète) ; Recoupements (constellation à déplacer vers le haut à gauche, phrase à descendre vers les listes, à confirmer).

Réponses de l'utilisateur (27/11), elles priment sur les hypothèses plus haut :
- **Recoupements** : la constellation passe au-dessus du texte, centrée, dans le même bloc.
- **Menu** : onglet « Audiences » retenu (Chevauchement + Flux).
- **Carte** : elle doit refléter le direct. Constat dans `renderMap` (`legacy.js`) : elle montre les chaînes qui ont des viewers actifs sur la période, hors ligne comprises ; « En live » est une option coupée par défaut ; taille, audience minimale et jeu portent sur la période. La règle des deux temps du 26/11 (E3) allait dans ce sens et n'a jamais été codée. Hypothèse : en live par défaut, hors ligne visibles sur demande, en planètes endormies.
- **Viewers max** : à la place de « viewers » dans « Les chaînes » (Vue d'ensemble) et dans « Par chaîne ».
- **96 %** : à mettre en avant, libellé « des viewers actifs n'écrivent que sur une seule de tes chaînes suivies », en tête d'« Audiences ».
- **« Tout »** : confirmé, le bloc d'activité « Tout · du … au … ».

Confirmé ensuite (27/11) : sur la Carte, les hors ligne sont masqués ; « jeux du moment » et « streamers du moment » forment un bloc « En ce moment » au-dessus de « Les chaînes ».

**R1 livré (27/11)** : `CALCULS.md`. Huit problèmes classés (§1) et trois décisions à prendre (§4), avant les corrections (R1 corr).

**Carte en direct** (nouveau, reprend E3 sans attendre les planètes 3D) : valeur 4 (la Carte dit le présent), cohérence 5 (règle validée le 26/11), faisabilité 4 (direct et viewers déjà connus), risque 3 (moteur de la Carte). Plus-value 20/25, coût M, **Faire**.

| Chantier | Contenu | Fichiers | Modèle, effort | Vérification | Abandon |
|---|---|---|---|---|---|
| R0 (S, d'abord) | **Bug constaté le 27/11** : aucun raid ne s'affiche (« Dernier raid », Flux, communautés investies, Par chaîne). Le collecteur écrit les raids dans `raid_events` (68 le 26/11, 36 le 27/11 à 15 h 32), le tableau de bord les lit dans `events`, où il n'y en a aucun | `app/src/legacy/legacy.js` | Sonnet 5.5, high | `/verifier`, puis lecture sur les vraies données | Aucun |
| R1 (1 session) | Audit des calculs : chaque chiffre, sa formule, sa source, sa limite ; hiérarchie des données ; raids dans les migrations | `CALCULS.md` (neuf), lecture de `legacy.js` et `schema.sql` | Opus 5.5, high | Relu avec l'utilisateur | Aucun |
| R1 corr (1 à 2 sessions, avant la Carte) | Corrections de `CALCULS.md` §1 : heures, fenêtre commune, raids hors interactions, un seul comptage des migrations, « part en commun » ; fidélité (`schema.sql`) en second | `legacy.js`, `overview/`, `flows/`, `schema.sql` | Sonnet 5.5, high | Chiffres comparés à la base avant et après, `/verifier` | La table `switches` ne couvre pas la période : garder l'estimation et le dire |
| R1 bis (1 session) | Carte en direct : en live par défaut, taille = viewers en direct, filtres audience et jeu sur le direct, sélecteur de période retiré de la Carte, liens sur tout le détail (date de début dans l'aide) | `legacy.js` (`renderMap`, `liveR`), `map/map.tsx`, `map/menu.tsx`, `DESIGN.md` | Sonnet 5.5, high | `/verifier`, Carte dense dans un vrai navigateur | Carte saccadée ou presque vide hors des heures de live |
| R2 (1 à 2 sessions) | « Aujourd'hui » par défaut, rangement rapide, légende dans l'aide, bandeau des raids, constellation centrée au-dessus du texte, viewers max | `legacy.js`, `legacy-markup.html`, `overview/`, `chat/`, `channel/`, `game/`, `map/map.tsx`, onglet Clip | Sonnet 5.5, medium | `/verifier` | Un bloc vide sur « Aujourd'hui » garde sa période |
| R3 (2 sessions) | Onglet Audiences, activité jour par jour en haut | `overlap/`, `flows/`, `overview/`, `app-sidebar.tsx`, `legacy.js` | Opus 5.5 high (maquette), puis Sonnet 5.5 high | Prototype choisi, `/verifier` | Page illisible : deux sections repliables |
| R4 (2 sessions) | Résumé du live du jour | `schema.sql`, `legacy.js`, `channel/` | Sonnet 5.5, high | SQL en transaction annulée, `/verifier` | Début ou fin faux sur un live réel |
| R5 (1 à 2 sessions) | Prototype planètes Blender en images (remplace E1) | page de démo `app/src/dev/` | Opus 5.5, high ; devis Higgsfield avant génération | Poids, 60 i/s, `file://` | Saccades ou poids excessif : planètes actuelles |
| R6 (1 à 2 sessions) | Prototype fiche à collectionner, après R5 | page de démo | Opus 5.5 high puis Sonnet 5.5 high | Choix de l'utilisateur | Fiche moins lisible que le tableau |
| Ensuite | Podium, remplissage du Chat, mascotte, carte des jeux | | | | |

R0 à R4 : 8 à 9 sessions, 2 avec Opus. R5 et R6 : 2 à 4 sessions de plus, et des crédits Higgsfield.

### Plan précédent

**État au 26/11** : A livré (PR #51, puis planètes peintes #55). B livré (PR #52), gardé comme prototype (26/11) ; la revue de mouvement B4 n'a pas été lancée. C livré (PR #53), fonction `flows_by_day` présente en base (vérifié le 26/11), à juger sur 14 journées vers le 8/12 ; C3 abandonné. D dormant. Le détail ci-dessous est le plan d'origine, proposé le 2026-11-25. **Un chantier = une session** (`/clear` entre deux). Rien ne se déploie sans ta demande ; pour les fusions, voir `SUIVI.md` §4.

### Chantiers F et G · Choix des chaînes suivies (F livré le 26/11, PR #71 ; G livré le 26/11, PR #72)

| Chantier | Tâche | Fichiers | Modèle, effort | Vérification | Abandon |
|---|---|---|---|---|---|
| F (S, 1 session) | Liste entière avec filtre, retrait avec confirmation, ajout en bloc ; puis résultats plus parlants (viewers, langue, direct d'abord) | `app/src/components/settings/settings.tsx`, `app/src/legacy/legacy.js` (`runAddSearch`) | Sonnet 5.5, medium | `/verifier`, Playwright sur `?demo=settings` | Les résultats enrichis sautent s'ils demandent un appel par chaîne |
| G (M, 1 à 2 sessions) | Compter les chaînes non suivies présentes dans `raid_events` (lecture seule), puis bloc « Elles ont raidé tes chaînes » avec bouton Ajouter | `legacy.js`, `settings.tsx`, `bridge.ts`, `demo.ts` | Sonnet 5.5, high | `/verifier`, relevé sur la vraie base | Moins de 10 candidates avec au moins 2 raids : on attend plus de données |

Coût estimé : 2 à 3 sessions, sans Opus. Pas fait : recherche côté serveur avec les identifiants du collecteur (demande un déploiement), nombre de followers par résultat (un appel Twitch par chaîne).

### Chantier A · Planète partout (S, 1 session)

| Tâche | Fichiers | Modèle, effort | Vérification |
|---|---|---|---|
| Faire rendre `av()` en planète (relief et halo, même sens que `ChannelAvatar`) ; garder la gestion d'erreur de photo (`legacy.js` écouteur `error`, classe `av` sur `<img>` interdite côté React mais utilisée ici par le legacy) | `app/src/legacy/legacy.js` (lignes 57 à 62, 444, 1459, 1462), `app/src/legacy/legacy.css` (lignes 113 à 136) | Sonnet 5.5, high | `npm run build`, puis Playwright sur `http://localhost:5173/?demo=map&hover=0.4` (info-bulle) et sur un graphique avec légende |
| Relief léger sans halo sous 20 px | `app/src/components/channel-avatar.tsx` | Sonnet 5.5, medium | Légende de `line-chart.tsx` et menu de la Carte lisibles à 16 px |

Critère de fin : plus aucune photo de chaîne plate dans l'info-bulle de la Carte ni dans les légendes ; contraste 4,5:1 conservé. **Abandon** : si le relief rend l'initiale illisible à 16 px, on garde la pastille plate à ce format et on le note dans `DESIGN.md`.

### Chantier B · Intro de la page d'accueil (M, 2 à 3 sessions)

| Étape | Exécutant | Modèle, effort | Sortie |
|---|---|---|---|
| B1. Écrire la séquence (storyboard : durée, mouvement de caméra, apparition du titre, effet du nom, bouton « Passer », rappel `prefers-reduced-motion`). Typographie et lueurs selon `DESIGN.md` | Session | Opus 5.5, high | Storyboard dans `IDEES.md`, accepté par toi avant tout code |
| B2. Prototype isolé (`?intro`, page à part, mode démo, sans toucher à la vraie page d'accueil), moteur Three.js via les skills `three-js` et `react-three-fiber`. Option : maquette de la scène dans Spline | Session | Sonnet 5.5, high | Prototype et mesures. **GO** (fluidité 60 i/s confirmée sur le PC de l'utilisateur, 25/11) : +141 Ko compressés, `file://` OK |
| B3. Décision go/no-go sur mesures, puis branchement sur `landing.tsx` (galaxie des chaînes en direct si des données existent, sinon l'illustration de `landing-map.tsx`) | Session | Sonnet 5.5, medium | Intro intégrée. **Fait, en attente de validation** (25/11) : `app/src/components/intro/intro.tsx` ; `?intro` et le prototype retirés |
| B4. Contrôle du mouvement | Relecture avec `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max/data/motion.csv`), une seule fois, sans agent | par défaut | Liste de corrections |

#### Storyboard (B1, 25/11, validé avec modifications)

Validé le 25/11 avec les modifications de l'utilisateur (durée de 4,0 s, mot « Observer » comme titre, seulement les chaînes en direct). Rien n'est codé. Le point du nom dans l'en-tête (plan 4) est validé le 25/11. Un choix technique reste à trancher pour B2 (voir les dernières sections).

**Principe.** L'intro est un calque posé au-dessus de la page d'accueil actuelle (`landing.tsx`), qui est déjà dans la page dessous, invisible et `inert` pendant l'intro. La dernière image de l'intro est la page d'accueil elle-même : la galaxie se range à la place de l'illustration (`landing-map.tsx`, même astre central, mêmes trois orbites), le mot « Observer » s'efface et l'en-tête affiche le nom comme aujourd'hui. Il n'y a pas de coupure : on passe du film à la page sans changer de décor.

**Durées.**

| Plan | Début → fin | Durée |
|---|---|---|
| 0 · Nuit | 0,0 → 0,3 s | 0,3 s |
| 1 · Approche | 0,3 → 1,7 s | 1,4 s |
| 2 · Mise en orbite | 1,7 → 2,5 s | 0,8 s |
| 3 · Titre | 2,5 → 3,5 s | 1,0 s |
| 4 · Arrivée sur l'accueil | 3,5 → 4,0 s | 0,5 s |
| **Total** | 0,0 → 4,0 s | **4,0 s** (0,3 + 1,4 + 0,8 + 1,0 + 0,5) |

- **Durée totale : 4,0 s, et c'est aussi la durée maximale.** La séquence suit l'horloge, pas le nombre d'images : si le PC rame, des images sautent mais la fin tombe quand même à 4,0 s.
- **Premier écran final sans attente** : à 4,0 s au plus tard sans rien faire ; 0,2 s après « Passer », Échap ou un clic ; tout de suite (fondu d'opacité de 0,2 s) avec `prefers-reduced-motion`.
- Si l'onglet est en arrière-plan au moment du chargement (`document.hidden`), l'intro attend qu'il redevienne visible, sinon elle serait jouée pour personne.

**Plan 0 · Nuit (0,0 → 0,3 s, 0,3 s)**

| | |
|---|---|
| Mouvement | Aucun. |
| Contenu | Fond ciel profond (#09090b). La poussière d'étoiles de la galaxie apparaît en fondu d'opacité (0 → 100 % en 0,3 s), encore très petite au centre. Le bouton « Passer l'intro » est là dès 0 s. |
| Titre et textes | Aucun, sauf « Passer l'intro ». |
| Son | Aucun (vaut pour tous les plans : pas d'autoplay sonore, outil utilisé au bureau). |
| `prefers-reduced-motion` | Le plan n'existe pas (voir plus bas). |
| Décision de données | À 0,3 s, l'intro regarde une seule fois si des données de chaînes sont déjà chargées. Elle choisit alors le cas illustré ou le cas réel pour toute la séquence ; elle ne bascule jamais en cours de route. |

**Plan 1 · Approche (0,3 → 1,7 s, 1,4 s)**

| | |
|---|---|
| Mouvement | Travelling avant vers le centre de la galaxie : la galaxie passe de 35 % à 85 % de sa taille finale, courbe `cubic-bezier(.32,.72,0,1)` (celle du tiroir, `DESIGN.md`), donc rapide au début puis de plus en plus lent. Le disque est vu incliné : 55° au départ, 20° à la fin du plan (il « se redresse » vers nous). Rotation dans son plan : 4° par seconde au plus, sens horaire. Aucun roulis de caméra, aucune secousse, aucun zoom brusque. Vitesse apparente d'un point au bord : 400 px/s au plus sur un écran de 1 440 px. |
| Contenu | Astre central violet (comme `landing-map.tsx`), poussière d'étoiles en deux bras spiraux, puis les planètes qui s'allument une à une (fondu de 0,3 s chacune, une toutes les 0,08 s : 12 planètes au plus tiennent dans le plan, la dernière finit d'apparaître vers 1,3 s), des orbites internes vers l'externe. Voir « Galaxie » pour ce que représente chaque point. |
| Titre et textes | Aucun. |
| Son | Aucun. |
| `prefers-reduced-motion` | Plan supprimé. |

**Plan 2 · Mise en orbite (1,7 → 2,5 s, 0,8 s)**

| | |
|---|---|
| Mouvement | Fin du travelling : 85 % → 100 %. Le disque finit de se redresser : 20° → 0° (vu de face, comme l'illustration à plat de l'accueil). La rotation ralentit de 4°/s à 1,5°/s, la vitesse exacte de `.landing-orbit` (un tour en 240 s), pour qu'il n'y ait aucun à-coup quand l'illustration prend le relais. |
| Contenu | Les trois orbites (rayons 92, 152 et 214 de `landing-map.tsx`) se dessinent en traits fins (`map-link` à 12 %). Les liens entre planètes se tracent ensuite (0,4 s, `map-link` à 34 %), comme dans l'illustration. |
| Titre et textes | Aucun. |
| Son | Aucun. |
| `prefers-reduced-motion` | Plan supprimé. |

**Plan 3 · Titre (2,5 → 3,5 s, 1,0 s)**

| | |
|---|---|
| Mouvement | La caméra ne bouge plus. La galaxie continue de tourner à 1,5°/s et descend à 30 % d'opacité en 0,3 s, avec le voile radial de la Carte (`map-veil`) derrière le titre. |
| Contenu | Au centre, le mot « Observer », mot court qui invite à observer la carte des streamers. 2,6 → 3,1 s : il se révèle par un masque horizontal, de gauche à droite (0,5 s, même courbe). 3,1 → 3,5 s : il reste à l'écran, immobile et lisible en entier, jusqu'à la fin du plan 3. Logo retiré le 25/11 : le logo à deux cercles n'est pas tracé au plan 3, le mot seul porte le plan. |
| Titre et textes | « Observer » en Inter 600, sans lueur, interlettrage −0,03em (comme le titre de l'accueil), taille `clamp(2.25rem, 7vw, 4rem)`, couleur lumière d'étoile (#f4f4f5). |
| Son | Aucun. |
| `prefers-reduced-motion` | Plan supprimé : l'image fixe porte déjà le nom dans l'en-tête. |

**Plan 4 · Arrivée sur l'accueil (3,5 → 4,0 s, 0,5 s)**

| | |
|---|---|
| Mouvement | Le mot « Observer » s'efface en 0,3 s (opacité seulement, sans déplacement) et l'en-tête affiche « Twitch Overlap » comme aujourd'hui. Validé le 25/11 : le nom de l'outil n'apparaît qu'à ce moment, dans l'en-tête, et non dans le film. Les déplacements n'utilisent que `transform`, jamais `top`, `left`, `width` ni `height` (règle de `DESIGN.md`). Sur écran large, la galaxie glisse et rétrécit jusqu'au cadre de l'illustration (colonne de droite, `transform` en 0,5 s) et remonte à 100 % d'opacité. Sous 1 024 px (`lg`), l'illustration est sous le texte : la galaxie s'efface en fondu (0,3 s) et l'illustration apparaît en fondu à sa place, sans déplacement. |
| Contenu | La poussière d'étoiles s'efface ; il ne reste que la composition de l'illustration. Le titre de la page, le sous-titre et les deux boutons arrivent comme toute vue du site : fondu + montée de 4 px en 0,3 s, décalés de 0,08 s (le dernier élément finit avant 4,0 s). Le bouton principal prend sa lueur d'action à la fin. À 4,0 s, le calque de l'intro est retiré et `LandingMap` (ou sa version réelle, B3) prend le relais, au même angle. Le focus va sur la page d'accueil, comme aujourd'hui. |
| Titre et textes | Ceux de la page d'accueil actuelle, inchangés. « Passer l'intro » s'efface de 3,7 à 3,9 s. |
| Son | Aucun. |
| `prefers-reduced-motion` | Remplacé par l'image fixe. |

**Galaxie : ce que représente chaque point.**

- **Cas illustré** (aucune chaîne suivie en direct, ou données pas encore chargées à 0,3 s ; c'est le cas le plus fréquent puisque la source des données n'est pas encore réglée) : des formes seulement. Les 9 planètes de `landing-map.tsx` (mêmes couleurs : `primary`, `primary-soft`, `map-link`, `star-gold`), l'astre central et la poussière d'étoiles. Aucun nom de chaîne, aucun chiffre, aucun avatar, et pas de rouge live (rien n'est en direct). La légende actuelle « Illustration. La Carte de ton tableau de bord affiche tes vraies chaînes. » apparaît avec l'illustration au plan 4.
- **Cas réel, seulement les chaînes en direct** (la galaxie ne montre que les chaînes en direct à la première visite, jamais les chaînes hors ligne ; si aucune chaîne suivie n'est en direct, on prend le cas illustré, l'illustration de `landing-map.tsx` ; données déjà chargées à 0,3 s, par exemple quand on rouvre l'accueil par `?accueil` une fois le tableau de bord rempli) : chaque planète est une chaîne en direct, dessinée comme `ChannelAvatar` (planète dès 20 px : photo ou initiale, cercle et atmosphère de la couleur de la chaîne, relief). Plafond de 12 planètes, les plus regardées sur l'orbite intérieure. Taille de 20 à 40 px selon la racine carrée des viewers, sans afficher le chiffre. Petit point rouge live posé sur la planète, fixe (pas de pulsation pendant l'intro). Pas de nom pendant le mouvement, pour ne rien donner à lire qui bouge. On n'attend jamais une photo : si elle n'est pas arrivée, l'initiale reste. La légende devient « Tes chaînes en direct à l'ouverture de cette page. »
- **Poussière d'étoiles** (les deux cas) : décor, aucune signification. Environ 180 points dans la variante Three.js, 60 dans la variante S, tons `map-link` et `star-gold` entre 20 et 60 % d'opacité, sans scintillement.

**Titre « Observer » : pourquoi ce choix.**

- **Révélation par masque horizontal** : elle évoque le balayage d'un instrument d'observation et laisse les lettres nettes à chaque image. Un fondu seul ferait passer le titre par un gris peu lisible ; un flou (refusé le 25/11) ou un brouillage de lettres serait du spectacle.
- **Un mot court** : « Observer » invite à observer la carte des streamers et se lit d'un coup d'œil dans un film de 4 s. Le nom vient ensuite, dans l'en-tête (validé le 25/11 ; logo retiré le 25/11).
- **Sobre** : pas d'Orbitron (refusé le 25/11), pas de capitales espacées (règle du libellé en clair), pas de lueur ni d'ombre portée sur le texte. Règle des deux niveaux de lueur : pendant l'intro, seule l'atmosphère des planètes et de l'astre central brille, en lueur ambiante. La seule lueur vive de la séquence est celle du bouton principal, à la fin.

**Bouton « Passer l'intro ».**

- **Place** : en bas à droite, à 24 px des bords (16 px sous 640 px). Bouton secondaire de `DESIGN.md` (orbite, filet), fond opaque pour que la galaxie ne passe jamais dessous ; 36 px de haut, 44 px sur mobile, comme les boutons de l'accueil.
- **Visible** de 0 s à 3,7 s, puis effacé en 0,2 s.
- **Ce qu'il fait** : saute à l'image finale (fondu d'opacité de 0,2 s, sans déplacement), retire le calque et marque l'intro comme vue. La page d'accueil reste ouverte : passer l'intro n'est pas entrer dans le tableau de bord.
- **Échap** fait la même chose pendant l'intro. Un second Échap, sur la page d'accueil, la ferme comme aujourd'hui. Le premier Échap ne doit donc pas atteindre l'écouteur actuel de `landing.tsx`. Un clic n'importe où sur le calque passe aussi l'intro, comme dans un jeu.
- **Focus** : le bouton reçoit le focus à 0 s (Entrée et Espace le déclenchent) ; à la fin, le focus revient sur la page d'accueil comme aujourd'hui. Il porte `aria-keyshortcuts="Escape"`.

**`prefers-reduced-motion`.** Pas d'intro du tout. On affiche directement l'image fixe de la fin du plan 4 : la page d'accueil actuelle, avec l'illustration (ou la galaxie réelle, en image fixe) et le nom dans l'en-tête. Seul un fondu d'opacité de 0,2 s est permis, aucun déplacement ni rotation (l'illustration ne tourne déjà plus dans ce cas, `index.css`). Pas de bouton « Passer », puisqu'il n'y a rien à passer.

**Lecture unique.**

- Nouveau drapeau `to2-intro-seen`, posé quand l'intro se termine ou est passée.
- L'intro joue seulement si la page d'accueil s'affiche **et** que le drapeau est absent, ou si l'adresse contient `?accueil` (elle rejoue alors à chaque chargement avec `?accueil`).
- Jamais avec `?demo` (l'accueil ne s'y affiche pas). Le prototype `?intro` de B2 a été retiré en B3. Jamais quand on rouvre l'accueil par le lien de l'état vide de la Vue d'ensemble (`to2:landing`) : la personne y cherche l'explication, pas le film.
- Si le stockage est indisponible : pas d'intro (on ne rejoue pas le film à chaque visite).

**Variante S (SVG et CSS, sans Three.js).** Même séquence, mêmes durées, mêmes textes et même bouton. Ce qui change :

- **Inclinaison** : le disque est un SVG aplati par une échelle verticale (45 % → 100 %) au lieu d'une vraie perspective. On voit une ellipse qui s'ouvre en cercle ; pas de vraie profondeur.
- **Profondeur** : deux calques seulement (poussière lointaine et disque) qui grandissent à des vitesses différentes, au lieu d'une parallaxe continue.
- **Poussière** : 60 points au lieu de 180.
- **Animation** : seulement `transform` et `opacity`, en Web Animations API ou en keyframes CSS ; les traits se dessinent par `stroke-dashoffset`.
- **Planètes réelles** : `ChannelAvatar` posé en HTML au-dessus du SVG. C'est aussi ce que je propose pour la variante Three.js, car une photo Twitch chargée comme texture WebGL depuis `file://` risque d'être refusée (règle d'origine croisée), à vérifier en B2.
- **Poids ajouté** : quelques Ko, aucune bibliothèque. Elle suffit si les critères de B2 échouent ; on peut aussi la choisir d'emblée.

**Accessibilité et lisibilité.**

- **Contraste du titre** : lumière d'étoile sur un fond qui, dans la zone du titre, n'est jamais plus clair que la coupole (#121217). Pour ça, la galaxie passe à 30 % d'opacité et le voile `map-veil` est posé derrière le titre. Contraste ≥ 15:1. Le titre ne passe jamais sur l'astre central à pleine intensité : sur le violet profond, la lumière d'étoile tomberait sous 4,5:1.
- **Contraste du bouton** : lumière d'étoile sur orbite opaque, ≥ 15:1, quel que soit le décor derrière. Anneau de focus violet de 3 px, comme partout.
- **Lisible à tout moment** : pendant le masque, les lettres déjà révélées sont à pleine opacité (pas de lettre à moitié transparente) ; pendant le plan 4, « Observer » s'efface sans bouger et le nom apparaît à 14 px dans l'en-tête, comme aujourd'hui.
- **Pas de clignotement** : aucun éclair, aucune variation de luminosité plus de trois fois par seconde (WCAG 2.3.1).
- **Lecteurs d'écran** : le calque de l'intro est `aria-hidden` ; seul « Passer l'intro » est annoncé. La page d'accueil garde son rôle de dialogue et son nom (« Accueil de Twitch Overlap »).
- **Clavier** : tout se fait sans souris (Échap, ou Entrée sur « Passer l'intro »).

**Décisions de l'utilisateur (25/11).**

1. **Durée** : 4,0 s au total, qui est aussi le maximum. Découpage : 0,3 + 1,4 + 0,8 + 1,0 + 0,5 s (tableau ci-dessus).
2. **Titre** : le mot « Observer » (plan 3), qui s'efface au plan 4 pendant que l'en-tête affiche « Twitch Overlap » (validé le 25/11).
3. **Seulement les chaînes en direct** : jamais de chaîne hors ligne dans la galaxie ; sans chaîne en direct, le cas illustré. Plafond de 12 planètes, de 20 à 40 px.
4. **Phrase d'accroche avant le nom** : non retenue (aucun plan supplémentaire).

**Choix à trancher pour B2.**

| | Three.js | Variante S (SVG et CSS) |
|---|---|---|
| Ce qui change visuellement | Profondeur réelle et parallaxe continue | Inclinaison simulée du disque (échelle verticale), deux calques seulement |
| Poids ajouté à `twitch-overlap.html` | Ordre de grandeur à mesurer, quelques centaines de Ko | Quelques Ko, aucune bibliothèque |
| Risque sous `file://` | Réel : chargement du moteur et des textures (photos Twitch refusées par l'origine croisée), à vérifier | Aucun |
| Risque de fluidité pendant le chargement du tableau de bord | Réel : le rendu WebGL se dispute le fil principal avec le chargement | Faible : seulement `transform` et `opacity` |
| Effort | Une session Sonnet high | Une session de prototype plus longue (réglage fin de l'illusion de profondeur) |
| Recommandation | Il serait raisonnable de commencer par la variante S pour la livraison, et de n'ouvrir Three.js que si la capture de la variante S paraît plate. | |

**Critères go/no-go de B2** (à confirmer par toi) : poids ajouté au HTML unique mesuré et écrit (ordre de grandeur à tenir : quelques centaines de Ko, Three.js allégé par import ciblé) ; 60 images par seconde sur ton PC ; chargement correct depuis `file://` ; intro passable en un clic ou à la touche Échap ; une seule lecture par navigateur (`to2-landing-seen`). **Abandon** : poids ou fluidité hors critère, on garde une animation en SVG et CSS (variante S, sans Three.js).

**Spline** : sert à maquetter la scène. Elle n'entre dans la version livrée que si le chargement sans service externe depuis `file://` est démontré à B2 ; c'est un critère de réussite, pas un doute sur ses conseils.

### Chantier C · Carte des migrations (onglet Flux, M, 2 à 3 sessions, dès le 8/12)

| Tâche | Fichiers | Modèle, effort | Vérification |
|---|---|---|---|
| C0. Prototype isolé sur les journées déjà agrégées (mode démo, sans SQL) : disposition des chaînes du Sankey, arcs animés par journée, curseur de date. Mesure la lisibilité avec 2 à 3 journées puis 14 | `app/src/components/flows/` (page de démo seulement) | Opus 5.5, high (c'est une décision de lisibilité) | Capture Playwright sur `npm run dev` |
| C1. Fonction SQL additive `flows_by_day(code, d0, d1)` : passages par jour et par paire, top N, avec part organique et raid. Dans `schema.sql`, rejouable (`create or replace`), derrière `board_ok()` comme les autres | `schema.sql`, `app/src/legacy/legacy.js` (appel RPC, événement `legacy:flows` enrichi) | Sonnet 5.5, high | Test sur la base dans une transaction annulée, avec le bon code et un mauvais code (0 ligne) |
| C2. Composant React « carte des migrations » avec curseur de date, à côté du Sankey (le Sankey reste pour la période) | `app/src/components/flows/flows-map.tsx`, `flows.tsx` | Sonnet 5.5, high | `npm run build`, Playwright `?demo=flows` |

**Statut (26/11)** :
- C0 : prototype isolé livré (démo `?demo=flows-map`), verdict partiel : lisible, pas encore prouvé sur les vraies données.
- C1 : fonction SQL `flows_by_day` et appel dans l'onglet Flux livrés (PR #53). Testée en transaction annulée : mauvais code → 0 ligne. Fonction présente en base et identique à `schema.sql` (vérifié le 26/11). Reste à voir l'onglet Flux avec le bon code.
- C2 : livré (PR #53). Carte masquée tant que `byDay` est absent, Sankey inchangé.

**Variante tuyaux (25/11)** : si le prototype C0 réussit en tuyaux, les trajets A→B→C deviennent une étape C3, après C2 : une tâche de nuit (Sonnet high, `schema.sql` rejouable, testée en transaction annulée) qui calcule, à partir des passages bruts de la veille, les trajets à deux sauts par jour et les garde dans une table agrégée. Sans cette table, on ne montre que des paires, jamais un parcours. Les planètes des nœuds réutilisent `ChannelAvatar` (déjà en planète dès 20 px). Décision prise le 25/11 : `DESIGN.md` l. 321 ne réserve plus l'atmosphère à la Carte ; le ciel étoilé la remplace sur toutes les pages. Les tuyaux peuvent donc être dessinés dans Flux, à condition de passer le critère de lisibilité du prototype.

**Statut C3 (26/11) : abandonné.** Le prototype tuyaux (`?demo=paths`) ne se lit pas : les tuyaux d'un même pivot se superposent et se croisent, et les arcs de C2 restent plus clairs. Le calcul à deux sauts (table `daily_paths`, tests en transaction annulée) n'est pas livré : pas de SQL en production pour ce point. Le travail est gardé sur la branche locale `archive/c3-trajets-deux-sauts` (commit `855717e`), non fusionnée.

Critère de fin : la carte se lit sans survol sur 14 journées, chaque arc donne son nombre de viewers uniques et la part organique, et le libellé dit « viewers actifs qui écrivent, par jour ». **Abandon** : si, sur 14 journées, la carte ne dit rien de plus que le Sankey, on ne la livre pas et on garde le Sankey.

### Chantier D · Hébergement et comptes clients (L, dormant)

Ne se lance qu'après un premier contrat signé, sur ce qui est validé à l'étape 1 de `VALIDATION-AGENCES.md`. Décisions prises le 25/11 :

1. **Base commune avec droits**, sur un plan Supabase payant (augmentation des capacités du compte). Droits par client via RLS. Le palier se choisit selon `COUTS-CLIENTS.md` §5.
2. **Le secret Twitch reste chez l'opérateur**, qui est seul responsable des données. Le client ne reçoit qu'un accès au tableau de bord.
3. **Collecte 24 h/24 : conseil sur les dépenses.** Une seule collecte pour l'union des chaînes de tous les clients, dimensionnée selon `COUTS-CLIENTS.md`. Le serveur reste à chiffrer sur deux ou trois offres avant tout choix.

Étapes, si les trois décisions sont prises :
- D0. Cadre juridique (RGPD, conditions Twitch sur le stockage et la redistribution) validé par un juriste. Bloquant avant tout client payant (§12).
- D1. Collecteur sur serveur, en ligne, avec sauvegarde et alerte de panne. Sonnet high, testé sur une base de test.
- D2. Tableau de bord publié sur un site, derrière une connexion par compte. La clé publique ne doit plus lire toutes les tables (§12, blocages). Opus high pour l'architecture des droits, Sonnet high pour l'implémentation.
- D3. Création d'un compte client avec accès en lecture seule, testé avec un compte de démonstration.

**Critère d'abandon** : si le juriste ne valide pas la base commune, on passe à une base par client, plus lente à monter mais sans droits partagés. Le conseil de coûts est tenu dans `COUTS-CLIENTS.md` : à chaque nouveau client, on remplit le questionnaire de son §6 avant de chiffrer.

### Chantier E · Redéfinir les planètes (M, 2 sessions, proposé le 26/11, pas lancé)

**Aujourd'hui** : disque rond de la couleur de la chaîne, un motif tiré du nom (bandes, cratères ou taches), l'initiale au centre, un anneau sur les 3 chaînes les plus fortes de la vue. Sur la Carte, ce disque est posé en médaillon sur une sphère à facettes. La photo de profil n'apparaît plus.

**E0, réponses de l'utilisateur (26/11)**
- Priorités : l'absence de la photo et les textures.
- Photo : posée comme un pin's accroché à la planète.
- Forme et texture : seulement pour varier les modèles de la Carte, elles ne portent aucune donnée.
- Références : `C:\Users\User\Desktop\hugo\SCREEN\Mood design` (hors dépôt, images d'autrui : s'en inspirer, ne pas les copier ni les versionner).

**Décisions de l'utilisateur (26/11, second message)**, elles remplacent la lecture « jouet 3D » :
- **Style de référence : low-poly** (`low 2.jpg`), sans détails extérieurs (ni arbres ni maisons).
- **La planète Twitch suit le même style.**
- **Taille d'une planète = viewers sur le live en ce moment.** À changer : aujourd'hui, viewers actifs de la période (`liveR`, `legacy.js` ; légendes de `map.tsx`).
- **Périodes de la Carte à clarifier** : on s'y perd.

**Constats dans le code** : les planètes des chaînes ont déjà une sphère à facettes, mais le médaillon peint en cache les deux tiers du rayon ; la planète Twitch est une icosphère low-poly lisse. La période choisit les chaînes affichées, la taille, l'étoile, l'épaisseur des liens, les groupes, les lueurs de passage et le filtre de jeu ; les signaux du direct (ondes, comètes, pastilles) ne la suivent pas. Avec une rétention de 1 à 2 jours, « 7 jours », « 30 jours » et « Tout » montrent la même chose.

**Règle des deux temps, validée par l'utilisateur (26/11)** : la planète dit le présent (taille = viewers en direct, hors live = petite et éteinte) ; les liens disent la relation, calculée sur tout le détail disponible, sans sélecteur de période sur la Carte, avec la date de début écrite dans la légende. Conséquence : l'étoile d'un système n'est plus forcément la plus grosse planète.

**Couleurs, décidé (26/11)** : chaque planète est teintée de la couleur de sa chaîne. La variété vient des formes et des reliefs.

**Contrainte** : sur la Carte, une planète fait environ 22 à 48 px de diamètre hors zoom : peu de facettes, de gros reliefs, un pin's lisible. L'écart de taille est à élargir maintenant qu'il porte les viewers en direct.

| Tâche | Fichiers | Modèle, effort | Vérification |
|---|---|---|---|
| E0. Cadrer avec l'utilisateur : références, ce qui gêne, ce que forme et texture doivent dire (identité seule, ou une donnée avec légende) | `IDEES.md` | session | Réponses écrites |
| E1. Prototype isolé (`?demo=planets`) : modèles low-poly (silhouette et relief variés), pin's photo avec images factices, planète Twitch du même style, à 22, 30, 48 et 100 px | page de démo neuve dans `app/src/dev/` | Opus 5.5, high (décision de design) | Captures, choix de l'utilisateur |
| E2. Appliquer la piste retenue partout | `app/src/lib/planet.ts`, `index.css`, `channel-avatar.tsx`, `planetSvg` et `av()` dans `legacy.js`, `DESIGN.md` | Sonnet 5.5, high | Build, `/verifier`, Carte dense testée dans un vrai navigateur |
| E3. Taille = viewers en direct et périodes de la Carte (validé le 26/11 ; sélecteur retiré de la Carte seulement) | `legacy.js` (`liveR`, `renderMap`), `map.tsx`, `menu.tsx`, `DESIGN.md` | Sonnet 5.5, high | Build, `/verifier`, légende relue |

Critère de réussite : on reconnaît la chaîne sans lire son nom à 40 px, et la Carte reste fluide avec toutes les chaînes. Chargement correct depuis `file://`, initiale en repli si la photo manque. **Abandon** : si la photo est illisible sous 20 px, ce format garde la planète peinte ; si la Carte saccade, la photo reste hors de la Carte.

### Coût estimé

4 à 6 sessions au total : 1 Opus (B1), 3 à 4 Sonnet, 1 sous-agent d'une critique de mouvement. Le chantier A passe d'abord (peu cher, visible tout de suite).

### Ce que je propose de ne pas faire

- Ne pas passer la Carte en Three.js maintenant : ta décision d'aujourd'hui fait de Three.js un complément, pas un remplaçant. La question se reposera si l'intro prouve un gain de rendu.
- Ne pas afficher de noms de chaînes ou de chiffres inventés dans l'intro : si aucune donnée réelle n'est disponible à la première visite, l'intro montre la galaxie illustrée.

**Prochaine action** : cadrer le chantier E (E0), et regarder l'onglet Flux avec le bon code (`SUIVI.md` §0).

## Écartées

| Idée | Raison | Décision ou donnée citée |
|---|---|---|

## Bilans de chantier (estimé et réel)

| Chantier | Sessions estimées | Sessions réelles | Modèles | Ce que ça a apporté |
|---|---|---|---|---|
| A · Planète partout | 1 | non relevé | | Planètes dans l'info-bulle et les légendes (#51), puis peintes (#55) |
| B · Intro d'accueil | 3 | non relevé | | Intro de 4 s (#52), gardée comme prototype (26/11) |
| F · Gérer les chaînes suivies | 1 | 1 (avec la réparation 2.0.1) | Sonnet 5.5 | Liste entière, retrait, ajout en bloc, résultats avec viewers et langue (#71) |
| G · Suggestions d'après les raids | 1 à 2 | 1 | Sonnet 5.5 | 96 chaînes proposées sur la base (26/11, 4 jours de raids) ; à juger : combien sont réellement ajoutées. Doublons de raids découverts au passage |
| C · Carte des migrations | 2 à 3 | non relevé | | Passages par jour dans Flux (#53), à juger vers le 8/12 |
| R0 · Raids invisibles | moins d'1 | moins d'1 | Sonnet 5.5, dans la session | Raids de nouveau affichés (2.0.4) ; légendes fausses de Flux corrigées au passage |
| R1 · Audit des calculs | 1 | moins d'1 | Sonnet 5.5, dans la session (Opus prévu) | `CALCULS.md` : heures environ ×3, fenêtres différentes sous « Tout », raids dominant les interactions, trois comptages des migrations |
| R1 corr · Calculs corrigés | 1 à 2 | 1 | Sonnet 5.5, dans la session | Tableau de bord 2.0.5 ; fidélité du chat corrigée ensuite (2.0.6, `schema.sql`) |
