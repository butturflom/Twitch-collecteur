---
name: Twitch Overlap
description: Un observatoire personnel des communautés Twitch suivies, sombre et précis.
colors:
  nebula-violet: "#8b7cff"
  nebula-violet-pale: "#b3a9ff"
  nebula-violet-deep: "#6f5ff0"
  deep-sky: "#09090b"
  dome: "#121217"
  dome-crest: "#16161c"
  orbit: "#18181b"
  orbit-high: "#27272a"
  starlight: "#f4f4f5"
  haze: "#a1a1aa"
  dusk: "#868693"
  hairline: "rgba(255, 255, 255, 0.08)"
  hairline-strong: "rgba(255, 255, 255, 0.1)"
  field-edge: "#6b6b78"
  live-red: "#ff4757"
  signal-green: "#3ccf86"
  signal-amber: "#e0ad4a"
  signal-red: "#f2636f"
  signal-blue: "#5b93ff"
  map-link: "#e6e1ff"
  star-gold: "#ffc46b"
  star-core: "#fff3d1"
  map-veil: "rgba(9, 9, 11, 0.34)"
typography:
  page-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  hero-name:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  stat-value:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
  section-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.003em"
    fontFeature: "'tnum', 'cv11', 'ss01'"
  note:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.625
  table-head:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "'tnum'"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  panel: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "28px"
  section: "36px"
components:
  button-primary:
    backgroundColor: "{colors.nebula-violet-deep}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.orbit}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-ghost:
    textColor: "{colors.haze}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.starlight}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  panel:
    backgroundColor: "{colors.dome}"
    rounded: "{rounded.panel}"
    padding: "16px"
  nav-item:
    textColor: "{colors.haze}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 10px"
  nav-item-active:
    backgroundColor: "rgba(255, 255, 255, 0.07)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "36px"
  channel-pill:
    backgroundColor: "{colors.dome}"
    textColor: "{colors.haze}"
    rounded: "{rounded.pill}"
    padding: "4px 14px 4px 4px"
  channel-pill-active:
    backgroundColor: "rgba(139, 124, 255, 0.15)"
    textColor: "{colors.starlight}"
    rounded: "{rounded.pill}"
  badge-live:
    backgroundColor: "rgba(240, 64, 80, 0.14)"
    textColor: "#ffd9dc"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  segmented-control:
    backgroundColor: "#0c0c10"
    rounded: "11px"
    padding: "3px"
---

# Design System: Twitch Overlap

## Overview

**Creative North Star: "L'Observatoire"**

Twitch Overlap se regarde comme on observe le ciel la nuit. Les communautés suivies sont des astres : on mesure leur éclat (viewers, messages), on suit leurs trajectoires (flux, raids) et on cartographie les zones où elles se recoupent. L'interface est la coupole : un fond noir profond, des panneaux à peine plus clairs posés dessus, et une seule lumière colorée, le violet nébuleuse, qui marque ce qu'il faut regarder. La Carte est l'endroit où la métaphore devient littérale : galaxie en volume, planètes en facettes, échos radar. C'est la pièce signature du système, et elle peut être plus expressive que le reste.

Partout ailleurs, l'outil est dense et calme. C'est un instrument de lecture pour une seule personne, sur un écran d'ordinateur : beaucoup de chiffres, des tableaux et des courbes. Il n'y a pas de discours marketing. L'ambition se voit dans la précision : chiffres en chasse fixe, alignements à droite, petites barres de valeur sous les cellules, une note explicative sous chaque bloc qui dit d'où vient le chiffre. Les composants sont **précis et feutrés** : petits, aux bords doux, avec des états discrets. Seuls le bouton principal, l'onglet actif et les repères de section s'allument.

Deux refus sont confirmés. Ce n'est pas un **dashboard SaaS générique** : pas de grilles de cartes interchangeables, pas de dégradés arc-en-ciel, pas de gros chiffres sans contexte. Et il n'y a **pas de thème clair** : le sombre est un choix d'identité, pas une préférence à basculer.

**Key Characteristics:**
- Sombre uniquement : noir profond (#09090b) et surfaces zinc qui s'éclaircissent par paliers.
- Un seul accent, le violet nébuleuse, réservé aux repères et aux actions principales.
- Chaque chaîne apporte sa propre couleur, tirée de son logo, en liseré et en halo très léger.
- Les chiffres sont en JetBrains Mono, en chasse fixe ; le texte est en Inter.
- La profondeur vient des tons et des liserés ; les lueurs vives sont rares et signifiantes, les lueurs ambiantes (halo des panneaux, atmosphère des planètes) restent très faibles.
- Chaque bloc de données a une note sous lui et une vue Tableau à côté du Graphique.

## Colors

Une nuit neutre, presque sans teinte, éclairée par un seul violet froid, plus des couleurs de signal qui ne servent qu'à dire un état.

### Primary
- **Violet nébuleuse** (`nebula-violet`) : anneau de focus, repère carré des titres de section, pilule de chaîne sélectionnée, barres de valeur dans les tableaux et cases de matrice. C'est aussi la première série des graphiques.
- **Violet nébuleuse profond** (`nebula-violet-deep`, jeton `--primary-strong`) : fond des boutons principaux (« Démarrer l'écoute », « Enregistrer », « Chercher »). C'est le violet nébuleuse assombri, pour que le texte blanc atteigne 4,6:1 ; il ne sert à rien d'autre.
- **Violet nébuleuse pâle** (`nebula-violet-pale`, jeton `--primary-soft`) : liens externes (« VOD », « Clip »), survol des noms de chaîne, icône de l'onglet actif. C'est la version lisible du violet quand il porte du texte.

### Neutral
- **Ciel profond** (`deep-sky`) : fond de page. Deux lueurs très diffuses fixées à l'écran (violet sombre en haut à gauche, indigo en bas à droite) lui donnent un peu de matière sous le verre.
- **Coupole** (`dome`) et **Crête de coupole** (`dome-crest`) : les panneaux. Ils ont un léger dégradé vertical, de la crête en haut vers la coupole sur environ 90 px, ce qui donne l'impression d'une lumière venue d'en haut.
- **Orbite** (`orbit`) et **Orbite haute** (`orbit-high`) : surfaces secondaires (boutons secondaires, infobulles) et état actif d'un contrôle segmenté.
- **Lumière d'étoile** (`starlight`) : texte principal et chiffres.
- **Brume** (`haze`) : texte secondaire, libellés, navigation au repos.
- **Crépuscule** (`dusk`, jeton `--dusk`, classe `text-dusk`) : le niveau le plus bas : notes sous les blocs, en-têtes de tableau, indications, titres de lives. Il atteint au moins 4,6:1 sur toutes les surfaces, et reste plus sombre que la brume pour garder la hiérarchie.
- **Filet** (`hairline`) et **Filet marqué** (`hairline-strong`) : bordures de panneaux, séparateurs, bord des champs.

### Signal colors
- **Rouge live** (`live-red`) : uniquement l'état « en direct » (point pulsant et pastille LIVE). Il ne sert à rien d'autre.
- **Vert signal** (`signal-green`), **Ambre signal** (`signal-amber`), **Rouge signal** (`signal-red`) : variations positives, alertes et variations négatives (`Delta`, tendances) ; le vert marque aussi « Données anonymisées ». Les jetons `signal-amber` et `signal-red` sont câblés dans `index.css` depuis le 25/11/2026. **Fidélité du chat** : vert dans le quart haut des chaînes comparées, ambre dans le quart bas, aucune couleur entre les deux ; une phrase dit toujours l'état, la couleur ne porte jamais seule.
- **Bleu signal** (`signal-blue`) : deuxième série des graphiques et échelles séquentielles.

### Channel colors
Chaque chaîne a une couleur, extraite de la teinte dominante de son logo (`useAvatarColor`). Elle sert à son liseré de 2 px en haut de carte, à un halo radial à 14–16 % d'opacité, à l'anneau de son avatar et à sa série dans les graphiques. Ces couleurs viennent des données, pas du système : elles ne deviennent jamais des couleurs d'interface.

### Named Rules
**La règle de la lumière unique.** Le violet nébuleuse est la seule couleur d'interface. Une nouvelle fonctionnalité n'introduit pas de deuxième accent : elle utilise le violet, une couleur de signal, ou la couleur d'une chaîne.

**La règle du crépuscule lisible.** Un texte, même secondaire, atteint 4,5:1 sur sa surface. Pour reculer un texte, on prend le crépuscule (jeton `--dusk`), jamais une couleur écrite en dur ni un gris de la palette Tailwind plus sombre.

**La règle du rouge réservé.** Le rouge vif (#ff4757) veut dire « en direct » et rien d'autre. Une erreur utilise le rouge signal (#f2636f), plus doux.

## Typography

**Body Font:** Inter (avec ui-sans-serif, system-ui, Segoe UI)
**Data/Label Font:** JetBrains Mono (avec ui-monospace, Cascadia Mono, Consolas)

**Character:** Inter, resserré (approche légèrement négative, `cv11` et `ss01` activés), porte tout le texte. JetBrains Mono porte tout ce qui se compte ou se compare : chiffres des tableaux, valeurs des mesures, pastilles de langue. On reconnaît une donnée à sa police : un libellé n'est jamais en mono.

### Hierarchy
- **Page title** (600, 24 px, 21 px sur mobile, interlettrage −0,025em) : le nom de l'onglet, une fois par page, suivi d'un sous-titre de 13 px en brume (640 px de large au maximum).
- **Hero name** (600, 22 px) : le nom d'une chaîne dans son bandeau.
- **Stat value** (600, 1,625rem/2rem, −0,03em, chiffres tabulaires) : valeur d'un indicateur. Elle a toujours un libellé au-dessus et, si possible, une indication en dessous.
- **Section title** (600, 15 px, −0,015em) : titre de bloc, précédé du repère carré violet.
- **Body** (400, 13,5 px/1,5) : texte courant, cellules de libellé.
- **Note** (400, 12 px/1,625, crépuscule, 900 px max) : l'explication sous chaque bloc ; les termes clés passent en gras brume.
- **Table head** (500, 11 px, casse de phrase, sans interlettrage, crépuscule) : en-têtes de colonnes, en Inter.
- **Data** (JetBrains Mono, 12,5 px, chiffres tabulaires) : toutes les valeurs de tableau, alignées à droite.
- **Label** (Inter 500, 12 px, casse de phrase, sans interlettrage, crépuscule) : titres de groupes de navigation (Observatoire, Analyse et flux, Exploration), libellé Période, titres de section du menu de la Carte, bandeau de la Carte.

### Named Rules
**La règle du chiffre en mono.** Un nombre qu'on compare (tableau, mesure de carte, compteur) est en JetBrains Mono avec `tabular-nums`. Seules les grandes valeurs d'indicateur restent en Inter semi-gras, mais toujours en chiffres tabulaires.

**La règle du libellé en clair** (adoptée le 21/11/2026, à la suite de l'audit Hallmark). Jamais de capitales espacées ni de petites capitales, ni d'étiquette en mono : un libellé, un en-tête de tableau, une pastille ou un titre de groupe est en Inter, un cran plus petit que le texte, en casse de phrase et sans interlettrage. Toutes les surfaces ont migré (la Carte le 21/11/2026, puis la barre latérale, les tableaux, les pastilles Live / Hors ligne / chat limité et le libellé Période le 22/11/2026). Les codes de langue (FR, EN) restent des données en mono.

**La règle de la note.** Un bloc de données qui demande une interprétation porte une note sous lui qui dit ce que mesure le chiffre et ses limites. Ce texte fait partie du design et ne se coupe pas pour gagner de la place.

## Layout

L'application a une barre latérale fixe de 248 px (dès `lg`), un en-tête collant de 58 px et une colonne de contenu limitée à 1 320 px, avec 28 px de marge latérale (14 px sur mobile). La Carte est la seule exception : elle prend toute la largeur et masque l'en-tête de page.

L'espacement suit un rythme serré : 6 px entre les cellules d'une grille de mesures, 12 px dans les composants, 16 px de marge interne d'un panneau (20 px pour un bandeau) et 36 px entre deux sections. Les blocs vont souvent par deux (`Two`) dès `lg`, avec 16 px entre les colonnes et 36 px entre les rangées ; ils passent sur une colonne en dessous.

Les indicateurs sont regroupés dans une seule surface et séparés par des filets (`StatCardGroup`), pas en cartes séparées. Chaque cellule fait 11rem de large au minimum et la rangée passe à la ligne d'elle-même. Les cartes de chaîne vont en grille de quatre sur grand écran.

Sous `lg`, la barre latérale devient un tiroir avec un voile `black/55` flouté ; les libellés des boutons d'en-tête disparaissent et seules les icônes restent.

### Named Rules
**La règle du groupe à filets.** Des indicateurs qui vont ensemble partagent une seule surface séparée par des filets de 1 px. On n'empile jamais une carte dans une carte.

## Elevation & Depth

Le système est **tonal, avec des lueurs rares et douces**. La profondeur vient d'abord des paliers de surface (ciel profond, coupole, orbite, orbite haute) et d'un liseré intérieur clair de 1 px en haut de chaque panneau, comme une arête qui accroche la lumière. Les ombres sont ambiantes : très larges, très décalées vers le bas et presque invisibles. Elles détachent un panneau du fond sans former de contour.

Le verre flouté est réservé au cadre de l'application (barre latérale, en-tête, infobulles) et aux surcouches qui flottent sur le dessin de la Carte (bandeau, colonne de boutons, aide, fiche de la chaîne choisie, menu et rail des filtres), c'est-à-dire aux surfaces posées au-dessus de quelque chose qui bouge. Le contenu lui-même n'est pas en verre : pas de flou derrière un état vide, un panneau ou un tableau. Sur les pages qui montrent le ciel étoilé (voir plus bas), les panneaux sont très légèrement translucides (crête à 90 %, coupole à 85 %) pour laisser affleurer les étoiles ; un tableau et un état vide restent opaques.

### Shadow Vocabulary
- **Arête de coupole** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 12px 32px -20px rgba(0,0,0,.9)`) : tous les panneaux, cartes de chaîne et groupes d'indicateurs.
- **Console** (`shadow-console`, 25/11/2026) : arête de coupole, plus un filet violet à 5 % et un halo violet très diffus (`0 0 28px -14px rgba(139,124,255,.22)`). Panneaux, cartes de chaîne et groupes d'indicateurs des pages qui montrent le ciel étoilé (toutes sauf la Carte). Sans flou : il serait invisible devant ce fond.
- **Flottant** (`box-shadow: 0 25px 50px -12px rgba(0,0,0,.6)`) : infobulles et tiroirs.
- **Lueur d'action** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 6px 16px -8px rgba(139,124,255,.75)`) : le bouton principal uniquement.
- **Lueur de repère** (`box-shadow: 0 0 10px rgba(139,124,255,.7)`) : la barre de l'onglet actif. (25/11/2026, audit Hallmark, règle 63 : le carré violet devant chaque titre de section est retiré. Répété sur tous les titres, il ne signalait rien ; un titre se repère par sa taille et sa graisse.)

### Named Rules
**La règle des deux niveaux de lueur.** Une lueur *vive* signale « c'est ici » ou « c'est l'action » : onglet actif, bouton principal, sélection sur la Carte. Une lueur *ambiante* (halo « console » des panneaux, atmosphère des avatars-planètes) fait l'ambiance d'observatoire : elle reste très faible, ne varie pas selon l'état et ne s'allume jamais au survol. Si deux éléments brillent de façon vive à égalité dans un même écran, l'un des deux ne devrait pas briller. La lueur ambiante ne s'ajoute que sur les pages du ciel étoilé, pas sur une surface isolée.

## Shapes

Les formes sont douces et régulières. Les panneaux ont 14 px de rayon, les cartes internes et les cellules de mesure 10 px, les boutons et les champs 10 px, et les éléments de navigation 12 px. Tout ce qui désigne un objet du monde Twitch est rond : avatars, pilules de chaîne, pastilles LIVE et de langue, bandeau radar. Les bordures font toujours 1 px, en filet blanc très transparent. L'épaisseur ne change pas d'un état à l'autre, seule l'opacité change. Les barres de valeur font 1,5 à 2 px de haut, avec des bouts arrondis.

## Components

### Buttons
Précis et feutrés : petits (36 px), avec des icônes Lucide de 16 px et un trait de 1,75.
- **Shape:** coins doux (10 px).
- **Primary:** violet nébuleuse profond (`bg-primary-strong`), texte blanc (4,6:1), lueur d'action. Un seul par zone d'action (« Démarrer l'écoute », « Enregistrer »).
- **Secondary:** orbite à 60–70 % avec un filet ; au survol, fond zinc-800 et filet plus marqué. C'est le bouton courant (« Arrêter », « Ajouter un streamer »).
- **Ghost:** sans fond, brume ; au survol, fond orbite haute à 50 %.
- **Focus:** anneau de 3 px en violet nébuleuse à 50 %, sur tous les éléments actionnables.
- **Disabled:** opacité 50 %, aucun événement.

### Segmented control
Le choix de la période (Tout, Aujourd'hui, 7 jours, 30 jours) et la bascule Graphique / Tableau : une gouttière plus sombre que la page avec une ombre intérieure. L'option active monte d'un palier (orbite haute, filet marqué, petite arête claire). Les options inactives sont en brume, sans fond.

### Chips (channel pills)
- **Style:** pilule ronde, avatar de 24 px à gauche, nom en 13 px 500, fond coupole, filet, texte brume.
- **State:** la pilule sélectionnée prend un filet violet, un fond violet à 15 % et un anneau extérieur violet à 8 %. Un point rouge live se pose sur l'avatar quand la chaîne est en direct.

### Badges
- **Live:** pilule rouge translucide, point qui pulse avec sa lueur, « Live » en libellé, en casse de phrase.
- **Langue:** pilule en mono 10 px, en filet et brume. Une chaîne multilingue passe en violet avec l'icône Langues.
- **Chat limité:** pilule en filet, en libellé (casse de phrase), avec une infobulle explicative.

### Cards / Containers
- **Corner Style:** 14 px.
- **Background:** dégradé vertical de la crête de coupole vers la coupole.
- **Shadow Strategy:** arête de coupole (voir Elevation & Depth).
- **Border:** filet de 1 px ; au survol d'une carte cliquable, filet marqué.
- **Internal Padding:** 16 px (20 px pour un bandeau de chaîne).
- **Empty state:** même rayon, bordure en pointillés, fond coupole à 50 %, texte centré en 12,5 px brume qui explique pourquoi c'est vide et quand ça se remplira.

### Ciel étoilé (25/11/2026)
`.to2-sky` (`index.css`), monté par `App.tsx` pour les onglets de `SKY_TABS` (toutes les pages sauf la Carte, qui garde son canvas). Des étoiles en dégradés radiaux sur deux mailles de tailles différentes, et deux lueurs très diffuses (violet de la palette, bleu de signal). Statique, sans flou ni animation. Les étoiles restent à peine visibles : c'est voulu.

### Avatar-planète (27/11/2026)
`ChannelAvatar` (React), `av()` (ancien code) et la Carte (`planetSvg`) dessinent la même planète : la photo de profil, collée et enroulée sur une planète à facettes, la remplit (piste B, composition B2, choisie sur prototype ; remplace la planète peinte du 26/11). Cinq formes rendues avec Blender (`scripts/planetes/planetes.py`, images dans `src/assets/planetes/`), choisies d'après le nom, toujours la même pour la même chaîne ; relief marqué, avec un reflet sur les facettes les plus éclairées (l'utilisateur préfère le relief, quitte à brûler un peu les photos claires) ; couleur exacte de la chaîne en bande au bord et en halo ambiant très faible. Chaque planète est une seule image, composée une fois (`lib/planet.ts`). Sans photo (absente ou refusée) : la planète aux deux tons de la couleur, avec l'initiale dès 20 px. Un anneau fin marque les 3 chaînes qui ont le plus de viewers actifs dans la vue en cours (`window.planetRing`, tenu à jour par `render()`), sauf s'il y a 3 chaînes ou moins. Sous 20 px (légendes, filtres) : ni halo, ni anneau, ni initiale. La lumière est peinte dans l'image : elle ne suit plus l'étoile du système.

### Constellation des recoupements (25/11/2026)
En tête du bloc « Recoupements » (`recoup.tsx`, à partir de 768 px), centrée au-dessus de la phrase à retenir (27/11) : les chaînes des paires les plus proches (7 au plus) posées sur une orbite en pointillés, voisines reliées par un trait d'autant plus épais et lumineux que leur part commune est grande. C'est un résumé des chiffres de la colonne « Paires les plus proches », décoratif pour la lecture et masqué aux lecteurs d'écran.

### Channel card (signature)
La carte d'une chaîne en Vue d'ensemble prend sa couleur : liseré de 2 px en haut qui s'efface vers la droite, halo radial dans le coin haut gauche, et barre « Ont écrit pendant ce live » à sa couleur. En dessous, quatre mesures en grille 2×2, dans de petites cellules de 10 px de rayon sur fond blanc à 2 %. Le bandeau (`Hero`) des onglets Par chaîne et Chat reprend le même liseré et le même halo en plus grand.

### Data table
Le tableau est dans un panneau. Les en-têtes sont en libellé crépuscule, en casse de phrase, collantes dans les vues tableau. Les valeurs sont en mono 12,5 px et alignées à droite ; la première colonne, en Inter, porte le libellé ou la chaîne (avatar et nom cliquable souligné en pointillés). Au survol, la ligne prend un fond violet à 4,5 %. L'intensité d'une valeur s'affiche par une barre violette de 2 px sous la cellule, proportionnelle au maximum de la colonne (`heat`), et non par un fond coloré.

### Chart frame
Chaque graphique a une légende à gauche et la bascule Graphique / Tableau à droite. La vue Tableau donne toutes les valeurs sans survol : l'infobulle n'est jamais le seul moyen de lire un chiffre.

### Inputs / Fields
- **Style:** 36 px de haut, filet, fond blanc à 3 %, coins de 10 px, texte de 14 px.
- **Focus:** bordure en violet nébuleuse et anneau de 3 px à 50 %.
- **Error:** bordure rouge signal et anneau rouge signal à 40 %.

### Navigation
La barre latérale a des groupes titrés en libellé (Observatoire : Carte et Vue d'ensemble ; Analyse et flux ; Exploration ; Configuration). Les éléments font 36 px, en 13,5 px 500, avec des icônes de 17 px. Au repos ils sont en brume avec une icône zinc-500 ; au survol ils prennent un fond blanc à 4 %. L'élément actif a un fond blanc à 7 %, un filet, une icône violet clair et une barre de 3 px en violet avec sa lueur, collée au bord gauche. En pied : l'encart « Données anonymisées » et le bouton secondaire « Ajouter un streamer ». L'en-tête montre le fil d'Ariane, la pilule d'état de l'écoute (point d'état et texte en chiffres tabulaires) et les deux boutons d'écoute.

### Map (signature)
La Carte est la surface la plus chargée en atmosphère (depuis le 25/11, le ciel étoilé est sur toutes les pages sauf la Carte, qui garde son fond propre ; toute autre surface peut reprendre l'atmosphère de la Carte si la lisibilité suit, décision de l'utilisateur) : galaxie en volume, planètes à facettes portant la photo de chaque chaîne (voir « Avatar-planète »), planète centrale avec une double lueur douce, liens entre chaînes, échos radar fins et pâles. Ses textes restent dans le système : noms en petites pilules sombres translucides avec un filet blanc (filet violet quand l'élément est sélectionné) et bandeau en libellé sur une pilule de verre. Ses couleurs propres sont des jetons : **lien de carte** (`map-link`, #e6e1ff) pour les traits et leurs exemples dans la légende (rangée dans l'aide depuis le 27/11 : posée sur la carte, elle masquait des planètes), **or d'étoile** (`star-gold`) et **cœur d'étoile** (`star-core`) pour la couronne des étoiles, **voile de carte** (`map-veil`) pour le voile radial qui garde les traits lisibles sur le cœur clair de la galaxie.

**La règle des deux temps** (26/11/2026, codée le 27/11). La planète dit le présent : sa taille suit les viewers en direct, et seules les chaînes en direct sont montrées d'office. Une chaîne hors ligne, affichée sur demande, est plus petite que toute chaîne en direct et **endormie** (grise, assombrie, sans halo). Les traits, les groupes et les passages disent la relation : tout le détail gardé, sans sélecteur de période, avec la date de début écrite dans le bandeau et l'aide. L'étoile d'un système n'est donc pas forcément la plus grosse planète.

### Motion
Les changements de vue font un fondu avec une montée de 4 px en 300 ms (`animate-in fade-in-0 slide-in-from-bottom-1`). Les survols et les états prennent 200 ms. Le tiroir de navigation glisse en 300 ms avec `cubic-bezier(.32,.72,0,1)`. Avec `prefers-reduced-motion`, les transitions de déplacement sont coupées : toute transition qui porte un `transform` a sa variante `motion-reduce:`.

**La règle des propriétés nommées.** Jamais `transition: all` (`transition-all`) : une transition nomme ce qui change (`transition-colors`, `transition-opacity`, `transition-transform`, ou une liste explicite). On n'anime jamais `width`, `height`, `top` ni `left`.

## Do's and Don'ts

### Do:
- **Do** garder le violet nébuleuse (#8b7cff) comme seule couleur d'interface, et le réserver aux repères, à la sélection et au focus ; son ton profond (#6f5ff0) sert de fond au bouton principal, son ton pâle (#b3a9ff) aux textes violets.
- **Do** utiliser les jetons (`text-dusk`, `text-primary-soft`, `bg-primary-strong`) plutôt que des couleurs hexadécimales ou des `zinc-*`/`purple-*` de Tailwind.
- **Do** mettre tout chiffre comparable en JetBrains Mono avec `tabular-nums`, aligné à droite dans les tableaux.
- **Do** poser une note en crépuscule sous chaque bloc qui demande une interprétation, et une vue Tableau à côté de chaque graphique.
- **Do** regrouper les indicateurs liés dans une seule surface séparée par des filets (`StatCardGroup`).
- **Do** utiliser la couleur extraite du logo d'une chaîne pour tout ce qui représente cette chaîne (liseré, halo, avatar, série de graphique).
- **Do** construire la profondeur par paliers de surface et par l'arête de coupole (`inset 0 1px 0 rgba(255,255,255,.035)`), et pas par des ombres franches.
- **Do** expliquer un état vide : pourquoi il est vide et ce qui le remplira.
- **Do** écrire les textes avec la typographie française : apostrophe courbe (’), guillemets « » avec espaces insécables.
- **Do** déclarer toute couleur, même propre à un composant (ombre teintée, dégradé de légende), comme jeton dans `index.css` avant de l'utiliser.

### Don't:
- **Don't** produire un dashboard SaaS générique : pas de grille de cartes interchangeables, pas de dégradés arc-en-ciel, pas de gros chiffre sans libellé ni contexte.
- **Don't** prévoir de thème clair ni de variante claire d'un composant.
- **Don't** utiliser le rouge live (#ff4757) pour autre chose que l'état « en direct ».
- **Don't** ajouter une lueur violette pour décorer ; elle signale toujours une position ou une action.
- **Don't** mettre le contenu en verre flouté ; le verre est réservé au cadre (barre latérale, en-tête, infobulles) et aux surcouches de la Carte.
- **Don't** écrire de libellé en capitales espacées, en petites capitales ou en mono.
- **Don't** utiliser `transition-all` ni écrire une couleur en dur dans une classe (`bg-[#…]`, `shadow-[…rgba(…)]`).
- **Don't** colorer le fond entier d'une cellule pour dire son intensité ; utiliser la barre de 2 px sous la valeur.
- **Don't** imbriquer une carte dans une carte : dans un panneau, séparer par un filet (`border-t`), et poser un tableau avec `DataTable bare`.
