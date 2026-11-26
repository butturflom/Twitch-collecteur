# Twitch Overlap — guide utilisateur

Petit programme qui tourne en fond sur ton PC Windows. Il écoute les chats Twitch 24h/24, relève les viewers et les jeux, et envoie des compteurs dans une base Supabase. Le tableau de bord `twitch-overlap.html` lit ensuite cette base, depuis n'importe quel navigateur.

Ce qui part dans Supabase : des compteurs (qui a écrit où et combien, emotes, mots, ambiance, viewers, jeux, raids, subs, sanctions). Les pseudos sont remplacés par une empreinte avant l'envoi, et le texte des messages n'est jamais conservé.

Les notes de chaque version sont dans [CHANGELOG.md](CHANGELOG.md).

## 1. Installer

### 1.1 La base Supabase (une seule fois)

1. Sur supabase.com, crée un **nouveau projet** gratuit (région Paris, eu-west-3). Garde-le séparé de tes autres projets.
2. Dans le projet : **SQL Editor** → **New query** → colle tout le contenu de `schema.sql` → **Run**.
3. **Project Settings** → **API Keys** : note la **clé publique** (`sb_publishable_…`) et la **clé secrète** (`sb_secret_…`). Dans **Data API**, note l'URL du projet (`https://….supabase.co`).

### 1.2 L'API Twitch (conseillé)

Sur dev.twitch.tv/console/apps → **Enregistrer votre application** (URL de redirection `http://localhost`, catégorie Analytics) → note le **Client ID**, puis **Nouveau secret**. Sans ça, le collecteur n'a que le chat : pas de viewers, de jeux, de clips, de followers ni de liens VOD.

### 1.3 Le collecteur sur ton PC

1. Installe **Node.js LTS** (version 22 ou plus) depuis nodejs.org.
2. Mets ce dossier où tu veux, par exemple `Documents\twitch-collecteur`.
3. Double-clique sur **`lancer.bat`** : il crée `config.json` et l'ouvre dans le Bloc-notes. Remplis `supabaseUrl`, `supabaseSecretKey` (la clé **secrète** : elle ne quitte jamais ton PC), `twitchClientId`, `twitchClientSecret`, et `chainesParDefaut` (la liste de départ ; ensuite tu la gères depuis le tableau de bord).
4. Relance **`lancer.bat`**. Tu dois voir « Connecté au chat Twitch ». Laisse tourner une minute, puis ferme la fenêtre.
5. Double-clique sur **`installer-demarrage.bat`** : le collecteur tourne en arrière-plan, sans fenêtre, et se relance à chaque démarrage de Windows. Une tâche planifiée (« TwitchOverlapCollecteur ») le relance aussi toutes les 5 minutes s'il s'est arrêté ; s'il tourne déjà, elle ne fait rien.

Pour créer l'icône « Twitch Overlap » sur le Bureau et dans le menu Démarrer, lance **`creer-raccourci.bat`**. Elle ouvre le tableau de bord et relance le collecteur s'il est arrêté. Si tu déplaces le dossier, relance ce fichier.

### 1.4 Arrêter

- **`desinstaller-demarrage.bat`** retire le démarrage automatique et la tâche de relance, puis demande au collecteur de s'arrêter. Il a jusqu'à 20 s pour envoyer ses dernières données.
- Si tu l'arrêtes seulement avec le Gestionnaire des tâches, il revient tout seul en 5 minutes au plus.
- La relance ne marche que session Windows ouverte. Si le PC redémarre et reste sur l'écran de connexion, le collecteur attend que tu ouvres ta session.

## 2. Le tableau de bord

Ouvre `twitch-overlap.html` → **Réglages** → **Source des données** → **Collecteur 24h/24** → colle l'URL du projet, la clé **publique** et le **code du tableau** → **Connecter**.

- **Code du tableau** : créé par le collecteur à son premier démarrage, à la ligne `codeTableau` de `config.json`. La clé publique n'est pas un secret ; c'est ce code qui empêche quelqu'un d'autre de modifier ta liste de chaînes. Pour en changer, efface la ligne `codeTableau`, relance le collecteur, puis colle le nouveau code dans la page.
- **Ajouter un streamer** : bouton **+ Streamer**, ou **Réglages** → **Chaînes suivies**. Tape un pseudo ou colle un lien `twitch.tv/…`, puis **Suivre**. Avec l'API Twitch renseignée dans les Réglages (Client ID + secret → **Générer le jeton**, valable environ 60 jours), la recherche affiche photo et statut live.
- **Retirer** : clique sur **×**, puis sur **retirer ?**. Le collecteur suit 100 chaînes au maximum. Les changements sont pris en compte dans la minute.
- **Mode « Ce navigateur »** : sans collecteur, les données sont relevées par la page elle-même, tant qu'elle reste ouverte. Les pseudos y sont aussi remplacés par une empreinte.

## 3. Ce que le collecteur mesure

- **Chat** : emotes 7TV, BTTV et FFZ (listes rechargées toutes les heures) ; type de chaque message (réaction, vague, vers le streamer, entre viewers, commentaire, court, commande) ; participation (part des viewers qui écrivent, messages pour 1 000 viewers). Seuls des compteurs sont envoyés.
- **Audience** : viewers, jeux, langue déclarée par le streamer, followers (relevés chaque heure), raids reçus, changements de jeu.
- **Clips** : les meilleurs clips de chaque chaîne, placés sur la minute exacte du live. Seuls le titre et le nombre de vues sont gardés, jamais le pseudo de celui qui l'a créé.
- **Publicité et métadonnées** : pub déclarée, labels de contenu, tags, réglages du chat (mode lent, abonnés seulement, emotes seulement, messages uniques, followers seulement).
- **Modération** : bans, timeouts, chats vidés et messages supprimés, comptés par chaîne et par minute. Ni le pseudo sanctionné ni le modérateur ne sont gardés.
- **Changements de stream** : quand un même viewer écrit chez une chaîne puis chez une autre moins de 3 h après, c'est compté message par message.
- **Périodes sans écoute** : les moments où le collecteur n'écoutait pas une chaîne (PC éteint, chat coupé, chaîne pas encore ajoutée) sont grisés sur les courbes.

Les états « du moment » (paramètres du chat, pub déclarée, langue) ont un historique qui commence à la mise à jour qui les a introduits : il n'existe pas pour avant.

## 4. Mettre à jour

- **Collecteur** : remplace le dossier (ou fais `git pull`), puis relance `lancer.bat`.
- **Base** : si la note de version le demande, rejoue **tout** `schema.sql` dans le SQL Editor. Le script est idempotent : il ajoute ce qui manque et ne supprime rien.
- **Tableau de bord seul** : recharge la page.

Chaque entrée de [CHANGELOG.md](CHANGELOG.md) indique si `schema.sql` doit être rejoué.

## 5. Stockage et conservation

Supabase gratuit s'arrête à **500 Mo**. Le collecteur avertit dans son journal et sur le tableau de bord dès **400 Mo**. La taille actuelle s'affiche dans **Réglages** → **Source des données**.

Les durées se règlent dans `config.json` :

| Clé | Défaut du code | Rôle |
|---|---|---|
| `joursDetailMinute` | 14 | Détail minute par minute (courbes fines) |
| `joursPresence` | 21 | Présences des viewers : la donnée la plus lourde (environ 0,3 Ko par viewer, par chaîne et par jour) |
| `joursEvenements` | 60 | Bans, timeouts, chats vidés, messages supprimés |
| `joursReleves` | 30 | Relevés de viewers |
| `alertes` | `true` | Notifications Windows en cas d'envois bloqués ; `false` les coupe |

Avec 86 chaînes, la version 1.6.11 a mesuré jusqu'à 19 Mo par heure aux heures de pointe, et recommande pour l'offre gratuite **2, 1, 2, 2** pour `joursDetailMinute`, `joursPresence`, `joursEvenements`, `joursReleves` : les périodes « 7 jours » et « 30 jours » ne montrent alors que 2 jours. Le fichier `config.exemple.json` garde les défauts du code ; c'est `config.json` qui fait foi. Une ligne supprimée ne fait pas baisser la taille annoncée tout de suite : la place est réutilisée pour les nouvelles données.

Les champs `sel` et `codeTableau` sont créés automatiquement. **Ne modifie jamais `sel`** : toutes les empreintes changeraient et les viewers ne seraient plus reconnus d'un jour à l'autre.

## 6. Bon à savoir

- **PC éteint ou en veille** : rien n'est collecté pendant ce temps. Désactive la mise en veille automatique (Paramètres → Système → Alimentation).
- **Coupure internet** : le collecteur garde les données et les envoie au retour du réseau. Ce qui n'est pas encore parti est recopié dans `en-attente.json` toutes les 30 s. Ce fichier est donc presque toujours présent : ne le supprime pas.
- **Arrêt brutal** (Gestionnaire des tâches, coupure de courant) : seules les dernières secondes peuvent se perdre.
- **Une seule instance** : même si Windows lance le collecteur deux fois, la seconde se ferme.
- **Envois bloqués** : après 3 envois refusés de suite, une notification Windows s'affiche, puis un rappel toutes les 30 minutes. Si le collecteur lui-même est arrêté, c'est le tableau de bord qui l'indique.
- **Positions des chaînes sur la carte** : celles que tu déplaces à la souris sont gardées dans le navigateur où tu les as déplacées, pas dans Supabase.
- **Projet gratuit en pause** : Supabase met en pause un projet gratuit inactif pendant 7 jours. Tant que le collecteur tourne, ça n'arrive pas.
- **Journal** : `collecteur.log`, dans ce dossier.

## 7. Réglages de `config.json`

| Clé | Rôle |
|---|---|
| `supabaseUrl` | URL du projet Supabase |
| `supabaseSecretKey` | Clé secrète : reste sur ce PC |
| `twitchClientId`, `twitchClientSecret` | API Twitch (viewers, jeux, clips, followers, VOD) |
| `chainesParDefaut` | Liste de départ, uniquement pour le premier démarrage |
| `codeTableau` | Créé automatiquement ; à coller dans le tableau de bord |
| `sel` | Créé automatiquement ; ne jamais le modifier |
| `joursDetailMinute`, `joursPresence`, `joursEvenements`, `joursReleves` | Durées de conservation (§5) |
| `alertes` | Notifications Windows (§6) |

## 8. Agences

Pour servir une agence à la main : une base Supabase par client, son collecteur, et un rapport livré chaque mois.

- `node scripts/nouveau-client.mjs "Agence" chaine1 chaine2 …` prépare `clients/<agence>/` (config avec sel et code propres au client, roster, copie du collecteur, schéma, `INSTALLATION.md`). Il ne crée rien chez Supabase ni chez Twitch. Le dossier `clients/` n'est pas versionné : il contient des clés.
- `node scripts/rapport-mensuel.mjs clients/<agence> [jours]` écrit `rapport.pdf`, `rapport.html` et `rapport.csv`. Le PDF vient de Chrome ou d'Edge en mode sans fenêtre ; `--sans-pdf` saute cette étape.
- Avant de montrer un rapport, laisse tourner le collecteur au moins 7 jours. Le rapport signale lui-même une couverture trop courte.

Démarche et limites : [VALIDATION-AGENCES.md](VALIDATION-AGENCES.md), [COUTS-CLIENTS.md](COUTS-CLIENTS.md), [CONFORMITE.md](CONFORMITE.md).

## 9. Développer avec Claude Code

Pour le travail sur le code : [CLAUDE.md](CLAUDE.md) (règles et architecture), [SUIVI.md](SUIVI.md) (état des chantiers), [app/LISEZMOI.md](app/LISEZMOI.md) (tableau de bord), [DOCKER.md](DOCKER.md) (conteneurs). Pour lancer Claude Code en orchestrateur depuis ce dossier, double-clique sur **`lancer-orchestrateur.bat`**.
