#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/mnt/backup/etc"
mkdir -p "${BACKUP_DIR}"

DATE="$(date +%Y%m%d-%H%M%S)"
tar -czf "${BACKUP_DIR}/etc-${DATE}.tar.gz" /etc

echo "Backup created: etc-${DATE}.tar.gz"