# Coûts et dimensionnement par client

Document de conseil, tenu à jour à chaque nouveau client. Objet : dire quoi payer, à quel palier, et quand, selon ce qu'un client demande réellement. Décisions de cadre : `IDEES.md`, chantier D. Les prix ci-dessous sont **indicatifs** : les vérifier sur la page officielle avant de signer.

## 1. Principes

1. **Une collecte pour tous les clients.** Le collecteur suit l'union des chaînes de tous les clients, en une seule fois. Une chaîne suivie pour deux clients n'est collectée qu'une fois. Le coût marginal d'un client est donc surtout son stockage et son accès, pas la collecte.
2. **Le collecteur a une limite de 100 chaînes** (`CLAUDE.md`, « max 100 »). Au-delà, il faut une seconde instance ou une levée de cette limite. C'est le premier seuil de coût à surveiller.
3. **Le secret Twitch reste chez toi.** Il ne sort jamais du serveur. Le client reçoit un accès au tableau de bord, jamais la clé.
4. **Tu es responsable des données.** Chaque client voit uniquement ses chaînes et ses rapports : c'est le rôle des droits par client sur la base commune.
5. **On paie ce qui sert un client.** Un palier supérieur ne s'achète qu'une fois que le palier actuel est atteint, pas en prévision.

## 2. Ce qui coûte, mesuré

Mesures du projet (`SUIVI.md` §1, §8, §15) :

| Poste | Mesure | Source |
|---|---|---|
| Base totale | 271 à 285 Mo (les deux chiffres figurent dans SUIVI, à réconcilier) | SUIVI §1, §15 |
| Présence (brut) | 145 Mo | SUIVI §15 |
| Événements | 40 Mo | SUIVI §15 |
| Minutes | 33 Mo | SUIVI §15 |
| Rétention brute | présence 1 j, événements 3 j, minutes détaillées 7 j (valeurs de 24/11, `config.json` non relu) | SUIVI §8 |
| Rollups quotidiens | jamais purgés : ils croissent chaque jour | SUIVI §8 |

**Conséquence** : la base grossit de façon régulière à cause des rollups, même si les brutes sont purgées. Un client ajouté pèse donc durablement, pas seulement pendant sa période active.

Quotas Twitch (pour le collecteur) :
- Une requête Helix par cycle de 2 minutes pour jusqu'à 100 chaînes : très en dessous de la limite. La limite Twitch n'est pas le facteur qui coûte.
- Points de limitation : 800 par minute avec un jeton d'application, 30 sans jeton, selon les forums ([Twitch Dev, guide de l'API](https://dev.twitch.tv/docs/api/guide/) pour la confirmation officielle).

## 3. Paliers Supabase (indicatif, à vérifier)

| Palier | Prix | Ce que la source tierce indique | Quand |
|---|---|---|---|
| Free | 0 $ | 500 Mo de base | Un seul usage, base sous 400 Mo |
| Pro | 25 $/mois | 10 $ de crédit de calcul (une instance Micro), 8 Go de base, puis environ 0,125 $ par Go | Dès deux clients, ou dès que les rollups font dépasser 400 Mo |
| Team | 599 $/mois | Non détaillé ici | Au-delà de l'équipe de conseil, ou si un client l'exige |

Sources : [page tarifaire Supabase](https://supabase.com/pricing) (à confirmer, les chiffres ci-dessus viennent de comparateurs tiers), [facturation Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase).

Ordre de grandeur, à recalculer avec les vraies mesures : 8 Go à 285 Mo par base actuelle représentent environ 28 utilisateurs de cette taille. Mais la base grossit avec les rollups, donc le calcul réel doit venir des mesures de chaque palier, pas de cette règle.

## 4. Collecteur 24 h/24

- Le collecteur est un processus Node léger. Un petit serveur suffit pour une collecte de 100 chaînes au plus.
- **Prix du serveur : à chiffrer** sur deux ou trois offres de VPS, en comparant le coût mensuel, la sauvegarde et le support. Ne pas en fixer un avant.
- Une seule instance par collecte. Pas de seconde instance avant d'atteindre 100 chaînes uniques.

## 5. Décision par étape

| Étape | Déclencheur | Ce qu'on prend |
|---|---|---|
| 0 | Pas de client | Rien en ligne. Base actuelle sur Free. |
| 1 | Premier client signé | Collecteur 24 h/24 sur petit serveur. Base sur Free si elle reste sous 400 Mo, sinon Pro. |
| 2 | Deux clients ou plus | Pro, une collecte pour l'union des chaînes, droits par client. |
| 3 | Union des chaînes au-delà de 100 | Deuxième collecteur, ou levée de la limite après test. |
| 4 | Stockage au-delà de 8 Go | Passage au palier suivant ou purge plus courte pour certains rollups, après accord du client. |

## 6. Questionnaire d'entrée par client

À poser avant tout chiffrage :
1. Combien de chaînes suis-tu, et lesquelles ? (Vérifier les recoupements avec les autres clients.)
2. Quelle durée d'historique veux-tu garder ? (Détermine la rétention et le stockage.)
3. Acceptes-tu une coupure de collecte de quelques heures ? (Si non, le 24 h/24 est obligatoire.)
4. Combien de personnes utiliseront le tableau de bord ? (Droits et lectures.)
5. Quels rapports attends-tu, et à quelle fréquence ? (Mensuel, hebdomadaire, à la demande.)

## 7. Ce que je ne fais pas

- Je ne fixe pas de prix de vente à partir de ces coûts : c'est ta décision commerciale.
- Je ne promets pas de chiffre que les mesures ne soutiennent pas (sponsors, démographie, brand safety : `SUIVI.md` §11).
- Je ne donne pas une estimation de palier sans les réponses au questionnaire et une mesure réelle du stockage par client.
