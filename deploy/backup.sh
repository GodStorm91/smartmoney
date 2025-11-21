#!/bin/bash
set -e

# Load environment
source .env

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/smartmoney_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

echo "Creating database backup..."
docker compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > $BACKUP_FILE

echo "Backup saved to: $BACKUP_FILE"

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs -r rm

echo "Cleanup complete. Current backups:"
ls -lh $BACKUP_DIR/
