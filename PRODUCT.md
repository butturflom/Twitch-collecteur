# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Aujourd'hui, une seule personne : le propriétaire du projet, qui l'utilise pour lui-même, par curiosité. Il suit une liste de chaînes Twitch qu'il choisit (100 au maximum) et ouvre le tableau de bord sur son ordinateur pour comprendre ces communautés : qui regarde quoi, comment les audiences se recoupent, comment vit chaque chat. Direction décidée le 25/11/2026 : faire évoluer l'outil vers les agences et les talent managers (suivre un roster de 10 à 50 créateurs, mesurer l'audience réellement unique du groupe, produire des rapports pour leurs clients). Tant que les comptes, le partage et la vie privée ne sont pas revus (voir SUIVI.md, §12), le produit reste mono-utilisateur.

## Product Purpose

Twitch Overlap se compose de deux parties :

- **Le collecteur** (`collecteur.mjs`), un programme Node qui tourne en fond 24h/24 sur le PC Windows. Il écoute les chats, relève viewers, jeux, followers, clips, raids, subs et réglages du chat par l'API Twitch, et envoie des compteurs dans une base Supabase personnelle.
- **Le tableau de bord** (`twitch-overlap.html`, construit depuis `app/`). Il lit cette base et la présente en onglets : Vue d'ensemble, Par chaîne, Par jeu, Chat, Audience, Chevauchement, Carte, Flux, Configuration, Réglages.

Le projet réussit quand on peut répondre, à partir de ses propres données, à des questions qu'aucun site public ne pose : quelles chaînes partagent leurs viewers, comment l'audience circule de l'une à l'autre, ce que le chat dit vraiment de l'ambiance d'un live.

## Positioning

Contrairement aux sites de stats publics (TwitchTracker, SullyGnome…), Twitch Overlap :

- **mesure le chevauchement d'audience** : quels viewers regardent plusieurs chaînes, avec des liens et des flux entre chaînes ;
- **montre ce chevauchement sur la Carte**, une galaxie où Twitch est au centre et où chaque chaîne est une planète en orbite ; c'est la pièce maîtresse ;
- **lit le chat en détail** : type de chaque message (réaction, vague, vers le streamer, entre viewers, commentaire…), ambiance, emotes 7TV/BTTV/FFZ, participation pour 1 000 viewers ;
- **écoute 24h/24 la liste de l'utilisateur**, au lieu d'un échantillon public.

## Operating Context

- Le tableau de bord s'ouvre en `file://` dans Chrome, par l'icône « Twitch Overlap » (`ouvrir-twitch-overlap.vbs`), qui relance aussi le collecteur s'il s'est arrêté. La connexion Supabase (URL, clé publique, code du tableau de bord) est gardée dans le localStorage du navigateur.
- La page se met à jour toute seule chaque minute. Mots et emotes arrivent avec jusqu'à 5 minutes de décalage.
- Deux sources de données : « Collecteur 24h/24 » (Supabase) ou « Ce navigateur » (collecte locale).
- Toutes les heures sont affichées à l'heure de Paris.
- Interface entièrement en français, avec le tutoiement.

## Capabilities and Constraints

- Source dans `app/` (Vite, React, Tailwind v4, shadcn). `npm run build` produit un seul fichier HTML à la racine, qu'on ne modifie jamais à la main.
- `app/src/legacy/legacy.js` garde la collecte, le stockage, la synchronisation Supabase et les calculs. Il envoie les données à React par des événements `legacy:*`. Le moteur de dessin de la Carte reste volontairement impératif dans legacy.js : React gère la page autour.
- Mode démo en dev seulement : `npm run dev` puis `?demo=<onglet>`.
- La liste des chaînes ne se modifie qu'avec le code du tableau de bord (`codeTableau` dans `config.json`).
- Limites de rétention : détail minute par minute gardé 14 jours, présences 21 jours. Les états « du moment » (pub déclarée, labels, réglages du chat) n'ont pas d'historique antérieur à leur ajout.
- Un utilisateur, un ordinateur. Pas de comptes, pas de partage.

## Brand Commitments

- Nom : « Twitch Overlap ». Icône : `twitch-overlap.ico`.
- Vie privée : les pseudos des viewers sont remplacés par une empreinte avant l'envoi, le texte des messages n'est jamais conservé, ni le pseudo des personnes qui créent les clips. Aucune fonction future ne doit revenir là-dessus.
- Langue : français, ton direct et tutoyé, comme dans `LISEZMOI.md`.

## Evidence on Hand

- Vraies données dans la base Supabase de l'utilisateur. Claude ne peut pas les ouvrir directement : il faut les exporter par un script Node.
- `LISEZMOI.md` : documentation complète, avec l'historique des versions.
- `schema.sql` : schéma de la base.
- Aucun témoignage, aucun utilisateur externe, aucun chiffre public. Il n'y en a pas, il ne faut pas en inventer.

## Product Principles

1. **Montrer ce que les sites publics ne montrent pas.** Chevauchement, flux et lecture du chat passent avant les statistiques classiques.
2. **La Carte est le cœur.** Elle doit rester lisible : on doit pouvoir y lire les orbites, les tailles et les liens, et le spectacle ne doit pas cacher la donnée.
3. **Vie privée par construction.** On ne garde que des compteurs et des empreintes, jamais de texte ni de pseudos.
4. **Honnête sur ses limites.** Dire quand une donnée manque, est partielle ou date d'après une mise à jour du collecteur, plutôt que de combler les trous.
5. **Prototyper avant de toucher au code** pour tout changement visuel important (fond, planètes, mouvement, effets) : l'utilisateur choisit sur des prototypes.
