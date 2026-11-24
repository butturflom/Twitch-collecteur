# Twitch Overlap — collecteur Docker (autonome)
# Nécessite Node.js 22 ou plus récent
# Fichiers collecteur.mjs et config.json doivent être dans ce dossier

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
COPY config.json ./
COPY task-queue.js ./
COPY retry-handler.mjs ./
COPY metrics.mjs ./

# Démarrer le collecteur
CMD ["node", "collecteur.mjs"]