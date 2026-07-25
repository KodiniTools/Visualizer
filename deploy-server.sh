#!/usr/bin/env bash
# deploy-server.sh - Server-seitiges Deployment
#
# Läuft DIREKT AUF DEM SERVER: baut die App aus `main` und kopiert das
# Ergebnis lokal in den Web-Root. Kein SSH/scp nötig (im Gegensatz zu
# deploy.sh / deploy.ps1, die von einem entfernten Rechner deployen).
#
# Erwartete Umgebung:
#   - Dieses Repo ist auf dem Server geklont (z. B. /root/visualizer-build)
#   - node/npm sind installiert
#
# Verwendung:
#   /root/visualizer-build/deploy-server.sh
#
# Optionen (per Umgebungsvariable überschreibbar):
#   TARGET_DIR   Ziel-Web-Root (Standard: /var/www/kodinitools.com/visualizer)
#   BRANCH       Zu deployender Branch (Standard: main)
#   KEEP_BACKUPS Anzahl beizubehaltender Backups (Standard: 5)

set -euo pipefail

# In das Verzeichnis dieses Skripts wechseln (Repo-Wurzel)
cd "$(dirname "$0")"

# ── Konfiguration ───────────────────────────────────────────────────────────
TARGET_DIR="${TARGET_DIR:-/var/www/kodinitools.com/visualizer}"
BRANCH="${BRANCH:-main}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

# Farbige Ausgabe
CYAN='\033[0;36m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${CYAN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
ok()   { echo -e "${GREEN}$1${NC}"; }
err()  { echo -e "${RED}$1${NC}"; }

# ── Neuesten Stand holen ────────────────────────────────────────────────────
log "[GIT] Checking out '$BRANCH' and pulling latest..."
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# ── Bauen ───────────────────────────────────────────────────────────────────
# npm ci nur wenn nötig (package-lock neuer als node_modules oder fehlend)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  log "[DEPS] Installing dependencies (npm ci)..."
  npm ci
else
  log "[DEPS] Dependencies up to date, skipping npm ci."
fi

log "[BUILD] Building app..."
npm run build

if [ ! -d dist ]; then
  err "[ERROR] Build failed! 'dist' directory not found."
  exit 1
fi

# ── Backup + Deploy ─────────────────────────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
if [ -d "$TARGET_DIR" ]; then
  warn "[BACKUP] Backing up current release to ${TARGET_DIR}_backup_${TIMESTAMP}"
  mv "$TARGET_DIR" "${TARGET_DIR}_backup_${TIMESTAMP}"
fi
mkdir -p "$TARGET_DIR"

log "[DEPLOY] Copying build to $TARGET_DIR ..."
cp -r dist/* "$TARGET_DIR/"

# ── Rechte setzen ───────────────────────────────────────────────────────────
warn "[PERMISSIONS] Setting owner/permissions..."
chown -R www-data:www-data "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"

# ── Alte Backups aufräumen (die neuesten KEEP_BACKUPS behalten) ─────────────
BACKUP_GLOB="${TARGET_DIR}_backup_*"
# shellcheck disable=SC2012
OLD_BACKUPS=$(ls -dt $BACKUP_GLOB 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) || true)
if [ -n "$OLD_BACKUPS" ]; then
  warn "[CLEANUP] Removing old backups (keeping newest $KEEP_BACKUPS)..."
  echo "$OLD_BACKUPS" | xargs rm -rf
fi

ok "[SUCCESS] Deployment completed successfully!"
log "[INFO] Visit: https://kodinitools.com/visualizer/"
