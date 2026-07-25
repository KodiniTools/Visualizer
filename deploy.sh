#!/usr/bin/env bash
# deploy.sh - Automatisches Deployment-Skript (Bash-Version von deploy.ps1)
#
# Baut die Vue-App aus dem `main`-Branch und lädt den Build auf den Server
# nach /var/www/kodinitools.com/visualizer.
#
# Verwendung:
#   ./deploy.sh
#
# Voraussetzungen: git, node/npm, ssh und scp mit Zugriff auf den Server.

set -euo pipefail

# In das Verzeichnis dieses Skripts wechseln (Projektwurzel)
cd "$(dirname "$0")"

# ── Konfiguration ───────────────────────────────────────────────────────────
SERVER="root@145.223.81.100"
REMOTE_DIR="/var/www/kodinitools.com/visualizer"
DEPLOY_BRANCH="main"

# Farbige Ausgabe
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()  { echo -e "${CYAN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
ok()   { echo -e "${GREEN}$1${NC}"; }
err()  { echo -e "${RED}$1${NC}"; }

# ── Aus dem main-Branch bauen ───────────────────────────────────────────────
log "[GIT] Checking out '$DEPLOY_BRANCH' branch..."
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

log "[DEPS] Installing dependencies..."
npm ci

log "[BUILD] Building Vue app..."
npm run build

if [ ! -d dist ]; then
  err "[ERROR] Build failed! 'dist' directory not found."
  exit 1
fi

# ── Backup auf dem Server erstellen ─────────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
warn "[BACKUP] Creating backup on server..."
ssh "$SERVER" "if [ -d '$REMOTE_DIR' ]; then mv '$REMOTE_DIR' '${REMOTE_DIR}_backup_${TIMESTAMP}'; fi; mkdir -p '$REMOTE_DIR'"

# ── Dateien hochladen ───────────────────────────────────────────────────────
log "[UPLOAD] Uploading files..."
scp -r dist/* "$SERVER:$REMOTE_DIR/"

# ── Berechtigungen setzen ───────────────────────────────────────────────────
warn "[PERMISSIONS] Setting permissions..."
ssh "$SERVER" "chown -R www-data:www-data '$REMOTE_DIR' && chmod -R 755 '$REMOTE_DIR'"

ok "[SUCCESS] Deployment completed successfully!"
log "[INFO] Visit: https://kodinitools.com/visualizer/"
