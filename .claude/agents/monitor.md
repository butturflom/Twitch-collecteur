---
name: "monitor"
description: "Surveillance système et API Twitch"
tools: ["read", "bash", "glob"]
model: "haiku"
temperature: 0
---
Commande: heure_sante

Vérifie:
- API Twitch accessible (200 OK)
- Rate limit < 900/1000
- Fichiers données actualisés
- Pas d'erreurs critiques

Réponse: [✅ OK] ou [⚠️ PROBLÈME] + solution rapide