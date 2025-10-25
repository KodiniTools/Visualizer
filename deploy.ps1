# deploy.ps1 - Automatisches Deployment-Skript
cd $PSScriptRoot

Write-Host "[BUILD] Building Vue app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[BACKUP] Creating backup on server..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    ssh root@145.223.81.100 "mv /var/www/kodinitools.com/visualizer /var/www/kodinitools.com/visualizer_backup_$timestamp"
    
    Write-Host "[UPLOAD] Uploading files..." -ForegroundColor Cyan
    scp -r dist/* root@145.223.81.100:/var/www/kodinitools.com/visualizer/
    
    Write-Host "[PERMISSIONS] Setting permissions..." -ForegroundColor Yellow
    ssh root@145.223.81.100 "chown -R www-data:www-data /var/www/kodinitools.com/visualizer && chmod -R 755 /var/www/kodinitools.com/visualizer"
    
    Write-Host "[SUCCESS] Deployment completed successfully!" -ForegroundColor Green
    Write-Host "[INFO] Visit: https://kodinitools.com/visualizer/" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
}
