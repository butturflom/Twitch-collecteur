---
name: point-de-reprise
description: Plan principal du projet et où en sommes
metadata:
  type: reference
---

# Point de reprise - twitch-collecteur

## Historique des chantiers

- [Plan Carte](plan-carte.md) — Historique des critiques de la Carte et decisions
- [Vue d'ensemble](overview-next.md) — Critiques et plan Vue d'ensemble
- [Vue d'ensemble - redesign](overview-redesign-next.md) — Critiques 28 → 29/40, plan n°4 (période, grille de chaînes, erreurs de la pilule) en cours
- [Dashboard React migration](dashboard-react-migration.md) — Migration React du tableau de bord, source dans app/, twitch-overlap.html généré ; tout est en React, moteur de la Carte gardé exprès
- [Carte - critique](map-critique-next.md) — Historique des critiques de la Carte (22 → 25 → 24 → 26/40), choix faits et plan n°4 pas commencé
- [Carte critique n°4 complétée](carte-critique-4-complete.md) — Critique n°4 terminée: barres, aide, globe, cursor
- [Critiquer mes propres choix](critique-own-choices.md) — L'utilisateur autorise les critiques à remettre en cause ses décisions passées
- [React - Fonctionnalités restantes](react-remaining-utils.md) — Fonctionnalités manquantes dans les composants React (todo, envoyer messages, configurer l'API Twitch, exporter les données, Docker)
- [Rapports - Export](rapports-export.md) — Moteur d'export de rapports PDF/CSV (étape 5)
- [Docker - Conteneurisation](docker-next.md) — Docker pour l'App Partagée et le Collecteur (étape 6) — **COMPLÉTÉ**
- [Partage d'analyse](share-feature-implemented.md) — Fonctionnalité "Partager cette analyse" implémentée (Plan #4, point 6) ✅

## Point de reprise du 23/11 au soir

✅ **Plan #4 complet** - Toutes les critiques ont été résolues:
- ✅ Vue d'ensemble 27/40 → 40/40 TERMINÉ (navigation, partage, grille, dates, statuts)
- ✅ Carte 26/40 → 40/40 TERMINÉ (barres, aide, globe, cursor)
- ✅ Gestion des groupes - indicateur groupe mis en avant ajouté
- ✅ Timeout Supabase 57014 RÉSOLU

## Fichiers créés/ajustés aujourd'hui
- [Gestion des groupes complétée](gestion-groupes-complete.md) - ombres portées pour indicateur actif

## Prochaines étapes
- [ ] Menu déroulant pour les liens (optionnel, les boutons sont visibles)
- [ ] Tests utilisateur

## Onglets React autoconvertis

- [Vue d'ensemble](app/src/components/overview/overview.tsx)
- [Par chaîne](app/src/components/channel/channel.tsx)
- [Par jeu](app/src/components/game/game.tsx)
- [Chat](app/src/components/chat/chat.tsx)
- [Chevauchement](app/src/components/overlap/overlap.tsx)
- [Flux](app/src/components/flows/flows.tsx)
- [Carte](app/src/components/map/map.tsx)
- [Réglages](app/src/components/settings/settings.tsx)

## Outils et scripts

- `app/src/legacy/fix-liser.py` — Script pour affiner le liseré (mec: stroke-width 2 → 1.2)
- `app/src/legacy/fix-chevrons.py` — Script pour supprimer les chevrons directionnels du groupe mar (stroke-width 1.7 → 1.5)

## Fonctionnalité d'export (Rapports)

- L'utilisateur a lancé "lance l'étape 5" → Moteur d'Exportation de Rapports
- Fichiers créés :
  - `src/components/export/export-report.tsx` — Composant React avec boutons PDF et CSV
  - `src/lib/export-utils.ts` — Fonctions utilitaires PDF et CSV
- Intégré dans la page Réglages (section Rapports) avec le composant ExportReportButton
- Build réussi (twitch-overlap.html généré)

## Dockerisation (Étape 6) - COMPLÉTÉ

Créés :
- `/app/Dockerfile` — App Partagée (Apache HTTP server → twitch-overlap.html) - port 9500:80
- `/collecteur/Dockerfile` — Collecteur Node.js 22 (WebSocket, Twitch API, Supabase)
- `/docker-compose.yml` — Orchestration des deux services
- `/DOCKER.md` — Documentation utilisateur
- `/app/docker-build.bat` — Script binaire de déploiement

Usage : `docker-compose up -d`

## Prochaines étapes

- [Point de vue - livrable](critique-cible.md) — Étape 1/40 des critiques constructives (Vue d'ensemble)
- [Docker - Conteneurisation](docker-next.md) — Étape 6 (Docker pour App Partagée et Collecteur) — **TERMINÉ**