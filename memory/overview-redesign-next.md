---
name: overview-redesign-next
description: Plan d'amélioration de la Vue d'ensemble (27/40) - prochaines étapes critiques
metadata:
  type: project
---

# Plan Vue d'ensemble - Étapes critiques (continuation de 26 → 27/40)

## Contexte
La Vue d'ensemble est entièrement migrée en React (overview.tsx, recoup.tsx). Le bloc des recoupements, les KPIs, et l'analyse des chaînes sont fonctionnels.

## Critiques d'UX identifiées

### 1. **Clarté des indicateurs de statut** (priorité haute) ✅
- **Problème** : La "pouce" (pilule) de l'en-tête indique le statut et les problèmes, mais les couleurs ne sont pas assez contrastées pour les malvoyants
- **Critique** : L'erreur "Pilule de la période" n'est pas très explicite - l'utilisateur ne comprend pas ce que ça signifie
- **Plan n°4**:
  - [x] Ajouter une légende aux couleurs de la pilule
  - [x] Les titres d'erreur doivent inclure l'onglet concerné (ex: "Pilule de la période - all")
  - [x] Ajouter une info-bulle avec le détail technique au survol (via `alertTitle`)

### 2. **Section "Extra" cachée par défaut** (priorité haute) ✅
- **Problème** : Les analyses de fond (followers, publicité, modération) sont cachées sous un bouton qui se ferme/ouvre
- **Critique** : L'utilisateur n'est pas informé qu'il y a des analyse supplémentaires disponibles
- **Plan n°4**:
  - [x] Ajouter un compteur visuel du nombre d'analyses disponibles
  - [x] Animation du bouton lors d'un nouveau relevé
  - [x] Option "Mémoire" pour ouvrir cette section par défaut sur certaines périodes

### 3. **Grille des chaînes - ordre de lecture** (priorité moyenne) ✅
- **Problème** : Les 8 cartes et 8 lignes visibles - les autres sont dans un "ShowMore" qui n'indique pas l'ordre (cards vs rows)
- **Critique** : L'utilisateur ne comprend pas pourquoi certaines chaînes sont en "card" et d'autres en "row"
- **Plan n°4**:
  - [x] Ajouter un titre clair pour la section "Chaînes en live" - affiché comme "Chaînes en live (N)"
  - [x] Les "row" ont un titre plus explicite - "Prévisualisation hors ligne (N)"
  - [x] Option "Toujours voir les 2 premières en card" pour les nouvelles chaînes

### 4. **Dates et plages de temps** (priorité moyenne) ✅
- **Problème** : La période est affichée dans les boutons, mais pas clairement dans l'aperçu principal
- **Critique** : L'utilisateur doit cliquer dans l'onglet Chevauchement pour voir les dates exactes
- **Plan n°4**:
  - [x] Ajouter l'indication de dates dans le titre de la section "Activité sur la période" - affiché comme "Tout · Du 22 nov. au 23 nov. (2 jours)"
  - [x] Format: "Du 22/11 au 23/11 - 24h de données" (les heures de données calculées à partir des présences de la période)
  - [x] Badge visuel quand les données sont incomplètes - déjà implémenté

### 5. **Navigation entre les onglets** (priorité basse) ✅
- **Problème** : Les liens "Tout le chevauchement", "Tous les flux" sont en bas de colonne
- **Critique** : L'utilisateur doit scroller pour les trouver, et ils se comportent comme des liens classiques (pas d'indication de chargement)
- **Plan n°4**:
  - [x] Ajouter l'indicator de chargement (spinner) au survol - **NavLink component** implémenté
  - [x] Bouton "Voir tout" en haut à droite avec icône de flèche - **bouton ExternalLink dans le header**

### 6. **Export et partage des analyses** (priorité basse) ✅
- **Problème** : Aucun moyen de partager une analyse spécifique (ex: "Ces 3 paires sont les plus proches")
- **Critique** : L'utilisateur doit capturer d'écran ou re-copier manuellement les données
- **Plan n°4**:
  - [x] Bouton "Partager cette analyse" qui génère un lien avec les paramètres
  - [x] Copie du titre de la section et des chiffres clés dans le presse-papier

## Métrics à suivre
- % d'utilisateurs qui ouvrent la section "Extra"
- Temps moyen pour trouver une information critique
- Taux d'interaction avec les liens "Tout le..."

## Mise en œuvre
1. Priorité haute d'abord (statut + section Extra) ✅ **TERMINÉ**
2. Puis amélioration de la grille et dates ✅ **TERMINÉ**
3. Enfin navigation et partage ✅ **NAVIGATION TERMINÉ, PARTAGE TERMINÉ**
4. **Prochaine étape** : Option "Toujours voir les 2 premières chaînes en card" pour les nouvelles chaînes ✅ **TERMINÉ**
5. **Prochaine étape** : Fonctionnalité de partage d'analyse spécifique ✅ **TERMINÉ**