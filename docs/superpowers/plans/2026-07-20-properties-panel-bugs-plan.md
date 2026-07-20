# Bug修复: 属性面板与表格编辑体验优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复3个bug：文本控件颜色变黑、表格表头编辑体验、坐标锁定(fixed)不生效

**Architecture:** 全部改动在现有文件中，不新增文件。Bug 1修改配置默认值+输入防护，Bug 2追加CSS覆盖，Bug 3在hiprint的`updateOption`方法上追加`fixed→draggable`联动逻辑

**Tech Stack:** Vue 3 + Pinia + hiprint (jQuery插件) + TypeScript

---

### Task 1: Bug 1a — 在 hiprint.config.js 中添加颜色默认值

**Files:**
- Modify: `src/hiprint/hiprint.config.js`

- [ ] **Step 1: 为各元素类型添加 backgroundColor/borderColor 默认空值**

在 `hiprint.config.js` 中找到各元素类型的 `default` 对象，添加颜色默认值。

编辑 `src/hiprint/hiprint.config.js`:

**text (line ~405-409)**:
```js
default: {
  width: 120,
  height: 20,
  backgroundColor: '',
  borderColor: '',
}
```

**longText (line ~761-764)**:
```js
default: {
  height: 42,
  width: 550,
  backgroundColor: '',
  borderColor: '',
}
```

**barcode (line ~1785-1792)**:
```js
default: {
  width: 160,
  height: 40,
  title: '条形码',
  barcodeType: 'code128',
  testData: 'barcode',
  backgroundColor: '',
}
```

**qrcode (line ~1947-1953)**:
```js
default: {
  width: 80,
  height: 80,
  title: '二维码',
  qrcodeType: 'qrcode',
  testData: 'qrcode',
  backgroundColor: '',
}
```

**image (line ~524-525)**:
```js
default: {
  borderColor: '',
}
```

**rect (line ~1335-1339)**:
```js
default: {
  borderWidth: undefined,
  height: 90,
  width: 90,
  backgroundColor: '',
  borderColor: '',
}
```

**oval (line ~1439-1443)**:
```js
default: {
  borderWidth: undefined,
  height: 90,
  width: 90,
  backgroundColor: '',
  borderColor: '',
}
```

**table (line ~1044-1046)**:
```js
default: {
  width: 550,
  tableHeaderBackground: '',
}
```

- [ ] **Step 2: 验证颜色默认值已添加**

Run: `grep -n "backgroundColor\|borderColor\|tableHeaderBackground" src/hiprint/hiprint.config.js`
Expected: 所有上述元素类型都有对应的颜色默认值

- [ ] **Step 3: Commit**

```bash
git add src/hiprint/hiprint.config.js
git commit -m "fix: add empty color defaults to prevent black background/border on config change

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Bug 1b — PropertiesPanel enhanceColorInputs 空值防护

**Files:**
- Modify: `src/components/designer/PropertiesPanel.vue`

- [ ] **Step 1: 在 syncHex 函数开头增加空值防护**

编辑 `src/components/designer/PropertiesPanel.vue`，找到 `syncHex` 函数（约 line 91-93），修改为：

```js
const syncHex = () => {
  // 防护：color input 初始值为 #000000 且用户未输入 hex 值时跳过同步
  if (colorInput.value === '#000000' && !hexInput.value.trim()) return
  hexInput.value = (colorInput.value || '').toUpperCase()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/designer/PropertiesPanel.vue
git commit -m "fix: skip color sync when color input is default black and hex is empty

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Bug 2 — 表格表头选中样式 & 编辑框铺满

**Files:**
- Modify: `src/components/designer/DesignCanvas.vue`

- [ ] **Step 1: 在 DesignCanvas.vue 非 scoped `<style>` 块末尾追加CSS**

编辑 `src/components/designer/DesignCanvas.vue`，在第二个 `<style>` 块（非 scoped，约 line 302）的末尾（`</style>` 之前）追加：

```css
/* 表头选中行：白色文字，在深蓝色(#3e66ad)背景上可见 */
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

- [ ] **Step 2: Commit**

```bash
git add src/components/designer/DesignCanvas.vue
git commit -m "fix: white text on selected table header, full-width cell editor

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Bug 3 — 坐标锁定(fixed)通过 draggable 联动生效

**Files:**
- Modify: `src/composables/useHiprint.ts`

**根因确认:** hiprint bundle line 789-790 在每次编辑结束后强制 `draggable = true`; line 910-941 的 `updateOption` 方法设置 `this.options.fixed` 但不同步更新 `this.options.draggable` 和 hidraggable 状态。

- [ ] **Step 1: 在 init() 中添加 updateOption prototype patch（含延迟重试）**

编辑 `src/composables/useHiprint.ts`，在 `design()` 调用成功后（`isReady.value = true` 之前，约 line 114），添加原型 patch 逻辑。由于初始画布可能为空（无元素实例），需要 MutationObserver 兜底：

```js
// ── fixed → draggable 联动 ──
// hiprint 仅在编辑 blur 时更新 draggable（且默认重置为 true），
// fixed 变更时不同步 hidraggable 状态，导致位置锁定不生效。
// 通过原型链找到 updateOption 所在原型并 patch。
function applyFixedPatch(): boolean {
  const $ = (window as any).$
  if (!$) return false
  const el = hiprintTemplate.value?.editingPanel?.printElements?.[0]
  if (!el) return false
  let proto = Object.getPrototypeOf(el)
  while (proto && !Object.prototype.hasOwnProperty.call(proto, 'updateOption')) {
    proto = Object.getPrototypeOf(proto)
  }
  if (proto && !(proto as any).__fixedPatchApplied) {
    ;(proto as any).__fixedPatchApplied = true
    const orig = proto.updateOption
    proto.updateOption = function (this: any, o: string, v: any, b?: boolean) {
      orig.call(this, o, v, b)
      if (o === 'fixed') {
        this.options.draggable = !v
        if (this.designTarget) {
          $(this.designTarget).hidraggable('update', { draggable: !v })
        }
      }
    }
  }
  return true
}

try {
  if (!applyFixedPatch()) {
    // 初始无元素，通过 MutationObserver 在首个元素添加后 patch
    const paper = document.querySelector('.hiprint-printPaper-content')
    if (paper) {
      const mo = new MutationObserver(() => {
        if (applyFixedPatch()) mo.disconnect()
      })
      mo.observe(paper, { childList: true })
    }
  }
} catch (e) {
  console.error('fixed→draggable patch 失败:', e)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useHiprint.ts
git commit -m "fix: sync fixed option to draggable state so position lock works

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 验证 — 启动应用手动测试

**Files:** 无需修改

- [ ] **Step 1: 启动开发服务器**

```bash
cd c:/Users/Lenovo/Desktop/Project/Print/Version2 && npm run dev
```

- [ ] **Step 2: 验证 Bug 1 — 文本颜色不变黑**

1. 拖拽"文本"控件到画布
2. 修改任意属性（如字体大小、宽度）
3. 确认元素的 `background-color` 和 `border-color` inline style 未被设为 `rgb(0,0,0)`

- [ ] **Step 3: 验证 Bug 2 — 表格表头**

1. 拖拽"表格"控件到画布
2. 单击表头某列——确认选中后文字为白色，背景为深蓝(#3e66ad)
3. 双击表头编辑——确认编辑输入框填满整个单元格

- [ ] **Step 4: 验证 Bug 3 — 坐标锁定**

1. 拖拽"文本"控件到画布
2. 在属性面板中勾选"固定位置"(fixed)
3. 尝试拖动该元素——确认无法拖动
4. 取消勾选——确认可以正常拖动
