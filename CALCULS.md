# Calculs du tableau de bord

Audit R1 du 27/11/2026 : chaque chiffre, sa formule, sa source, sa limite. Établi par lecture de `app/src/legacy/legacy.js`, `collecteur.mjs`, `schema.sql` et d'une partie de `app/src`, avec des mesures en base (lecture seule) le 27/11. À mettre à jour quand un calcul change.

**Non audité** : rapports PDF et CSV (`export-utils.ts`, `report.ts`, `scripts/rapport-mensuel.mjs`), graphiques d'historique (`history.tsx`), signaux animés de la Carte, mode « Ce navigateur », panneau d'état.

## 1. Problèmes relevés et leur état

Corrigés dans le tableau de bord 2.0.5 (27/11), sauf mention.

| N° | Problème | Mesure du 27/11 | État |
|---|---|---|---|
| 1 | Heures de stream : pauses entre deux lives comprises | 3 463 h contre 1 170 h réelles | ✅ tranches de 2 min en live |
| 2 | Sous un même titre, des jours différents selon la table | actifs depuis le 26/11, messages depuis le 22/11 | ✅ « Tout », 7 et 30 jours bornés au début commun des présences, minutes et relevés |
| 3 | Viewers de raid additionnés aux subs dans « Communautés investies » | 72 % du total sur 24 h | ✅ nouveau classement : part qui écrit chaque minute, puis messages pour 1 000 viewers |
| 4 | Trois comptages des migrations | 5 109 estimés contre 7 141 comptés | ✅ source unique `switches` ; les rollups l'utilisaient déjà |
| 5 | Part « raid » des migrations en nombres | | ✅ plus de nombre, un signe sur le trajet. Les rollups gardent leurs colonnes, non affichées |
| 6 | Quatre définitions de « part en commun » | | ✅ « part des viewers actifs de A vus chez B », A étant la plus petite des deux ; ressemblance pour classer |
| 7 | Fidélité du chat : un partant vers deux chaînes compte deux fois | 26/11 : 5 396 départs comptés, 5 068 partants distincts parmi les actifs | ✅ dans `schema.sql` (2.0.6) ; appliqué en base le 27/11, journées à partir du 26/11 |
| 8 | Recommandations de raid : score relatif, passages après raid compris | | ✅ dit à l'écran, passages affichés |
| 9 | « N h de données » : somme des durées de tous les viewers | trouvé pendant la correction | ✅ retiré |

## 2. Hiérarchie des données

Du plus solide au plus fragile. Un chiffre vaut au mieux ce que vaut sa source la plus fragile.

| Rang | Donnée | Source | Ce qu'elle dit | Limite |
|---|---|---|---|---|
| 1 | Viewers, direct, jeu, titre | API Twitch, un relevé toutes les 2 min (`snaps`) | Audience annoncée par Twitch | Début et fin d'un live à ± 2 min ; rien sans API |
| 1 | Messages | Chat lu en direct (`minutes`) | Volume exact pendant l'écoute | Trous si le collecteur s'arrête ; commandes `!` comprises, bots connus exclus |
| 2 | **Viewers actifs** | Pseudos hachés ayant écrit (`presence`) | Qui participe | Les silencieux sont invisibles ; un message suffit |
| 2 | Subs, bits, raids reçus | Annonces du chat (`events`, `raid_events`) | Faits datés | Seulement chez les chaînes suivies |
| 3 | Viewers en commun, passages | Croisement des empreintes (`presence`, `switches`) | Liens entre chaînes suivies | Rien sur les chaînes non suivies |
| 4 | Esquisses des viewers uniques | `daily_hll` | Uniques sur 7, 30, 90 jours | ± 2,3 % ; aujourd'hui exclu |
| 5 | Types de messages, ambiance | Règles de mots (`words`, `minutes.k`) | Indication | Classement automatique, non vérifié sur échantillon |
| 5 | Part due aux raids, scores | Déduction | Ordre de grandeur | Voir n° 5 et 8 |

**Conservation observée en base le 27/11** : présences 2 jours, relevés et événements environ 3 jours, minutes environ 5,5 jours ; rollups depuis le 23/11 (jamais purgés).

**Vocabulaire à tenir partout** : « viewers » = nombre annoncé par Twitch ; « viewers actifs » = personnes qui ont écrit. Ne jamais les additionner ni les diviser sans le dire.

## 3. Dictionnaire

Verdict : ✅ juste ; ⚠️ juste mais à libeller mieux ; ❌ faux.

**Chaînes comptées** (2.0.9) : tout ce qui est calculé depuis le détail gardé (tous les onglets, rapport exporté) ne porte que sur les chaînes suivies et affichées (filtre de langue compris). La base garde quelques jours les données d'une chaîne retirée : elles ne comptent plus. La journée en cours de « Jour par jour » porte sur les chaînes suivies, sans le filtre de langue ; ses journées passées (rollups) gardent les chaînes suivies ces jours-là.

### Vue d'ensemble
| Chiffre | Formule | Source | Verdict |
|---|---|---|---|
| Viewers actifs uniques | empreintes distinctes, chaînes suivies et affichées | `presence` | ✅ (voir n° 2) |
| Messages | somme des messages par minute | `minutes` | ✅ même fenêtre que les actifs |
| Actifs dans 2 chats ou plus | empreintes vues sur au moins 2 chaînes | `presence` | ✅ « chaînes suivies » à dire |
| Abonnements et subs offerts | somme | `events` | ✅ |
| Paires les plus proches | communs ÷ la plus petite ; classées par communs ÷ réunion ; 25 chaînes les plus actives, 10 communs au moins | `presence` | ✅ pas toutes les chaînes, c'est dit |
| Trajets les plus fréquents | personnes distinctes par trajet ; délai médian estimé | `switches`, `presence` | ✅ |
| Les chaînes : viewers max | plus haut relevé en live sur la période (2.0.8) | `snaps` | ✅ un relevé toutes les 2 min environ ; borné par la conservation des relevés |
| Bandeau des raids | 15 derniers raids reçus par les chaînes suivies sur la période ; aucun aujourd'hui : les derniers gardés (2.0.8) | `raid_events` | ✅ chaînes suivies seulement |
| Les chaînes : part qui écrit | actifs depuis le début du live ÷ viewers moyens du live | `presence`, `snaps` | ✅ |
| Participation : « écrivent chaque minute » | auteurs par minute ÷ viewers moyens | `minutes`, `snaps` | ✅ pendant les lives seulement |
| Participation : « actifs ÷ viewers » | actifs de la période ÷ viewers moyens | `presence`, `snaps` | ⚠️ peut dépasser 100 % sur plusieurs jours |
| Viewers totaux (Top) | somme des moyennes par chaîne | `snaps` | ⚠️ ni simultané ni unique ; à retirer |
| Heures, heures cumulées | tranches de 2 min en live | `snaps` | ✅ |
| Croissance des followers | dernier contre premier, 20 h d'écart au moins | `chan_meta` | ✅ |
| Communautés investies | part qui écrit chaque minute, puis messages pour 1 000 viewers ; au moins 10 min de live et 50 viewers en moyenne | `minutes`, `snaps` | ✅ |
| Subs pour 1 000 viewers | subs de la période ÷ viewers moyens | `events`, `snaps` | ⚠️ grandit avec la durée de la période |
| Rythme des chaînes | actifs par jour, 7 derniers jours contre les précédents ; écart de 15 % et hors variations | rollups | ✅ à partir de 14 journées |
| Réseau : viewers actifs par jour (`actives` de `network_history`) | pseudos hachés distincts ayant écrit chez au moins une chaîne suivie ce jour-là (heure de Paris), estimés par HyperLogLog | esquisse `daily_hll`, ligne `*` | ✅ ± 2,3 % (1 écart type) ; vide sans esquisse ; aujourd'hui absent ; les jours ne s'additionnent pas ; silencieux invisibles. Le total « ≈ N uniques » sous « Jour par jour » réunit les dernières journées terminées (`period_reach`) |
| Réseau : pic de viewers simultanés par jour (`peak`, `peakAt`) | somme des viewers de toutes les chaînes en live à chaque passage de relevés (même horodatage), puis plus grand total du jour et son heure (le premier si égalité) | `snaps` → `daily_network_rollup`, jamais purgé | ✅ voir les limites ci-dessous |
| Activité : pic de viewers simultanés | même somme par passage (une chaîne comptée une fois par `t`), puis maximum sur la période ; « Aujourd'hui » : depuis minuit à Paris | `snaps` | ✅ un minimum s'il manque des relevés |
| Activité : chaînes passées en live | chaînes affichées avec au moins un relevé en live sur la période | `snaps` | ✅ |
| Activité : couverture et trous | « partielle » si le début commun dépasse le début demandé de plus de 30 min (jamais sur « Tout ») ; trou d'écoute signalé au-delà de 15 min cumulées | `snaps`, `minutes`, `presence`, écoute | ⚠️ une panne de l'API seule n'est pas détectée |
| Jour par jour : aujourd'hui (chaînes suivies, sans période ni filtre de langue) | actifs = empreintes distinctes ; messages = somme des minutes ; chaînes = celles qui ont des messages ; pic depuis minuit | `presence`, `minutes`, `snaps` | ✅ exact, journée incomplète |
| Jeux du moment | somme des viewers en direct des chaînes suivies par jeu ; « Écrivent » : empreintes distinctes dont le dernier message sur ces chaînes a moins de 10 min | direct, `presence` | ✅ chaînes suivies, pas l'audience du jeu sur Twitch |
| Streamers montants | gain = v − v30 ; classement par part = gain ÷ v30 ; v : dernier relevé, à l'heure T ; v30 : relevé du même live le plus proche de T − 30 min (± 4 min) ; live d'au moins 30 min, v30 ≥ 100, gain > 0 ; msg/min = messages des 5 dernières minutes ÷ 5 ; raid signalé s'il est reçu entre T − 30 min et maintenant | `snaps`, `minutes`, `events` | ✅ un raid fait monter d'un coup |
| « En ce moment » : direct refusé | pas d'API ; collecteur hors ligne ou écoute arrêtée ; API en erreur ; dernier relevé de plus de 6 min alors que des chaînes sont en live | état du collecteur, `snaps` | ✅ un vieux relevé n'est pas montré comme le direct |

**Limites du pic réseau** (calcul ajouté le 27/11, `build_daily_network_peak`) :
- un relevé toutes les 2 min environ : un pic plus bref passe entre deux ;
- ce sont des places de spectateur, pas des personnes : quelqu'un qui regarde deux lives compte deux fois ;
- chaînes suivies au moment du relevé : ajouter ou retirer des chaînes rend les jours moins comparables ;
- collecteur ou API arrêtés une partie du jour : le pic est celui des heures relevées, donc un minimum ;
- calculé la nuit pour la veille, seulement si les relevés du jour sont encore tous en base : vide avec `joursReleves` = 1, pour la première journée de collecte, et après une coupure assez longue pour qu'il ne reste aucun relevé d'avant le jour ;
- à l'exécution de `schema.sql`, seules les journées encore entières dans les relevés sont rattrapées. Une valeur enregistrée ne peut que monter (relevés arrivés en retard), jamais baisser.

### Audiences
La page ne porte que sur les chaînes suivies et affichées (voir « Chaînes comptées »), comme le rapport PDF et CSV : « 2 chaînes ou plus » y est le même nombre que « Actifs dans 2 chats ou plus » de la Vue d'ensemble.

| Chiffre | Formule | Verdict |
|---|---|---|
| Chiffre en tête, répartition 1 / 2 / 3 chaînes ou plus | empreintes présentes sur 1 chaîne ÷ empreintes ; sans le filtre de viewers | ✅ voir ci-dessous |
| « N'ont écrit qu'un seul message » | empreintes dont la somme de `presence.n` sur la période vaut 1 ÷ total | ✅ |
| « Au moins 3 messages » | (somme ≥ 3 et 1 chaîne) ÷ (somme ≥ 3) | ✅ |
| Paires les plus proches | les 7 plus fortes en communs ÷ réunion (communs > 0), puis rangées sur le pourcentage affiché : communs ÷ actifs de la plus petite | ✅ |
| Matrice | communs ÷ actifs de la ligne ; les 7 chaînes les plus actives après le filtre | ✅ pas toutes les chaînes |
| Ont changé de stream, changent souvent (3 fois ou plus) | compte du collecteur (`switches`) | ✅ |
| Chaîne par chaîne | chaînes avec un trajet ou au moins 20 actifs ; part = actifs avec 1 changement ou plus ÷ actifs (« — » sous 20) ; arrivées et départs = personnes distinctes par trajet, additionnées ; solde = arrivées − départs | ✅ quelqu'un sur deux trajets compte deux fois |
| Carte des migrations : journées passées | rollup (`flows_by_day`) : viewers distincts du jour par trajet ; aujourd'hui exclu | ✅ les jours ne s'additionnent pas |
| Carte des migrations : aujourd'hui | `flowsOf` sur les présences et `switches` du jour (Paris), 12 plus gros trajets ; délai médian estimé par les présences ; « raid » si un raid A vers B ce jour | ✅ journée incomplète |
| Carte des migrations : points sur un arc | max(1, arrondi(5 × n ÷ plus gros trajet de toutes les journées)) | ✅ dit à l'écran : ce ne sont pas des personnes |
| Raids reçus, viewers apportés | table des raids, doublons écartés | ✅ chaînes suivies seulement |

**Part « sur une seule chaîne »** : en base le 27/11, 95,4 % des viewers actifs n'avaient écrit que chez une chaîne suivie. Mais 38 % n'avaient écrit qu'un seul message, et ne pouvaient donc pas être sur deux chaînes. Parmi ceux qui avaient écrit au moins 3 messages : 91 %. La page montre les trois.

### Par chaîne, Par jeu, Chat, Carte
| Chiffre | Formule | Verdict |
|---|---|---|
| Viewers max, moyenne | relevés en live de la période ; le max est mis en avant (2.0.8). Sur « Aujourd’hui », remplacés par « Live du jour » (2.0.10) | ✅ |
| Messages par minute en moyenne | messages ÷ minutes avec au moins un message | ⚠️ le dire, ou ne prendre que les minutes de live |
| Viewers actifs fidèles | vus 2 jours ou plus ; sur « Aujourd'hui », calculé sur tout le détail gardé, et c'est écrit (2.0.8) | ⚠️ presque vide avec 2 jours de présences |
| Messages du top 10 % | part des 10 % les plus bavards | ✅ |
| Jeux streamés | tranches de 2 min ; sur « Aujourd’hui », les jeux sont dans « Live du jour » | ✅ |
| Avant et après un changement de jeu | 20 min de chaque côté | ⚠️ messages divisés par 20 même si le live vient de commencer |
| Son univers | uniques sur 30 jours (esquisses) | ✅ |
| Historique « Où vont », « D'où viennent » | somme des passages des rollups | ⚠️ des passages, pas des personnes : c'est dit à l'écran |
| Fidélité du chat | 100 × (1 − partants distincts ÷ actifs), 200 actifs au moins ; journées anciennes : somme des trajets | ✅ n° 7 ; un départ après un raid compte aussi |
| Recommandations de raid | personnes A→B × (1 + retour ÷ actifs de A), relatif à la première | ✅ dit à l'écran |
| Par jeu : viewers moyens | moyenne par chaîne et par relevé | ⚠️ pas l'audience de la catégorie |
| Types de messages, ambiance | règles, tranches de 10 min | ⚠️ précision non mesurée |
| Moments à clipper | au moins 2,5 fois la médiane des 20 min d'avant, 10 messages au moins | ✅ |
| Net Reach, cannibalisation (Rosters) | réunion ; 1 − réunion ÷ somme | ✅ |
| Comparaison : viewers moyens | moyenne des moyennes quotidiennes | ⚠️ un jour court pèse autant qu'un long |
| Carte : taille | viewers en direct (nombre annoncé par Twitch, relu toutes les 10 s) ; rayon = racine, par rapport à la chaîne la plus regardée de la carte ; hors ligne : taille fixe (2.0.7) | ✅ rafraîchi au rythme des relevés du collecteur (2 min) |
| Carte : liens, groupes, étoile, passages | viewers actifs de tout le détail gardé, depuis le début commun (sans période) ; liens choisis par ressemblance, épaisseur = communs ÷ la plus petite (2.0.7) | ⚠️ la profondeur dépend de la rétention de `config.json` |

### Live du jour (Par chaîne, 2.0.10)

Calculé sur tous les relevés gardés dans le navigateur (`snaps`, un toutes les 2 min environ), jamais sur la période choisie. Le code (`liveRuns` dans `legacy.js`) et la fonction SQL `build_lives` (historique) suivent la même définition : les changer ensemble.

| Chiffre | Formule | Verdict |
|---|---|---|
| Un live | relevés `live=1` consécutifs d’une chaîne ; coupé par un relevé `live=0` ou un trou de plus de 10 min | ⚠️ une coupure Twitch de quelques minutes fait deux lives ; un trou du collecteur aussi |
| Début | premier relevé en live. **Observé** seulement si le relevé précédent n’est pas en live et que le collecteur tournait juste avant : chat de la chaîne écouté sans interruption depuis 10 min (`ecoute`), ou relevé précédent hors ligne et un relevé (n’importe quelle chaîne) de moins de 10 min. Sinon « Premier relevé » | ✅ à environ 2 min ; 10 au pire après un raté |
| Fin | dernier relevé en live. **Observée** si un relevé `live=0` suit à 10 min près ; « En direct » si le dernier relevé a moins de 10 min ; sinon « fin non observée » | ✅ |
| Durée | fin − début ; « au moins » si l’un des deux n’est pas observé | ✅ |
| Viewers max, heure | plus haut relevé du live ; premier passage à ce nombre | ✅ un pic entre deux relevés échappe |
| Viewers moyens | moyenne de tous les relevés du live | ✅ |
| Minimum | plus bas relevé à partir de début + 10 min (le live se remplit) ; « — » avant | ⚠️ début non observé : les 10 premières minutes relevées sont écartées |
| Jeux, heures | tranches de 2 min par jeu, dans l’ordre du live | ✅ pas de durée dans l’historique |
| Total de plusieurs lives | maximum et moyenne de tous leurs relevés | ✅ |
| Lives précédents | fonction SQL `channel_lives`, 30 jours ; ceux qui chevauchent un live déjà affiché ne sont pas répétés | ⚠️ calculés chaque nuit ; rien avant la création de la table hormis les relevés alors en base |

Limites : le début observé peut être faux si l’API Twitch était en panne alors que le chat était écouté. « Twitch annonce … » est l’heure de début donnée par Twitch pour le live en cours, à titre de repère. Un live plus long que la conservation des relevés (`joursReleves`) perd son début dans le bloc du jour.

## 4. Décisions prises le 27/11

1. **Communautés les plus impliquées** : part des viewers qui écrivent chaque minute, puis messages pour 1 000 viewers ; subs à part ; raids hors du classement.
2. **Part en commun** : « part des viewers actifs de A vus chez B » partout.
3. **Part due aux raids** : pas de chiffre, un signe sur le trajet.
