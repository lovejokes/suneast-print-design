/// <reference types="vite/client" />

import $ from 'jquery'
declare global {
  interface Window {
    hiprint: any
    $: any
    jQuery: any
    hinnn: any
  }
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.js' {
  const content: any
  export default content
}

declare module '@/providers/default-provider' {
  const fn: (hiprint: any) => () => { addElementTypes: (context: any) => void }
  export default fn
}

declare module '@/providers/custom-provider' {
  const fn: (hiprint: any) => () => { addElementTypes: (context: any) => void }
  export default fn
}
