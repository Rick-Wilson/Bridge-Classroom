#!/bin/bash
# Nightly backup of Bridge Classroom SQLite database
# Writes a timestamped copy locally and to Google Drive

DB_PATH="/Users/rick/Development/GitHub/Bridge-Classroom/bridge-classroom-api/data/bridge_classroom.db"
LOCAL_BACKUP_DIR="/Users/rick/Development/GitHub/Bridge-Classroom/bridge-classroom-api/data"
GDRIVE_BACKUP_DIR="/Users/rick/Library/CloudStorage/GoogleDrive-rick.wilson.ca@gmail.com/My Drive/Bridge Classroom/Backups"

DATE=$(date +%Y%m%d)
BACKUP_NAME="bridge_classroom_backup_${DATE}.db"

# Safe backup using SQLite's built-in backup (handles WAL correctly)
sqlite3 "$DB_PATH" ".backup '${LOCAL_BACKUP_DIR}/${BACKUP_NAME}'"

if [ $? -ne 0 ]; then
  echo "ERROR: SQLite backup failed" >&2
  exit 1
fi

# Copy to Google Drive
mkdir -p "$GDRIVE_BACKUP_DIR"
cp "${LOCAL_BACKUP_DIR}/${BACKUP_NAME}" "$GDRIVE_BACKUP_DIR/"

if [ $? -ne 0 ]; then
  echo "ERROR: Google Drive copy failed" >&2
  exit 1
fi

# Keep only the 14 most recent local backups
ls -t "${LOCAL_BACKUP_DIR}"/bridge_classroom_backup_*.db | tail -n +15 | xargs rm -f 2>/dev/null

# Keep only the 14 most recent Google Drive backups
ls -t "${GDRIVE_BACKUP_DIR}"/bridge_classroom_backup_*.db | tail -n +15 | xargs rm -f 2>/dev/null

echo "Backup complete: ${BACKUP_NAME} ($(du -h "${LOCAL_BACKUP_DIR}/${BACKUP_NAME}" | cut -f1) )"
