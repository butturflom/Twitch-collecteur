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
| 7 | Fidélité du chat : un partant vers deux chaînes compte deux fois | 26/11 : 5 396 départs comptés, 5 068 partants distincts parmi les actifs | ✅ dans `schema.sql` (2.0.6) ; effectif une fois rejoué en base, pour les journées agrégées ensuite |
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

### Vue d'ensemble
| Chiffre | Formule | Source | Verdict |
|---|---|---|---|
| Viewers actifs uniques | empreintes distinctes, toutes chaînes | `presence` | ✅ (voir n° 2) |
| Messages | somme des messages par minute | `minutes` | ✅ même fenêtre que les actifs |
| Actifs dans 2 chats ou plus | empreintes vues sur au moins 2 chaînes | `presence` | ✅ « chaînes suivies » à dire |
| Abonnements et subs offerts | somme | `events` | ✅ |
| Paires les plus proches | communs ÷ la plus petite ; classées par communs ÷ réunion ; 25 chaînes les plus actives, 10 communs au moins | `presence` | ✅ pas toutes les chaînes, c'est dit |
| Trajets les plus fréquents | personnes distinctes par trajet ; délai médian estimé | `switches`, `presence` | ✅ |
| Les chaînes : part qui écrit | actifs depuis le début du live ÷ viewers moyens du live | `presence`, `snaps` | ✅ |
| Participation : « écrivent chaque minute » | auteurs par minute ÷ viewers moyens | `minutes`, `snaps` | ✅ pendant les lives seulement |
| Participation : « actifs ÷ viewers » | actifs de la période ÷ viewers moyens | `presence`, `snaps` | ⚠️ peut dépasser 100 % sur plusieurs jours |
| Viewers totaux (Top) | somme des moyennes par chaîne | `snaps` | ⚠️ ni simultané ni unique ; à retirer |
| Heures, heures cumulées | tranches de 2 min en live | `snaps` | ✅ |
| Croissance des followers | dernier contre premier, 20 h d'écart au moins | `chan_meta` | ✅ |
| Communautés investies | part qui écrit chaque minute, puis messages pour 1 000 viewers ; au moins 10 min de live et 50 viewers en moyenne | `minutes`, `snaps` | ✅ |
| Subs pour 1 000 viewers | subs de la période ÷ viewers moyens | `events`, `snaps` | ⚠️ grandit avec la durée de la période |
| Rythme des chaînes | actifs par jour, 7 derniers jours contre les précédents ; écart de 15 % et hors variations | rollups | ✅ à partir de 14 journées |
| Historique du réseau : audience | somme des moyennes des chaînes du jour | rollups | ⚠️ chaînes en live à des heures différentes |

### Chevauchement et Flux
| Chiffre | Formule | Verdict |
|---|---|---|
| Sur combien de chaînes écrivent les gens (« 96 % ») | chaînes distinctes par empreinte | ✅ voir ci-dessous |
| Matrice | communs ÷ actifs de la ligne | ✅ |
| Changent de stream, souvent (3 fois ou plus) | compte du collecteur (`switches`) | ✅ |
| Migrations, bilan par chaîne | personnes distinctes, une fois par trajet | ✅ |
| Raids reçus, viewers apportés | table des raids, doublons écartés | ✅ chaînes suivies seulement |
| Carte des migrations (par jour) | rollup : viewers distincts du jour | ✅ |
| Historique « Où vont », « D'où viennent » | somme des passages des rollups | ⚠️ des passages, pas des personnes : c'est dit à l'écran |

**Le 96 %** : en base le 27/11, 95,4 % des viewers actifs n'ont écrit que chez une chaîne suivie. Mais 38 % n'ont écrit qu'un seul message, et ne pouvaient donc pas être sur deux chaînes. Parmi ceux qui ont écrit au moins 3 messages : 91 %. Libellé conseillé : « 9 viewers actifs sur 10 n'écrivent que chez une seule de tes chaînes ».

### Par chaîne, Par jeu, Chat, Carte
| Chiffre | Formule | Verdict |
|---|---|---|
| Viewers en moyenne, pic | relevés en live | ✅ |
| Messages par minute en moyenne | messages ÷ minutes avec au moins un message | ⚠️ le dire, ou ne prendre que les minutes de live |
| Viewers actifs fidèles | vus 2 jours ou plus | ⚠️ presque vide avec 2 jours de présences |
| Messages du top 10 % | part des 10 % les plus bavards | ✅ |
| Jeux streamés | tranches de 2 min | ✅ |
| Avant et après un changement de jeu | 20 min de chaque côté | ⚠️ messages divisés par 20 même si le live vient de commencer |
| Son univers | uniques sur 30 jours (esquisses) | ✅ |
| Fidélité du chat | 100 × (1 − partants distincts ÷ actifs), 200 actifs au moins ; journées anciennes : somme des trajets | ✅ n° 7 ; un départ après un raid compte aussi |
| Recommandations de raid | personnes A→B × (1 + retour ÷ actifs de A), relatif à la première | ✅ dit à l'écran |
| Par jeu : viewers moyens | moyenne par chaîne et par relevé | ⚠️ pas l'audience de la catégorie |
| Types de messages, ambiance | règles, tranches de 10 min | ⚠️ précision non mesurée |
| Moments à clipper | au moins 2,5 fois la médiane des 20 min d'avant, 10 messages au moins | ✅ |
| Net Reach, cannibalisation (Rosters) | réunion ; 1 − réunion ÷ somme | ✅ |
| Comparaison : viewers moyens | moyenne des moyennes quotidiennes | ⚠️ un jour court pèse autant qu'un long |
| Carte : taille, liens | actifs de la période ; liens choisis par ressemblance, épaisseur = communs ÷ la plus petite | ✅ passe au direct avec le chantier « Carte en direct » |

## 4. Décisions prises le 27/11

1. **Communautés les plus impliquées** : part des viewers qui écrivent chaque minute, puis messages pour 1 000 viewers ; subs à part ; raids hors du classement.
2. **Part en commun** : « part des viewers actifs de A vus chez B » partout.
3. **Part due aux raids** : pas de chiffre, un signe sur le trajet.
