#!/bin/bash
# SmartMoney PostgreSQL Restore Script
# Usage: ./restore.sh [backup_file]
# If no file specified, lists available backups

set -e
umask 077

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
    echo "Usage: $0 <backup_file> [target_db]"
    echo "Example: $0 smartmoney_20260106_120000.sql.gz"
    echo "Example (restore drill): $0 smartmoney_20260106_120000.sql.gz smartmoney_restore_test"
    exit 0
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-smartmoney}"

if ! [[ "$TARGET_DB" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "ERROR: target_db must contain only letters, numbers, and underscores"
    exit 1
fi

# Check if file exists (with or without path)
if [ -f "$BACKUP_FILE" ]; then
    FULL_PATH="$BACKUP_FILE"
elif [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"
else
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [ "$TARGET_DB" = "smartmoney" ]; then
    echo "WARNING: This will RESTORE into the live smartmoney database!"
else
    echo "Restore drill mode: target database is $TARGET_DB"
    echo "The live smartmoney database will not be modified."
fi
echo "Backup to restore: $FULL_PATH"
echo "Target database: $TARGET_DB"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

if [ "$TARGET_DB" = "smartmoney" ]; then
    echo "Creating pre-restore backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    docker exec "$CONTAINER" pg_dump -U smartmoney smartmoney | gzip > "$BACKUP_DIR/pre_restore_${TIMESTAMP}.sql.gz"
    chmod 600 "$BACKUP_DIR/pre_restore_${TIMESTAMP}.sql.gz"
    echo "Pre-restore backup saved"
else
    echo "Ensuring test restore database exists..."
    if ! docker exec "$CONTAINER" psql -U smartmoney -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | grep -q 1; then
        docker exec "$CONTAINER" psql -U smartmoney -d postgres -c "CREATE DATABASE ${TARGET_DB}"
    fi
fi

echo "Restoring database into $TARGET_DB..."
gunzip -c "$FULL_PATH" | docker exec -i "$CONTAINER" psql -U smartmoney -d "$TARGET_DB"

echo "Restore completed successfully!"
if [ "$TARGET_DB" = "smartmoney" ]; then
    echo "If something went wrong, restore from: $BACKUP_DIR/pre_restore_${TIMESTAMP}.sql.gz"
fi
