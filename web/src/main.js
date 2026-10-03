import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { vRtable } from './utils/rtable'
import './style.css'

createApp(App).use(router).directive('rtable', vRtable).mount('#app')
