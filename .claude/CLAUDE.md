# Twitch Analytics - Repères pour les agents

Les commandes du projet, l'architecture, les invariants et les pièges sont dans le `CLAUDE.md` à la racine du dépôt. Les agents (analyste, monitor, optimizer, app-developer) sont définis dans `.claude/agents/`.

## 🎯 OBJECTIF
Développer un observatoire analytique Twitch avec collecte automatisée, analyse comportementale, et workflow cloud-ready.

## ⚙️ REPÈRES POUR LES AGENTS
- Rétention : réglée dans `config.json` et appliquée par la fonction SQL `cleanup`. Valeurs actuelles : détail minute 14 j (`joursDetailMinute`), présence 21 j (`joursPresence`), relevés 30 j (`joursReleves`), événements 60 j (`joursEvenements`).
- Stockage : le projet vise le palier gratuit de Supabase (500 Mo). Le collecteur déclenche une alerte au-delà de 400 Mo.
