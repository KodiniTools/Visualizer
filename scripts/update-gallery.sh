#!/bin/bash
# ============================================================
# Gallery Update & Build Script
# ============================================================
# Verwendung: ./scripts/update-gallery.sh
# ============================================================

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================"
echo -e "  Gallery Update & Build Script"
echo -e "========================================${NC}"
echo ""

# Ins Projektverzeichnis wechseln
cd /var/www/kodinitools.com/visualizer

# Schritt 1: Gallery JSON aktualisieren
echo -e "${YELLOW}[1/3] Gallery JSON aktualisieren...${NC}"
npm run gallery:update

# Schritt 2: Build erstellen
echo -e "${YELLOW}[2/3] Build erstellen...${NC}"
npm run build

# Schritt 3: Dist deployen
echo -e "${YELLOW}[3/3] Deploying...${NC}"
cp -r dist/* /var/www/kodinitools.com/visualizer/

echo ""
echo -e "${GREEN}========================================"
echo -e "  Fertig! Gallery wurde aktualisiert."
echo -e "========================================${NC}"
echo ""

# Zeige Statistik
echo -e "${CYAN}Statistik:${NC}"
if [ -f "public/gallery/gallery.json" ]; then
    TOTAL=$(grep -o '"totalImages": [0-9]*' public/gallery/gallery.json | grep -o '[0-9]*')
    echo -e "  Gesamtbilder: ${GREEN}${TOTAL}${NC}"
fi

echo ""
echo -e "Testen Sie: ${CYAN}https://kodinitools.com/visualizer/${NC}"
echo ""
