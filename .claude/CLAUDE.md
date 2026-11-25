# Twitch Analytics - Repères pour les agents

Les commandes du projet, l'architecture, les invariants et les pièges sont dans le `CLAUDE.md` à la racine du dépôt. Les agents (analyste, monitor, optimizer, app-developer) sont définis dans `.claude/agents/`.

## 🎯 OBJECTIF
Développer un observatoire analytique Twitch avec collecte automatisée, analyse comportementale, et workflow cloud-ready.

## ⚙️ REPÈRES POUR LES AGENTS
- Rétention : réglée dans `config.json` et appliquée par la fonction SQL `cleanup`. Valeurs notées le 24/11 : détail minute 7 j (`joursDetailMinute`), présence 1 j (`joursPresence`), événements et relevés 3 j (`joursEvenements`, `joursReleves`). Les rollups quotidiens ne sont pas purgés. Détail dans `SUIVI.md`, §8.
- Stockage : le projet vise le palier gratuit de Supabase (500 Mo). Le collecteur déclenche une alerte au-delà de 400 Mo.
