<template>
  <aside class="properties-panel">
    <div class="panel-header">属性设置</div>
    <div id="PrintElementOptionSetting" class="settings-container"></div>
    <div v-if="!element" class="panel-empty-overlay">
      <p>请在画布中选择</p>
      <p>一个元素进行编辑</p>
    </div>
    <div class="panel-footer" ref="footerRef"></div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  element: Record<string, unknown> | null
}>()

const footerRef = ref<HTMLElement>()

let observer: MutationObserver | null = null
let moveTimer: ReturnType<typeof setTimeout> | null = null

function findButtons(container: HTMLElement): { submitBtn: HTMLElement | null; deleteBtn: HTMLElement | null } {
  let submitBtn = container.querySelector('.hiprint-option-item-submitBtn') as HTMLElement | null
  let deleteBtn = container.querySelector('.hiprint-option-item-deleteBtn') as HTMLElement | null

  if (!submitBtn || !deleteBtn) {
    const allButtons = container.querySelectorAll('button')
    allButtons.forEach((btn) => {
      const text = (btn.textContent || '').trim()
      if (!submitBtn && (text === '确定' || text === '保存' || text === '确认')) {
        submitBtn = btn as HTMLElement
      }
      if (!deleteBtn && (text === '删除' || text === '移除')) {
        deleteBtn = btn as HTMLElement
      }
    })
  }

  return { submitBtn, deleteBtn }
}

function moveButtonsToFooter() {
  const footer = footerRef.value
  if (!footer) return
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return

  const { submitBtn, deleteBtn } = findButtons(container)
  if (!submitBtn && !deleteBtn) return

  footer.innerHTML = ''

  if (submitBtn) {
    footer.appendChild(submitBtn)
  }
  if (deleteBtn) {
    footer.appendChild(deleteBtn)
  }
}

/**
 * 增强原生 <input type="color">：在其后追加一个 hex 文本输入框，
 * 既显示当前颜色值，又允许直接输入十六进制色值。
 * - 文本框放在 color 输入之后，保证 hiprint 的 `find("input").val()`
 *   仍解析到第一个 color 输入，不影响 getValue/setValue。
 * - 跳过含水印透明度滑块等复合字段，避免破坏其布局。
 */
function enhanceColorInputs() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return
  const colorInputs = container.querySelectorAll<HTMLInputElement>(
    'input[type="color"]:not([data-hex-enhanced])'
  )
  colorInputs.forEach((colorInput) => {
    const field = colorInput.parentElement
    if (!field || field.querySelector('input[type="range"]')) return
    colorInput.setAttribute('data-hex-enhanced', '1')
    colorInput.setAttribute('data-color-pristine', '1')
    field.classList.add('color-field-enhanced')

    const hexInput = document.createElement('input')
    hexInput.type = 'text'
    hexInput.className = 'color-hex-input'
    hexInput.value = ''
    hexInput.placeholder = '#RRGGBB'
    hexInput.maxLength = 7
    field.appendChild(hexInput)

    const markDirty = () => {
      colorInput.removeAttribute('data-color-pristine')
    }

    const syncHex = () => {
      if (colorInput.hasAttribute('data-color-pristine')) return
      hexInput.value = (colorInput.value || '').toUpperCase()
    }
    colorInput.addEventListener('input', markDirty)
    colorInput.addEventListener('input', syncHex)
    colorInput.addEventListener('change', syncHex)
    hexInput.addEventListener('input', markDirty)

    const applyHex = () => {
      let v = (hexInput.value || '').trim()
      if (!v) return
      if (v[0] !== '#') v = '#' + v
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        if (colorInput.value.toLowerCase() !== v.toLowerCase()) {
          colorInput.value = v
          // 触发 hiprint 的 auto-submit（jQuery 绑定的 change 事件）
          const jq = (window as any).$
          if (jq) jq(colorInput).trigger('change')
          else colorInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
        hexInput.value = v.toUpperCase()
      } else {
        // 非法输入回退为当前颜色
        hexInput.value = (colorInput.value || '').toUpperCase()
      }
    }
    hexInput.addEventListener('change', applyHex)
    hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        applyHex()
      }
    })
  })
}

/**
 * 将独立渲染的左/上/右/下偏移项包裹为一个 .hiprint-option-item-row 容器
 * （参考水印功能的卡片布局），内部保持 2×2 网格排列。
 */
function enhanceOffsetOptions() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return
  const items = container.querySelectorAll<HTMLElement>('.hiprint-option-item')
  const offsetLabels = ['左偏移', '顶部偏移', '右偏移', '下偏移']
  const offsetItems: HTMLElement[] = []

  items.forEach((item) => {
    const label = item.querySelector('.hiprint-option-item-label')
    if (label && offsetLabels.includes((label.textContent || '').trim())) {
      offsetItems.push(item)
    }
  })

  if (offsetItems.length < 2) return

  // 检查是否已处理
  const firstItem = offsetItems[0]
  if (firstItem.dataset.offsetGrouped) return

  // 创建 .hiprint-option-item-row 容器（与 watermark 等卡片布局一致）
  const wrapper = document.createElement('div')
  wrapper.className = 'hiprint-option-item hiprint-option-item-row'

  // 组标题
  const title = document.createElement('div')
  title.className = 'hiprint-option-item-label'
  title.textContent = '偏移调整'
  wrapper.appendChild(title)

  // 2×2 网格容器
  const grid = document.createElement('div')
  grid.className = 'offset-grid'

  wrapper.appendChild(grid)

  // 先将 wrapper 插入到第一个偏移项原来的位置（DOM 操作必须在移动项目之前）
  firstItem.parentNode?.insertBefore(wrapper, firstItem)

  // 再将偏移项移入网格
  offsetItems.forEach((item, i) => {
    item.dataset.offsetGrouped = '1'
    item.classList.add('offset-item')
    item.classList.add(i % 2 === 0 ? 'offset-item--left' : 'offset-item--right')
    grid.appendChild(item)
    if (i % 2 === 1) {
      const clearfix = document.createElement('div')
      clearfix.className = 'offset-clearfix'
      grid.appendChild(clearfix)
    }
  })
}

onMounted(() => {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return

  observer = new MutationObserver(() => {
    const hasContent = container.children.length > 0
    const overlay = document.querySelector('.panel-empty-overlay') as HTMLElement
    if (overlay) {
      overlay.style.display = hasContent ? 'none' : 'flex'
    }
    enhanceColorInputs()
    enhanceOffsetOptions()
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(moveButtonsToFooter, 50)
  })

  observer.observe(container, { childList: true, subtree: true })

  // 拦截 auto-submit：hiprint 的 submitOption() 遍历所有 option item
  // 调用 getValue()，未被显式改过的 color input 值恒为 #000000（浏览器默认），
  // 会被误写为 rgb(0,0,0)。此处将 pristine 的 color input 临时改为 type=text
  // 并清空 value，使 getValue() 读到 '' 而非 #000000。
  container.addEventListener('change', (e) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('auto-submit')) return
    const pristine = container.querySelectorAll<HTMLInputElement>(
      'input[type="color"][data-color-pristine]'
    )
    if (pristine.length === 0) return
    pristine.forEach((ci: any) => {
      ci.setAttribute('data-orig-type', 'color')
      ci.setAttribute('type', 'text')
      ci.value = ''
    })
    requestAnimationFrame(() => {
      pristine.forEach((ci: any) => {
        ci.setAttribute('type', 'color')
        ci.removeAttribute('data-orig-type')
      })
    })
  }, true)

  nextTick(() => {
    enhanceColorInputs()
    enhanceOffsetOptions()
    moveButtonsToFooter()
  })
})

watch(() => props.element, () => {
  nextTick(() => {
    enhanceColorInputs()
    enhanceOffsetOptions()
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(moveButtonsToFooter, 100)
  })
})

onUnmounted(() => {
  observer?.disconnect()
  if (moveTimer) clearTimeout(moveTimer)
})
</script>

<style scoped>
.properties-panel {
  width: var(--panel-width-right);
  background: var(--panel-bg);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
}

.panel-header {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: var(--font-size-title);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: #fafbfc;
}

.settings-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.panel-footer {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-end;
  min-height: 44px;
}

.panel-footer:empty {
  display: none;
}

.panel-empty-overlay {
  position: absolute;
  inset: 36px 0 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  gap: 4px;
  pointer-events: none;
  z-index: 1;
  background: var(--panel-bg);
}

.panel-empty-overlay p {
  margin: 0;
}
</style>

<style>
/* ═════════════════════════════════════════════════════════════════════ */
/*  Hiprint settings — antd-style restyle with stacked layout           */
/* ═════════════════════════════════════════════════════════════════════ */

#PrintElementOptionSetting .hiprint-option-items {
  font-size: 12px;
  padding: 0;
  display: block;
}

/* Tab panels: restore hide/show behavior */
#PrintElementOptionSetting .prop-tabs .hiprint-option-items {
  display: none;
}
#PrintElementOptionSetting .prop-tabs .hiprint-option-items.active {
  display: block;
}

/* ── All items: uniform stacked layout ── */
#PrintElementOptionSetting .hiprint-option-item {
  float: none;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
  padding: 0;
}

/* ── Label styling ── */
#PrintElementOptionSetting .hiprint-option-item-label {
  font-size: 12px;
  color: #555;
  text-align: left;
  line-height: 1.4;
  padding: 0;
  font-weight: 500;
}

/* ── Row items: same as regular, no card wrapper ── */
#PrintElementOptionSetting .hiprint-option-item-row {
  padding: 0;
  background: none;
  border: none;
  border-radius: 0;
}

#PrintElementOptionSetting .hiprint-option-item-row > .hiprint-option-item-label {
  font-weight: 500;
  color: #555;
  margin-bottom: 0;
}

/* Row fields: inline for W/H / coordinate dual inputs */
#PrintElementOptionSetting .hiprint-option-item-row .hiprint-option-item-field {
  width: 100%;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 6px;
}

#PrintElementOptionSetting .hiprint-option-item-row .hiprint-option-item-field input[type="number"] {
  width: auto !important;
  flex: 1;
  min-width: 0;
}

/* ── Sync lock button ── */
#PrintElementOptionSetting .hiprint-option-item-row .hiprint-option-item-field .sync-lock-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  margin: 0 !important;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #bfbfbf;
  cursor: pointer;
  transition: all 0.15s;
}

#PrintElementOptionSetting .sync-lock-btn .sync-lock-icon {
  display: inline-block;
  vertical-align: middle;
}

#PrintElementOptionSetting .sync-lock-btn:hover {
  color: var(--selection-color, #4C8BF5);
  border-color: var(--selection-color, #4C8BF5);
}

#PrintElementOptionSetting .sync-lock-btn.locked {
  color: #fff;
  background: var(--selection-color, #4C8BF5);
  border-color: var(--selection-color, #4C8BF5);
}

#PrintElementOptionSetting .sync-lock-btn.locked:hover {
  background: #3b6de6;
  border-color: #3b6de6;
}

/* ── Field container ── */
#PrintElementOptionSetting .hiprint-option-item-field {
  width: 100%;
}

/* ── Inputs & Selects ── */
#PrintElementOptionSetting textarea,
#PrintElementOptionSetting input[type="text"],
#PrintElementOptionSetting input[type="number"] {
  height: 28px;
  font-family: '微软雅黑';
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fff;
  color: #333;
  width: 100%;
  box-sizing: border-box;
}
#PrintElementOptionSetting textarea:hover,
#PrintElementOptionSetting input[type="text"]:hover,
#PrintElementOptionSetting input[type="number"]:hover {
  border-color: #b3b3b3;
}
#PrintElementOptionSetting textarea:focus,
#PrintElementOptionSetting input[type="text"]:focus,
#PrintElementOptionSetting input[type="number"]:focus {
  border-color: var(--selection-color, #4C8BF5);
  box-shadow: 0 0 0 2px rgba(76,139,245,0.12);
}

#PrintElementOptionSetting input[type="color"] {
  height: 28px;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  outline: none;
  background: #fff;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

#PrintElementOptionSetting select {
  height: 28px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  outline: none;
  background: #fff;
  color: #333;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

#PrintElementOptionSetting select:hover {
  border-color: #b3b3b3;
}

#PrintElementOptionSetting select:focus {
  border-color: var(--selection-color, #4C8BF5);
  box-shadow: 0 0 0 2px rgba(76,139,245,0.12);
}

/* ── Buttons ── */
#PrintElementOptionSetting button,
#PrintElementOptionSetting .btn {
  height: 28px;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.15s;
}

#PrintElementOptionSetting button:hover {
  color: var(--selection-color, #4C8BF5);
  border-color: var(--selection-color, #4C8BF5);
}

/* ── Checkboxes ── */
#PrintElementOptionSetting input[type="checkbox"] {
  accent-color: #4C8BF5;
  width: 14px;
  height: 14px;
  margin: 6px 0;
}

/* ── Range inputs ── */
#PrintElementOptionSetting input[type="range"] {
  height: 28px;
  accent-color: #4C8BF5;
}

/* ── Submit button in footer ── */
.panel-footer .hiprint-option-item-submitBtn {
  height: 32px !important;
  font-size: 13px !important;
  padding: 4px 20px !important;
  border-radius: 4px !important;
  border: 1px solid #4C8BF5 !important;
  background: #4C8BF5 !important;
  color: #fff !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
}

.panel-footer .hiprint-option-item-submitBtn:hover {
  background: #3b6de6 !important;
  border-color: #3b6de6 !important;
}

/* ── Delete button in footer ── */
.panel-footer .hiprint-option-item-deleteBtn {
  height: 32px !important;
  font-size: 13px !important;
  padding: 4px 16px !important;
  border-radius: 4px !important;
  border: 1px solid #d9d9d9 !important;
  background: #fff !important;
  color: #ff4d4f !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
}

.panel-footer .hiprint-option-item-deleteBtn:hover {
  color: #fff !important;
  background: #ff4d4f !important;
  border-color: #ff4d4f !important;
}

/* ── Option tabs (基础 / 样式 / 边框): 还原 hiprint.css 原生样式 ──
   仅保留功能性的显隐控制（因 #PrintElementOptionSetting ID 选择器优先级
   高于 hiprint.css，需显式声明 inactive 隐藏 / active 显示）。
   视觉样式交给 hiprint.css 的 .prop-tabs .prop-tab-item 规则。 */

/* ── Color picker: color swatch + hex text input (antd-style) ── */
#PrintElementOptionSetting .hiprint-option-item-field.color-field-enhanced {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 6px;
}

#PrintElementOptionSetting .color-field-enhanced input[type="color"] {
  width: 34px !important;
  height: 28px;
  padding: 2px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  background: #fff;
}

#PrintElementOptionSetting .color-field-enhanced .color-hex-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  font-size: 12px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  outline: none;
  background: #fff;
  color: #333;
  text-transform: uppercase;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

#PrintElementOptionSetting .color-field-enhanced .color-hex-input:focus {
  border-color: var(--selection-color, #4C8BF5);
  box-shadow: 0 0 0 2px rgba(76, 139, 245, 0.12);
}

/* ── 偏移调整：2×2 网格 + 组标题 ── */
/* offset grid wrapper inside .hiprint-option-item-row */

#PrintElementOptionSetting .hiprint-option-item-row .offset-grid {
  display: block;
  width: 100%;
}

#PrintElementOptionSetting .hiprint-option-item-row .offset-grid::after {
  content: '';
  display: table;
  clear: both;
}

#PrintElementOptionSetting .hiprint-option-item.offset-item {
  width: 50% !important;
  float: left;
  clear: none;
  margin-bottom: 4px;
  padding: 0 4px;
  box-sizing: border-box;
}

#PrintElementOptionSetting .hiprint-option-item.offset-item--left {
	  padding-left: 0;
  padding-right: 4px;
}

#PrintElementOptionSetting .hiprint-option-item.offset-item--right {
  padding-left: 4px;
  padding-right: 0;
}

#PrintElementOptionSetting .offset-clearfix {
  clear: both;
  height: 0;
  margin: 0;
  padding: 0;
}
</style>
