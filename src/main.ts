import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'

import App from './App.vue'

import './styles/global.css'
import './styles/antd-override.css'

const app = createApp(App)
app.use(createPinia())
app.use(Antd)
app.mount('#app')
