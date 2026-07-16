/// <reference types="vite/client" />

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
  const fn: any
  export default fn
}

declare module '@/providers/custom-provider' {
  const fn: any
  export default fn
}
