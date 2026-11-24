# Twitch Overlap — Product Context

## Product Name
Twitch Overlap — Collecteur et Tableau de bord

## Mission
Permettre aux créateurs de Twitch de comprendre les relations entre leurs communautés et les communautés des autres streamers qu'ils suivent ou qui suivent leur chat.

## Core Value
Mesurer les recoupements de viewers entre chaînes, les flux de chat, et les dynamiques de communauté pour identifier où les audiences se croisent.

## Target Users
- Streamers amateurs ou professionnels
- Comptes de community management
- Analystes de communauté Twitch

## Key Features
1. **Collecteur 24h/24** — Écoute les chats Twitch, collecte viewers, messages, emotes, raids, subs
2. **Vue d'ensemble** — Statistiques globales, participation, réglages des chaînes
3. **Par chaîne** — Fiche détaillée, chat, clips, modération
4. **Carte (overlap)** — Visualisation des recoupements entre chaînes

## Technical Notes
- **Langue** : Français (libellés), code (FR/EN)
- **Plateforme** : Web (HTML/JS) + Node.js collecteur
- **Base de données** : Supabase (500 Mo gratuit, data anonymisée)
- **Authentification** : API Twitch (Client ID + Secret)

## Design Constraints
- **Uniquement sombre** — noir profond (#09090b), surfaces zinc
- **Un seul accent** — violet nébuleuse (#8b7cff) pour repères
- **Pas de thème clair** — choix d'identité, pas préférence

## Data Privacy
- Les pseudos des viewers sont remplacés par une empreinte hashée
- Le texte des messages n'est jamais conservé
- Les données sont collectées dans Supabase, anonymisées

## Last Updated
2026-11-23 — après migration React et critique Carte 1.6.9

## Related Files
- [`LISEZMOI.md`](../LISEZMOI.md) — Documentation technique complète
- [`DESIGN.md`](./DESIGN.md) — System de design