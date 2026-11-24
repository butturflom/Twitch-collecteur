# Twitch Overlap — App Partagée Docker

FROM node:20-alpine

WORKDIR /app

# Copier le fichier HTML généré (index.html → twitch-overlap.html) et le serveur
COPY dist/index.html /app/twitch-overlap.html
COPY server.js /app/server.js

# Exposer le port
EXPOSE 80

# Démarrer le serveur
CMD ["node", "server.js"]