import { createApp } from 'vue'
import { createPinia } from 'pinia' // <-- Das ist die erste neue Zeile
import App from './App.vue'

const app = createApp(App)

app.use(createPinia()) // <-- Das ist die zweite neue Zeile

app.mount('#app')
