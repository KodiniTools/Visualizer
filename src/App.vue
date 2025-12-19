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

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: auto;
}

#app {
  height: 100%;
  background-color: var(--bg, #0f1416);
  color: var(--text, #E9E9EB);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif);
  font-size: 12px;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(158, 190, 193, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(96, 145, 152, 0.4);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 145, 152, 0.6);
}
</style>
