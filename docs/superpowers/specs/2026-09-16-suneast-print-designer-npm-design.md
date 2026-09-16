# suneast-print-designer 公开发包 — 设计规格

**日期**: 2026-09-16  
**状态**: 已确认（架构与发布流程已口头确认；演示站托管延后）

---

## 概述

将本仓库的 Vue 打印设计器以 **单仓库双模式** 发布到公开 npm，包名为 `suneast-print-designer`。其他项目 `npm install` 后注册插件并使用整页 `<PrintDesigner />`。第一版不单独上线演示站；本仓库保留应用构建，供后期静态托管。

---

## 目标与非目标

**要做**

- 公开 npm 包 `suneast-print-designer@2.0.0`
- 保留 `npm run dev`（本地开发）与 `npm run build`（日后演示站）
- `npm run build:lib` 产出可发布的 `dist`
- 宿主通过 Vue 插件注册整页设计器（含内置打印预览）
- 生成 TypeScript 声明、补齐 `license` 与 `publishConfig.access: public`

**不做（第一版）**

- 在线演示站托管
- 给 `<PrintDesigner />` 增加业务 props（外部模板、外部预览数据）
- 私有 npm 源
- 独立的包测试套件
- 把 Vue / Pinia / Ant Design Vue 打进库包

---

## 仓库模式

| 命令 | 产物 | 第一版 |
|---|---|---|
| `npm run dev` | 本地 Vite 开发服务 | 保留 |
| `npm run build:lib` | 库：ES + UMD + CSS + `.d.ts` | 发布用 |
| `npm publish` | 上传 `files` 字段列出的内容 | 登录后执行 |
| `npm run build` | 可静态托管的演示应用 | 保留，不上线 |

入口：`src/index.ts`（库）与 `src/main.ts`（应用）继续并存。库模式不启用图片代理中间件。

---

## 包标识与产物

- `name`: `suneast-print-designer`
- `version`: `2.0.0`
- `license`: MIT
- `publishConfig.access`: `public`
- `files`: `dist`、`README.md`

导出约定：

- `.` → types `dist/index.d.ts`，import ES，require UMD
- CSS → `suneast-print-designer/dist/style.css`（或等价 `exports` 路径）

Vite lib 全局名可保留或改为与包名一致的 `SuneastPrintDesigner`；产物文件名与包名对齐（如 `suneast-print-designer.js` / `suneast-print-designer.umd.cjs`）。

类型：当前 `vue-tsc` 为 `noEmit`，不会生成 `dist/index.d.ts`。实现时用 `vite-plugin-dts`（或等价）在 `build:lib` 时写出声明。

---

## 宿主接入

消费项目安装：

```bash
npm install suneast-print-designer
npm install vue pinia ant-design-vue @ant-design/icons-vue
```

`main.ts`：

```ts
import PrintDesignerPlugin from 'suneast-print-designer'
import 'suneast-print-designer/dist/style.css'

app.use(createPinia())
app.use(Antd)
app.use(PrintDesignerPlugin)
```

页面：`<PrintDesigner />`。行为与本仓库应用一致：工具栏、元素面板、画布、属性面板、打印预览。预览使用包内 `PREVIEW_DATA`，第一版不从宿主注入。

**peerDependencies**：`vue`、`pinia`、`ant-design-vue`、`@ant-design/icons-vue`（版本下限与现 `package.json` 一致）。

**打进库的依赖**：jQuery、hiprint、条码/PDF 等相关依赖。引入库时沿用现有 side effect：把 `$` / `jQuery` / `hiprint` 挂到 `window`。

---

## 发布流程

1. 实现包名、产物名、README、类型生成、license、publishConfig。
2. `npm run build:lib` 成功。
3. `npm pack` 检查包内仅有 `dist` 与 README。
4. 维护者本机：`npm login`，`npm whoami` 确认身份。
5. 确认 npm 上 `suneast-print-designer` 未被占用。
6. `npm publish --access public`。
7. 发错版本不覆盖，改为发 `2.0.1`。

构建失败、未登录、包名冲突时不发布。

---

## 验收

- 本仓库 `npm run build:lib` 通过，`dist` 含 JS、CSS、`index.d.ts`。
- 最小 Vue 3 项目安装该包后能渲染设计器并打开预览。
- README 安装名与导出路径与真实包一致。

---

## 后续（非本规格）

静态托管演示站：对 `npm run build` 的应用产物使用 GitHub Pages / Vercel 等，不阻塞第一版 npm 发布。
