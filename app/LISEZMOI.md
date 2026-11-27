# Tableau de bord — code source (React + Tailwind + shadcn/ui)

Le fichier `../twitch-overlap.html` est maintenant **généré** à partir de ce dossier. Ne le modifie plus à la main : tes changements seraient écrasés au prochain build.

## Commandes (dans ce dossier `app`)

```powershell
npm install        # une seule fois
npm run dev        # aperçu en direct sur http://localhost:5173 (se recharge à chaque modification)
npm run build      # vérifie le code, construit, et recopie le résultat dans ../twitch-overlap.html
```

Le build produit un seul fichier HTML autonome : le raccourci du Bureau (`ouvrir-twitch-overlap.vbs`) l'ouvre comme avant.

## Ajouter un composant 21st.dev

1. Sur 21st.dev, copie la commande d'installation du composant (`npx shadcn@latest add "https://21st.dev/r/…"`) et lance-la ici.
2. Le composant arrive dans `src/components/ui/`.
3. La version actuelle de la CLI shadcn écrit parfois `import { cn } from "cn"` et installe un paquet `cn`. Remplace par `import { cn } from "@/lib/utils"` et lance `npm uninstall cn`.
4. Utilise-le dans un composant React, puis `npm run build`.

Exemple déjà en place : **Stat Card** (`src/components/ui/stat-card.tsx`) pour les indicateurs de la vue d'ensemble.

## Comment c'est organisé (migration progressive)

- `src/App.tsx`, `src/components/` : la partie React (barre latérale, en-tête, titre de page, indicateurs).
- `src/legacy/` : l'ancienne interface, gardée telle quelle le temps de convertir les onglets un par un.
  - `legacy.js` : tout l'ancien code (collecte, base locale, Supabase, calculs, graphiques, carte).
  - `legacy-markup.html` : les filtres et les onglets que remplit l'ancien code.
  - `legacy.css` : ses styles, tous préfixés par `.legacy` pour ne pas gêner Tailwind.
  - `bridge.ts` : le pont. L'ancien code prévient React par des événements (`legacy:tab`, `legacy:overview`, `legacy:channel`, `legacy:chat`, `legacy:clip`, `legacy:game`, `legacy:overlap`, `legacy:flows`, `legacy:settings`, `legacy:map`) ; React l'appelle par `showTab()` et `openAddStreamer()`.

### Onglets déjà convertis

- **Vue d'ensemble** (`src/components/overview/`) : bandeau des raids reçus (`raid-ticker.tsx`), indicateurs (Stat Card 21st.dev), cartes des chaînes (viewers max), tableaux (shadcn Table) avec cases colorées. L'ancien `renderOverview()` calcule et envoie l'événement `legacy:overview`.
- **Par chaîne** (`src/components/channel/`) : barre de choix avec photos, bandeau de la chaîne (live, jeu, lien Twitch), indicateurs principaux et « Communauté et événements », types de messages et ambiance, changements de jeu, chaînes voisines et jeux streamés en pastilles. Événement `legacy:channel`.

- **Chat** (`src/components/chat/`) : choix « Toutes » ou une chaîne, ambiance, répartition des types de messages (barre empilée), tableaux par chaîne repliés, emotes (podium des 3 premières), mots. Événement `legacy:chat`.

- **Clip** (`src/components/clip/`) : choix « Toutes » ou une chaîne (`data-clip`), moments à clipper et clips. Événement `legacy:clip`.

- **Par jeu** (`src/components/game/`) : catégories, effet d'un changement de jeu, chevauchement entre jeux. Événement `legacy:game`.
- **Chevauchement** (`src/components/overlap/`) : filtre de viewers (contrôle segmenté qui appelle `setOverlapFilter()`), viewers qui changent de stream, chaîne par chaîne, parcours les plus nomades, matrice entre chaînes, paires les plus proches, nombre de chaînes par viewer. Événement `legacy:overlap`.
- **Flux** (`src/components/flows/`) : indicateurs (migrations, délai médian, raids), migrations A → B, bilan par chaîne avec barre de solde, raids reçus, et carte des migrations jour par jour (`flows-map.tsx`) à côté du Sankey quand `byDay` est présent (fonction SQL `flows_by_day`). Événement `legacy:flows`.
- **Réglages** (`src/components/settings/`) : source des données, chaînes suivies (recherche, ajout, retrait avec confirmation, liste en bloc), API Twitch, sauvegardes. L'ancien `renderSettings()` envoie l'état (`legacy:settings`) ; chaque bouton appelle une action de l'ancien code : `settingsMode`, `saveSupabase`, `runAddSearch`, `addFromSearch`, `importLocal`, `dropLocal`, `removeChan`, `saveChanList`, `saveApi`, `genToken`, `exportDb`, `importDbFile`, `resetDb`. Les messages d'état sont gardés dans `smsg` au lieu d'être écrits dans la page. **Attention** : `importLocal`, `dropLocal`, `saveApi` (coller un jeton), `settingsMode` (mode local ou nuage) et `saveChanList` (remplacer toute la liste) existent dans `legacy.js` mais n'ont pas de bouton dans React. L'ajout en bloc passe par `addChanList`, qui n'enlève rien. Le bloc des raids (`raid-suggestions.tsx`) lit `window.raidSuggestions()` : table `raid_events` sur 30 jours, doublons à moins d'une minute écartés, réponse gardée 10 minutes.
- **Carte** (`src/components/map/`) : React possède la page (menu de filtres, boutons + − ⤢ ◎ ↺, fiche de la chaîne choisie, message des noms masqués, états vides). La carte elle-même reste dessinée image par image par le moteur de l'ancien code (disposition, rotation, glisser, zoom, radar, activité en direct), dans les éléments que React lui fournit : l'ancien `renderMap()` envoie `legacy:map` avec `mount(els)`, React appelle `mount` et reçoit les commandes du moteur (`zoomIn`, `zoomOut`, `fit`, `recenter`, `select`, `find`, `group`, `stop`) ; le moteur prévient React par `els.notify(...)`. Les actions du menu passent par `mapAction(...)`. La Carte n'a pas de période : `render()` lui donne `Q(true)` (tout le détail, pour les liens et les groupes) ; la taille des planètes et les filtres Statut, Jeu en cours et Audience minimale lisent le direct (`info`).

### Graphiques (`src/components/charts/`)

`LineChart` (courbes) et `BarChart` (barres) remplacent les anciens `lineChart()` et `barChart()`. L'ancien code prépare les données avec `lineSpec(séries, {unit, pct, yFloor, gaps, h})` (séries réduites à 500 points, périodes sans écoute) et React dessine : réticule et infobulle, navigation au clavier (flèches, Maj + flèches, Début, Fin, Échap), bascule **Graphique / Tableau** sur chaque graphique. Règles suivies (compétence « dataviz ») : traits de 2 px, quadrillage plein et discret, légende dès 2 séries, libellés en bout de courbe (4 séries au plus, masqués sous 480 px de large), barres de 24 px au plus avec haut arrondi. La palette des chaînes (`PAL` dans `legacy.js`) passe le validateur de couleurs en thème sombre.

Pour vérifier l'infobulle sans souris : `?demo&hover=0.4` simule un survol à 40 % de la largeur du premier graphique.

Blocs partagés : `src/components/shared/blocks.tsx` (barre de choix, bandeau, indicateurs, moments, clips) et `src/components/shared/matrix.tsx` (matrice de chevauchement des onglets Par jeu et Chevauchement : `matrixData()` dans l'ancien code).

### Langues des chaînes

Par défaut, la langue vient de Twitch (langue du dernier stream relevé). Le tableau `LANG_FIX` en haut de la partie « Langue » de `legacy.js` la remplace à la main : `us` pour un streamer américain (compté comme anglophone), plusieurs codes pour une chaîne multilingue (`shadowkekw:['ru','en']`, la première est la principale ; elle apparaît alors dans chaque filtre de langue concerné). L'affichage passe par `src/components/lang-badge.tsx` : pastille grise pour une langue, violette avec une icône pour plusieurs ; l'ukrainien (`uk`) s'affiche UA.

### Convertir un autre onglet

1. Dans `legacy.js`, faire calculer à `renderXxx(q)` des données (pas du HTML) et les envoyer avec `window.dispatchEvent(new CustomEvent('legacy:xxx', {detail: …}))`.
2. Dans `bridge.ts`, déclarer leur type et `export const useXxxData = legacyStore<…>("legacy:xxx")`.
3. Afficher avec des composants React (voir `components/overview/parts.tsx` : `Section`, `DataTable`, `ChannelCell`, `heat`, `MeterList` ; et `components/charts/` pour les graphiques).

Pièges :
- N'utilise pas de balise `<section>` dans React : l'ancien code masque toutes les `<section>` qui ne sont pas l'onglet affiché.
- N'utilise pas la classe `av` sur une image React : l'ancien code remplace lui-même ces images quand elles ne se chargent pas.
- Les clics sur `data-open="chaîne"` (ouvrir une chaîne) et `data-goto="onglet"` restent gérés par l'ancien code, y compris sur des éléments React.

### Mode démo

`npm run dev`, puis ouvre http://localhost:5173/?demo (ou `?demo=channel`, `?demo=chat`, `?demo=game`, `?demo=overlap`, `?demo=flows`, `?demo=settings` qui ouvre simplement les Réglages, `?demo=map` qui remplit la base EN MÉMOIRE avec 12 chaînes et 3 000 viewers fictifs pour que le moteur de la Carte ait quelque chose à dessiner) : les onglets convertis affichent un jeu de données fictif (`src/dev/demo.ts`), pratique pour travailler le design sans vraie base. Ce mode n'est jamais inclus dans le build (il n'existe que dans `npm run dev`).

Paramètres de démo : `&sticky=bas|haut|petit|peu` (fidélité du chat), `&rythme=vide|calme` (alertes de rythme), `?demo=rosters&compare=etoiles,xari,gotaga` (comparaison de chaînes), `&histo=non` (base pas à jour, couvre l'historique, la fidélité et les alertes), `?demo=flows-map` (page d'essai de la carte des migrations), `&byday=N` ou `&byday=non` (journées de la carte). La page d'accueil ne s'affiche jamais en démo ; `?accueil` la rouvre sur le fichier construit.
