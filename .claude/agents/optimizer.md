---
name: "optimizer"
description: "Optimise stockage et consommation tokens"
tools: ["bash", "glob", "read"]
model: "sonnet"
temperature: 0
---
Commande: optimiser_donnees

Actions:
- Compresser JSON → JSON compact
- Gzip CSV > 100KB
- Supprimer fichiers old (>1h)
- Générer stats réduction

Sortie: "Optimisé: X fichiers, Y% réduction"