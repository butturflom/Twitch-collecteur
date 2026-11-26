---
name: verifier
description: Vérifie une modification du tableau de bord (app/) avant commit : build, diff, captures des pages démo concernées, et rapport court. À utiliser après chaque changement d'interface, ou quand l'utilisateur demande « vérifie », « contrôle », « teste le rendu ».
---

# /verifier : contrôle d'une modification du tableau de bord

But : un seul passage qui produit build, diff et captures, pour que l'utilisateur n'ait pas à relancer les étapes à la main.

## Étapes

1. **Build.** Depuis la racine du worktree, sans `cd` (un garde-fou bloque les `cd` dans le worktree) :
   `npm run build --prefix "<worktree>/app"`
   Si le build échoue, arrête-toi là et rapporte la ligne d'erreur exacte.

2. **Diff.** `git -C "<worktree>" diff --stat` et la liste des fichiers modifiés. Vérifie que chaque fichier est prévu par la tâche ; signale tout fichier inattendu, y compris un fichier parasite comme `nul`.

3. **Captures.** Choisis les routes démo selon les fichiers modifiés (voir `app/CLAUDE.md`, section « Mode démo ») :
   - `?demo` : Vue d'ensemble, Recoupements, Classements ;
   - `?demo=channel` : Par chaîne, avec `&histo=1` pour une seule journée, `&sticky=petit` pour un petit échantillon ;
   - `?demo=flows` : Flux (Sankey et carte des migrations), `&byday=non` pour l'absence de données par jour ;
   - `?demo=map` : Carte ;
   - `?demo=overlap`, `?demo=game`, `?demo=chat`, `?demo=settings` selon le besoin.
   Capture chaque route touchée avec Chrome headless, en ouvrant le fichier `twitch-overlap.html` de la racine du worktree (généré par le build) :
   `"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --window-size=1440,1000 --virtual-time-budget=6000 --screenshot="<dossier>\<nom>.png" "file:///<chemin absolu>/twitch-overlap.html?demo=..."`
   Range les PNG dans le dossier de travail du job (`$CLAUDE_JOB_DIR/tmp`), jamais dans le dépôt.

4. **Lecture.** Lis chaque PNG. Pour chaque capture : ce qui est correct, ce qui déborde, ce qui manque. Un défaut visible est un défaut, même s'il est ancien ; dis lequel est nouveau.

5. **Rapport.** Court, dans cet ordre :
   - Build : passe / échoue (une ligne).
   - Fichiers : nombre et liste courte, avec les écarts.
   - Captures : une ligne par route.
   - Non vérifié : mobile, données réelles, survol, zoom (ce que les captures ne montrent pas).
   - Une ligne de statut finale, selon le format de la mémoire « bloc de statut » (ce qui est fait, ce qui attend un choix, commande à lancer si elle existe).

## Limites

- Les captures sont statiques : pas de survol, pas d'animation, pas de mobile réel.
- La démo n'a pas de données réelles : un rendu correct en démo ne prouve pas le comportement sur les vraies données.
