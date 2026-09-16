import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { dirname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const rootDir = dirname(fileURLToPath(import.meta.url))

function copyLibTypes(): Plugin {
  return {
    name: 'copy-lib-types',
    closeBundle() {
      mkdirSync(join(rootDir, 'dist'), { recursive: true })
      copyFileSync(join(rootDir, 'types', 'index.d.ts'), join(rootDir, 'dist', 'index.d.ts'))
    },
  }
}

/**
 * 同源图片代理：服务端拉取外部图片（绕过浏览器 CORS），
 * 供「图片 PDF」导出把无 CORS 头的外部图片转为 base64。
 * dev 与 vite preview 均生效；生产静态部署需在网关提供同样的 /api/img-proxy。
 */
function imageProxy(): Plugin {
  const handler = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = req.url || ''
    if (!url.startsWith('/api/img-proxy')) {
      next()
      return
    }
    try {
      const target = new URL(url, 'http://localhost').searchParams.get('url')
      if (!target) {
        res.statusCode = 400
        res.end('missing url')
        return
      }
      const upstream = await fetch(target, { redirect: 'follow' })
      if (!upstream.ok) {
        res.statusCode = upstream.status
        res.end('upstream ' + upstream.status)
        return
      }
      const buf = Buffer.from(await upstream.arrayBuffer())
      res.statusCode = 200
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') || 'application/octet-stream',
      )
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(buf)
    } catch (e) {
      res.statusCode = 502
      res.end('proxy error')
    }
  }
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'
  const pagesBase = !isLib && mode === 'production' ? (process.env.VITE_BASE || './') : '/'

  return {
    base: pagesBase,
    plugins: [
      vue(),
      ...(isLib ? [copyLibTypes()] : [imageProxy()]),
    ],

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

    build: isLib
      ? {
          lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: 'SuneastPrintDesigner',
            formats: ['es', 'umd'],
            fileName: (format) => `suneast-print-designer.${format === 'umd' ? 'umd.cjs' : 'js'}`,
          },
          rollupOptions: {
            external: [
              'vue',
              'pinia',
              'ant-design-vue',
              '@ant-design/icons-vue',
            ],
            output: {
              exports: 'named',
              globals: {
                vue: 'Vue',
                pinia: 'Pinia',
                'ant-design-vue': 'AntDesignVue',
                '@ant-design/icons-vue': 'AntDesignIconsVue',
              },
              assetFileNames: (assetInfo) => {
                if (assetInfo.names?.some((n) => n.endsWith('.css')) || assetInfo.name?.endsWith('.css')) {
                  return 'style.css'
                }
                return assetInfo.names?.[0] || assetInfo.name || 'asset'
              },
            },
          },
          cssCodeSplit: false,
          minify: true,
          sourcemap: true,
          emptyOutDir: true,
        }
      : {
          emptyOutDir: true,
        },
  }
})