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
/* --- CUSTOM FONT --- */
@font-face {
  font-family: 'Supreme';
  src: url('/fonts/Supreme-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* --- THEME VARIABLE DEFINITIONS --- */
:root {
  --font-sans: 'Supreme', sans-serif;
  --green: #c5deb0;
  --red: #ef4444;
  --yellow: #eab308;
  --palette-cyan: #f8e1a9;
  --palette-beige: #7a8da0;
  --palette-grayblue: #f8e1a9;
  --palette-lightgray: #e9e9eb;
  --palette-lightgreen: #c5deb0;
  --palette-teal: #c9984d;
}

[data-theme='dark'] {
  --primary-bg: #091428;
  --secondary-bg: #0e1c32;
  --card-bg: #142640;
  --accent-primary: #c9984d;
  --accent-secondary: #014f99;
  --accent-tertiary: #f8e1a9;
  --accent-text: #091428;
  /* Akzent als Text oder Icon (Titel, Chips, Hover-Icons): im Dark Theme Gold. */
  --accent-ink: #c9984d;
  --text-primary: #f9f2d5;
  --text-secondary: #f8e1a9;
  /* #8396a9: 5,0:1 auf --card-bg (WCAG AA ≥ 4,5:1); vorher #7a8da0 = 4,45:1 */
  --text-muted: #8396a9;
  --btn-hover: #1a2a42;
  --ring: #c9984d;
  --border-color: rgb(201 152 77 / 20%);
  --shadow-color: rgb(0 0 0 / 50%);
  --gradient-color: rgb(201 152 77 / 3%);
  --panel-highlight: rgb(201 152 77 / 5%);
  --progress-bg: rgb(1 79 153 / 20%);
  --success: #c5deb0;
  --body-gradient:
    radial-gradient(1200px 600px at 80% -20%, #0a2850 0%, transparent 60%), var(--primary-bg);
}

[data-theme='light'] {
  --primary-bg: var(--primary-bg);
  --secondary-bg: var(--secondary-bg);
  --card-bg: var(--card-bg);
  --accent-primary: var(--accent-primary);
  --accent-secondary: var(--accent-primary);
  --accent-tertiary: #b8842f;
  --accent-text: #091428;
  --accent-ink: var(--accent-primary);
  --text-primary: var(--accent-primary);
  --text-secondary: var(--accent-primary);
  --text-muted: var(--text-muted);
  --btn-hover: var(--btn-hover);
  --ring: var(--accent-primary);
  --border-color: rgb(201 152 77 / 30%);
  --shadow-color: rgb(0 0 0 / 10%);
  --gradient-color: rgb(201 152 77 / 5%);
  --panel-highlight: rgb(201 152 77 / 8%);
  --progress-bg: rgb(1 79 153 / 15%);
  --success: #c5deb0;
  --body-gradient:
    radial-gradient(1200px 600px at 80% -20%, var(--btn-hover) 0%, transparent 60%),
    var(--primary-bg);
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
