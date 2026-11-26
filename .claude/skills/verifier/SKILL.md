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

3. **Captures.** Choisis les routes démo selon les fichiers modifiés (voir la ligne « Mode démo » de `app/CLAUDE.md`) :
   - `?demo` : Vue d'ensemble, Recoupements, Classements ;
   - `?demo=channel` : Par chaîne, avec `&histo=1` pour une seule journée, `&sticky=petit` pour un petit échantillon ;
   - `?demo=flows` : Flux (Sankey et carte des migrations), `&byday=non` pour l'absence de données par jour ;
   - `?demo=map` : Carte ;
   - `?demo=overlap`, `?demo=game`, `?demo=chat`, `?demo=settings` selon le besoin.
   **Les routes démo ne marchent que sur le serveur de développement, pas sur le fichier `twitch-overlap.html`** : `main.tsx` n'importe la démo que si `import.meta.env.DEV` est vrai, donc le build de production la laisse de côté (vérifié le 26/11 : les captures du fichier généré affichent une Vue d'ensemble vide).
   Démarre le serveur en arrière-plan, depuis le worktree : `npm run dev --prefix "<worktree>/app"` (port 5173 par défaut). Attends qu'il réponde, par exemple avec `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` (doit renvoyer 200).
   Capture chaque route touchée avec Chrome headless :
   `"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --window-size=1440,1000 --virtual-time-budget=8000 --screenshot="<dossier>\<nom>.png" "http://localhost:5173/?demo=..."`
   Range les PNG dans le dossier de travail du job (`$CLAUDE_JOB_DIR/tmp`), jamais dans le dépôt. Arrête le serveur à la fin de la vérification.

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
