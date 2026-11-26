# Docker — Twitch Overlap

Deux conteneurs : l'application (le tableau de bord, servi sur le port 9500) et le collecteur. Le collecteur du PC et celui de Docker ne doivent **jamais tourner en même temps** : les mêmes chaînes seraient écoutées deux fois.

## Structure

```
twitch-collecteur/
├── docker-compose.yml      # Lance les deux services
├── app/
│   ├── Dockerfile          # Application (Apache → twitch-overlap.html)
│   └── dist/               # Build Vite (généré par npm run build)
└── collecteur/
    ├── Dockerfile          # Collecteur, Node.js 22
    ├── collecteur.mjs      # Copie du collecteur de la racine (voir l'avertissement plus bas)
    ├── metrics.mjs, retry-handler.mjs, task-queue.js
```

## Démarrage

```bash
docker compose up -d
```

Le tableau de bord est ensuite sur http://localhost:9500.

## Services

### Application (port 9500 → 80)

- **Image** : `twitch-overlap:app`
- **Contenu** : `twitch-overlap.html`, généré par `npm run build` dans `app/`
- **Données** : aucun volume. Tout est dans Supabase.

### Collecteur

- **Image** : `twitch-overlap:collecteur`
- **Redémarrage** : automatique (`restart: unless-stopped`)
- **Volumes** :
  - `./config.json` → `/app/config.json` (lecture seule : clés et liste des chaînes)
  - `./collecteur-data` → `/app/data` (journal, cache)
  - `./collecteur-pid` → `/app/.pid` (verrou et drapeaux)

## Configuration

Place `config.json` à la racine du projet, au même niveau que `docker-compose.yml`. Les clés sont les mêmes que sur le PC (voir `LISEZMOI.md` §7) :

```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseSecretKey": "sb_secret_xxx",
  "twitchClientId": "xxx",
  "twitchClientSecret": "xxx",
  "chainesParDefaut": ["etoiles", "xari"],
  "joursDetailMinute": 14,
  "joursPresence": 21
}
```

`config.json` n'est jamais copié dans l'image : il contient les clés. Il est monté à chaque démarrage.

## Avertissement : copie du collecteur en retard

`collecteur/collecteur.mjs` n'est pas synchronisé avec la racine. La version de la racine (`collecteur.mjs`, 1.6.13 au moment de cette mise à jour) fait foi. Avant de lancer le conteneur, reporte dans la copie les changements de la racine, puis vérifie les points propres à la copie Docker (file de relance, `/metrics`, compteur global). Le détail est dans `SUIVI.md` §5.

## Développement

Construire les images à la main :

```bash
# Application
cd app && docker build -t twitch-overlap:app -f Dockerfile .

# Collecteur
cd collecteur && docker build -t twitch-overlap:collecteur -f Dockerfile .
```

Lancer le collecteur sans compose, depuis la racine :

```bash
docker run -d --name twitch-overlap-collecteur -v "$PWD/config.json:/app/config.json:ro" twitch-overlap:collecteur
```

## Arrêt

```bash
docker compose down
```

Les volumes `collecteur-data` et `collecteur-pid` restent. Pour tout supprimer, y compris ces dossiers : `docker compose down -v` (ne touche pas à Supabase).
