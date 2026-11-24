# CLAUDE.md — tableau de bord (`app/`)

Chargé seulement quand on travaille dans `app/`. Les règles générales du projet sont dans le `CLAUDE.md` à la racine.

- `vite-plugin-singlefile` produit un seul fichier HTML, que `scripts/publier.mjs` copie vers `../twitch-overlap.html`. **Ce fichier est généré, ne jamais l'éditer à la main.** Les fichiers `twitch-overlap.vanilla.html` et `twitch-overlap.avant-design.html` sont d'anciennes versions.
- **Pont legacy** : `src/legacy/legacy.js` garde l'ancien code (données, accès Supabase, calculs, moteur de la Carte).
  - Les anciennes fonctions `renderXxx()` émettent un `CustomEvent('legacy:xxx')` pour overview, channel, chat, game, overlap, flows, settings, map et tab.
  - `bridge.ts` expose ces événements sous forme de stores (`useXxxData = legacyStore("legacy:xxx")`), et React rappelle le legacy via `showTab()`, `openAddStreamer()` et les actions de réglages.
  - Une nouvelle donnée se calcule donc dans legacy.js, est transmise par l'événement, puis est affichée en React.
- Le moteur de la Carte est conservé exprès. Il expose `mount(els)`, les commandes zoomIn/zoomOut/fit/recenter/select/find/group/stop, `els.notify` et `mapAction`. Les graphiques utilisent `lineSpec()` du legacy, dessiné par `LineChart`/`BarChart` en React.
- Pièges :
  - pas de balise `<section>` dans le React ;
  - pas de classe `av` sur les images ;
  - les clics `data-open` et `data-goto` sont gérés par le legacy ;
  - `LANG_FIX` dans legacy.js force la langue de certaines chaînes.
- Mode démo : `?demo` ou `?demo=channel|chat|game|overlap|flows|settings|map`, et `&hover=0.4` pour figer un survol. Les données viennent de `src/dev/demo.ts`, qui est exclu du build. C'est le moyen de tester l'interface sans Supabase.
- Ajouter un composant 21st.dev : lancer `npx shadcn@latest add …`, remplacer `import { cn } from "cn"` par `@/lib/utils`, puis `npm uninstall cn`.
