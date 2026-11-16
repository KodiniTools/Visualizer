# Visualizer als Windows-App (Beta)

Die Web-App wird mit [Electron](https://www.electronjs.org) als Windows-Programm verpackt.
Die Browser-Version auf kodinitools.com bleibt unverändert; beide nutzen denselben Code und
denselben Build (`vite build`). Eine Korrektur an der Web-App gilt damit für beide.

## Was die Desktop-App anders macht

- **Eigene Grafikkarte:** Gerendert wird im mitgelieferten Chromium auf der GPU des Rechners.
- **FFmpeg lokal:** MP4-, GIF- und HQ-Export laufen über ein mitgeliefertes FFmpeg auf dem
  eigenen Rechner. Es wird nichts hochgeladen, der Server auf kodinitools.com wird nicht gebraucht.
- **Feste Browser-Version:** Die App verhält sich auf jedem Rechner gleich, unabhängig vom
  installierten Browser.
- **Keine Nutzungsdaten:** Google Tag Manager/Analytics sind in der Desktop-App blockiert.

## Aufbau

| Datei                                   | Aufgabe                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `electron/main.mjs`                     | Hauptprozess: startet den lokalen Server, öffnet das Fenster                                                                                         |
| `electron/localServer.mjs`              | Lokaler Server auf `127.0.0.1` (freier Port): liefert `dist/` unter `/visualizer/` aus und bindet `server/routes/api.js` unter `/visualizer/api` ein |
| `electron-builder.yml`                  | Installer-Konfiguration (NSIS, x64), Version der Beta                                                                                                |
| `.github/workflows/desktop-windows.yml` | Baut den Installer auf einem Windows-Runner                                                                                                          |

Die Desktop-Hülle hat ein eigenes `package.json`, damit Electron, electron-builder und FFmpeg
(zusammen rund 800 MB) nicht in den Abhängigkeiten der Web-App landen. `npm ci` im Hauptordner und
der Web-Deploy bleiben dadurch unverändert.

Uploads und Ergebnisse liegen im Benutzerordner der App
(`%APPDATA%\Visualizer Beta\server\`), nicht im Programmverzeichnis.

## Installer bekommen

GitHub → Actions → „Windows-Desktop-App (Beta)“ → „Run workflow“. Die Datei liegt danach im Lauf
unter „Artifacts“ → `visualizer-beta-windows` (ZIP mit `Visualizer-Beta-Setup-<Version>.exe`).

Der Installer ist **nicht signiert**. Windows SmartScreen zeigt beim ersten Start eine Warnung:
„Weitere Informationen“ → „Trotzdem ausführen“.

## Lokal starten (Entwicklung)

```bash
npm ci                   # Web-App
npm ci --prefix desktop  # Desktop-Hülle (einmalig)
npm run desktop:dev      # vite build + Electron-Fenster
```

Installer lokal bauen (nur unter Windows, sonst fehlen `ffmpeg.exe`/`ffprobe.exe`):

```bash
npm run desktop:build    # Ergebnis in dist-desktop/
```

## Tests

- `electron/__tests__/localServer.spec.js` (Vitest): Auslieferung, History-Routen, API-Anbindung,
  Abweisen fremder Origins.
- Die E2E-Tests unter `e2e/` prüfen die Web-App, deren Build die Desktop-App unverändert ausliefert.

## Bekannte Grenzen der Beta

- Kein App-Icon (Standard-Icon von Electron), keine Code-Signatur, kein Auto-Update.
- Encoding läuft über libx264 (CPU). Hardware-Encoding (NVENC) ist noch nicht eingebaut.
- Admin-Login und Landing-Inhalte des Servers gibt es in der Desktop-App nicht.
- Nur Windows x64.
