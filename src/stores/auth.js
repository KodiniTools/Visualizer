import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ==========================================================================
// Auth Store (Visualizer Adminbereich)
//
// Passwortgeschützter Login für den Landing-Page-Adminbereich. Versucht zuerst
// das echte Backend (/visualizer/api/login); ist es nicht erreichbar, greift
// ein lokaler Mock-Login als Fallback (Demo/Entwicklung ohne Backend).
// ==========================================================================

// Basis-URL der API. In Entwicklung wird direkt gegen die Produktion getestet,
// in Produktion läuft alles über den relativen NGINX-Pfad /visualizer/api.
const getApiBase = () => {
  const isDevelopment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  if (isDevelopment) {
    return 'https://kodinitools.com/visualizer/api'
  }
  return '/visualizer/api'
}

// Mock-Zugangsdaten für den Fallback ohne Backend
const MOCK_CREDENTIALS = {
  username: 'Kodini',
  password: 'Onomatopeja_1357',
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('visualizer_auth_token') || null)

  // User-Objekt sicher aus localStorage parsen
  let parsedUser = null
  try {
    const userStr = localStorage.getItem('visualizer_auth_user')
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      parsedUser = JSON.parse(userStr)
    }
  } catch (e) {
    console.warn('[Auth] User aus localStorage nicht lesbar:', e)
    localStorage.removeItem('visualizer_auth_user')
  }
  const user = ref(parsedUser)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => isAuthenticated.value)

  const persist = () => {
    if (token.value) {
      localStorage.setItem('visualizer_auth_token', token.value)
    } else {
      localStorage.removeItem('visualizer_auth_token')
    }
    if (user.value) {
      localStorage.setItem('visualizer_auth_user', JSON.stringify(user.value))
    } else {
      localStorage.removeItem('visualizer_auth_user')
    }
  }

  // Login: erst echtes Backend, dann Mock-Fallback.
  // Gibt { success, error } zurück (wirft nicht).
  const login = async (password) => {
    try {
      const response = await fetch(`${getApiBase()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) throw new Error('Login fehlgeschlagen')

      const data = await response.json()
      if (!data.ok || !data.token) throw new Error(data.error || 'Login fehlgeschlagen')

      token.value = data.token
      user.value = data.user || { username: 'Kodini', role: 'admin' }
      persist()
      return { success: true }
    } catch (error) {
      // Fallback: Mock-Login, wenn das Backend nicht verfügbar ist
      console.warn('[Auth] Backend nicht verfügbar – verwende Mock-Login')

      if (password === MOCK_CREDENTIALS.password) {
        token.value = 'mock-token-' + Date.now()
        user.value = { username: MOCK_CREDENTIALS.username, role: 'admin' }
        persist()
        return { success: true }
      }
      return { success: false, error: 'Ungültiges Passwort' }
    }
  }

  const logout = async () => {
    // Best effort: Session auch serverseitig entfernen
    try {
      if (token.value && !token.value.startsWith('mock-token-')) {
        await fetch(`${getApiBase()}/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
        })
      }
    } catch (e) {
      // ignorieren – lokaler Logout reicht
    }
    token.value = null
    user.value = null
    persist()
  }

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: token.value ? `Bearer ${token.value}` : '',
  })

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    getAuthHeaders,
    getApiBase,
  }
})
