<template>
  <router-view />
</template>

<script setup>
// App.vue serves as a simple wrapper with router-view
// All content is handled by LandingPage.vue and VisualizerApp.vue
</script>

<style>
/* --- THEME VARIABLE DEFINITIONS --- */
:root {
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --green: #C5DEB0;
    --red: #ef4444;
    --yellow: #eab308;
    --palette-cyan: #f8e1a9;
    --palette-beige: #7A8DA0;
    --palette-grayblue: #f8e1a9;
    --palette-lightgray: #E9E9EB;
    --palette-lightgreen: #C5DEB0;
    --palette-teal: #c9984d;
}

[data-theme='dark'] {
    --primary-bg: #091428;
    --secondary-bg: #0E1C32;
    --card-bg: #142640;
    --accent-primary: #c9984d;
    --accent-secondary: #014f99;
    --accent-tertiary: #f8e1a9;
    --accent-text: #091428;
    --text-primary: #f9f2d5;
    --text-secondary: #f8e1a9;
    --text-muted: #7A8DA0;
    --btn-hover: #1a2a42;
    --ring: #c9984d;
    --border-color: rgb(201 152 77 / 20%);
    --shadow-color: rgb(0 0 0 / 50%);
    --gradient-color: rgb(201 152 77 / 3%);
    --panel-highlight: rgb(201 152 77 / 5%);
    --progress-bg: rgb(1 79 153 / 20%);
    --success: #C5DEB0;
    --body-gradient: radial-gradient(1200px 600px at 80% -20%, #0a2850 0%, transparent 60%), var(--primary-bg);
}

[data-theme='light'] {
    --primary-bg: #F5F4D6;
    --secondary-bg: #f9f2d5;
    --card-bg: #FFFFFF;
    --accent-primary: #014f99;
    --accent-secondary: #c9984d;
    --accent-tertiary: #c9984d;
    --accent-text: #F5F4D6;
    --text-primary: #003971;
    --text-secondary: #014f99;
    --text-muted: #4d6d8e;
    --btn-hover: #f8e1a9;
    --ring: #c9984d;
    --border-color: rgb(201 152 77 / 30%);
    --shadow-color: rgb(0 0 0 / 10%);
    --gradient-color: rgb(201 152 77 / 5%);
    --panel-highlight: rgb(201 152 77 / 8%);
    --progress-bg: rgb(1 79 153 / 15%);
    --success: #C5DEB0;
    --body-gradient: radial-gradient(1200px 600px at 80% -20%, #f8e1a9 0%, transparent 60%), #F5F4D6;
}

/* Global styles */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  height: 100%;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--primary-bg, #091428);
}

#app {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--primary-bg, #091428);
  color: var(--text-primary, #E9E9EB);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif);
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
  background: rgba(1, 79, 153, 0.05);
}
[data-theme='light'] ::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.2);
}
[data-theme='light'] ::-webkit-scrollbar-thumb:hover {
  background: rgba(1, 79, 153, 0.4);
}
</style>
