# Twitch Overlap — collecteur Docker
# Nécessite Node.js 22 ou plus récent. Construire depuis ce dossier (docker compose le fait).
# config.json n'est PAS copié dans l'image (il contient les clés Supabase et Twitch) : il est monté au
# démarrage, voir docker-compose.yml ou « docker run -v …/config.json:/app/config.json:ro ».

FROM node:22-alpine

# Installer SQLite (utilisé par le collecteur)
RUN apk add --no-cache sqlite

WORKDIR /app

# Volume pour les données persistantes
VOLUME ["/app/data"]

# Variable environnementale pour indiquer le mode Docker
ENV DOCKER_MODE=1

# Copier les fichiers nécessaires
COPY collecteur.mjs ./
COPY task-queue.js ./
COPY retry-handler.mjs ./
COPY metrics.mjs ./

# Démarrer le collecteur
CMD ["node", "collecteur.mjs"]