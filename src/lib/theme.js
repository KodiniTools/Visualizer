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
  // Read the current data-theme attribute (may be set by SSI nav already)
  const existingTheme = document.documentElement.getAttribute('data-theme')
  if (existingTheme && (existingTheme === 'light' || existingTheme === 'dark')) {
    currentTheme.value = existingTheme
  }
  applyTheme(currentTheme.value)

  // SSI nav sets data-theme on documentElement directly without dispatching events.
  // Use MutationObserver to detect attribute changes and sync Vue reactive state.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const theme = document.documentElement.getAttribute('data-theme')
        if ((theme === 'light' || theme === 'dark') && theme !== currentTheme.value) {
          currentTheme.value = theme
          document.body.setAttribute('data-theme', theme)
          const metaThemeColor = document.querySelector('meta[name="theme-color"]')
          if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#091428' : '#F5F4D6')
          }
        }
      }
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
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
