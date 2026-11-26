---
name: audit
description: Audit du dépôt Twitch Overlap : liens et chemins cassés dans la documentation, réglages Claude (hooks, MCP, en-têtes des agents et skills), worktrees avec modifications non commitées, branches déjà fusionnées. À utiliser quand l'utilisateur demande « audit », « vérifie les liens », « tout est à jour ? », « y a-t-il des liens cassés ? », tape /audit, et avant de clore un chantier.
---

# /audit : contrôle de cohérence du dépôt

But : que rien ne se perde et qu'aucun lien ne soit cassé. Le contrôle est mécanique : le script `scripts/audit-projet.mjs` fait le constat, ce skill décide quoi corriger.

## Étapes

1. **Constat.** Depuis la racine du dépôt ou d'un worktree : `node scripts/audit-projet.mjs`. Lecture seule : le script ne corrige ni ne supprime rien. La version courte (`--court`) tourne déjà au démarrage de session.

2. **Liens et chemins.** Pour chaque ligne signalée, corrige le document qui la porte (un fichier, un rôle). Si la cible n'existe que sur le PC de l'utilisateur (`config.json`, `en-attente.json`, fichiers générés), ne retire pas le lien : ajoute le nom à `LOCAUX` dans le script, avec une ligne pour dire pourquoi.

3. **Faits à jour.** Compare `SUIVI.md` §0 et §2 à l'état réel des PR : `gh pr list --state all --limit 10`. Une PR marquée « ouverte » alors qu'elle est fusionnée, ou l'inverse, est un défaut à corriger.

4. **Réglages.** Un hook qui appelle un fichier absent, ou un hook Impeccable, est un défaut. `.claude/settings.local.json` est ignoré par git et propre au PC : ne le modifie pas depuis un worktree ; donne à l'utilisateur la commande ou la modification à faire (format « lance ceci dans <chemin complet> : »).

5. **Worktrees et branches.** Ne supprime jamais un worktree ni une branche non fusionnée. Une branche fusionnée se supprime avec `git branch -d` (git refuse si elle n'est pas fusionnée). Un worktree ne se supprime que sur demande, après contrôle de ses modifications non commitées.

6. **Restitution.** Trois lignes, selon le bloc de statut habituel : **Fait** (ce qui a été corrigé et vérifié en relançant le script), **Attend un choix** (ce qui demande une décision, par exemple un worktree à supprimer), **Commande à lancer** (ou « aucune »). Si tout est propre : « Audit propre ».

## Limites

- Ne lis pas `config.json`, `.env` ni les fichiers générés (`twitch-overlap.html`).
- N'applique aucune migration SQL et ne touche pas à Supabase.
- Les archives (`archives/`) et les docs de skills tiers ne sont pas audités : c'est volontaire.
- Le script ne vérifie pas le contenu des pages web ni le rendu : c'est le rôle de `/verifier`.
