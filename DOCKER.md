# Docker - Twitch Overlap

Deux services Docker pour une installation complète : l'App Partagée et le Collecteur.

## Structure

```
twitch-collecteur/
├── docker-compose.yml      # Orchestration des deux services
├── app/
│   ├── Dockerfile          # App Partagée (Apache → twitch-overlap.html)
│   └── dist/               # Build Vite (généré avec npm run build)
└── collecteur/
    └── Dockerfile          # Collecteur Node.js 22
```

## Déploiement rapide

```bash
docker-compose up -d
```

## Services

### App (port 9500 → 80)

- **Image** : `twitch-overlap:app`
- **Port** : 9500 (modifiable dans `docker-compose.yml`)
- **Contenu** : `twitch-overlap.html` généré par `npm run build`
- **Data** : Aucun volume persistant (les données sont dans Supabase)

### Collecteur (en arrière-plan)

- **Image** : `twitch-overlap:collecteur`
- **Volumes** :
  - `config.json` → `/app/config.json` (paramètres Supabase, liste des chaînes)
  - `./collecteur-data` → `/app/data` (logs, cache, PID)
- **Cron** : Exécuter toutes les heures si besoin

## Configuration requise

Placez `config.json` à la racine du projet (au même niveau que `docker-compose.yml`):

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

## Développement

Construire manuellement :

```bash
# App
cd app && docker build -t twitch-overlap:app -f Dockerfile .

# Collecteur
cd collecteur && docker build -t twitch-overlap:collecteur -f Dockerfile .
```

## Arrêt

```bash
docker-compose down
```

Les données du volume persistent. Pour tout neter :

```bash
docker-compose down -v
```