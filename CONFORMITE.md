# Conformité : vie privée, conditions de Twitch, limites techniques

État au 25/11/2026. Ce document dit ce que le projet fait, ce qu'il ne fait pas, et ce qui reste à faire valider **par un juriste** avant de vendre ou de partager le service. Ce n'est pas un avis juridique.

## 1. Ce que le projet collecte

| Donnée | Où | Durée | Personnelle ? |
|---|---|---|---|
| Empreinte d'un viewer actif (SHA-256 de `sel:pseudo`, 12 caractères), chaîne, jour, jeu | `presence`, `switches` | `joursPresence` (1 j), puis supprimée par `cleanup` | Pseudonymisée : le sel est dans `config.json`, sur le PC du collecteur |
| Activité par minute (compteurs), événements (subs, bits, raids, bans : sans pseudo) | `minutes`, `events` | 3 à 7 jours | Non (agrégats par chaîne) |
| Relevés Helix : viewers, jeu, followers | `snaps`, `chan_meta` | 3 jours | Non (données de chaînes) |
| Rollups quotidiens, matrice de chevauchement, esquisses HyperLogLog | `daily_*` | Conservés | Non : aucune empreinte n'y figure |

Jamais stocké : le texte des messages, les pseudos en clair, les adresses IP, les jetons des diffuseurs.

## 2. Mesures en place

- **Pseudonymisation** : sel aléatoire de 128 bits par installation, jamais envoyé à la base.
- **Minimisation** : seules les empreintes des viewers *actifs dans le chat* sont gardées ; la liste des spectateurs n'est pas collectée.
- **Durées courtes** : l'identifiant pseudonymisé disparaît après 1 jour ; seuls des agrégats restent.
- **Lecture protégée** (25/11/2026) : la clé publique ne lit plus rien toute seule. La base rend ses lignes seulement si la requête porte le code du tableau de bord (`codeTableau`, 96 bits). Voir `migration_lecture_protegee.sql`.
- **Droit à l'effacement** : `node oublier.mjs pseudo` retire un viewer à partir de son pseudo (l'empreinte est recalculée avec le sel).
- **Un sel par client** (25/11/2026) : `scripts/nouveau-client.mjs` tire un sel et un code du tableau propres à chaque dossier client ; les empreintes d'un client ne sont pas comparables à celles d'un autre. `clients/` n'est pas versionné (clés, sel).
- **Écriture fermée** : seule la clé secrète (sur le PC) écrit ; la liste des chaînes se modifie avec le code du tableau.

## 3. Ce qui reste à faire valider

1. **RGPD.** Une empreinte avec un sel que vous gardez reste une donnée *pseudonymisée*, donc personnelle au sens du RGPD tant que vous pouvez la relier à un pseudo (c'est ce que fait `oublier.mjs`). Pour un usage commercial il faut : une base légale (intérêt légitime, avec une mise en balance écrite), une information des personnes (page publique ou mention), un registre de traitement, et une réponse aux demandes d'accès et d'effacement. Un juriste doit valider ce cadre, surtout pour des chaînes tierces suivies au profit d'un client.
2. **Conditions de Twitch.** Le [contrat des services pour développeurs](https://legal.twitch.com/legal/developer-agreement) contient une règle de stockage : les données d'utilisateurs Twitch qui ne sont pas créés par votre application ne doivent pas être gardées plus de 24 heures, sauf accord de l'utilisateur (OAuth) ou accord avec Twitch ([discussion sur le forum développeurs](https://discuss.dev.twitch.com/t/storage-of-data-from-twitch-api/63884)). Le projet garde l'empreinte d'un viewer 1 jour et des agrégats plus longtemps : **c'est une zone grise**, d'autant plus pour un service payant. Des développeurs à qui on avait demandé de revendre des analyses tirées de données publiques se sont fait répondre qu'il faut un accord séparé avec Twitch (réponse de la communauté, pas une position officielle). Je n'ai pas pu lire le texte actuel de la clause : à vérifier sur la page du contrat ou en écrivant à l'équipe développeurs de Twitch avant toute vente.
3. **Chaînes suivies.** Prévenir les streamers dont la chaîne est suivie pour un client, et leur permettre de sortir du suivi.

## 4. Limites techniques sans changer de forfait

- Le palier gratuit de Supabase (500 Mo, 2 projets actifs) tient une base, pas plusieurs clients : 285 Mo utilisés le 25/11. Une base par client demande des projets payants.
- Le code du tableau est un secret partagé, pas un compte : tous ceux qui le connaissent voient tout. Suffisant pour vous seul, ou pour un client unique servi à la main ; insuffisant pour plusieurs utilisateurs avec des droits différents (il faudra alors l'authentification Supabase, des rosters côté serveur et un schéma par client).
- Pas de limitation du nombre d'essais sur le code : le code fait 96 bits, la devinette est hors de portée, mais ne le raccourcissez pas.
