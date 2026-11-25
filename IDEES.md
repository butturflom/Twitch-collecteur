# Boîte à idées

Dépose ici tes idées en vrac, sans te censurer : une ligne chacune. Le skill `/contremaitre` les range, les évalue (plus-value sur 25, coût S, M ou L, verdict) et en tire un plan. Barème et règles : `.claude/skills/contremaitre/SKILL.md`. Décisions déjà prises : `SUIVI.md` §4, §5 et §11.

## En vrac

- 2026-11-25 · « Pour la landing page, entrer avec une animation de la carte : une galaxie des streamers en live, comme les premières secondes d'un jeu vidéo, jusqu'au titre du film. À la fin, le nom de l'application apparaît avec un effet adapté au style et à l'ambiance du site. » → (Intro animée de la page d'accueil : galaxie des chaînes en direct, puis révélation du titre.)
- 2026-11-25 · « Pour la Vue d'ensemble et toutes les statistiques et analyses, les icônes des streamers sont toujours représentées par leur planète. » (avec le texte collé : fond spatial, cartes console, avatars en planètes, Recoupements cosmiques) → (Planète partout, y compris les petits formats et les avatars encore dessinés par `legacy.js`. Le reste du texte collé est déjà livré, voir ci-dessous.)
- 2026-11-25 · Décision sur les outils 3D : Three.js complémentaire (pas un remplaçant de la Carte), autorisé à modifier le code ; ses conseils, ceux de Spline et des derniers skills comptent comme des évaluations légitimes. → (Rangée dans `SUIVI.md` §16 et dans le skill, §3.)
- 2026-11-25 · « Pour la partie flux, construire l'onglet comme une map de flux qui représente les migrations des viewers actifs. » → (Carte animée des passages de viewers entre chaînes, jour par jour, à côté du Sankey existant.)

## Évaluées

| Idée | Valeur | Cohérence | Faisabilité | Risque | Plus-value /25 | Coût | Verdict | Raison |
|---|---|---|---|---|---|---|---|---|
| Intro animée de la page d'accueil (galaxie en direct puis titre) | 3 : première impression pour la prospection de fin décembre, mais n'ajoute aucune analyse | 4 : lisible avant spectaculaire (`PRODUCT.md` principe 2) si l'intro se passe d'un clic, ne joue qu'une fois et respecte `prefers-reduced-motion` ; « en live » exige de vraies données, sinon on retombe sur l'illustration actuelle, sans nom ni chiffre inventé | 4 : la page d'accueil est une surface neuve posée par-dessus, Three.js y est autorisé ; poids dans le HTML unique à mesurer | 4 : ne touche ni `schema.sql` ni le moteur de la Carte ; le seul risque est le poids et la fluidité | **18** | M (2 à 3 sessions) | **Faire** | Bonne plus-value pour un coût moyen. Première étape = un prototype isolé avec critère go/no-go écrit (plan ci-dessous). |
| Carte des migrations de viewers actifs (onglet Flux, animée) | 4 : répond à « où vont les viewers » par jour, un axe que le Sankey de période ne montre pas ; sert raids et agences | 4 : honnête si libellée « viewers actifs qui écrivent, jour par jour » ; ne change aucune décision de données | 3 : `daily_switches_rollup` existe et n'est jamais purgé, mais il faut une fonction SQL par jour et 14 journées (vers le 8/12) pour que la lecture temporelle vaille quelque chose | 4 : fonction SQL additive et rejouable, composant neuf ; ne touche ni la Carte ni `legacy.js` si on ne réutilise pas son moteur | **19** | M (2 à 3 sessions) | **Planifier à une date (8/12)** | Précision : la rétention des passages bruts est d'un jour, donc l'animation avance par journée, pas en temps réel. Un prototype isolé peut démarrer avant, sur les données actuelles, pour juger la lisibilité. |
| Planète partout (petits formats et avatars de `legacy.js`) | 2 : cohérence visuelle voulue, ne change aucune décision | 5 : prolonge `DESIGN.md` et la règle des deux niveaux de lueur | 5 : `ChannelAvatar` fait déjà la planète dès 20 px et couvre 17 composants | 4 : touche `legacy.js` (3 appels de `av()`) et `legacy.css`, sans toucher au moteur de la Carte | **18** | S (1 session) | **Faire** | Il reste très peu à faire (voir « Ce qui est déjà livré »). |

### Ce qui est déjà livré du texte collé (PR #43 et #44)

1. Fond spatial, étoiles discrètes : fait, ciel étoilé sur toutes les pages sauf la Carte (`SKY_TABS`).
2. Cartes « console spatiale » : fait.
3. Avatars en planètes : fait pour les 17 composants React via `app/src/components/channel-avatar.tsx` (atmosphère et relief dès 20 px).
4. Recoupements cosmiques : fait (constellation des recoupements).
5. Densité conservée : oui.

**Ce qui n'est pas planète aujourd'hui** :
- `av()` dans `app/src/legacy/legacy.js:57`, appelée ligne 444 (légende des graphiques), ligne 1459 (info-bulle de la Carte, taille `md`) et ligne 1462 (lignes de l'info-bulle). Rendu en CSS plat (`legacy.css:126-136`).
- Les pastilles de moins de 20 px de `ChannelAvatar` (légende de `line-chart.tsx`, menu de la Carte) : sans relief ni halo par choix de lisibilité. Ce choix peut rester, avec un relief léger sans halo.

## Plan en cours

Proposé le 2026-11-25, pas lancé. **Un chantier = une session** (`/clear` entre deux). Rien ne se fusionne ni ne se déploie sans ta demande.

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
| B2. Prototype isolé (`?intro`, page à part, mode démo, sans toucher à la vraie page d'accueil), moteur Three.js via les skills `three-js` et `react-three-fiber`. Option : maquette de la scène dans Spline | Session | Sonnet 5.5, high | Prototype et mesures |
| B3. Décision go/no-go sur mesures, puis branchement sur `landing.tsx` (galaxie des chaînes en direct si des données existent, sinon l'illustration de `landing-map.tsx`) | Session | Sonnet 5.5, medium | Intro intégrée |
| B4. Contrôle du mouvement | Sous-agent `impeccable-motion-reviewer`, une seule fois | par défaut | Liste de corrections |

**Critères go/no-go de B2** (à confirmer par toi) : poids ajouté au HTML unique mesuré et écrit (ordre de grandeur à tenir : quelques centaines de Ko, Three.js allégé par import ciblé) ; 60 images par seconde sur ton PC ; chargement correct depuis `file://` ; intro passable en un clic ou à la touche Échap ; une seule lecture par navigateur (`to2-landing-seen`). **Abandon** : poids ou fluidité hors critère, on garde une animation en SVG et CSS (variante S, sans Three.js).

**Spline** : sert à maquetter la scène. Elle n'entre dans la version livrée que si le chargement sans service externe depuis `file://` est démontré à B2 ; c'est un critère de réussite, pas un doute sur ses conseils.

### Chantier C · Carte des migrations (onglet Flux, M, 2 à 3 sessions, dès le 8/12)

| Tâche | Fichiers | Modèle, effort | Vérification |
|---|---|---|---|
| C0. Prototype isolé sur les journées déjà agrégées (mode démo, sans SQL) : disposition des chaînes du Sankey, arcs animés par journée, curseur de date. Mesure la lisibilité avec 2 à 3 journées puis 14 | `app/src/components/flows/` (page de démo seulement) | Opus 5.5, high (c'est une décision de lisibilité) | Capture Playwright sur `npm run dev` |
| C1. Fonction SQL additive `flows_by_day(code, d0, d1)` : passages par jour et par paire, top N, avec part organique et raid. Dans `schema.sql`, rejouable (`create or replace`), derrière `board_ok()` comme les autres | `schema.sql`, `app/src/legacy/legacy.js` (appel RPC, événement `legacy:flows` enrichi) | Sonnet 5.5, high | Test sur la base dans une transaction annulée, avec le bon code et un mauvais code (0 ligne) |
| C2. Composant React « carte des migrations » avec curseur de date, à côté du Sankey (le Sankey reste pour la période) | `app/src/components/flows/flows-map.tsx`, `flows.tsx` | Sonnet 5.5, high | `npm run build`, Playwright `?demo=flows` |

Critère de fin : la carte se lit sans survol sur 14 journées, chaque arc donne son nombre de viewers uniques et la part organique, et le libellé dit « viewers actifs qui écrivent, par jour ». **Abandon** : si, sur 14 journées, la carte ne dit rien de plus que le Sankey, on ne la livre pas et on garde le Sankey.

### Coût estimé

4 à 6 sessions au total : 1 Opus (B1), 3 à 4 Sonnet, 1 sous-agent d'une critique de mouvement. Le chantier A passe d'abord (peu cher, visible tout de suite).

### Ce que je propose de ne pas faire

- Ne pas passer la Carte en Three.js maintenant : ta décision d'aujourd'hui fait de Three.js un complément, pas un remplaçant. La question se reposera si l'intro prouve un gain de rendu.
- Ne pas afficher de noms de chaînes ou de chiffres inventés dans l'intro : si aucune donnée réelle n'est disponible à la première visite, l'intro montre la galaxie illustrée.

**Première action** : dire « lance le chantier A ». Pour B, valider d'abord les critères go/no-go ci-dessus.

## Écartées

| Idée | Raison | Décision ou donnée citée |
|---|---|---|

## Bilans de chantier (estimé et réel)

| Chantier | Sessions estimées | Sessions réelles | Modèles | Ce que ça a apporté |
|---|---|---|---|---|
| A · Planète partout | 1 | | | |
| B · Intro d'accueil | 3 | | | |
