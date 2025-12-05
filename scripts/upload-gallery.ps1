# ============================================================
# Gallery Upload Script für Windows PowerShell
# ============================================================
# Verwendung: .\upload-gallery.ps1
# ============================================================

$SERVER = "root@145.223.81.100"
$REMOTE_PATH = "/var/www/kodinitools.com/visualizer/public/gallery"
$LOCAL_BASE = "C:\Users\User\Pictures\Visualizer"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gallery Upload Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Funktion zum Hochladen eines Ordners
function Upload-Folder {
    param (
        [string]$LocalFolder,
        [string]$RemoteFolder,
        [string]$DisplayName
    )

    $LocalPath = Join-Path $LOCAL_BASE $LocalFolder

    if (Test-Path $LocalPath) {
        $FileCount = (Get-ChildItem $LocalPath -File | Measure-Object).Count
        if ($FileCount -gt 0) {
            Write-Host "Uploading $DisplayName ($FileCount Dateien)..." -ForegroundColor Yellow
            scp "$LocalPath\*" "${SERVER}:${REMOTE_PATH}/${RemoteFolder}/"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  OK - $DisplayName hochgeladen" -ForegroundColor Green
            } else {
                Write-Host "  FEHLER beim Upload von $DisplayName" -ForegroundColor Red
            }
        } else {
            Write-Host "  Keine Dateien in $DisplayName" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Ordner nicht gefunden: $LocalPath" -ForegroundColor Gray
    }
}

# Alle Ordner hochladen
Write-Host "Starte Upload..." -ForegroundColor Cyan
Write-Host ""

Upload-Folder -LocalFolder "Element" -RemoteFolder "elements" -DisplayName "Elemente"
Upload-Folder -LocalFolder "Hintergrund" -RemoteFolder "backgrounds" -DisplayName "Hintergruende"
Upload-Folder -LocalFolder "Muster" -RemoteFolder "patterns" -DisplayName "Muster"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload abgeschlossen!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Naechster Schritt: Auf Server ausfuehren:" -ForegroundColor Yellow
Write-Host "  ssh $SERVER" -ForegroundColor White
Write-Host "  cd /var/www/kodinitools.com/visualizer && ./scripts/update-gallery.sh" -ForegroundColor White
Write-Host ""
