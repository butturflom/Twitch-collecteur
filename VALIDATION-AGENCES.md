# Valider la demande des agences (étape 1 du SUIVI.md, §12)

Objectif : savoir, avant de construire un service, si le rapport de roster fait **payer** ou **changer une décision**. Cible : 3 à 5 agences ou talent managers. Durée : environ 3 semaines.

Ce fichier est un kit à utiliser à la main. Aucun code n'est à écrire pour cette étape.

## 1. Ce qu'on montre

Un seul objet : le **rapport de roster PDF** (Rosters → un roster → « Exporter le rapport », impression du navigateur). Il contient :

- **Net Reach** : audience active réellement unique du groupe de chaînes ;
- **Cannibalisation** : part de l'audience qui fait doublon ;
- **Exclusifs** par chaîne : ce que chaque créateur apporte en propre ;
- **Synergies** : les paires de chaînes qui partagent le plus de viewers.

Sur 7, 30 ou 90 jours, les chiffres sont des estimations (± 2,3 %) et le rapport ne donne alors ni exclusifs ni paires : le dire.

Option pour la démonstration en direct : la Carte, le Flux (où vont les viewers) et la comparaison de 2 à 4 chaînes. Ne pas montrer plus : le but est de tester le rapport, pas l'outil entier.

## 2. Préparer le rapport avant chaque rendez-vous

1. Demander à l'agence la **liste de ses créateurs** (10 à 50 chaînes, pseudos Twitch publics).
2. Les ajouter au suivi (`add_channels`, avec le code du tableau) et **laisser tourner au moins 7 jours** : sinon le rapport est trop pauvre (aujourd'hui, 2 journées agrégées seulement).
3. Créer le roster, choisir la période, exporter le PDF. Relire les chiffres : rien d'inventé, une chaîne absente est signalée par le rapport.
   Pour un client suivi dans sa propre base (étape 2), le rapport se génère en ligne de commande : `node scripts/rapport-mensuel.mjs clients/<nom>` (voir `scripts/nouveau-client.mjs`). Il produit un PDF, un HTML et un CSV.
4. Prévoir aussi le CSV (compatible Excel français), certains clients le demanderont.

Honnêteté : ne montrer aucun chiffre qu'on n'a pas mesuré. Pas de sponsors, de deals, de brand safety ni de démographie (voir SUIVI.md, §11).

## 3. Où trouver des interlocuteurs

Pas de liste inventée : à constituer. Pistes :

- agences et talent managers de streamers francophones (équipes d'esport et de divertissement, collectifs, structures de management) ;
- chargés d'influence côté marques qui achètent des campagnes Twitch ;
- gros streamers qui gèrent eux-mêmes un petit collectif de créateurs.

Premier message (court, sans pièce jointe, à adapter) :

> Bonjour, je développe un outil qui mesure l'audience réellement unique d'un groupe de chaînes Twitch (combien de viewers différents vous touchez, au-delà des doublons entre créateurs). Pourriez-vous me donner 20 minutes pour que je vous montre un rapport sur quelques-uns de vos créateurs, et recueillir votre avis ? Je ne vends rien à ce stade.

## 4. Déroulé du rendez-vous (20 à 30 min)

**Avant de montrer** (5 min), poser sans orienter :
1. Comment mesurez-vous aujourd'hui l'audience de votre groupe de créateurs ?
2. Avec quels outils, et à quel prix ? Qu'est-ce qui vous manque ?
3. Quelle décision prenez-vous avec ces chiffres (signer, recruter, répartir un budget, proposer une campagne) ?

**En montrant le rapport** (10 min) :
4. Que comprenez-vous de ce chiffre ? (tester la lisibilité du Net Reach et de la cannibalisation)
5. Qu'est-ce qui vous surprend ou vous semble faux ?
6. Qu'est-ce que vous en feriez, concrètement, demain ?

**Pour conclure** (5 min) :
7. Ce rapport vous ferait-il **changer une décision** ? Laquelle ?
8. Le recevriez-vous chaque mois ? Combien de créateurs, quelle fréquence ?
9. Quelle somme vous semblerait normale pour ça ? (laisser répondre en premier, ne pas ancrer un prix)
10. Que faudrait-il ajouter pour que vous payiez ?
11. Qui d'autre chez vous ou chez un confrère devrait le voir ?

Noter les mots exacts, pas des interprétations.

## 5. Grille de suivi (une ligne par rendez-vous)

| Date | Agence / contact | Nb créateurs | Outil actuel et prix | Décision visée | Lisible ? | Changerait une décision ? | Prix cité | Demandes en plus | Suite |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |

## 6. Critères de décision (à fixer avant les rendez-vous)

- **Poursuivre vers l'étape 2** (service pour un premier client) : au moins 2 agences sur 5 disent que le rapport changerait une décision **et** citent un prix ou acceptent un essai payant.
- **Ajuster le rapport** : la même demande revient chez 2 agences ou plus (par exemple un autre format, une autre mesure possible avec nos données).
- **Arrêter ou revoir la direction** : personne ne change de décision, ou le besoin réel est ailleurs (sponsors, démographie : on ne le collecte pas).

Ne pas compter un compliment comme une validation : seuls comptent un prix, un essai payant ou une décision changée.

## 7. Avant de montrer de vraies données

- Ne montrer que des chiffres **agrégés par chaîne** (jamais de pseudos de viewers : on ne les a pas, seulement des empreintes).
- Prévenir l'interlocuteur que les chaînes tierces sont suivies de façon passive, en anonymisant les viewers (voir `CONFORMITE.md`).
- Ne pas laisser le tableau de bord ni la clé publique à quelqu'un : la lecture est protégée par un code, mais le tableau lit toute la base (SUIVI.md, §12). Ne donner qu'un PDF ou un CSV.
- Les points RGPD et les conditions de Twitch restent à valider avant de **vendre** quoi que ce soit (étape 2).

## 8. Ce qui reste hors de cette étape

Aucune construction d'un service : pas de comptes, pas de multi-utilisateur, pas de VPS. Voir SUIVI.md, §12 (étapes 2 et 3).
