# 日东打印设计器 Version2 — 设计规格

**日期**: 2026-07-16  
**状态**: 已确认

---

## 概述

基于 vue-plugin-hiprint 精简版打印设计器。保留默认拖拽设计 + 自定义设计合并为单页，移除队列批量打印、多面板设计、模版中心、语言设置。使用 Vue3 + Vite + Ant Design Vue 4.x 重建，UI 风格清新精致紧凑。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 (Composition API, `<script setup>`) |
| 构建 | Vite 5 |
| UI 库 | Ant Design Vue 4.x |
| 状态管理 | Pinia |
| 样式 | CSS Variables + Scoped Styles + Antd 主题定制 |
| 图标 | 手写 SVG 组件 |
| 打印引擎 | 复用父项目 hiprint.bundle.js |

---

## 功能范围

**保留**:
- 默认拖拽设计 + 自定义设计（合并为一页，左侧上下分区）
- 纸张选择、缩放、撤销/重做
- 元素对齐（左中右、上中下）、分布对齐
- 元素层级（置顶/置底/上移/下移）
- 网格开关、清空画布
- 导入/导出模板 JSON
- 打印、导出 PDF
- 打印预览、独立 PrintRenderer 组件
- 多页设计
- 所有原始属性配置项（除函数类）

**移除**:
- 队列批量打印
- 多面板设计
- 模版中心
- 语言设置/i18n
- 格式化函数、样式函数等开发者功能

---

## 目录结构

```
Version2/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.ts
    ├── App.vue
    ├── styles/
    │   ├── variables.css
    │   ├── global.css
    │   └── antd-override.css
    ├── assets/
    │   └── icons/
    │       ├── *.vue              # ~20 SVG 图标组件
    │       └── index.ts
    ├── hiprint/
    │   ├── hiprint.bundle.js
    │   └── hiprint.config.js
    ├── providers/
    │   ├── default-provider.js
    │   └── custom-provider.js
    ├── stores/
    │   └── designer.ts
    ├── composables/
    │   ├── useHiprint.ts
    │   └── useTemplate.ts
    ├── config/
    │   └── custom-elements.ts
    └── components/
        ├── designer/
        │   ├── AppHeader.vue
        │   ├── ElementsPanel.vue
        │   ├── DesignCanvas.vue
        │   └── PropertiesPanel.vue
        ├── renderer/
        │   └── PrintRenderer.vue
        ├── preview/
        │   └── PrintPreview.vue
        └── common/
            └── JsonView.vue
```

---

## 布局

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER (48px)  日东打印设计器  文件▾ 导出▾ 纸张:A4▾ ...      │
├────────────┬──────────────────────────┬───────────────────────┤
│ 元素面板    │       画布区             │     属性面板           │
│ (250px)    │    (flex-1)             │     (280px)           │
│            │                        │                       │
│ 默认组件 ▾  │   ┌──────────────┐     │  选中元素属性编辑       │
│  文本 图片  │   │   打印纸张    │     │  基本/样式/边框/高级    │
│  表格 条码  │   │   设计区域    │     │  折叠面板              │
│  横线 竖线  │   │              │     │                       │
│  矩形 椭圆  │   └──────────────┘     │                       │
│ ─────────  │                        │                       │
│ 自定义组件 ▾│     页面1 页面2 +页面   │                       │
│  订单号    │                        │                       │
│  客户名    │                        │                       │
│  日期 金额 │                        │                       │
└────────────┴──────────────────────────┴───────────────────────┘
```

---

## 视觉风格

- **主色调**: 清新蓝 #4C8BF5
- **背景**: 页面 #f5f6f8, 面板 #fff, 画布区 #eef0f4
- **圆角**: 卡片 6px, 按钮 4px
- **阴影**: 面板 0 1px 3px rgba(0,0,0,0.06), 纸张 0 2px 8px rgba(0,0,0,0.1)
- **间距**: 面板内边距 12px, 元素间距 8px
- **字体**: 正文 14px, 辅助 12px, 标题 16px
- **滚动条**: 6px 宽, 浅灰 thumb, hover 变蓝

---

## 远期目标：作为独立包导出

Version2 架构为未来导出 npm 包做准备：

- **核心与外壳分离**: `stores/`、`composables/`、`providers/`、`hiprint/` 构成"引擎层"，`components/` 构成"UI层"
- **引擎层无UI框架依赖**（仅依赖 hiprint + 纯逻辑），可被任何 Vue3 项目引用
- **PrintRenderer 为第一导出目标** — 已设计为独立组件，零外部依赖
- 未来导出形式: `@ridong/print-designer` 包含设计器 + `@ridong/print-renderer` 包含预览渲染器
- hiprint.bundle.js 作为 peer dependency 外置，不打包进组件

当前阶段不实现导出功能，但目录结构和组件边界已为此优化。

---

## 组件说明

### AppHeader (48px 单行)
- 左侧: Logo + "日东打印设计器" 标题
- 文件▾: 新建、导入JSON、导出JSON
- 导出▾: 打印、导出PDF
- 纸张选择、缩放(数字+−○+)、撤销重做
- 对齐组、层级组、网格开关

### ElementsPanel (250px)
- 上半区: 默认组件(a-collapse) — 文本/图片/表格/条形码/二维码/横线/竖线/矩形/椭圆
- 分隔线
- 下半区: 自定义组件(a-collapse) — 从 config/custom-elements.ts 读取
- 每个元素项: SVG图标 + 名称, hover蓝色高亮, cursor:grab

### DesignCanvas (flex-1)
- 浅灰背景, 打印纸居中白色+阴影
- 多页支持(标签切换+添加页面)

### PropertiesPanel (280px)
- 未选中: "请在画布中选择一个元素进行编辑"
- 已选中: 基本/样式/边框/高级 四组折叠面板, antd Form size=small
- 不含格式化函数、样式函数等

### PrintRenderer (独立组件)
- Props: templateJson, dataJson, paperSize, showToolbar
- 只读渲染, 可选底部打印/缩放工具栏
- 可嵌入任何页面给客户预览
