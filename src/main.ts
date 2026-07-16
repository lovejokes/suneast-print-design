import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'

import App from './App.vue'

import './styles/global.css'
import './styles/antd-override.css'
import './hiprint/hiprint.css'
import './hiprint/print-lock.css'

import $ from 'jquery'
;(window as any).$ = $
;(window as any).jQuery = $

// hiprint 通过 ES module export，需设置到 window 上供 composable 使用
// @ts-ignore - hiprint.bundle.js is a webpack bundle, TS can't infer named exports
import { hiprint } from './hiprint/hiprint.bundle.js'
;(window as any).hiprint = hiprint

import './hiprint/hiprint.config.js'

// 禁用 WebSocket 自动连接（不需要直接打印功能）
;(window as any).autoConnect = false

const app = createApp(App)
app.use(createPinia())
app.use(Antd)
app.mount('#app')
