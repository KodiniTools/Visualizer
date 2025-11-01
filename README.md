# Audio Visualizer

Ein professioneller Audio-Visualizer für die Erstellung von animierten Musikvideos mit Echtzeit-Visualisierung, Text-Overlays, Bildbearbeitung und Social-Media-Export.

**Autor**: Dinko Ramić  
**Website**: [kodinitools.com](https://kodinitools.com)  
**Projekt**: Kodini Tools

## 🎯 Hauptfunktionen

### 🎵 Audio-Verarbeitung
- **Audio-Player**: Abspielen lokaler Audio-Dateien mit vollständiger Playback-Steuerung
- **Web Audio API Integration**: Echtzeit-Frequenzanalyse mit FFT (Fast Fourier Transform)
- **Audio-Context**: Professionelles Audio-Routing mit Analyser-Node und Gain-Control
- **Crossorigin-Support**: Unterstützung für externe Audio-Quellen

### 🎬 Video-Recording
- **MediaRecorder Integration**: Aufnahme von Canvas-Animationen mit Audio
- **Dynamisches Audio-Routing**: Zuschaltbares Audio während der Aufnahme
- **Recording Gain Control**: Separate Lautstärke-Steuerung für Aufnahmen
- **Canvas-Stream-Management**: Optimierte Stream-Verwaltung mit automatischem Cleanup
- **Format-Unterstützung**: Export als WebM-Video

### 🎨 Visualisierung
- **Multiple Visualizer-Modi**: Verschiedene Visualisierungsarten für Audio-Frequenzen
- **Echtzeit-Rendering**: 60 FPS Canvas-basierte Animation
- **FFT-Analyse**: Frequenzspektrum-Analyse mit 1024 FFT-Size
- **Separater Render-Loop**: Unabhängige Visualizer-Loop für flüssige Performance
- **Freeze-Prevention**: Verhindert Rendering-Freezes bei UI-Änderungen

### 📝 Text-Management
- **Text-Editor**: Hinzufügen und Bearbeiten von Text-Overlays
- **Custom Fonts**: Integration benutzerdefinierter Schriftarten
- **Font-Manager**: Verwaltung und Laden von Web-Fonts
- **Text-Positionierung**: Drag & Drop Positionierung auf Canvas
- **Text-Styling**: Anpassbare Farben, Größen und Effekte

### 🖼️ Bild-Management
- **Multi-Image-Support**: Mehrere Bilder gleichzeitig auf Canvas
- **Foto-Filter**: Bild-Filter und Effekte
- **Schatten-Effekte**: Anpassbare Schatten für Bilder
- **Drag & Drop**: Intuitive Bild-Positionierung
- **Bildauswahl**: Click-basierte Objektselektion
- **Auto-Cleanup**: Bilder werden nach Aufnahme automatisch entfernt

### 🎛️ Canvas-Steuerung
- **Workspace-Presets**: Vordefinierte Größen für Social Media Plattformen:
  - **TikTok**: 1080x1920 (Vertikal)
  - **Instagram Story**: 1080x1920 (Vertikal)
  - **Instagram Post**: 1080x1080 (Quadratisch)
  - **Instagram Reel**: 1080x1920 (Vertikal)
  - **YouTube Short**: 1080x1920 (Vertikal)
  - **YouTube Video**: 1920x1080 (Horizontal)
  - **Facebook Post**: 1200x630 (Horizontal)
  - **Twitter Video**: 1280x720 (Horizontal)
  - **LinkedIn Video**: 1920x1080 (Horizontal)
- **Dynamic Resizing**: Canvas passt sich automatisch an Workspace-Preset an
- **Grid-Overlay**: Optionales Raster für präzise Positionierung
- **Interactive Canvas**: Mouse-Events für Drag, Drop und Selection

### ⌨️ Keyboard Shortcuts
- **Tastaturkürzel**: Schnelle Steuerung über Keyboard
- **Shortcut-Manager**: Zentrale Verwaltung aller Shortcuts
- **Custom Bindings**: Anpassbare Tastenkombinationen

### 🔧 State-Management
- **Pinia Stores**: Reaktive State-Verwaltung für:
  - `playerStore`: Player-Zustand und Kontrolle
  - `recorderStore`: Recording-Status und Einstellungen
  - `textStore`: Text-Objekte und Styling
  - `visualizerStore`: Visualizer-Konfiguration
  - `gridStore`: Grid-Sichtbarkeit
  - `workspaceStore`: Workspace-Presets
- **Provide/Inject**: Component-übergreifende Manager-Instanzen

### 🏗️ Architektur
- **Manager-Pattern**: Modulare Manager für spezifische Aufgaben:
  - `CanvasManager`: Canvas-Interaktionen und Event-Handling
  - `TextManager`: Text-Rendering und -Verwaltung
  - `FotoManager`: Bild-Filter und Effekte
  - `GridManager`: Grid-Overlay-Rendering
  - `MultiImageManager`: Verwaltung mehrerer Bilder
  - `FontManager`: Font-Loading und -Caching
  - `KeyboardShortcuts`: Shortcut-Handling
- **Composition API**: Vue 3 mit `<script setup>` Syntax
- **Reactive Canvas**: Synchronisation zwischen Display- und Recording-Canvas

### 🎯 Performance-Optimierungen
- **Separate Render-Loops**: Unabhängige Loops für UI und Visualizer
- **RequestAnimationFrame**: Browser-optimierte Frame-Timing
- **Canvas-Stream-Optimization**: Effizientes Stream-Management für Recording
- **Memory-Management**: Automatisches Cleanup bei Component-Unmount
- **Force-Restart-Mechanik**: Robuste Loop-Verwaltung mit Debug-Countern

### 🔒 Sicherheit & Stability
- **Error-Handling**: Try-Catch-Blöcke in kritischen Render-Funktionen
- **Stream-Cleanup**: Vollständige Track-Beendigung bei Recording-Stop
- **Audio-Context-Cleanup**: Proper AudioContext-Schließung bei Unmount
- **Canvas-Reset**: Komplett neue Canvas-Erstellung nach jeder Aufnahme
- **Memory-Leak-Prevention**: Systematisches Cleanup aller Ressourcen

## 🚀 Installation

```bash
npm install
```

## 💻 Entwicklung

```bash
# Development-Server mit Hot-Reload
npm run dev
```

## 🏗️ Build

```bash
# Production-Build
npm run build
```

## 🧪 Tests

```bash
# Unit-Tests mit Vitest
npm run test:unit

# E2E-Tests mit Playwright
npx playwright install  # Einmalig: Browser installieren
npm run build           # Build für E2E-Tests
npm run test:e2e        # Alle E2E-Tests
npm run test:e2e -- --project=chromium  # Nur Chromium
npm run test:e2e -- tests/example.spec.ts  # Spezifischer Test
npm run test:e2e -- --debug  # Debug-Modus
```

## 📋 Code-Qualität

```bash
# ESLint
npm run lint
```

## 🛠️ Technologie-Stack

- **Framework**: Vue 3 (Composition API)
- **Build-Tool**: Vite
- **State-Management**: Pinia
- **Audio-Processing**: Web Audio API
- **Video-Recording**: MediaRecorder API
- **Canvas-Rendering**: HTML5 Canvas
- **Testing**: Vitest (Unit), Playwright (E2E)
- **Code-Quality**: ESLint

## 📱 Unterstützte Browser

- Chromium-basierte Browser (Chrome, Edge, Brave)
- Firefox
- Safari (mit Einschränkungen bei MediaRecorder)

**Empfohlung**: Chrome/Edge für beste Performance und Kompatibilität

## 🎨 Empfohlene IDE-Konfiguration

- **VS Code** + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- **Browser DevTools**:
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) (Chrome)
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/) (Firefox)
  - Custom Object Formatter aktivieren für bessere Debugging-Erfahrung

## 📖 Weitere Informationen

- [Vite Configuration Reference](https://vite.dev/config/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🐛 Bekannte Limitierungen

- Safari: Eingeschränkte MediaRecorder-Unterstützung
- Mobile Browser: Performance-Einschränkungen bei komplexen Visualisierungen
- CORS: Externe Audio-Quellen benötigen entsprechende Header

## Autor

**Entwickelt von**: Dinko Ramić  
**Website**: [kodinitools.com](https://kodinitools.com)  

Weitere Tools und Anwendungen finden Sie auf [kodinitools.com](https://kodinitools.com)

---


