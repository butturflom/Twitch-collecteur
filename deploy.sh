#!/bin/bash
# Twitch Overlap — Script de déploiement VPS
# Usage : ./deploy.sh [environment]
# Exemple : ./deploy.sh production

set -e

ENV=${1:-production}
DEPLOY_DIR="/opt/twitch-overlap"
BACKUP_DIR="/opt/backups/twitch-overlap"

echo "🚀 Déploiement Twitch Overlap vers $ENV..."

# Créer le répertoire de backup
mkdir -p "$BACKUP_DIR"

# Sauvegarder l'ancienne version si elle existe
if [ -f "$DEPLOY_DIR/.env" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/env_backup_$TIMESTAMP"
    cp "$DEPLOY_DIR/.env" "$BACKUP_FILE"
    echo "✅ Backup de l'ancienne configuration sauvegardé"
fi

# Arrêter les conteneurs existants
echo "⏹️  Arrêt des conteneurs..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" down 2>/dev/null || true

# Télécharger les nouvelles versions (si git est configuré)
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd "$DEPLOY_DIR"
    echo "📥 Mise à jour du code..."
    git fetch origin
    git reset --hard "origin/main"
fi

# Construire les nouveaux images
echo "🔨 Construction des images Docker..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" build --no-cache

# Restaurer le fichier .env
if [ -f "$BACKUP_FILE" ] && [ -f "$DEPLOY_DIR/.env.example" ]; then
    # Conserver les variables personnalisées, réinitialiser les nouvelles
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    if [ -f "$BACKUP_FILE" ]; then
        # Garder les valeurs personnalisées ( CLIENT_ID, SECRET, etc.)
        while IFS='=' read -r key value; do
            if [[ ! -z "$key" && "$key" != "#"* ]]; then
                sed -i "s|^$key=.*|$key=$value|" "$DEPLOY_DIR/.env" 2>/dev/null || true
            fi
        done < "$BACKUP_FILE"
    fi
    echo "✅ Configuration restaurée"
fi

# Démarrer les conteneurs
echo "▶️  Démarrage des conteneurs..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" up -d

# Attente et vérification
sleep 10
echo "🩺 Vérification de l'état..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" ps

# Afficher les logs récents
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" logs --tail=50

echo "✅ Déploiement terminé !"
echo ""
echo "📋 Vérification rapide :"
echo "   - App accessible sur http://localhost:9500"
echo "   - Logs collecteur : docker logs twitch-overlap-collecteur --tail 50"
echo "   - Statut Docker : docker ps | grep twitch"