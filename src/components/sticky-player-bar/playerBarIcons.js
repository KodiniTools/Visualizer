/**
 * SVG-Pfade (viewBox 0 0 24 24, fill currentColor) der Player-Leiste.
 * Ein Eintrag ist ein Pfad oder eine Liste von Pfaden.
 */
export const PLAYER_ICONS = {
  microphone:
    'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
  note: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 4h4v16H6V4zm8 0h4v16h-4V4z',
  stop: 'M6 6h12v12H6z',
  next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  redo: 'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
  slideshow:
    'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z',
  markers:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  volume: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
  volumeMuted:
    'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
  playlist: 'M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13-1v5.55l4-2.28-4-3.27z',
  gallery:
    'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z',
  presets:
    'M12 2l2.09 6.26H20.5l-5.2 3.78 1.99 6.26L12 14.52 6.71 18.3l1.99-6.26-5.2-3.78h6.41L12 2z',
  audioReactive: 'M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z',
  // Großes „T“ (Text-Manager)
  textManager: 'M5 4v3h5.5v12h3V7H19V4H5z',
  // Kreis, Quadrat und Dreieck (Formen & Symbole)
  shapes:
    'M7 2a5 5 0 1 1 0 10A5 5 0 0 1 7 2zm6 11h9v9h-9v-9zM6.5 13.5l5 8.5h-10l5-8.5zM17.5 2.5l4.5 8h-9l4.5-8z',
  // Schrift „T“ über Pegelbalken (Text-Audio-Reaktiv)
  textAudioReactive: [
    'M4 3h12v2.5h-4.75V15h-2.5V5.5H4V3z',
    'M3 18h2v3H3v-3zm4-2h2v5H7v-5zm4 3h2v2h-2v-2zm4-4h2v6h-2v-6zm4 2h2v4h-2v-4z',
  ],
  canvasFormat:
    'M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16.01H3V4.99h18v14.02z',
  visualizer: 'M3 12h2v9H3v-9zm4-6h2v15H7V6zm4 3h2v12h-2V9zm4-6h2v18h-2V3zm4 9h2v9h-2v-9z',
  // Schieberegler (Visualizer-Steuerung)
  visualizerControls:
    'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  // Gestapelte Ebenen (Layer)
  multiLayer:
    'M12 2L2 7l10 5 10-5-10-5zm0 11.5L4.21 9.62 2 10.73l10 5 10-5-2.21-1.11L12 13.5zm0 5L4.21 14.62 2 15.73l10 5 10-5-2.21-1.11L12 18.5z',
  // Funkeln (Post-Processing-Effekte)
  effects:
    'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-8.5.5L8 4 5.5 9.5 0 12l5.5 2.5L8 20l2.5-5.5L16 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  // Palette (Canvas-Steuerung: Hintergrund, Presets, Effekte)
  canvasControl:
    'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  // Filmklappe/Videokamera
  video:
    'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  screenshot:
    'M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z',
}

/** Wiedergabemodus → Symbol (unbekannte Modi zeigen „Shuffle“). */
export const PLAY_MODE_ICONS = {
  none: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z',
  sequence: 'M6 18l8.5-6L6 6v12zm8.5-6L23 6v12l-8.5-6zM4 6H2v12h2V6z',
  'repeat-one':
    'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  'repeat-all': 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  shuffle:
    'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
}

/** Pfad oder Pfadliste → Liste. */
export const iconPaths = (icon) => (Array.isArray(icon) ? icon : [icon])
