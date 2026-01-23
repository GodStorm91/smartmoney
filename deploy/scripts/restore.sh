#!/bin/bash
# SmartMoney PostgreSQL Restore Script
# Usage: ./restore.sh [backup_file]
# If no file specified, lists available backups

set -e

BACKUP_DIR="/root/smartmoney/backups"
CONTAINER="smartmoney-db"

# If no argument, list available backups
if [ -z "$1" ]; then
    echo "Available backups:"
    echo "=================="
    ls -lh "$BACKUP_DIR"/smartmoney_*.sql.gz 2>/dev/null | while read line; do
        echo "  $line"
    done
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 smartmoney_20260106_120000.sql.gz"
    exit 0
fi

BACKUP_FILE="$1"

# Check if file exists (with or without path)
if [ -f "$BACKUP_FILE" ]; then
    FULL_PATH="$BACKUP_FILE"
elif [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"
else
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will OVERWRITE the current database!"
echo "Backup to restore: $FULL_PATH"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Creating pre-restore backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec "$CONTAINER" pg_dump -U smartmoney smartmoney | gzip > "$BACKUP_DIR/pre_restore_${TIMESTAMP}.sql.gz"
echo "Pre-restore backup saved"

echo "Restoring database..."
# Drop and recreate database, then restore
gunzip -c "$FULL_PATH" | docker exec -i "$CONTAINER" psql -U smartmoney -d smartmoney

echo "Restore completed successfully!"
echo "If something went wrong, restore from: $BACKUP_DIR/pre_restore_${TIMESTAMP}.sql.gz"
