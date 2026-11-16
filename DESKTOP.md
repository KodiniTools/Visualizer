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
| `electron/updater.mjs`                  | Auto-Update: Prüfen beim Start, Nachfrage vor dem Neustart                                                                                           |
| `electron/localServer.mjs`              | Lokaler Server auf `127.0.0.1` (freier Port): liefert `dist/` unter `/visualizer/` aus und bindet `server/routes/api.js` unter `/visualizer/api` ein |
| `desktop/package.json`                  | Eigenes Paket der Desktop-Hülle: Electron, electron-builder, electron-updater, FFmpeg, Version der App                                               |
| `desktop/stage.mjs`                     | Stellt `dist/`, die Server-Routen und die Hülle unter `desktop/app/` zusammen                                                                        |
| `desktop/electron-builder.yml`          | Installer-Konfiguration (NSIS, x64), Quelle des Auto-Updates                                                                                         |
| `.github/workflows/desktop-windows.yml` | Baut den Installer auf einem Windows-Runner, legt auf Wunsch das Release an                                                                          |

Die Desktop-Hülle hat ein eigenes `package.json`, damit Electron, electron-builder und FFmpeg
(zusammen rund 800 MB) nicht in den Abhängigkeiten der Web-App landen. `npm ci` im Hauptordner und
der Web-Deploy bleiben dadurch unverändert.

Uploads und Ergebnisse liegen im Benutzerordner der App
(`%APPDATA%\Visualizer Beta\server\`), nicht im Programmverzeichnis.

## Installer bekommen

GitHub → Actions → „Windows-Desktop-App (Beta)“ → „Run workflow“.

- **Nur Build:** Die Dateien liegen danach im Lauf unter „Artifacts“ → `visualizer-beta-windows`
  (ZIP mit `Visualizer-Beta-Setup-<Version>.exe`).
- **Release:** Haken bei **„Als GitHub-Release veröffentlichen“** setzen. Es entsteht das Release
  `desktop-v<Version>` mit festem Download-Link unter
  [Releases](https://github.com/KodiniTools/Visualizer/releases/latest).

Der Installer ist **nicht signiert**. Windows SmartScreen zeigt beim ersten Start eine Warnung:
„Weitere Informationen“ → „Trotzdem ausführen“.

## Updates

Ab Version 0.1.1 aktualisiert sich die installierte App selbst (`electron/updater.mjs`,
[electron-updater](https://www.electron.build/auto-update)): Beim Start prüft sie das neueste
GitHub-Release, lädt eine neuere Version im Hintergrund und fragt, ob sie neu starten darf. Bei
„Später“ wird das Update beim nächsten Beenden installiert. Ohne Internet startet die App normal.

Eine neue Version veröffentlichen:

1. `version` in `desktop/package.json` erhöhen (z. B. `0.1.1` → `0.1.2`) und mergen.
2. Workflow mit Haken bei „Als GitHub-Release veröffentlichen“ starten.

Dieselbe Version zweimal bricht ab. Das Auto-Update liest immer das als „Latest“ markierte Release
des Repositorys. Releases für andere Zwecke dürfen deshalb nicht als „Latest“ markiert werden.

Die Beta 0.1.0-beta.1 kennt das Auto-Update noch nicht. Wer sie installiert hat, installiert 0.1.1
einmal von Hand darüber.

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
- `electron/__tests__/updater.spec.js` (Vitest): Update nur in der installierten App, Neustart nur
  nach Zustimmung, Fehler ohne Netz werden abgefangen.
- Die E2E-Tests unter `e2e/` prüfen die Web-App, deren Build die Desktop-App unverändert ausliefert.

## Bekannte Grenzen der Beta

- Kein App-Icon (Standard-Icon von Electron), keine Code-Signatur.
- Encoding läuft über libx264 (CPU). Hardware-Encoding (NVENC) ist noch nicht eingebaut.
- Admin-Login und Landing-Inhalte des Servers gibt es in der Desktop-App nicht.
- Nur Windows x64.
