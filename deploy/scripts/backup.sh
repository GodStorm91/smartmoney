#!/bin/bash
# SmartMoney PostgreSQL Backup Script
# Runs daily via cron, keeps 7 days of backups

set -e

# Configuration
BACKUP_DIR="/root/smartmoney/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="smartmoney_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/smartmoney-backup.log"

# Docker container name
CONTAINER="smartmoney-db"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting backup..."

# Run pg_dump inside the container and compress
if docker exec "$CONTAINER" pg_dump -U smartmoney smartmoney | gzip > "$BACKUP_DIR/$BACKUP_FILE"; then
    FILESIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log "Backup successful: $BACKUP_FILE ($FILESIZE)"
else
    log "ERROR: Backup failed!"
    exit 1
fi

# Verify backup is not empty (minimum 1KB)
if [ $(stat -f%z "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_DIR/$BACKUP_FILE") -lt 1024 ]; then
    log "ERROR: Backup file too small, possibly corrupted!"
    rm -f "$BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "smartmoney_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED old backup(s)"

# List current backups
log "Current backups:"
ls -lh "$BACKUP_DIR"/smartmoney_*.sql.gz 2>/dev/null | tail -7 | while read line; do
    log "  $line"
done

log "Backup completed successfully"
