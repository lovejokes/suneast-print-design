# Bug修复: 属性面板与表格编辑体验优化

**日期**: 2026-07-20
**状态**: 待实现

---

## 背景

用户反馈了4个问题，涉及 hiprint 打印设计器的属性设置面板、表格编辑体验、位置锁定功能以及UI文案理解。

---

## Bug 1: 文本控件修改配置后背景色/边框色变黑

### 根因

hiprint 渲染属性设置面板时，`backgroundColor` 和 `borderColor` 的 `<input type="color">` 初始值为空（`#000000`）。当用户修改任意属性触发 auto-submit 时，空 color 值被 jQuery `.val()` 读取为空字符串，hiprint 内部将其解析为 `rgb(0,0,0)` 并写入元素的 inline style。

### 修复

**文件: `src/hiprint/hiprint.config.js`** — 在以下元素类型的 `default` 中添加颜色默认值：
- `text`: `backgroundColor: ''`, `borderColor: ''`
- `longText`: `backgroundColor: ''`, `borderColor: ''`
- `barcode`: `backgroundColor: ''`
- `qrcode`: `backgroundColor: ''`
- `image`: `borderColor: ''`
- `rect`: `backgroundColor: ''`, `borderColor: ''`
- `oval`: `backgroundColor: ''`, `borderColor: ''`
- `table`: `tableHeaderBackground: ''`

**文件: `src/components/designer/PropertiesPanel.vue`** — `enhanceColorInputs` 的 `syncHex` 函数中增加空值防护：当 color input 的值为 `#000000`（默认黑色）且 hex text input 为空或显示占位符时，跳过同步，避免将未主动设置的颜色写入元素。

---

## Bug 2: 表格表头选中字体颜色 & 编辑框大小

### 根因

1. `hiprint.css` 中 `.hitable .selected { background: #3e66ad; }` 只设置了深蓝背景色（#3e66ad），未设置文字颜色。浏览器默认黑色文字在深蓝背景上几乎不可见。
2. `.hitable .hitable-editor-text` 的宽高为 `width: 95%; height: 80%`，编辑框未填满单元格。

### 修复

**文件: `src/components/designer/DesignCanvas.vue`** — 非 scoped `<style>` 块追加：
```css
/* 表头选中行：白色文字 */
#hiprint-printTemplate .hitable .selected {
  color: #fff !important;
}

/* 表格编辑框：铺满单元格 */
#hiprint-printTemplate .hitable .hitable-editor-text {
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box;
}
```

---

## Bug 3: 坐标锁定(fixed)不生效

### 根因（待排查确认）

hiprint 的 `fixed` 选项通过控制 hidraggable 的 `disable`/`enable` 来锁定元素位置。可能原因：
1. `useHiprint.ts` 中清除了 `.hiprint-printPaper-content` 的 `left/top`，干扰了 hidraggable 状态判断
2. DesignCanvas.vue 中 `.resize-panel` 的 CSS 覆盖（`display: block !important`）与 hiprint 内部 fixed 判断逻辑冲突

### 修复策略

1. **排查阶段**: 在浏览器 console 验证 hiprint 的 `fixed` option change 事件是否正常触发，检查 hidraggable 实例的 disabled 状态
2. **修复**: 在 `useHiprint.ts` 的 `init()` 中监听 hiprint option change 事件，当 `fixed` 值变化时手动执行 `$(element).hidraggable('disable')` / `$(element).hidraggable('enable')`

**文件: `src/composables/useHiprint.ts`** — 在元素创建后添加 fixed 选项变更监听逻辑。

---

## Bug 4: "纸张方向(仅自定义纸质有效)"

### 结论

这不是 bug，是 hiprint 的原有设计。`orient` 选项（纸张方向）在 `hiprint.config.js` panel 配置中启用。hiprint 内置的预设纸张（A4/A3/B4等）有固定方向定义，`orient` 切换仅在自定义纸张尺寸（`paperType: 'custom'`）时生效。

**无需代码修改**，仅向用户解释此行为即可。

---

## 影响范围

| Bug | 文件 | 风险 |
|-----|------|------|
| 1 | `hiprint.config.js`, `PropertiesPanel.vue` | 低 — 仅添加默认值和空值防护 |
| 2 | `DesignCanvas.vue` | 低 — 纯CSS追加 |
| 3 | `useHiprint.ts` | 中 — 需先排查根因再修复 |
| 4 | 无 | - |
