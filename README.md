# Suneast Print Designer

Vue 3 打印模板设计器组件，基于 hiprint 打印引擎。

当前以本地 `.tgz` 分发，其它项目用文件路径安装。

## 安装

在本仓库生成安装包：

```bash
npm run pack:lib
```

会得到 `suneast-print-designer-2.0.0.tgz`。在消费项目里：

```bash
npm install C:\path\to\suneast-print-designer-2.0.0.tgz
```

把路径换成你机器上 tgz 的实际位置。

消费项目还需要：

```bash
npm install vue pinia ant-design-vue @ant-design/icons-vue
```

## 使用

在 `main.ts` 中注册：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import PrintDesignerPlugin from 'suneast-print-designer'
import 'suneast-print-designer/dist/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(Antd)
app.use(PrintDesignerPlugin)
app.mount('#app')
```

在任意组件中使用：

```vue
<template>
  <PrintDesigner />
</template>
```

设计器为整页组件，含工具栏、元素面板、画布、属性面板和打印预览（预览使用包内示例数据）。

## API

### 组件

- `PrintDesigner` — 主设计器组件

### 插件

- `PrintDesignerPlugin` — Vue 插件（`default` 导出），注册全局 `<PrintDesigner />`

### Composables

- `useHiprint()` — hiprint 生命周期管理
- `useTemplate()` — 模板导入/导出

### Store

- `useDesignerStore()` — 设计器状态 Pinia store

### 工具函数

- `renderPreviewPages()` — 渲染预览页面
- `printPreviewPapers()` — 打印预览
- `exportPreviewPapersToPdf()` — 导出为 PDF
- `exportPreviewPapersToImagePdf()` — 导出为图片 PDF
- `computeTableLayout()` — 计算表格布局
- `writeTableCellBorderOptions()` — 写入表格单元格边框选项
- `isTableLayoutElementType()` — 判断是否为表格布局兼容元素类型
- `sealFakeTableTopBordersOnElements()` — 封闭假表格上边框
- `sealFakeTableTopBordersInContainer()` — 在容器中封闭假表格上边框

### Providers

- `defaultProvider` — 默认 hiprint 元素提供者
- `customProvider` — 自定义 hiprint 元素提供者

## 要求

- Vue >= 3.5
- Pinia >= 2.3
- Ant Design Vue >= 4.2
- @ant-design/icons-vue >= 7.0

## GitHub Pages 预览站

预览站构建的是本仓库的网页应用（`npx vite build`），不是 `.tgz`。把本仓库推到 GitHub 后：

1. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
2. 推送到 `master` 或 `main`，等待 Actions 里的 `GitHub Pages` 工作流成功
3. 打开 `https://<用户名>.github.io/<仓库名>/`

本机没有安装 GitHub CLI，需要你在 GitHub 网页上新建仓库并推送。不要把 `.tgz` 和 `node_modules` 推进去。
