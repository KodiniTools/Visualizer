import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './design-system/tokens-v2.css'
// Theme früh initialisieren (data-theme aus localStorage) – unabhängig davon,
// ob die Start-Route Landing (lazy) oder App ist.
import './lib/theme'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Mount in einem eigenen Task: Auswertung des Bundles und erstes Rendern
// bilden sonst zusammen einen einzigen langen Task (Total Blocking Time).
setTimeout(() => app.mount('#app'), 0)
