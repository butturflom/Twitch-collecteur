# Twitch Analytics — repères pour les agents

- Les commandes, l'architecture, les invariants et les pièges sont dans le `CLAUDE.md` à la racine. À lire avant toute modification.
- Agents du projet : `.claude/agents/`. Agent de session : `orchestrateur`, lancé par `lancer-orchestrateur.bat` ; son tableau de routage fait foi. Skills du projet : `contremaitre`, `verifier`, `audit`, `ui-ux-pro-max`, `three-js`, `react-three-fiber`. Le reste est dans `archives/outils-claude/`. Rappels automatiques : `.claude/hooks/` (au démarrage et à chaque prompt).
- Objectif : observatoire analytique Twitch (collecte automatisée, analyse comportementale), base prête pour un hébergement futur.
- Conservation : défauts du code 14 / 21 / 60 / 30 jours, réglables dans `config.json` et appliqués par la fonction SQL `cleanup()`. Les valeurs réelles ne sont pas relues par la doc : voir `LISEZMOI.md` §5 et `SUIVI.md` §8. Les rollups quotidiens (`daily_*`) ne sont pas purgés.
- Stockage : palier gratuit Supabase 500 Mo ; le collecteur alerte à 400 Mo.
- Langue : documentation et interface en français.
