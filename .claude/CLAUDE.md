# Twitch Analytics — repères pour les agents

- Les commandes, l'architecture, les invariants et les pièges sont dans le `CLAUDE.md` à la racine. À lire avant toute modification.
- Agents du projet : `.claude/agents/` (analyste, app-developer, monitor, optimizer, agents Impeccable). Agent de session : `orchestrateur`, lancé par `lancer-orchestrateur.bat`.
- Objectif : observatoire analytique Twitch (collecte automatisée, analyse comportementale), base prête pour un hébergement futur.
- Conservation : défauts du code 14 / 21 / 60 / 30 jours, réglables dans `config.json` et appliqués par la fonction SQL `cleanup()`. Les valeurs réelles ne sont pas relues par la doc : voir `LISEZMOI.md` §5 et `SUIVI.md` §8. Les rollups quotidiens (`daily_*`) ne sont pas purgés.
- Stockage : palier gratuit Supabase 500 Mo ; le collecteur alerte à 400 Mo.
- Langue : documentation et interface en français.
