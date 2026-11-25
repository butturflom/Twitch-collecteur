# Design System: Twitch Overlap

## North Star: L'Observatoire

Twitch Overlap se regarde comme on observe le ciel la nuit. Les communautés suivies sont des astres : on mesure leur éclat (viewers, messages), on suit leurs trajectoires (flux, raids) et on cartographie les zones où elles se recoupent. L'interface est la coupole : un fond noir profond, des panneaux à peine plus clairs posés dessus, et une seule lumière colorée, le violet nébuleuse, qui marque ce qu'il faut regarder. La Carte est l'endroit où la métaphore devient littérale : galaxie en volume, planètes en facettes, échos radar. C'est la pièce signature du système, et elle peut être plus expressive que le reste.

**Mode: Operate** - Instrument de lecture pour une seule personne, sur un écran d'ordinateur.

---

## Couleurs

### Palette principale
- **Violet nébuleuse** : `#8b7cff` (primary)
- **Violet profond** : `#6f5ff0` (fond bouton principal)
- **Crépuscule** : `#868693` (texte secondaire)
- **Coupole** : `#16161c` (fond principal)

### Couleurs d'état
- **Rouge live** : `#ff4757` → état "en direct"
- **Ambre signal** : `#f59e0b` (via `data-alert="warning"`)
- **Rouge signal** : `#f2636f` (erreur, distinct du live)

### Typographie
- **Titres** : Inter, 15px, medium, uppercase section-title
- **Corps** : Inter, 13.5px, regular
- **Chiffres comparables** : JetBrains Mono, tabular-nums, droite
- **Eyebrow** : JetBrains Mono, 10.5px, uppercase, gris #71717a

---

## Éléments de conception

### Bouton principal (ds-btn-primary)
Action principale, une seule par écran. Violet nébuleuse avec lueur.

### Bouton secondaire (ds-btn-secondary)
Bouton courant. Bordeau subtil, fond zinc.

### Contrôle segmenté
Choix de la période ou mode Vue/Graphique. Un seul bouton actif avec fond violet.

### Pilule de chaîne (ds-pill)
- Actif : fonds violet, bordure violet, initiales en fond violet
- Live : point rouge à droite
- Inactif : bordure subtile, texte crépuscule

### Pastilles (ds-badges)
- **Live** : fond rouge clair, point rouge vif, texte rouge clair
- **Langue** : fond zinc, bordure subtile, monospace

### Panneau (ds-panel)
Fond dégradé crête→coupole, bordure subtile, ombre ambiante. Titre avec repère carré violet.

### Groupe d'indicateurs (ds-kpis)
Fonds uni avec filets de séparation. Valeurs en Inter semi-gras, numéros tabulaires.

### Tableau de données (ds-tbl)
Cellules avec barre violette sous les valeurs (%). Texte mono aligné à droite.

### Champ de saisie (ds-input)
Fond zinc, bordure subtile, focus en violet nébuleuse.

### Navigation latérale (ds-nav)
Groupes avec titre eyebrow, élément actif avec barre violette et fond.

---

## Règles

| Règle | Corps |
|-------|-------|
| **Lumière unique** | Le violet nébuleuse est la seule couleur d'interface. Nouvelle fonction utilise le violet, une couleur de signal, ou la couleur d'une chaîne. |
| **Crépuscule lisible** | Texte secondaire atteint 4.5:1 contraste. Utiliser `--dusk`, pas d'autres gris. |
| **Rouge réservé** | Le rouge vif veut dire "en direct". Une erreur utilise le rouge signal plus doux. |
| **Chiffre en mono** | Les nombres comparables sont en JetBrains Mono tabular-nums. |
| **Note** | Chaque bloc d'interprétation a une note sous lui expliquant le chiffre et ses limites. |
| **Groupe à filets** | Les indicateurs liés partagent une surface séparée par des filets 1px. |
| **Deux niveaux de lueur** | Lueur vive = "c'est ici" ou "c'est l'action" (onglet actif, bouton principal, sélection). Lueur ambiante (halo « console », atmosphère des planètes) = ambiance, très faible, jamais au survol, seulement sur les pages du ciel étoilé. |

---

## Dos / Donts

**Do** :
- Garder le violet nébuleuse (#8b7cff) pour repères et sélections
- Utiliser les jetons CSS (`text-dusk`, `bg-primary-strong`)
- Mettre les chiffres comparables en JetBrains Mono tabular-nums
- Expliquer les états vides

**Don't** :
- Produire un dashboard SaaS générique
- Prévoir de thème clair
- Utiliser le rouge live pour autre chose que "en direct"
- Ajouter des lueurs décoratives
- Mettre le contenu en verre flouté

---

## Breakpoints
- **sm** : 640px
- **lg** : 1024px

---

## Éléments interactifs

| Élément | Transition |
|---------|------------|
| Apparition | fade-in + translateY(4px), 300ms |
| État | 200ms |
| Tiroir | 300ms cubic-bezier(.32,.72,0,1) |

---

## Navigation
- Vue d'ensemble
- Par chaîne
- (autres onglets selon contexte)

**Libellés en clair** - Voir LA RÈGLE dans DESIGN.md racine.