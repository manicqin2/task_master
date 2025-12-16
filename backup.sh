#!/bin/bash

# Task Master - Backup Script
# Creates a backup of the SQLite database

set -e

BACKUP_DIR="/opt/taskmaster/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tasks_backup_${TIMESTAMP}.db"

echo "========================================="
echo "Task Master Database Backup"
echo "========================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup..."

# Copy database from Docker volume
sudo docker compose -f docker-compose.prod.yml exec -T backend sh -c \
    "cat /app/data/tasks.db" > "${BACKUP_DIR}/${BACKUP_FILE}"

# Verify backup was created
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "   File: ${BACKUP_FILE}"
    echo "   Size: ${BACKUP_SIZE}"
    echo "   Location: ${BACKUP_DIR}/${BACKUP_FILE}"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "🗄️  Existing backups:"
ls -lh "$BACKUP_DIR"

echo ""
echo "💡 Tip: Set up a cron job to automate backups:"
echo "   crontab -e"
echo "   # Add this line for daily backups at 2 AM:"
echo "   0 2 * * * /opt/taskmaster/backup.sh"
echo ""

# Optional: Keep only last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t tasks_backup_*.db | tail -n +8 | xargs -r rm
echo "   Done!"
echo ""
