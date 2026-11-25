# Boîte à idées

Dépose ici tes idées en vrac, sans te censurer : une ligne chacune. Le skill `/contremaitre` les range, les évalue (plus-value sur 25, coût S, M ou L, verdict) et en tire un plan. Barème et règles : `.claude/skills/contremaitre/SKILL.md`. Décisions déjà prises : `SUIVI.md` §4, §5 et §11.

## En vrac

- 2026-11-25 · « Pour la landing page, entrer avec une animation de la carte : une galaxie des streamers en live, comme les premières secondes d'un jeu vidéo, jusqu'au titre du film. À la fin, le nom de l'application apparaît avec un effet adapté au style et à l'ambiance du site. » → (Intro animée de la page d'accueil : galaxie des chaînes en direct, puis révélation du titre.)
- 2026-11-25 · « Pour la Vue d'ensemble et toutes les statistiques et analyses, les icônes des streamers sont toujours représentées par leur planète. » (avec le texte collé : fond spatial, cartes console, avatars en planètes, Recoupements cosmiques) → (Planète partout, y compris les petits formats et les avatars encore dessinés par `legacy.js`. Le reste du texte collé est déjà livré, voir ci-dessous.)
- 2026-11-25 · Décision sur les outils 3D : Three.js complémentaire (pas un remplaçant de la Carte), autorisé à modifier le code ; ses conseils, ceux de Spline et des derniers skills comptent comme des évaluations légitimes. → (Rangée dans `SUIVI.md` §16 et dans le skill, §3.)
- 2026-11-25 · « Pour la partie flux, construire l'onglet comme une map de flux qui représente les migrations des viewers actifs. » → (Carte animée des passages de viewers entre chaînes, jour par jour, à côté du Sankey existant.)
- 2026-11-25 · « Je voyais la map comme un réseau de tuyaux ou de conduits qui représente les déplacements d'un point A à B, ou C, ou plus encore, avec les planètes des streamers. » → (Variante du chantier C : trajets à plusieurs sauts, dessinés en tuyaux, nœuds = planètes.)
- 2026-11-25 · « Plus tard, l'application sera à télécharger ou consultable sur un site. Après la création d'un contrat, je donne accès à un compte que je prédéfinis avec le client ID et le secret. Le collecteur tourne 24 h/24 en ligne, et la base Supabase reste identique. » → (Hébergement du collecteur et du tableau de bord, comptes par client. Reprend la Client View abandonnée le 24/11 et l'étape 3 du §12.)

## Évaluées

| Idée | Valeur | Cohérence | Faisabilité | Risque | Plus-value /25 | Coût | Verdict | Raison |
|---|---|---|---|---|---|---|---|---|
| Intro animée de la page d'accueil (galaxie en direct puis titre) | 3 : première impression pour la prospection de fin décembre, mais n'ajoute aucune analyse | 4 : lisible avant spectaculaire (`PRODUCT.md` principe 2) si l'intro se passe d'un clic, ne joue qu'une fois et respecte `prefers-reduced-motion` ; « en live » exige de vraies données, sinon on retombe sur l'illustration actuelle, sans nom ni chiffre inventé | 4 : la page d'accueil est une surface neuve posée par-dessus, Three.js y est autorisé ; poids dans le HTML unique à mesurer | 4 : ne touche ni `schema.sql` ni le moteur de la Carte ; le seul risque est le poids et la fluidité | **18** | M (2 à 3 sessions) | **Faire** | Bonne plus-value pour un coût moyen. Première étape = un prototype isolé avec critère go/no-go écrit (plan ci-dessous). |
| Carte des migrations de viewers actifs (onglet Flux, animée) | 4 : répond à « où vont les viewers » par jour, un axe que le Sankey de période ne montre pas ; sert raids et agences | 4 : honnête si libellée « viewers actifs qui écrivent, jour par jour » ; ne change aucune décision de données | 3 : `daily_switches_rollup` existe et n'est jamais purgé, mais il faut une fonction SQL par jour et 14 journées (vers le 8/12) pour que la lecture temporelle vaille quelque chose | 4 : fonction SQL additive et rejouable, composant neuf ; ne touche ni la Carte ni `legacy.js` si on ne réutilise pas son moteur | **19** | M (2 à 3 sessions) | **Planifier à une date (8/12)** | Précision : la rétention des passages bruts est d'un jour, donc l'animation avance par journée, pas en temps réel. Un prototype isolé peut démarrer avant, sur les données actuelles, pour juger la lisibilité. |
| Réseau de tuyaux des déplacements A→B→C, nœuds en planètes (variante du chantier C) | 5 : les trajets à plusieurs sauts montrent où les viewers vont après un passage, donc où un raid ou une collab a le plus de chances de marcher | 2 : `DESIGN.md` réserve l'atmosphère à la Carte (l. 321) ; les tuyaux lumineux risquent d'être du spectacle qui cache la donnée (`PRODUCT.md` principe 2). À réconcilier avec la règle du ciel étoilé posée par #43 et #44 | 2 : `daily_switches_rollup` donne des paires par jour, pas le parcours d'un viewer. Un trajet A→B→C exige un calcul quotidien sur les passages bruts, qui ne sont gardés qu'un jour : nouvelle étape de la tâche de nuit, à valider contre les délais de purge | 3 : une tâche de nuit de plus touche le pipeline des rollups, déjà source d'incidents (57014, 21000) | **17** | L (plusieurs sessions, une décision de design et une tâche de nuit) | **Prototype d'abord** | Le prototype n'a pas besoin de la nouvelle tâche : il part des paires par jour déjà agrégées (2 à 3 journées aujourd'hui). Critère de réussite : sans survol, on lit les 5 trajets les plus forts et leur sens ; sinon, on garde la carte à plat du chantier C. |
| Application en ligne 24 h/24, comptes clients après contrat (reprend la Client View et l'étape 3 du §12) | 5 : supprime la dépendance au PC et l'installation pour un non-technicien (§12 bis, point 3), ce qui ouvre agences et petits streamers | 2 : remet en cause la Client View abandonnée le 24/11 et renvoie le multi-utilisateur à une demande réelle (§12, étape 3) ; le VPS a été mis de côté (§5) | 2 : hébergement permanent, authentification, isolation des données par client, sauvegardes, et une base Supabase gratuite de 500 Mo qui ne tient pas plusieurs clients (§12) | 1 : le client secret Twitch ne doit jamais sortir du serveur ; `board_ok()` ne suffit pas comme droit par utilisateur ; données personnelles à cadrer (RGPD, `CONFORMITE.md`) et conditions Twitch à relire | **16** | L (plusieurs mois de travail, avec juriste) | **Planifier à une date** : après le premier contrat signé, pas avant janvier | Voir « Chantier D » ci-dessous. Ne pas remettre le secret au client : il reste chez l'opérateur, seul l'accès au tableau de bord est donné. |
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
| B2. Prototype isolé (`?intro`, page à part, mode démo, sans toucher à la vraie page d'accueil), moteur Three.js via les skills `three-js` et `react-three-fiber`. Option : maquette de la scène dans Spline | Session | Sonnet 5.5, high | Prototype et mesures. **GO** (fluidité 60 i/s confirmée sur le PC de l'utilisateur, 25/11) : +141 Ko compressés, `file://` OK |
| B3. Décision go/no-go sur mesures, puis branchement sur `landing.tsx` (galaxie des chaînes en direct si des données existent, sinon l'illustration de `landing-map.tsx`) | Session | Sonnet 5.5, medium | Intro intégrée. **Fait, en attente de validation** (25/11) : `app/src/components/intro/intro.tsx` ; `?intro` et `intro-proto.tsx` retirés |
| B4. Contrôle du mouvement | Sous-agent `impeccable-motion-reviewer`, une seule fois | par défaut | Liste de corrections |

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

**Variante tuyaux (25/11)** : si le prototype C0 réussit en tuyaux, les trajets A→B→C deviennent une étape C3, après C2 : une tâche de nuit (Sonnet high, `schema.sql` rejouable, testée en transaction annulée) qui calcule, à partir des passages bruts de la veille, les trajets à deux sauts par jour et les garde dans une table agrégée. Sans cette table, on ne montre que des paires, jamais un parcours. Les planètes des nœuds réutilisent `ChannelAvatar` (déjà en planète dès 20 px). Décision prise le 25/11 : `DESIGN.md` l. 321 ne réserve plus l'atmosphère à la Carte ; le ciel étoilé la remplace sur toutes les pages. Les tuyaux peuvent donc être dessinés dans Flux, à condition de passer le critère de lisibilité du prototype.

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
