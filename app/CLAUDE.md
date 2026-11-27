# CLAUDE.md — tableau de bord (`app/`)

Chargé seulement quand on travaille dans `app/`. Les règles générales du projet sont dans le `CLAUDE.md` à la racine.

- `vite-plugin-singlefile` produit un seul fichier HTML, que `scripts/publier.mjs` copie vers `../twitch-overlap.html`. **Ce fichier est généré, ne jamais l'éditer à la main.**
- **Pont legacy** : `src/legacy/legacy.js` garde l'ancien code (données, accès Supabase, calculs, moteur de la Carte).
  - Les anciennes fonctions `renderXxx()` émettent un `CustomEvent('legacy:xxx')` pour overview, channel, chat, clip, game, overlap, flows, settings, map et tab.
  - `bridge.ts` expose ces événements sous forme de stores (`useXxxData = legacyStore("legacy:xxx")`), et React rappelle le legacy via `showTab()`, `openAddStreamer()` et les actions de réglages.
  - Une nouvelle donnée se calcule donc dans legacy.js, est transmise par l'événement, puis est affichée en React.
- Le moteur de la Carte est conservé exprès. Il expose `mount(els)`, les commandes zoomIn/zoomOut/fit/recenter/select/find/group/stop, `els.notify` et `mapAction`. Les graphiques utilisent `lineSpec()` du legacy, dessiné par `LineChart`/`BarChart` en React.
- Pièges :
  - pas de balise `<section>` dans le React ;
  - pas de classe `av` sur les images ;
  - les clics `data-open` et `data-goto` sont gérés par le legacy ;
  - `LANG_FIX` dans legacy.js force la langue de certaines chaînes.
- Mode démo : `?demo` ou `?demo=channel|chat|clip|game|audiences|rosters|settings|map` (`overlap` et `flows` mènent à `audiences`), `?demo&raidsbande=0|2|anciens` pour le bandeau des raids, `&hover=0.4` pour figer un survol, `?demo=channel&live=…` et `&lives=…` pour « Live du jour », `?demo=settings&chaines=40` pour une longue liste suivie, `&raids=vide` ou `&raids=non` pour le bloc des raids ; les autres paramètres (Audiences, « En ce moment », activité, « Jour par jour ») sont dans le `LISEZMOI.md` de ce dossier. Les données viennent de `src/dev/demo.ts`, qui est exclu du build. C'est le moyen de tester l'interface sans Supabase.
- Page d'accueil (`components/landing/`) : posée PAR-DESSUS le tableau de bord, qui reste monté et `inert` dessous (l'ancien code a besoin de ses éléments dans la page). Drapeau `to2-landing-seen` ; `?accueil` la rouvre.
- Intro (`components/intro/`) : calque Three.js de 4 s avant la page d'accueil, drapeau `to2-intro-seen`, jamais en démo ni avec les mouvements réduits. Imports ciblés de `three`, pas de `@react-three/fiber`.
- Planètes des chaînes : une seule source, `src/lib/planet.ts`, pour `ChannelAvatar`, `av()` et la Carte (`planetSvg`) ; une image composée par planète (photo sur une forme de `src/assets/planetes/`, rendue par `scripts/planetes/planetes.py`), posée après coup sur les éléments `[data-planet]` ; anneau via `window.planetRing`.
- Carte des migrations (`components/flows/flows-map.tsx`, onglet Audiences) : journées passées par `byDay` de `legacy:flows` (SQL `flows_by_day`), journée en cours par `today` (`flowsToday()`) ; sans `byDay`, seule la journée en cours. Démo : `?demo=audiences`, `&byday=N` ou `&byday=non`.
- Raids : le collecteur les écrit dans `raid_events`, pas dans `events`. `syncRaids` (legacy.js) les ajoute à `DB.events` en type `raid`, doublons à moins d'une minute écartés ; suivi par `id` dans `DB.revs.raid_events`.
- Live du jour (`components/channel/live.tsx`) : `liveRuns` / `liveToday` (legacy.js, sur `DB.snaps` non filtré) dans `legacy:channel` (`live`), historique par `window.channelLives` (SQL `channel_lives`). Même définition d’un live que la fonction SQL `build_lives` : les changer ensemble.
- Calculs : formules et limites dans `../CALCULS.md`. Migrations lues dans `DB.switches` (`flowsOf(pres,sw)`) ; période bornée au début commun (`dataStart()`), sauf pour les rollups (`periodStart()`).
- Données lues dans les rollups (historique, fidélité, rythme, comparaison) : fonctions SQL `channel_history`, `channel_stickiness`, `channels_rhythm`, `period_reach`, `network_history`, exposées par `window.*` dans legacy.js ; si la fonction manque, React affiche « demande la base à jour ».
- Ajouter un composant 21st.dev : lancer `npx shadcn@latest add …`, remplacer `import { cn } from "cn"` par `@/lib/utils`, puis `npm uninstall cn`.
