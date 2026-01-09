# CONTEXT.md - Visualizer Project

## Projektbeschreibung

**Visualizer** ist eine webbasierte Audio-Visualisierungs-Anwendung, die Audio-Dateien in Echtzeit visuell darstellt. Die Anwendung bietet verschiedene Visualisierungsstile, Video-Aufnahme-Funktionalitaet und Server-seitige Video-Konvertierung mit FFmpeg.

---

## Tech-Stack

### Frontend

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| Vue.js | ^3.5.22 | Reaktives Frontend-Framework |
| Vue Router | ^4.5.1 | Client-seitiges Routing |
| Pinia | ^3.0.3 | State Management |
| Vite (Rolldown) | latest | Build-Tool und Dev-Server |
| Lodash-ES | ^4.17.21 | Utility-Funktionen |

### Backend

| Technologie | Version | Beschreibung |
|-------------|---------|--------------|
| Node.js | ^20.19.0 / >=22.12.0 | Runtime-Umgebung |
| Express | ^4.22.1 | Web-Framework |
| Multer | ^1.4.5-lts.1 | File-Upload Middleware |
| FFmpeg | extern | Video-Konvertierung |
| PM2 | extern | Process Manager |
| CORS | ^2.8.5 | Cross-Origin Resource Sharing |

### Development Tools

| Tool | Version | Beschreibung |
|------|---------|--------------|
| ESLint | ^9.33.0 | Code Linting |
| OxLint | ~1.11.0 | Schnelles Linting |
| Prettier | 3.6.2 | Code Formatting |
| Vitest | ^3.2.4 | Unit Testing |
| Playwright | ^1.55.1 | E2E Testing |
| Vue Test Utils | ^2.4.6 | Vue Component Testing |

---

## Ordnerstruktur

```
Visualizer/
├── dist/                      # Build-Output
├── docs/                      # Dokumentation
├── e2e/                       # Playwright E2E Tests
├── public/                    # Statische Assets
│   ├── fonts/                 # Schriftarten
│   ├── gallery/               # Galerie-Bilder
│   └── icons/                 # Icon-Dateien
├── scripts/                   # Build/Helper-Scripts
│   └── gallery-generator.js   # Galerie-Generator
├── server/                    # Backend-Server
│   ├── index.js               # Express Server Entry Point
│   ├── routes/
│   │   └── api.js             # API-Routen
│   ├── services/
│   │   └── ffmpegService.js   # FFmpeg Video-Verarbeitung
│   ├── uploads/               # Temporaere Uploads (auto-generiert)
│   └── files/                 # Verarbeitete Dateien (auto-generiert)
├── src/                       # Frontend Source Code
│   ├── main.js                # Vue App Entry Point
│   ├── App.vue                # Root Component
│   ├── VisualizerApp.vue      # Haupt-Visualizer-Komponente
│   ├── components/            # Vue Komponenten
│   │   ├── BackgroundTilesPanel.vue
│   │   ├── CanvasControlPanel.vue
│   │   ├── FotoPanel.vue
│   │   ├── LandingPage.vue
│   │   ├── MainCanvas.vue
│   │   ├── PlayerPanel.vue
│   │   ├── RecorderPanel.vue
│   │   ├── TextManagerPanel.vue
│   │   ├── VisualizerPanel.vue
│   │   └── ...
│   ├── composables/           # Vue Composables
│   ├── lib/                   # Kernbibliotheken
│   │   ├── canvasManager/     # Canvas-Verwaltung
│   │   │   ├── interaction/   # Benutzerinteraktion
│   │   │   ├── recording/     # Aufnahme-Logik
│   │   │   └── rendering/     # Render-Pipeline
│   │   └── visualizers/       # Visualisierungs-Module
│   │       ├── core/          # Kern-Utilities
│   │       ├── effects/       # Effekt-Visualizer
│   │       ├── geometric/     # Geometrische Visualizer
│   │       ├── organic/       # Organische Visualizer
│   │       ├── particle/      # Partikel-Visualizer
│   │       ├── retro/         # Retro-Visualizer
│   │       ├── spectrum/      # Spektrum-Visualizer
│   │       └── tech/          # Tech-Visualizer
│   ├── router/                # Vue Router Konfiguration
│   │   └── index.js
│   ├── stores/                # Pinia Stores
│   │   ├── audioSourceStore.js
│   │   ├── backgroundTilesStore.js
│   │   ├── beatMarkerStore.js
│   │   ├── canvasStore.js
│   │   ├── fontStore.js
│   │   ├── gridStore.js
│   │   ├── historyStore.js
│   │   ├── panelSettingsStore.js
│   │   ├── playerStore.js
│   │   ├── recorderStore.js
│   │   ├── textStore.js
│   │   ├── toastStore.js
│   │   ├── visualizerStore.js
│   │   └── workspaceStore.js
│   ├── workers/               # Web Workers
│   └── __tests__/             # Unit Tests
├── .vscode/                   # VS Code Konfiguration
├── ecosystem.config.cjs       # PM2 Konfiguration
├── vite.config.js             # Vite Build-Konfiguration
├── eslint.config.js           # ESLint Konfiguration
├── playwright.config.js       # Playwright E2E Konfiguration
├── package.json               # NPM Dependencies
└── index.html                 # HTML Entry Point
```

---

## Datenspeicherung

### Kein persistentes Datenbank-Schema

Das Projekt verwendet **keine klassische Datenbank**. Stattdessen werden folgende Speichermechanismen genutzt:

#### 1. In-Memory Job-Tracking (Backend)

```javascript
// server/routes/api.js
const jobs = new Map();

// Job-Struktur
{
  id: 'job_timestamp_randomhex',
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: 0-100,
  inputFile: '/path/to/upload',
  outputFile: 'converted_timestamp.mp4',
  thumbnail: 'thumb_timestamp.jpg',
  options: { quality, action },
  createdAt: ISO-String,
  updatedAt: ISO-String,
  error: null | string,
  info: { duration, size, format }
}
```

#### 2. Datei-basierte Speicherung (Backend)

| Verzeichnis | Beschreibung | Lebensdauer |
|-------------|--------------|-------------|
| `server/uploads/` | Temporaere hochgeladene Videos | Auto-Cleanup nach 1 Stunde |
| `server/files/` | Verarbeitete/konvertierte Videos | Auto-Cleanup nach 1 Stunde |

#### 3. Client-seitiger State (Frontend)

Der gesamte Frontend-State wird durch **Pinia Stores** verwaltet:

| Store | Beschreibung |
|-------|--------------|
| `audioSourceStore` | Audio-Quellen und Analyse |
| `visualizerStore` | Aktiver Visualizer und Einstellungen |
| `playerStore` | Audio-Player-Zustand |
| `recorderStore` | Video-Aufnahme-State |
| `canvasStore` | Canvas-Dimensionen und -Einstellungen |
| `backgroundTilesStore` | Hintergrund-Konfiguration |
| `textStore` | Text-Overlays |
| `historyStore` | Undo/Redo-Historie |
| `toastStore` | Benachrichtigungen |
| `panelSettingsStore` | UI-Panel-Einstellungen |
| `fontStore` | Custom Fonts |
| `gridStore` | Grid-Overlay-Einstellungen |
| `workspaceStore` | Workspace-Konfiguration |

---

## API-Endpunkte

### Server (Port 9006)

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/health` | Health Check |
| GET | `/api/info` | Server-Info und FFmpeg-Status |
| POST | `/api/upload` | Video hochladen |
| POST | `/api/convert` | WebM zu MP4 konvertieren |
| POST | `/api/convert-blob` | Blob direkt konvertieren |
| POST | `/api/process` | Erweiterte Video-Verarbeitung |
| GET | `/api/status/:jobId` | Job-Status abfragen |
| GET | `/api/download/:filename` | Datei herunterladen |
| POST | `/api/cleanup/:filename` | Datei loeschen |
| DELETE | `/api/job/:jobId` | Job und Dateien loeschen |

---

## Visualizer-Kategorien

| Kategorie | Beschreibung |
|-----------|--------------|
| `spectrum` | Frequenz-Balken, Wellenformen |
| `geometric` | Kreise, Gitter, geometrische Muster |
| `organic` | Natuerliche, fliessende Muster |
| `particle` | Partikel-Systeme, Raum-Effekte |
| `tech` | Digitale, Matrix, Netzwerk-Stile |
| `retro` | 80er, Synthwave, Pixel-Art |
| `effects` | Spezial-Effekte, Ambient |

---

## NPM Scripts

| Script | Beschreibung |
|--------|--------------|
| `npm run dev` | Vite Dev-Server starten |
| `npm run build` | Production Build |
| `npm run preview` | Preview des Builds |
| `npm run test:unit` | Unit Tests mit Vitest |
| `npm run test:e2e` | E2E Tests mit Playwright |
| `npm run lint` | OxLint + ESLint |
| `npm run format` | Prettier Formatierung |
| `npm run server` | Backend-Server starten |
| `npm run server:dev` | Backend mit Watch-Mode |
| `npm run pm2:start` | PM2 Production Start |

---

## Deployment

- **Frontend**: Statische Dateien unter `/visualizer/` (via Vite Build)
- **Backend**: PM2 Prozess auf Port 9006
- **Domain**: kodinitools.com
- **Proxy**: NGINX vor dem Backend

---

## Wichtige Konfigurationen

### Vite (vite.config.js)
- Base URL: `/visualizer/` (Production) oder `/` (Development)
- Code-Splitting fuer Vue und Lodash
- Custom Asset-Pfade fuer Fonts

### PM2 (ecosystem.config.cjs)
- Max Memory Restart: 1GB
- Auto-Restart bei Absturz
- Logging nach `./logs/`

### FFmpeg Encoding Presets
- `highest`: CRF 18, 10M Bitrate
- `high`: CRF 20, 8M Bitrate (Standard)
- `medium`: CRF 23, 5M Bitrate
- `social`: CRF 21, 8M Bitrate (Social Media optimiert)
- `preview`: CRF 28, 2M Bitrate (schnelle Vorschau)
