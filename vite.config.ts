import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@claviska/jquery-minicolors/jquery.minicolors.min':
        fileURLToPath(new URL('./node_modules/@claviska/jquery-minicolors/jquery.minicolors.min.js', import.meta.url)),
      'nzh/dist/nzh.min.js':
        fileURLToPath(new URL('./node_modules/nzh/dist/nzh.min.js', import.meta.url)),
      'canvg':
        fileURLToPath(new URL('./src/hiprint/canvg-shim.js', import.meta.url)),
    },
  },
})
