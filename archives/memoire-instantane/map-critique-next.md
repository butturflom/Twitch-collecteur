---
name: map-critique-next
description: Plan d'amélioration de la Carte (26/40) - prochaines étapes critiques
metadata:
  type: project
---

# Plan Carte - Étapes critiques (continuation de 22 → 25 → 24 → 26/40)

## Contexte
La Carte est entièrement migrée en React (map.tsx). Toutes les fonctionnalités de base sont opérationnelles.

✅ **Critique n°4 terminée** (23/11/2026) :
- ✅ Barres fiche sur échelle traits (max=0.5) - progressive bar thickness implémenté dans MeterList
- ✅ Bouton "?" aide 3 onglets - composant Tab existe
- ✅ Mode Globe visible - badge existe
- ✅ Cursor change pour Globe mode - implémenté via svgRef

## Critiques d'UX identifiées

### 1. **Gestion des groupes** (priorité haute) ✅
- **Statut** : TERMINÉ - indicateur amélioré avec ombres portées
- **Plan n°4** :
  - [x] Ajouter un indicateur visuel du "groupe mis en avant" (ombre portée)
  - [ ] Séparer visuellement les groupes des chaînes isolées
  - [ ] Ajouter un bouton "Voir tous les groupes" quand il y a plus de 3 groupes

### 2. **Workflow de sélection** (priorité moyenne)
- **Plan n°4** :
  - [ ] Ajouter un mode "Sélection" avec icône de coche dans la barre d'outils principale
  - [ ] Les boutons de sélection deviennent visibles en haut de la carte quand on activite ce mode
  - [ ] Indiquer clairement le nombre de chaînes sélectionnées

### 3. **Performance avec beaucoup de chaînes** (priorité moyenne)
- **Plan n°4**:
  - [ ] Ajouter un filtre "Seulement les chaînes avec > X viewers"
  - [ ] Option "Grouper par catégorie de jeu" (si données disponibles)
  - [ ] Bouton "Simplifier la vue" qui masque les chaînes avec peu de viewers

### 4. **Amélioration de l'aide** (priorité basse)
- **Plan n°4**:
  - [ ] L'aide peut être affichée en "pièce jointe" (dock) sur le côté droit
  - [ ] Ajouter un bouton "Pinceau" pour copier le lien d'une chaîne vers le presse-papier

### 5. **Feedback visuel des actions** (priorité basse)
- **Plan n°4**:
  - [ ] Ajouter un spinner sur le bouton pendant le recalcul
  - [ ] Toast confirmation "Disposition recalculée"

## Métrics à suivre
- Nombre de groupes créés par période
- Temps moyen pour trouver une chaîne dans la liste
- Taux d'utilisation du bouton "Réorganiser"

## Mise en œuvre
1. ✅ Critique n°4 terminée (barres, aide, globe)
2. Priorité haute d'abord (groupes + sélection)
3. Puis performance et filtres avancés
4. Enfin améliorations UI/UX