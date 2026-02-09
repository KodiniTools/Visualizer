<template>
  <router-view />
</template>

<script setup>
// App.vue serves as a simple wrapper with router-view
// All content is handled by LandingPage.vue and VisualizerApp.vue
</script>

<style>
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
