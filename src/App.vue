<template>
  <!--
    keep-alive caches the Visualizer app so navigating to the landing page /
    functions ("Zur Startseite" / Hero-Navigation) and back does NOT destroy it.
    Without this, all component-local state (uploaded audio, canvas images,
    video, texts and settings held in the manager instances) would be lost on
    every route change. Only 'VisualizerApp' is cached; the marketing/landing
    pages are re-rendered normally.
  -->
  <router-view v-slot="{ Component }">
    <keep-alive :include="['VisualizerApp']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup>
// App.vue serves as a simple wrapper with router-view.
// All content is handled by LandingPage.vue and VisualizerApp.vue.
</script>

<style>
/* --- SCHRIFT: Supreme in den drei genutzten Gewichten (400/500/700),
   wie im Collage Maker. font-semibold (600) fällt auf Supreme Bold. --- */
@font-face {
  font-family: 'Supreme';
  src: url('/fonts/Supreme-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Supreme';
  src: url('/fonts/Supreme-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Supreme';
  src: url('/fonts/Supreme-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* --- DESIGN-TOKENS ---
   Die Werte kommen aus src/design-system/tokens-v2.css (--ds-*): der mit dem
   Collage Maker und dem Playlist Generator geteilten Token-Datei (Dark auf
   :root, Light auf :root[data-theme='light'], eingebunden in main.js).
   Die Visualizer-Namen bleiben als Aliase, damit die Komponenten unverändert
   weiterlesen. Hier stehen nur Aliase auf --ds-*, nie Literale und nie ein
   Token, das auf sich selbst zeigt (Zyklus = Variable ungültig = Light Theme
   kaputt, 05.10.2026). themeTokenBlocks.spec.js prüft das. */
:root {
  --font-sans: var(--ds-font-sans);

  /* Flächen: Seite, Eingabe, Karte, Hover */
  --primary-bg: var(--ds-surface-0);
  --secondary-bg: var(--ds-surface-2);
  --card-bg: var(--ds-surface-1);
  --btn-hover: var(--ds-surface-3);

  /* Akzent: Gold als Fläche, Text darauf ds-on-accent; Blau nur Link/Info */
  --accent-primary: var(--ds-accent);
  --accent-secondary: var(--ds-link);
  --accent-tertiary: var(--ds-accent-hover);
  --accent-text: var(--ds-on-accent);
  --ring: var(--ds-accent);

  /* Text und Rahmen */
  --text-primary: var(--ds-text);
  --text-muted: var(--ds-text-2);
  --border-color: var(--ds-border);
  --progress-bg: var(--ds-border-strong);

  /* v2 kennt keine Verläufe, Innenkanten oder Glow */
  --gradient-color: transparent;
  --panel-highlight: transparent;
  --body-gradient: var(--ds-surface-0);

  /* Status */
  --success: var(--ds-success);
  --green: var(--ds-success);
  --red: var(--ds-danger);
  --yellow: var(--ds-warning);

  /* Legacy-Aliase (nicht mehr verwenden) */
  --palette-cyan: var(--ds-accent-hover);
  --palette-beige: var(--ds-text-2);
  --palette-grayblue: var(--ds-accent-hover);
  --palette-lightgray: var(--ds-text);
  --palette-lightgreen: var(--ds-success);
  --palette-teal: var(--ds-accent);
}

[data-theme='dark'] {
  /* Gold als Text ist im Dark Theme erlaubt (8,0:1 auf ds-surface-0) */
  --accent-ink: var(--ds-accent);
  --text-secondary: var(--ds-accent);
  --shadow-color: rgb(0 0 0 / 35%);
}

[data-theme='light'] {
  /* Gold ist im Light Theme nie Text (2,4:1): Akzent-Text wird Tinte, Hervorhebung Link-Blau */
  --accent-ink: var(--ds-text);
  --text-secondary: var(--ds-link);
  --shadow-color: rgb(20 33 58 / 12%);
}

/* Global styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Supreme Font auf alle UI-Elemente anwenden (Browser-Defaults überschreiben) */
h1,
h2,
h3,
h4,
h5,
h6,
p,
span,
div,
a,
li,
label,
legend,
summary,
button,
input,
select,
textarea,
.btn,
.panel-title,
.header-title,
.section-title,
.custom-file-upload,
details summary {
  font-family: var(--font-sans);
}

html {
  min-height: 100%;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans);
  background-color: var(--primary-bg, #091428);
}

#app {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--primary-bg, #091428);
  color: var(--text-primary, #e9e9eb);
  font-family: var(--font-sans, 'Supreme', sans-serif);
  font-size: 12px;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(201, 152, 77, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(201, 152, 77, 0.4);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 152, 77, 0.6);
}

/* Light Theme Scrollbar */
[data-theme='light'] ::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
}
[data-theme='light'] ::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
[data-theme='light'] ::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-primary) 40%, transparent);
}
</style>
