import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css' // Assuming this is where your Tailwind imports are

const app = createApp(App)

app.use(router) // Attach the router
app.mount('#app')