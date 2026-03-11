import { createApp } from 'vue'
import App from './App.vue'
import './assets/global.css'

const app = createApp(App)

// Vueのエラーをコンソールに出力
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', info, err)
}

app.mount('#app')
