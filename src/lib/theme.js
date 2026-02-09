import { ref, computed, watchEffect } from 'vue'

// Theme state
const currentTheme = ref(localStorage.getItem('theme') || 'dark')

// Apply theme to document
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.body.setAttribute('data-theme', theme)

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#091428' : '#F5F4D6')
  }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme(currentTheme.value)
}

// Get current theme
export function getTheme() {
  return currentTheme.value
}

// Set theme
export function setTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    applyTheme(theme)
  }
}

// Toggle theme
export function toggleTheme() {
  const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
  setTheme(newTheme)
}

// Check if dark mode
export function isDarkMode() {
  return currentTheme.value === 'dark'
}

// Composable for Vue components
export function useTheme() {
  const theme = computed(() => currentTheme.value)
  const isDark = computed(() => currentTheme.value === 'dark')

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
}
