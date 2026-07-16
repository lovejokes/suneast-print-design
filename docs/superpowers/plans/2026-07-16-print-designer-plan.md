# 日东打印设计器 Version2 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 vue-plugin-hiprint 构建精简版打印设计器 — Vue3 + Vite + Ant Design Vue 4.x，合并默认组件与自定义组件为单页，清新精致紧凑 UI。

**Architecture:** 引擎层（hiprint/stores/composables/providers）与 UI 层（components）分离。hiprint jQuery 库通过全局脚本注入，composables 封装初始化/销毁生命周期。Pinia 管理模板状态与选中元素。PrintRenderer 为独立可复用组件。

**Tech Stack:** Vue 3 (Composition API) + Vite 5 + TypeScript + Ant Design Vue 4.x + Pinia + CSS Variables + 手写 SVG 图标

---

### Task 1: 项目脚手架

**Files:**
- Create: `Version2/package.json`
- Create: `Version2/vite.config.ts`
- Create: `Version2/tsconfig.json`
- Create: `Version2/tsconfig.node.json`
- Create: `Version2/index.html`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ridong-print-designer",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "ant-design-vue": "^4.2.6",
    "@ant-design/icons-vue": "^7.0.1",
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "jquery": "^3.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "typescript": "~5.6.2",
    "vite": "^6.0.1",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForExpose": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client", "jquery"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>日东打印设计器</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: 安装依赖**

Run: `cd c:/Users/Lenovo/Desktop/Project/Print/Version2 && npm install`
Expected: 依赖安装成功

- [ ] **Step 7: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: scaffold Vite + Vue3 + TS + antd project"
```

---

### Task 2: 目录结构 + CSS 基础样式

**Files:**
- Create: `Version2/src/styles/variables.css`
- Create: `Version2/src/styles/global.css`
- Create: `Version2/src/styles/antd-override.css`
- Create: `Version2/src/hiprint/.gitkeep`
- Create: `Version2/src/providers/.gitkeep`
- Create: `Version2/src/stores/.gitkeep`
- Create: `Version2/src/composables/.gitkeep`
- Create: `Version2/src/config/.gitkeep`
- Create: `Version2/src/components/designer/.gitkeep`
- Create: `Version2/src/components/renderer/.gitkeep`
- Create: `Version2/src/components/preview/.gitkeep`
- Create: `Version2/src/components/common/.gitkeep`
- Create: `Version2/src/assets/icons/.gitkeep`

- [ ] **Step 1: 创建 CSS 变量文件 `src/styles/variables.css`**

```css
:root {
  --brand-50: #f0f5ff;
  --brand-100: #dbe8fe;
  --brand-200: #bfd6fe;
  --brand-300: #93bbfd;
  --brand-400: #609dfa;
  --brand-500: #4C8BF5;
  --brand-600: #3b6de6;
  --brand-700: #2d52d4;
  --brand-800: #2542ad;
  --brand-900: #1e3a8a;

  --page-bg: #f5f6f8;
  --panel-bg: #ffffff;
  --canvas-bg: #eef0f4;
  --border-color: #e8e8e8;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;

  --panel-width-left: 250px;
  --panel-width-right: 280px;
  --header-height: 48px;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-paper: 0 2px 8px rgba(0, 0, 0, 0.1);
  --radius-sm: 4px;
  --radius-md: 6px;

  --font-size-title: 14px;
  --font-size-base: 13px;
  --font-size-sm: 12px;
}
```

- [ ] **Step 2: 创建全局样式 `src/styles/global.css`**

```css
@import './variables.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background: var(--page-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--brand-500);
}

::-webkit-scrollbar-corner {
  background: transparent;
}
```

- [ ] **Step 3: 创建 antd 覆盖样式 `src/styles/antd-override.css`**

```css
/* 紧凑化 antd 组件 */
.ant-btn {
  font-size: var(--font-size-sm);
  padding: 2px 10px;
  height: 28px;
  border-radius: var(--radius-sm);
}

.ant-btn-sm {
  font-size: 11px;
  padding: 0 6px;
  height: 22px;
}

.ant-input {
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
}

.ant-select {
  font-size: var(--font-size-sm);
}

.ant-select-selector {
  border-radius: var(--radius-sm) !important;
}

.ant-collapse {
  border: none;
  background: transparent;
}

.ant-collapse-item {
  border: none !important;
}

.ant-collapse-header {
  padding: 8px 12px !important;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.ant-collapse-content-box {
  padding: 4px 8px !important;
}

.ant-form-item {
  margin-bottom: 8px;
}

.ant-form-item-label > label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.ant-divider {
  margin: 8px 0;
}

.ant-dropdown-menu-item {
  font-size: var(--font-size-sm);
  padding: 6px 12px;
}

.ant-tabs-tab {
  font-size: var(--font-size-sm);
  padding: 6px 12px;
}
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add directory structure and base CSS styles"
```

---

### Task 3: SVG 图标组件

**Files:**
- Create: `Version2/src/assets/icons/LogoIcon.vue`
- Create: `Version2/src/assets/icons/TextIcon.vue`
- Create: `Version2/src/assets/icons/ImageIcon.vue`
- Create: `Version2/src/assets/icons/TableIcon.vue`
- Create: `Version2/src/assets/icons/BarcodeIcon.vue`
- Create: `Version2/src/assets/icons/QrcodeIcon.vue`
- Create: `Version2/src/assets/icons/LineIcon.vue`
- Create: `Version2/src/assets/icons/VLineIcon.vue`
- Create: `Version2/src/assets/icons/RectIcon.vue`
- Create: `Version2/src/assets/icons/OvalIcon.vue`
- Create: `Version2/src/assets/icons/AlignLeftIcon.vue`
- Create: `Version2/src/assets/icons/AlignCenterIcon.vue`
- Create: `Version2/src/assets/icons/AlignRightIcon.vue`
- Create: `Version2/src/assets/icons/AlignTopIcon.vue`
- Create: `Version2/src/assets/icons/AlignMiddleIcon.vue`
- Create: `Version2/src/assets/icons/AlignBottomIcon.vue`
- Create: `Version2/src/assets/icons/BringForwardIcon.vue`
- Create: `Version2/src/assets/icons/SendBackwardIcon.vue`
- Create: `Version2/src/assets/icons/UndoIcon.vue`
- Create: `Version2/src/assets/icons/RedoIcon.vue`
- Create: `Version2/src/assets/icons/ZoomInIcon.vue`
- Create: `Version2/src/assets/icons/ZoomOutIcon.vue`
- Create: `Version2/src/assets/icons/GridIcon.vue`
- Create: `Version2/src/assets/icons/SaveIcon.vue`
- Create: `Version2/src/assets/icons/PrintIcon.vue`
- Create: `Version2/src/assets/icons/PdfIcon.vue`
- Create: `Version2/src/assets/icons/index.ts`

- [ ] **Step 1: 创建 LogoIcon.vue**

```vue
<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
    <rect x="6" y="8" width="12" height="8" rx="0.5" fill="currentColor" opacity="0.15" />
    <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="8" y1="13.5" x2="14" y2="13.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 2: 创建 TextIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <line x1="3" y1="6.5" x2="11" y2="6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <line x1="3" y1="10" x2="13" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <line x1="3" y1="13.5" x2="9" y2="13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 3: 创建 ImageIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5" />
    <circle cx="5" cy="6" r="1.5" fill="currentColor" />
    <path d="M1.5 12 L6 8 L9 10 L13 4 L14.5 6 L14.5 14 L1.5 14 Z" fill="currentColor" opacity="0.3" />
  </svg>
</template>
```

- [ ] **Step 4: 创建 TableIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" stroke-width="1.5" />
    <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1.2" />
    <line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" stroke-width="1.2" />
    <line x1="10.5" y1="2" x2="10.5" y2="14" stroke="currentColor" stroke-width="1.2" />
  </svg>
</template>
```

- [ ] **Step 5: 创建 BarcodeIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="3" width="1.5" height="10" fill="currentColor" />
    <rect x="3.5" y="3" width="1" height="10" fill="currentColor" />
    <rect x="5.5" y="3" width="2" height="10" fill="currentColor" />
    <rect x="8.5" y="3" width="1" height="10" fill="currentColor" />
    <rect x="10.5" y="3" width="1.5" height="10" fill="currentColor" />
    <rect x="13" y="3" width="2" height="10" fill="currentColor" />
  </svg>
</template>
```

- [ ] **Step 6: 创建 QrcodeIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="14" height="14" rx="1" stroke="currentColor" stroke-width="1.5" />
    <rect x="3" y="3" width="4" height="4" rx="0.5" fill="currentColor" />
    <rect x="9" y="3" width="4" height="4" rx="0.5" fill="currentColor" />
    <rect x="3" y="9" width="4" height="4" rx="0.5" fill="currentColor" />
    <rect x="9" y="9" width="1.5" height="1.5" fill="currentColor" />
    <rect x="11.5" y="9" width="1.5" height="1.5" fill="currentColor" />
    <rect x="9" y="11.5" width="1.5" height="1.5" fill="currentColor" />
    <rect x="11.5" y="11.5" width="1.5" height="1.5" fill="currentColor" />
  </svg>
</template>
```

- [ ] **Step 7: 创建 LineIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 8: 创建 VLineIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 9: 创建 RectIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.5" />
  </svg>
</template>
```

- [ ] **Step 10: 创建 OvalIcon.vue**

```vue
<template>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="8" cy="8" rx="6" ry="5" stroke="currentColor" stroke-width="1.5" />
  </svg>
</template>
```

- [ ] **Step 11: 创建 AlignLeftIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="1" y1="3" x2="9" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="1" y1="11" x2="7" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 12: 创建 AlignCenterIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="3" x2="11" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="4" y1="11" x2="10" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 13: 创建 AlignRightIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="7" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 14: 创建 AlignTopIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="1" x2="3" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="11" y1="1" x2="11" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 15: 创建 AlignMiddleIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="3" x2="3" y2="11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="11" y1="4" x2="11" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 16: 创建 AlignBottomIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="5" x2="3" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="11" y1="7" x2="11" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 17: 创建 BringForwardIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.2" />
    <rect x="4" y="4" width="9" height="9" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.2" />
    <line x1="7" y1="7" x2="7" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="5.5" y1="8.5" x2="7" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="8.5" y1="8.5" x2="7" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 18: 创建 SendBackwardIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.2" />
    <rect x="4" y="4" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.2" />
    <line x1="7" y1="7" x2="7" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="5.5" y1="5.5" x2="7" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="8.5" y1="5.5" x2="7" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 19: 创建 UndoIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5 L1 7 L3 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M1 7 H8 A4 4 0 0 1 12 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>
</template>
```

- [ ] **Step 20: 创建 RedoIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5 L13 7 L11 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M13 7 H6 A4 4 0 0 0 2 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>
</template>
```

- [ ] **Step 21: 创建 ZoomInIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2" />
    <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="6" y1="4" x2="6" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 22: 创建 ZoomOutIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2" />
    <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 23: 创建 GridIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <rect x="8" y="1" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <rect x="1" y="8" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <rect x="8" y="8" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2" />
  </svg>
</template>
```

- [ ] **Step 24: 创建 SaveIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 1 L13 3.5 L13 13 L1 13 L1 1 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    <rect x="4" y="1" width="6" height="3" rx="0.3" stroke="currentColor" stroke-width="1" />
    <rect x="4" y="8" width="6" height="5" rx="0.3" stroke="currentColor" stroke-width="1" />
  </svg>
</template>
```

- [ ] **Step 25: 创建 PrintIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="1" width="8" height="4" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <rect x="2" y="5" width="10" height="5" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <rect x="4" y="9" width="6" height="4" rx="0.5" stroke="currentColor" stroke-width="1.2" />
    <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 26: 创建 PdfIcon.vue**

```vue
<template>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1 L12 5 L12 13 L2 13 L2 1 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M8 1 L8 5 L12 5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    <text x="3.5" y="11" font-size="5" font-weight="bold" fill="currentColor">PDF</text>
  </svg>
</template>
```

- [ ] **Step 27: 创建图标统一导出 `src/assets/icons/index.ts`**

```typescript
export { default as LogoIcon } from './LogoIcon.vue'
export { default as TextIcon } from './TextIcon.vue'
export { default as ImageIcon } from './ImageIcon.vue'
export { default as TableIcon } from './TableIcon.vue'
export { default as BarcodeIcon } from './BarcodeIcon.vue'
export { default as QrcodeIcon } from './QrcodeIcon.vue'
export { default as LineIcon } from './LineIcon.vue'
export { default as VLineIcon } from './VLineIcon.vue'
export { default as RectIcon } from './RectIcon.vue'
export { default as OvalIcon } from './OvalIcon.vue'
export { default as AlignLeftIcon } from './AlignLeftIcon.vue'
export { default as AlignCenterIcon } from './AlignCenterIcon.vue'
export { default as AlignRightIcon } from './AlignRightIcon.vue'
export { default as AlignTopIcon } from './AlignTopIcon.vue'
export { default as AlignMiddleIcon } from './AlignMiddleIcon.vue'
export { default as AlignBottomIcon } from './AlignBottomIcon.vue'
export { default as BringForwardIcon } from './BringForwardIcon.vue'
export { default as SendBackwardIcon } from './SendBackwardIcon.vue'
export { default as UndoIcon } from './UndoIcon.vue'
export { default as RedoIcon } from './RedoIcon.vue'
export { default as ZoomInIcon } from './ZoomInIcon.vue'
export { default as ZoomOutIcon } from './ZoomOutIcon.vue'
export { default as GridIcon } from './GridIcon.vue'
export { default as SaveIcon } from './SaveIcon.vue'
export { default as PrintIcon } from './PrintIcon.vue'
export { default as PdfIcon } from './PdfIcon.vue'

import TextIcon from './TextIcon.vue'
import ImageIcon from './ImageIcon.vue'
import TableIcon from './TableIcon.vue'
import BarcodeIcon from './BarcodeIcon.vue'
import QrcodeIcon from './QrcodeIcon.vue'
import LineIcon from './LineIcon.vue'
import VLineIcon from './VLineIcon.vue'
import RectIcon from './RectIcon.vue'
import OvalIcon from './OvalIcon.vue'
import type { Component } from 'vue'

export const elementIcons: Record<string, Component> = {
  text: TextIcon,
  image: ImageIcon,
  table: TableIcon,
  barcode: BarcodeIcon,
  qrcode: QrcodeIcon,
  hline: LineIcon,
  vline: VLineIcon,
  rect: RectIcon,
  oval: OvalIcon,
  longText: TextIcon,
}
```

- [ ] **Step 28: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add 26 SVG icon components with unified export"
```

---

### Task 4: 复制 hiprint 核心库

**Files:**
- Copy: `vue-plugin-hiprint-main/src/hiprint/hiprint.bundle.js` → `Version2/src/hiprint/hiprint.bundle.js`
- Copy: `vue-plugin-hiprint-main/src/hiprint/hiprint.config.js` → `Version2/src/hiprint/hiprint.config.js`
- Copy: `vue-plugin-hiprint-main/src/hiprint/css/hiprint.css` → `Version2/src/hiprint/hiprint.css`
- Copy: `vue-plugin-hiprint-main/src/hiprint/css/print-lock.css` → `Version2/src/hiprint/print-lock.css`

- [ ] **Step 1: 复制 hiprint 文件**

```bash
cp "c:/Users/Lenovo/Desktop/Project/Print/vue-plugin-hiprint-main/src/hiprint/hiprint.bundle.js" "c:/Users/Lenovo/Desktop/Project/Print/Version2/src/hiprint/hiprint.bundle.js"
cp "c:/Users/Lenovo/Desktop/Project/Print/vue-plugin-hiprint-main/src/hiprint/hiprint.config.js" "c:/Users/Lenovo/Desktop/Project/Print/Version2/src/hiprint/hiprint.config.js"
cp "c:/Users/Lenovo/Desktop/Project/Print/vue-plugin-hiprint-main/src/hiprint/css/hiprint.css" "c:/Users/Lenovo/Desktop/Project/Print/Version2/src/hiprint/hiprint.css"
cp "c:/Users/Lenovo/Desktop/Project/Print/vue-plugin-hiprint-main/src/hiprint/css/print-lock.css" "c:/Users/Lenovo/Desktop/Project/Print/Version2/src/hiprint/print-lock.css"
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: copy hiprint core library and styles"
```

---

### Task 5: 自定义元素配置 + Providers

**Files:**
- Create: `Version2/src/config/custom-elements.ts`
- Create: `Version2/src/providers/default-provider.js`
- Create: `Version2/src/providers/custom-provider.js`

- [ ] **Step 1: 创建 `src/config/custom-elements.ts`**

```typescript
export interface CustomElement {
  tid: string
  title: string
  type: string
  data?: string
  field?: string
  testData?: string
  options?: Record<string, unknown>
}

export interface CustomElementGroup {
  name: string
  elements: CustomElement[]
}

export const customElementGroups: CustomElementGroup[] = [
  {
    name: '业务字段',
    elements: [
      {
        tid: 'customModule.header',
        title: '单据表头',
        type: 'text',
        data: '单据表头',
        options: {
          testData: '单据表头',
          height: 17,
          fontSize: 16.5,
          fontWeight: '700',
          textAlign: 'center',
          hideTitle: true,
        },
      },
      {
        tid: 'customModule.orderNo',
        title: '订单编号',
        type: 'text',
        data: 'XS888888888',
        options: {
          field: 'orderNo',
          testData: 'XS888888888',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.customerName',
        title: '客户名称',
        type: 'text',
        data: '客户名称',
        options: {
          field: 'customerName',
          testData: '客户名称',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.date',
        title: '日期',
        type: 'text',
        data: '2023-07-16',
        options: {
          field: 'date',
          testData: '2023-07-16',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.amount',
        title: '金额',
        type: 'text',
        data: '¥0.00',
        options: {
          field: 'amount',
          testData: '¥0.00',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'right',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.barcode',
        title: '条形码',
        type: 'text',
        data: '123456789',
        options: {
          field: 'barcode',
          testData: '123456789',
          height: 32,
          fontSize: 12,
          textType: 'barcode',
        },
      },
      {
        tid: 'customModule.qrcode',
        title: '二维码',
        type: 'text',
        data: 'https://example.com',
        options: {
          field: 'qrcode',
          testData: 'https://example.com',
          height: 48,
          fontSize: 12,
          textType: 'qrcode',
        },
      },
    ],
  },
  {
    name: '表格/其他',
    elements: [
      {
        tid: 'customModule.table',
        title: '数据表格',
        type: 'table',
        options: {
          field: 'table',
          fields: [
            { text: '名称', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '规格', field: 'GG' },
            { text: '单价', field: 'DJ' },
            { text: '金额', field: 'JE' },
          ],
        },
      },
      {
        tid: 'customModule.signer',
        title: '签字',
        type: 'text',
        data: '',
        options: {
          field: 'signer',
          testData: '',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
    ],
  },
]
```

- [ ] **Step 2: 创建 `src/providers/default-provider.js`**

```javascript
export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('defaultModule')
      context.addPrintElementTypes('defaultModule', [
        new hiprint.PrintElementTypeGroup('常用', [
          {
            tid: 'defaultModule.text',
            title: '文本',
            data: '',
            type: 'text',
          },
          {
            tid: 'defaultModule.image',
            title: '图片',
            data: '',
            type: 'image',
          },
          {
            tid: 'defaultModule.longText',
            title: '长文',
            data: '长文本内容',
            type: 'longText',
          },
          {
            tid: 'defaultModule.table',
            field: 'table',
            title: '表格',
            type: 'table',
            groupFields: ['name'],
            columns: [
              [
                { title: '行号', fixed: true, rowspan: 2, field: 'id', width: 70 },
                { title: '人员信息', colspan: 2 },
                { title: '销售统计', colspan: 2 },
              ],
              [
                { title: '姓名', align: 'left', field: 'name', width: 100 },
                { title: '性别', field: 'gender', width: 100 },
                { title: '销售数量', field: 'count', width: 100 },
                { title: '销售金额', field: 'amount', width: 100 },
              ],
            ],
            editable: true,
            columnDisplayEditable: true,
            columnDisplayIndexEditable: true,
            columnTitleEditable: true,
            columnResizable: true,
            columnAlignEditable: true,
            isEnableEditField: true,
            isEnableContextMenu: true,
            isEnableInsertRow: true,
            isEnableDeleteRow: true,
            isEnableInsertColumn: true,
            isEnableDeleteColumn: true,
            isEnableMergeCell: true,
          },
          {
            tid: 'defaultModule.emptyTable',
            title: '空白表格',
            type: 'table',
            columns: [[
              { title: '', field: '', width: 100 },
              { title: '', field: '', width: 100 },
            ]],
          },
          {
            tid: 'defaultModule.customText',
            title: '自定义文本',
            customText: '自定义文本',
            custom: true,
            type: 'text',
          },
        ]),
        new hiprint.PrintElementTypeGroup('辅助', [
          {
            tid: 'defaultModule.hline',
            title: '横线',
            type: 'hline',
          },
          {
            tid: 'defaultModule.vline',
            title: '竖线',
            type: 'vline',
          },
          {
            tid: 'defaultModule.rect',
            title: '矩形',
            type: 'rect',
          },
          {
            tid: 'defaultModule.oval',
            title: '椭圆',
            type: 'oval',
          },
          {
            tid: 'defaultModule.barcode',
            title: '条形码',
            type: 'barcode',
          },
          {
            tid: 'defaultModule.qrcode',
            title: '二维码',
            type: 'qrcode',
          },
        ]),
      ])
    }
    return {
      addElementTypes: addElementTypes,
    }
  }
}
```

- [ ] **Step 3: 创建 `src/providers/custom-provider.js`**

```javascript
import { customElementGroups } from '../config/custom-elements'

export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('customModule')
      var groups = customElementGroups.map(function (group) {
        return new hiprint.PrintElementTypeGroup(
          group.name,
          group.elements.map(function (el) {
            var element = {
              tid: el.tid,
              title: el.title,
              type: el.type,
            }
            if (el.data !== undefined) element.data = el.data
            if (el.options) element.options = el.options
            return element
          })
        )
      })
      context.addPrintElementTypes('customModule', groups)
    }
    return {
      addElementTypes: addElementTypes,
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add custom element config and default/custom providers"
```

---

### Task 6: Pinia Store

**Files:**
- Create: `Version2/src/stores/designer.ts`

- [ ] **Step 1: 创建 `src/stores/designer.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export interface PanelTemplate {
  panels: Array<{
    index: number
    name: string | number
    height: number
    width: number
    paperHeader?: number
    paperFooter?: number
    printElements: Array<Record<string, unknown>>
    paperNumberLeft?: number
    paperNumberTop?: number
    paperNumberContinue?: boolean
    watermarkOptions?: Record<string, unknown>
  }>
}

const DEFAULT_PANEL: PanelTemplate = {
  panels: [
    {
      index: 0,
      name: 1,
      height: 297,
      width: 210,
      paperHeader: 49.5,
      paperFooter: 780,
      printElements: [],
      watermarkOptions: {
        content: '日东打印',
        rotate: 25,
        timestamp: true,
        format: 'YYYY-MM-DD HH:mm',
      },
    },
  ],
}

export const useDesignerStore = defineStore('designer', () => {
  const template = reactive<PanelTemplate>(JSON.parse(JSON.stringify(DEFAULT_PANEL)))
  const selectedElement = ref<Record<string, unknown> | null>(null)
  const zoom = ref(1)
  const currentPage = ref(0)
  const gridEnabled = ref(true)
  const paperType = ref('A4')
  const historyStack = ref<PanelTemplate[]>([])
  const historyIndex = ref(-1)

  function selectElement(el: Record<string, unknown> | null) {
    selectedElement.value = el
  }

  function setZoom(z: number) {
    zoom.value = Math.max(0.5, Math.min(5, z))
  }

  function setPaperType(type: string) {
    paperType.value = type
  }

  function addPage() {
    const lastPanel = template.panels[template.panels.length - 1]
    const newPanel = JSON.parse(JSON.stringify(lastPanel))
    newPanel.index = template.panels.length
    newPanel.name = template.panels.length + 1
    newPanel.printElements = []
    template.panels.push(newPanel)
    currentPage.value = newPanel.index
  }

  function removePage(index: number) {
    if (template.panels.length <= 1) return
    template.panels.splice(index, 1)
    template.panels.forEach((p, i) => {
      p.index = i
      p.name = i + 1
    })
    if (currentPage.value >= template.panels.length) {
      currentPage.value = template.panels.length - 1
    }
  }

  function setCurrentPage(index: number) {
    currentPage.value = index
  }

  function clearPaper() {
    template.panels[currentPage.value].printElements = []
  }

  function pushHistory() {
    const snapshot = JSON.parse(JSON.stringify(template))
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    historyStack.value.push(snapshot)
    historyIndex.value = historyStack.value.length - 1
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--
      Object.assign(template, JSON.parse(JSON.stringify(historyStack.value[historyIndex.value])))
    }
  }

  function redo() {
    if (historyIndex.value < historyStack.value.length - 1) {
      historyIndex.value++
      Object.assign(template, JSON.parse(JSON.stringify(historyStack.value[historyIndex.value])))
    }
  }

  function importTemplate(json: PanelTemplate) {
    Object.assign(template, JSON.parse(JSON.stringify(json)))
    currentPage.value = 0
  }

  function exportTemplate(): PanelTemplate {
    return JSON.parse(JSON.stringify(template))
  }

  function newTemplate() {
    Object.assign(template, JSON.parse(JSON.stringify(DEFAULT_PANEL)))
    currentPage.value = 0
    selectedElement.value = null
    historyStack.value = []
    historyIndex.value = -1
  }

  return {
    template,
    selectedElement,
    zoom,
    currentPage,
    gridEnabled,
    paperType,
    historyStack,
    historyIndex,
    selectElement,
    setZoom,
    setPaperType,
    addPage,
    removePage,
    setCurrentPage,
    clearPaper,
    pushHistory,
    undo,
    redo,
    importTemplate,
    exportTemplate,
    newTemplate,
  }
})
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add Pinia designer store with template/undo/history management"
```

---

### Task 7: Composables

**Files:**
- Create: `Version2/src/composables/useHiprint.ts`
- Create: `Version2/src/composables/useTemplate.ts`

- [ ] **Step 1: 创建 `src/composables/useHiprint.ts`**

```typescript
import { ref, type Ref } from 'vue'

declare global {
  interface Window {
    hiprint: any
    $: any
    jQuery: any
  }
}

export function useHiprint() {
  const hiprintTemplate = ref<any>(null)
  const isReady = ref(false)

  function init(
    containerSelector: string,
    settingContainerSelector: string,
    providers: Array<{ addElementTypes: (context: any) => void }>,
    panelTemplate: any,
    options?: {
      onDataChanged?: (type: string, data: any) => void
      onImageChooseClick?: (target: any) => void
    }
  ) {
    if (!window.hiprint) {
      console.error('hiprint not loaded')
      return
    }

    const { hiprint } = window
    hiprint.init({
      providers: providers,
    })

    hiprintTemplate.value = new hiprint.PrintTemplate({
      template: panelTemplate,
      settingContainer: settingContainerSelector,
      ...options,
    })

    hiprintTemplate.value.design(containerSelector, { grid: true })
    isReady.value = true
  }

  function destroy() {
    if (hiprintTemplate.value) {
      hiprintTemplate.value.destroy()
      hiprintTemplate.value = null
    }
    isReady.value = false
  }

  function print() {
    hiprintTemplate.value?.print()
  }

  function exportPdf(): Promise<Blob> {
    return hiprintTemplate.value?.exportPdf?.() || Promise.reject('not available')
  }

  function setPaper(type: string, width: number, height: number) {
    hiprintTemplate.value?.setPaper(type, { width, height })
  }

  function rotatePaper() {
    hiprintTemplate.value?.rotatePaper()
  }

  function setZoom(scale: number) {
    hiprintTemplate.value?.zoom?.(scale)
  }

  function updateTemplate(panelTemplate: any) {
    hiprintTemplate.value?.update?.(panelTemplate)
  }

  return {
    hiprintTemplate,
    isReady,
    init,
    destroy,
    print,
    exportPdf,
    setPaper,
    rotatePaper,
    setZoom,
    updateTemplate,
  }
}
```

- [ ] **Step 2: 创建 `src/composables/useTemplate.ts`**

```typescript
export function useTemplate() {
  function exportJSON(template: any): string {
    return JSON.stringify(template, null, 2)
  }

  function importJSON(jsonStr: string): any {
    try {
      const parsed = JSON.parse(jsonStr)
      if (!parsed.panels || !Array.isArray(parsed.panels)) {
        throw new Error('无效的模板格式：缺少 panels 数组')
      }
      return parsed
    } catch (e) {
      console.error('导入模板失败:', e)
      throw e
    }
  }

  function downloadJSON(template: any, filename: string = 'template.json') {
    const json = exportJSON(template)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function readFileAsJSON(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = importJSON(e.target?.result as string)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  }

  return {
    exportJSON,
    importJSON,
    downloadJSON,
    readFileAsJSON,
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add useHiprint and useTemplate composables"
```

---

### Task 8: JsonView 通用组件

**Files:**
- Create: `Version2/src/components/common/JsonView.vue`

- [ ] **Step 1: 创建 `src/components/common/JsonView.vue`**

```vue
<template>
  <a-modal
    v-model:open="visible"
    title="模板 JSON"
    :footer="null"
    width="700px"
    :body-style="{ padding: '12px', maxHeight: '70vh', overflow: 'auto' }"
  >
    <a-button type="link" size="small" @click="copyJSON" style="margin-bottom: 8px">
      复制 JSON
    </a-button>
    <pre
      style="
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 16px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.6;
        overflow: auto;
        max-height: 55vh;
        margin: 0;
      "
    ><code>{{ jsonText }}</code></pre>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps<{
  open: boolean
  template: object
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const jsonText = computed(() => JSON.stringify(props.template, null, 2))

function copyJSON() {
  navigator.clipboard.writeText(jsonText.value).then(() => {
    message.success('JSON 已复制到剪贴板')
  })
}
</script>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add JsonView common component"
```

---

### Task 9: AppHeader 组件

**Files:**
- Create: `Version2/src/components/designer/AppHeader.vue`

- [ ] **Step 1: 创建 `src/components/designer/AppHeader.vue`**

```vue
<template>
  <header class="app-header">
    <div class="header-left">
      <span class="header-logo">
        <LogoIcon />
      </span>
      <span class="header-title">日东打印设计器</span>
    </div>

    <div class="header-tools">
      <a-dropdown>
        <a-button type="text" size="small">文件</a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="$emit('new')">新建模板</a-menu-item>
            <a-menu-item @click="$emit('import')">导入 JSON</a-menu-item>
            <a-menu-item @click="$emit('export')">导出 JSON</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-dropdown>
        <a-button type="text" size="small">导出</a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="$emit('print')">
              <PrintIcon />
              <span style="margin-left:6px">打印</span>
            </a-menu-item>
            <a-menu-item @click="$emit('pdf')">
              <PdfIcon />
              <span style="margin-left:6px">导出 PDF</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <span class="tool-sep" />

      <a-select
        :value="paperType"
        size="small"
        style="width: 72px"
        @change="$emit('update:paperType', $event)"
      >
        <a-select-option value="A3">A3</a-select-option>
        <a-select-option value="A4">A4</a-select-option>
        <a-select-option value="A5">A5</a-select-option>
        <a-select-option value="B3">B3</a-select-option>
        <a-select-option value="B4">B4</a-select-option>
        <a-select-option value="B5">B5</a-select-option>
        <a-select-option value="custom">自定义</a-select-option>
      </a-select>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('zoomOut')" :disabled="zoom <= 0.5">
        <ZoomOutIcon />
      </a-button>
      <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
      <a-button type="text" size="small" @click="$emit('zoomIn')" :disabled="zoom >= 5">
        <ZoomInIcon />
      </a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('undo')">
        <UndoIcon />
      </a-button>
      <a-button type="text" size="small" @click="$emit('redo')">
        <RedoIcon />
      </a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('alignLeft')"><AlignLeftIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignCenter')"><AlignCenterIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignRight')"><AlignRightIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignTop')"><AlignTopIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignMiddle')"><AlignMiddleIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignBottom')"><AlignBottomIcon /></a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('bringForward')"><BringForwardIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('sendBackward')"><SendBackwardIcon /></a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('toggleGrid')" :class="{ active: gridEnabled }">
        <GridIcon />
      </a-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  LogoIcon,
  PrintIcon, PdfIcon,
  ZoomInIcon, ZoomOutIcon,
  UndoIcon, RedoIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
  AlignTopIcon, AlignMiddleIcon, AlignBottomIcon,
  BringForwardIcon, SendBackwardIcon,
  GridIcon,
} from '@/assets/icons'

defineProps<{
  paperType: string
  zoom: number
  gridEnabled: boolean
}>()

defineEmits<{
  new: []
  import: []
  export: []
  print: []
  pdf: []
  'update:paperType': [val: string]
  zoomIn: []
  zoomOut: []
  undo: []
  redo: []
  alignLeft: []
  alignCenter: []
  alignRight: []
  alignTop: []
  alignMiddle: []
  alignBottom: []
  bringForward: []
  sendBackward: []
  toggleGrid: []
}>()
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  gap: 4px;
  flex-shrink: 0;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--brand-600);
  flex-shrink: 0;
}

.header-logo {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.header-tools::-webkit-scrollbar {
  height: 0;
}

.tool-sep {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.zoom-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
  cursor: default;
}

.ant-btn-text.active {
  color: var(--brand-600);
  background: var(--brand-50);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add AppHeader with toolbar buttons and dropdown menus"
```

---

### Task 10: ElementsPanel 组件

**Files:**
- Create: `Version2/src/components/designer/ElementsPanel.vue`

- [ ] **Step 1: 创建 `src/components/designer/ElementsPanel.vue`**

```vue
<template>
  <aside class="elements-panel">
    <a-collapse v-model:active-key="activeKeys" :bordered="false" expand-icon-position="end">
      <a-collapse-panel key="default" header="默认组件">
        <a-collapse v-model:active-key="defaultSubKeys" :bordered="false" expand-icon-position="end">
          <a-collapse-panel v-for="group in defaultGroups" :key="group.name" :header="group.name">
            <div
              v-for="el in group.elements"
              :key="el.tid"
              class="element-item"
              :tid="el.tid"
              :title="`拖拽 ${el.title} 到画布`"
            >
              <span class="element-icon">
                <component :is="getIcon(el.type)" />
              </span>
              <span class="element-name">{{ el.title }}</span>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-collapse-panel>

      <a-collapse-panel key="custom" header="自定义组件">
        <a-collapse v-model:active-key="customSubKeys" :bordered="false" expand-icon-position="end">
          <a-collapse-panel v-for="group in customGroups" :key="group.name" :header="group.name">
            <div
              v-for="el in group.elements"
              :key="el.tid"
              class="element-item"
              :tid="el.tid"
              :title="`拖拽 ${el.title} 到画布`"
            >
              <span class="element-icon">
                <component :is="getIcon(el.type)" />
              </span>
              <span class="element-name">{{ el.title }}</span>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-collapse-panel>
    </a-collapse>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { elementIcons } from '@/assets/icons'
import { customElementGroups } from '@/config/custom-elements'
import type { Component } from 'vue'
import TextIcon from '@/assets/icons/TextIcon.vue'

const activeKeys = ref(['default', 'custom'])
const defaultSubKeys = ref(['常用', '辅助'])

const defaultGroups = [
  {
    name: '常用',
    elements: [
      { tid: 'defaultModule.text', title: '文本', type: 'text' },
      { tid: 'defaultModule.image', title: '图片', type: 'image' },
      { tid: 'defaultModule.longText', title: '长文', type: 'longText' },
      { tid: 'defaultModule.table', title: '表格', type: 'table' },
      { tid: 'defaultModule.emptyTable', title: '空白表格', type: 'table' },
      { tid: 'defaultModule.customText', title: '自定义文本', type: 'text' },
    ],
  },
  {
    name: '辅助',
    elements: [
      { tid: 'defaultModule.hline', title: '横线', type: 'hline' },
      { tid: 'defaultModule.vline', title: '竖线', type: 'vline' },
      { tid: 'defaultModule.rect', title: '矩形', type: 'rect' },
      { tid: 'defaultModule.oval', title: '椭圆', type: 'oval' },
      { tid: 'defaultModule.barcode', title: '条形码', type: 'barcode' },
      { tid: 'defaultModule.qrcode', title: '二维码', type: 'qrcode' },
    ],
  },
]

const customSubKeys = ref(customElementGroups.map(g => g.name))

function getIcon(type: string): Component {
  return elementIcons[type] || TextIcon
}

defineExpose({ activeKeys, defaultSubKeys, customSubKeys })
</script>

<style scoped>
.elements-panel {
  width: var(--panel-width-left);
  background: var(--panel-bg);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  padding: 4px 0;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: grab;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  transition: all 0.15s;
  border-left: 2px solid transparent;
  user-select: none;
}

.element-item:hover {
  background: #e8f0fe;
  color: var(--brand-600);
  border-left-color: var(--brand-500);
}

.element-item:active {
  cursor: grabbing;
}

.element-icon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.element-item:hover .element-icon {
  color: var(--brand-500);
}

.element-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add ElementsPanel with default and custom collapsible groups"
```

---

### Task 11: DesignCanvas 组件

**Files:**
- Create: `Version2/src/components/designer/DesignCanvas.vue`

- [ ] **Step 1: 创建 `src/components/designer/DesignCanvas.vue`**

```vue
<template>
  <main class="canvas-area">
    <div id="hiprint-printTemplate" class="design-container"></div>
    <div class="canvas-page-tabs">
      <a-tag
        v-for="(panel, idx) in panels"
        :key="idx"
        :color="currentPage === idx ? 'blue' : undefined"
        style="cursor: pointer; margin-right: 4px"
        @click="$emit('update:currentPage', idx)"
      >
        页面 {{ panel.name }}
      </a-tag>
      <a-button type="dashed" size="small" @click="$emit('addPage')" style="font-size: 11px">
        + 添加页面
      </a-button>
    </div>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  panels: Array<{ name: string | number; index: number }>
  currentPage: number
}>()

defineEmits<{
  'update:currentPage': [idx: number]
  addPage: []
}>()
</script>

<style scoped>
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg);
  overflow: hidden;
  position: relative;
}

.design-container {
  flex: 1;
  overflow: auto;
}

.canvas-page-tabs {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
  gap: 4px;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add DesignCanvas with hiprint container and page tabs"
```

---

### Task 12: PropertiesPanel 组件

**Files:**
- Create: `Version2/src/components/designer/PropertiesPanel.vue`

- [ ] **Step 1: 创建 `src/components/designer/PropertiesPanel.vue`**

```vue
<template>
  <aside class="properties-panel">
    <div v-if="!element" class="panel-empty">
      <p>请在画布中选择</p>
      <p>一个元素进行编辑</p>
    </div>

    <template v-else>
      <div class="panel-header">
        {{ element.printElementType?.title || '元素' }}
      </div>

      <a-collapse v-model:active-key="activeKeys" :bordered="false" expand-icon-position="end">
        <a-collapse-panel key="basic" header="基本">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="字段名">
              <a-input v-model:value="options.field" size="small" @change="emitChange" />
            </a-form-item>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="X">
                  <a-input-number v-model:value="options.left" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Y">
                  <a-input-number v-model:value="options.top" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="宽度">
                  <a-input-number v-model:value="options.width" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="高度">
                  <a-input-number v-model:value="options.height" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="style" header="样式">
          <a-form layout="vertical" :model="options" size="small">
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="字号">
                  <a-input-number v-model:value="options.fontSize" size="small" :step="1" :min="4" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="颜色">
                  <a-input v-model:value="options.color" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="对齐">
              <a-radio-group v-model:value="options.textAlign" size="small" @change="emitChange">
                <a-radio-button value="left">左</a-radio-button>
                <a-radio-button value="center">中</a-radio-button>
                <a-radio-button value="right">右</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="垂直对齐">
              <a-radio-group v-model:value="options.textContentVerticalAlign" size="small" @change="emitChange">
                <a-radio-button value="top">上</a-radio-button>
                <a-radio-button value="middle">中</a-radio-button>
                <a-radio-button value="bottom">下</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="行高">
                  <a-input-number v-model:value="options.lineHeight" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="字间距">
                  <a-input-number v-model:value="options.letterSpacing" size="small" :step="0.5" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="字体加粗">
              <a-switch v-model:checked="isBold" size="small" @change="onBoldChange" />
            </a-form-item>

            <a-form-item label="背景色">
              <a-input v-model:value="options.backgroundColor" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
            </a-form-item>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="border" header="边框">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="边框宽度">
              <a-input-number v-model:value="options.borderWidth" size="small" :step="0.5" :min="0" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="边框颜色">
              <a-input v-model:value="options.borderColor" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
            </a-form-item>
            <a-form-item label="边框样式">
              <a-select v-model:value="options.borderStyle" size="small" @change="emitChange">
                <a-select-option value="solid">实线</a-select-option>
                <a-select-option value="dashed">虚线</a-select-option>
                <a-select-option value="dotted">点线</a-select-option>
                <a-select-option value="">无</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="advanced" header="高级">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="旋转角度(°)">
              <a-input-number v-model:value="options.rotate" size="small" :step="1" :min="0" :max="360" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="透明度">
              <a-input-number v-model:value="options.opacity" size="small" :step="0.1" :min="0" :max="1" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="层级">
              <a-input-number v-model:value="options.zIndex" size="small" :step="1" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="锁定">
              <a-switch v-model:checked="isFixed" size="small" @change="onFixedChange" />
            </a-form-item>
            <a-form-item label="标题">
              <a-input v-model:value="options.title" size="small" @change="emitChange" />
            </a-form-item>
          </a-form>
        </a-collapse-panel>
      </a-collapse>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  element: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  (e: 'update', options: Record<string, unknown>): void
}>()

const activeKeys = ref(['basic', 'style'])

const options = ref<Record<string, unknown>>({})

const isBold = computed(() => options.value.fontWeight === '700' || options.value.fontWeight === 'bold')
const isFixed = computed(() => options.value.fixed === true)

watch(
  () => props.element,
  (el) => {
    if (el && (el as any).options) {
      options.value = { ...(el as any).options }
    } else {
      options.value = {}
    }
  },
  { immediate: true }
)

function emitChange() {
  emit('update', { ...options.value })
}

function onBoldChange(val: boolean) {
  options.value.fontWeight = val ? '700' : '400'
  emitChange()
}

function onFixedChange(val: boolean) {
  options.value.fixed = val
  emitChange()
}
</script>

<style scoped>
.properties-panel {
  width: var(--panel-width-right);
  background: var(--panel-bg);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  padding: 4px 0;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  gap: 4px;
}

.panel-empty p {
  margin: 0;
}

.panel-header {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 4px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add PropertiesPanel with basic/style/border/advanced sections"
```

---

### Task 13: PrintPreview 组件

**Files:**
- Create: `Version2/src/components/preview/PrintPreview.vue`

- [ ] **Step 1: 创建 `src/components/preview/PrintPreview.vue`**

```vue
<template>
  <a-modal
    v-model:open="visible"
    title="打印预览"
    :footer="null"
    width="90vw"
    :body-style="{ padding: '0', background: '#eef0f4', height: '80vh', display: 'flex', flexDirection: 'column' }"
    destroy-on-close
  >
    <div ref="previewContainer" class="preview-container"></div>
    <div class="preview-footer">
      <a-space>
        <a-button size="small" @click="handlePrint">
          <PrintIcon />
          打印
        </a-button>
        <a-button size="small" @click="handleExportPdf">
          <PdfIcon />
          导出 PDF
        </a-button>
        <a-button size="small" @click="zoomOut">
          <ZoomOutIcon />
        </a-button>
        <span style="font-size:12px; color:#666">{{ Math.round(previewZoom * 100) }}%</span>
        <a-button size="small" @click="zoomIn">
          <ZoomInIcon />
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { PrintIcon, PdfIcon, ZoomInIcon, ZoomOutIcon } from '@/assets/icons'

const props = defineProps<{
  open: boolean
  template: object
  data: object
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const previewContainer = ref<HTMLElement>()
const previewZoom = ref(1)
let printTemplate: any = null

watch(
  () => props.open,
  (val) => {
    if (val) {
      setTimeout(initPreview, 100)
    } else {
      destroyPreview()
    }
  }
)

function initPreview() {
  if (!window.hiprint) return
  try {
    printTemplate = new window.hiprint.PrintTemplate({
      template: props.template,
    })
    printTemplate.print(previewContainer.value, {})
  } catch (e) {
    console.error('预览失败', e)
  }
}

function destroyPreview() {
  if (printTemplate) {
    printTemplate.destroy()
    printTemplate = null
  }
}

function handlePrint() {
  printTemplate?.print()
}

function handleExportPdf() {
  printTemplate?.exportPdf?.()
}

function zoomOut() {
  previewZoom.value = Math.max(0.5, previewZoom.value - 0.1)
}

function zoomIn() {
  previewZoom.value = Math.min(3, previewZoom.value + 0.1)
}

onUnmounted(destroyPreview)
</script>

<style scoped>
.preview-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.preview-footer {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add PrintPreview modal component"
```

---

### Task 14: PrintRenderer 独立预览组件

**Files:**
- Create: `Version2/src/components/renderer/PrintRenderer.vue`

- [ ] **Step 1: 创建 `src/components/renderer/PrintRenderer.vue`**

```vue
<template>
  <div class="print-renderer">
    <div ref="renderContainer" class="render-container"></div>
    <div v-if="showToolbar" class="render-toolbar">
      <a-space>
        <a-button size="small" @click="handlePrint">
          <PrintIcon />
          打印
        </a-button>
        <a-button size="small" @click="handlePdf">
          <PdfIcon />
          PDF
        </a-button>
        <a-button size="small" @click="zoomOut">
          <ZoomOutIcon />
        </a-button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <a-button size="small" @click="zoomIn">
          <ZoomInIcon />
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { PrintIcon, PdfIcon, ZoomInIcon, ZoomOutIcon } from '@/assets/icons'

const props = withDefaults(
  defineProps<{
    templateJson: object
    dataJson?: object
    paperSize?: string
    showToolbar?: boolean
  }>(),
  {
    paperSize: 'A4',
    showToolbar: false,
  }
)

const renderContainer = ref<HTMLElement>()
const zoom = ref(1)
let printTemplate: any = null

function initRenderer() {
  if (!window.hiprint || !renderContainer.value) return
  destroyRenderer()
  try {
    printTemplate = new window.hiprint.PrintTemplate({
      template: props.templateJson,
    })
    printTemplate.print(renderContainer.value, props.dataJson || {})
  } catch (e) {
    console.error('渲染失败', e)
  }
}

function destroyRenderer() {
  if (printTemplate) {
    printTemplate.destroy()
    printTemplate = null
  }
}

function handlePrint() {
  printTemplate?.print(props.dataJson || {})
}

function handlePdf() {
  printTemplate?.exportPdf?.()
}

function zoomOut() {
  zoom.value = Math.max(0.5, zoom.value - 0.1)
}

function zoomIn() {
  zoom.value = Math.min(3, zoom.value + 0.1)
}

watch(
  () => [props.templateJson, props.dataJson],
  () => initRenderer(),
  { deep: true }
)

onMounted(initRenderer)
onUnmounted(destroyRenderer)
</script>

<style scoped>
.print-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.render-container {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #eef0f4;
}

.render-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: add PrintRenderer standalone preview component"
```

---

### Task 15: App.vue + main.ts 总装

**Files:**
- Create: `Version2/src/main.ts`
- Create: `Version2/src/App.vue`
- Create: `Version2/src/env.d.ts`

- [ ] **Step 1: 创建 `src/env.d.ts`**

```typescript
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
```

- [ ] **Step 2: 创建 `src/main.ts`**

```typescript
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

import './hiprint/hiprint.bundle.js'
import './hiprint/hiprint.config.js'

const app = createApp(App)
app.use(createPinia())
app.use(Antd)
app.mount('#app')
```

- [ ] **Step 3: 创建 `src/App.vue`**

```vue
<template>
  <div class="app-layout">
    <AppHeader
      :paper-type="store.paperType"
      :zoom="store.zoom"
      :grid-enabled="store.gridEnabled"
      @new="handleNew"
      @import="handleImport"
      @export="handleExport"
      @print="handlePrint"
      @pdf="handlePdf"
      @update:paper-type="paperTypeChange"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @undo="store.undo()"
      @redo="store.redo()"
      @align-left="align('left')"
      @align-center="align('center')"
      @align-right="align('right')"
      @align-top="align('top')"
      @align-middle="align('middle')"
      @align-bottom="align('bottom')"
      @bring-forward="layer('up')"
      @send-backward="layer('down')"
      @toggle-grid="store.gridEnabled = !store.gridEnabled"
    />

    <div class="app-body">
      <ElementsPanel ref="elementsPanelRef" />

      <DesignCanvas
        :panels="store.template.panels"
        :current-page="store.currentPage"
        @update:current-page="store.setCurrentPage"
        @add-page="store.addPage()"
      />

      <PropertiesPanel
        :element="store.selectedElement"
        @update="onElementUpdate"
      />
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display:none"
      @change="onFileSelected"
    />

    <PrintPreview
      v-model:open="previewOpen"
      :template="store.template"
      :data="{}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useDesignerStore } from '@/stores/designer'
import { useHiprint } from '@/composables/useHiprint'
import { useTemplate } from '@/composables/useTemplate'

import AppHeader from '@/components/designer/AppHeader.vue'
import ElementsPanel from '@/components/designer/ElementsPanel.vue'
import DesignCanvas from '@/components/designer/DesignCanvas.vue'
import PropertiesPanel from '@/components/designer/PropertiesPanel.vue'
import PrintPreview from '@/components/preview/PrintPreview.vue'

import defaultProviderFn from '@/providers/default-provider'
import customProviderFn from '@/providers/custom-provider'

const store = useDesignerStore()
const { hiprintTemplate, init, destroy, setZoom, print } = useHiprint()
const { downloadJSON, readFileAsJSON } = useTemplate()

const elementsPanelRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const previewOpen = ref(false)

const paperSizes: Record<string, { width: number; height: number }> = {
  A3: { width: 420, height: 297 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B3: { width: 500, height: 353 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
}

function paperTypeChange(type: string) {
  store.setPaperType(type)
  const size = paperSizes[type]
  if (size) {
    hiprintTemplate.value?.setPaper(type, size)
  }
}

function zoomIn() {
  store.setZoom(store.zoom + 0.1)
  setZoom(store.zoom)
}

function zoomOut() {
  store.setZoom(store.zoom - 0.1)
  setZoom(store.zoom)
}

function handlePrint() {
  hiprintTemplate.value?.print?.()
}

function handlePdf() {
  hiprintTemplate.value?.exportPdf?.()
}

function handleNew() {
  store.newTemplate()
  hiprintTemplate.value?.update?.(store.template)
}

function handleExport() {
  downloadJSON(store.template)
  message.success('模板已导出')
}

function handleImport() {
  fileInputRef.value?.click()
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const json = await readFileAsJSON(file)
    store.importTemplate(json)
    hiprintTemplate.value?.update?.(store.template)
    message.success('模板已导入')
  } catch (err) {
    message.error('导入失败：格式不正确')
  }
}

function align(dir: string) {
  // hiprint alignment maps
  const map: Record<string, string> = {
    left: 'vLeft', center: 'vCenter', right: 'vRight',
    top: 'vTop', middle: 'vMiddle', bottom: 'vBottom',
  }
  hiprintTemplate.value?.align?.(map[dir])
}

function layer(dir: string) {
  if (dir === 'up') {
    hiprintTemplate.value?.moveUp?.()
  } else {
    hiprintTemplate.value?.moveDown?.()
  }
}

function onElementUpdate(options: Record<string, unknown>) {
  hiprintTemplate.value?.updateElementOption?.(options)
}

onMounted(() => {
  const hiprint = (window as any).hiprint
  if (!hiprint) return

  const defaultProvider = defaultProviderFn(hiprint)()
  const customProvider = customProviderFn(hiprint)()

  init(
    '#hiprint-printTemplate',
    '#PrintElementOptionSetting',
    [defaultProvider, customProvider],
    store.template,
    {
      onDataChanged() {
        store.pushHistory()
      },
    }
  )

  // build draggable items after hiprint is initialized
  nextTick(() => {
    const items = document.querySelectorAll('.ep-draggable-item, .element-item')
    if (items.length > 0 && hiprint.PrintElementTypeManager) {
      hiprint.PrintElementTypeManager.buildByHtml(items as any)
    }
  })
})

onUnmounted(() => {
  destroy()
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "feat: wire up App.vue and main.ts with all components integrated"
```

---

### Task 16: 启动验证 + 调试修复

- [ ] **Step 1: 启动开发服务器**

Run: `cd c:/Users/Lenovo/Desktop/Project/Print/Version2 && npm run dev`
Expected: Vite 启动成功，无编译错误

- [ ] **Step 2: 检查页面渲染**

在浏览器打开 http://localhost:5173 检查：
- 顶部 Header 显示"日东打印设计器"和所有工具栏按钮
- 左侧面板显示默认组件和自定义组件折叠列表
- 中间画布显示打印纸设计区域
- 右侧属性面板显示"请选择元素"

- [ ] **Step 3: 修复发现的问题**

根据浏览器控制台报错修复：
- hiprint 初始化失败 → 检查 jQuery 和 hiprint.bundle.js 加载顺序
- 组件导入报错 → 检查路径别名和类型声明
- 样式问题 → 调整 CSS 变量或 antd 覆盖

- [ ] **Step 4: Commit**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2
git add -A
git commit -m "fix: startup validation and bug fixes"
```
