import type { App } from 'vue'
import PrintDesigner from './App.vue'

const PrintDesignerPlugin = {
  install(app: App) {
    app.component('PrintDesigner', PrintDesigner)
  },
}

export { PrintDesigner }
export default PrintDesignerPlugin