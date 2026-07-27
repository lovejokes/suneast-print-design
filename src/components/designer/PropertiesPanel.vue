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

  <!-- 字段选择弹窗 -->
  <a-modal
    v-model:open="fieldSelector.open"
    title="选择字段"
    :width="420"
    :footer="null"
    @cancel="fieldSelector.open = false"
  >
    <div class="field-selector-category">
      <div class="field-selector-category-title">
        {{ fieldSelector.isTable ? '表格字段' : '表单字段' }}
      </div>
      <div class="field-selector-list">
        <div
          v-for="f in fieldSelector.fields"
          :key="f.field"
          class="field-selector-item"
          :class="{ selected: fieldSelector.selected === f.field }"
          @click="fieldSelector.selected = f.field"
        >
          <span class="field-selector-name">{{ f.name }}</span>
          <span class="field-selector-sep">|</span>
          <span class="field-selector-field">{{ f.field }}</span>
        </div>
      </div>
    </div>
    <div class="field-selector-actions">
      <a-button @click="fieldSelector.open = false">取消</a-button>
      <a-button type="primary" @click="confirmFieldSelect">确定</a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const emit = defineEmits<{
  update: [options: Record<string, unknown>]
}>()

const props = defineProps<{
  element: Record<string, unknown> | null
}>()

const footerRef = ref<HTMLElement>()

let observer: MutationObserver | null = null
let moveTimer: ReturnType<typeof setTimeout> | null = null

// ── 字段选择器 ──

const FORM_FIELDS = [
  { name: '订单编号', field: 'orderNo', testData: 'XS888888888' },
  { name: '日期', field: 'date', testData: '2023-07-16' },
  { name: '客户名称', field: 'customerName', testData: '客户名称' },
  { name: '合计金额', field: 'amount', testData: '¥0.00' },
  { name: '签字人', field: 'signer', testData: '' },
  { name: '供应商', field: 'supplier', testData: '供应商' },
  { name: '发货人', field: 'shipper', testData: '发货人' },
  { name: '收货地址', field: 'address', testData: '收货地址' },
  { name: '备注', field: 'remark', testData: '备注' },
  { name: '有效期', field: 'validity', testData: '有效期' },
  { name: '联系人', field: 'contact', testData: '联系人' },
  { name: '电话', field: 'phone', testData: '电话' },
]

const TABLE_FIELDS = [
  { name: '商品名称', field: 'NAME', testData: '商品名称' },
  { name: '数量', field: 'SL', testData: '数量' },
  { name: '规格', field: 'GG', testData: '规格' },
  { name: '单价', field: 'DJ', testData: '单价' },
  { name: '金额', field: 'JE', testData: '金额' },
  { name: '序号', field: 'id', testData: '序号' },
  { name: '单位', field: 'UNIT', testData: '单位' },
  { name: '品牌', field: 'BRAND', testData: '品牌' },
  { name: '型号', field: 'MODEL', testData: '型号' },
  { name: '仓位', field: 'LOCATION', testData: '仓位' },
]

interface FieldItem {
  name: string
  field: string
  testData: string
}

const fieldSelector = ref<{
  open: boolean
  isTable: boolean
  fields: FieldItem[]
  selected: string
  targetInput: HTMLInputElement | HTMLSelectElement | null
  displayInput: HTMLInputElement | null
}>({
  open: false,
  isTable: false,
  fields: [],
  selected: '',
  targetInput: null,
  displayInput: null,
})

function confirmFieldSelect() {
  const { targetInput, displayInput, selected, fields } = fieldSelector.value
  if (!targetInput || !displayInput || !selected) {
    fieldSelector.value.open = false
    return
  }

  const match = fields.find((f) => f.field === selected)
  ;(targetInput as HTMLInputElement).value = selected
  displayInput.value = match ? `${match.name}|${match.field}` : selected

  const jq = (window as any).$
  if (jq) {
    jq(targetInput).trigger('change')
  } else {
    targetInput.dispatchEvent(new Event('change', { bubbles: true }))
  }
  // 同步更新画布显示为 @字段名（实际值）
  if (match) {
    emit('update', { data: '@' + match.field + '（' + (match.testData || '') + '）' })
  }

  fieldSelector.value.open = false
}

function enhanceFieldInputs() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return

  const allItems = container.querySelectorAll<HTMLElement>(
    '.hiprint-option-item:not([data-field-enhanced])'
  )
  allItems.forEach((item) => {
    const label = item.querySelector('.hiprint-option-item-label')
    if (!label || (label.textContent || '').trim() !== '字段名') return

    item.setAttribute('data-field-enhanced', '1')

    const fieldEl = item.querySelector('.hiprint-option-item-field')
    if (!fieldEl) return

    const originalInput = fieldEl.querySelector('input, select') as HTMLInputElement | HTMLSelectElement | null
    if (!originalInput) return

    const tabs = container.querySelectorAll('.prop-tab-item')
    let isTable = false
    tabs.forEach((tab) => {
      if ((tab.textContent || '').trim() === '列') isTable = true
    })

    originalInput.style.display = 'none'

    const wrapper = document.createElement('div')
    wrapper.className = 'field-selector-wrapper'

    const displayInput = document.createElement('input')
    displayInput.type = 'text'
    displayInput.readOnly = true
    displayInput.className = 'field-selector-display'
    displayInput.placeholder = '点击选择字段'

    const currentVal = (originalInput as HTMLInputElement).value
    if (currentVal) {
      const fields = isTable ? TABLE_FIELDS : FORM_FIELDS
      const match = fields.find((f) => f.field === currentVal)
      displayInput.value = match ? `${match.name}|${match.field}` : currentVal
    }

    const selectBtn = document.createElement('button')
    selectBtn.type = 'button'
    selectBtn.className = 'field-selector-btn'
    selectBtn.textContent = '选择'
    selectBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const fields = isTable ? TABLE_FIELDS : FORM_FIELDS
      const cur = (originalInput as HTMLInputElement).value
      fieldSelector.value = {
        open: true,
        isTable,
        fields,
        selected: cur || '',
        targetInput: originalInput,
        displayInput,
      }
    })

    wrapper.appendChild(displayInput)
    wrapper.appendChild(selectBtn)
    fieldEl.appendChild(wrapper)
  })
}

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

    // 标记 option item
    const optionItem = field.closest('.hiprint-option-item') as HTMLElement
    if (optionItem) {
      const label = optionItem.querySelector('.hiprint-option-item-label')
      const text = (label?.textContent || '').trim()
      if (text.includes('背景颜色') || text.includes('Background')) {
        optionItem.setAttribute('data-option-name', 'backgroundColor')
      } else if (text.includes('表头背景')) {
        optionItem.setAttribute('data-option-name', 'tableHeaderBackground')
      } else if (text.includes('边框颜色') || text.includes('border')) {
        optionItem.setAttribute('data-option-name', 'borderColor')
      } else if (text.includes('颜色') || text.includes('Color')) {
        optionItem.setAttribute('data-option-name', 'borderColor')
      }
    }

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
          const jq = (window as any).$
          if (jq) jq(colorInput).trigger('change')
          else colorInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
        hexInput.value = v.toUpperCase()
      } else {
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

function setupAutoSubmitInputListener() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container || (container as any).__autoSubmitPatched) return
  ;(container as any).__autoSubmitPatched = true

  let timer: ReturnType<typeof setTimeout> | null = null

  // hiprint 绑定的是 change 事件，文本/数字输入框仅在失焦时触发。
  // 此处通过 input 事件委托，让输入时即触发 change → submitOption，实现修改即时生效。
  container.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLElement
    if (!target || !target.classList.contains('auto-submit')) return

    const tag = target.tagName
    if (tag === 'INPUT') {
      const type = (target as HTMLInputElement).type
      // 仅处理文本类输入；checkbox/color/range 等已即时触发 change
      if (type !== 'text' && type !== 'number') return
    } else if (tag !== 'TEXTAREA') {
      return
    }

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const jq = (window as any).$
      if (jq) jq(target).trigger('change')
      else target.dispatchEvent(new Event('change', { bubbles: true }))
    }, 200)
  })
}

interface GroupConfig {
  title: string
  labels: string[]
  datasetKey: string
}

const GROUP_CONFIGS: GroupConfig[] = [
  { title: '偏移调整', labels: ['左偏移', '顶部偏移', '右偏移', '下偏移'], datasetKey: 'offsetGrouped' },
  { title: '边框设置', labels: ['上边框', '左边框', '右边框', '下边框'], datasetKey: 'borderGrouped' },
  { title: '边距设置', labels: ['上内边距', '左内边距', '右内边距', '下内边距'], datasetKey: 'paddingGrouped' },
  { title: '页尾设置', labels: ['首页页尾', '尾页页尾', '偶数页页尾', '奇数页页尾'], datasetKey: 'footerGrouped' },
  { title: '对齐方式', labels: ['左右对齐', '上下对齐'], datasetKey: 'alignGrouped' },
]

function enhanceFontSizeSelect() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return
  const allItems = Array.from(container.querySelectorAll<HTMLElement>('.hiprint-option-item'))
  for (const item of allItems) {
    if ((item as any).__fontSizeEnhanced) continue
    const label = item.querySelector('.hiprint-option-item-label')
    if ((label?.textContent || '').trim() !== '字体大小') continue
    const select = item.querySelector('select')
    if (!select) continue
    ;(item as any).__fontSizeEnhanced = true

    const currentValue = select.value
    const input = document.createElement('input')
    input.type = 'number'
    input.step = '0.75'
    input.min = '1'
    input.className = 'auto-submit'
    input.style.width = '100%'
    input.value = currentValue || ''
    input.placeholder = 'pt'

    // 同步: input change -> 更新 select (隐藏) 以保持 hiprint 内部状态一致
    select.style.display = 'none'
    select.parentNode?.insertBefore(input, select)

    // input change 时触发 select change，让 hiprint 的 setValue/getValue 正常工作
    input.addEventListener('change', () => {
      const v = input.value
      if (v) {
        select.value = v
        // 如果选项不存在，添加一个
        if (select.value !== v) {
          const opt = document.createElement('option')
          opt.value = v
          opt.text = v
          select.appendChild(opt)
          select.value = v
        }
      } else {
        select.value = ''
      }
      // 触发 jQuery change，让 hiprint submitOption
      const jq = (window as any).$
      if (jq) jq(select).trigger('change')
      else select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
}

function enhanceOptionGroups() {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return
  const allItems = Array.from(container.querySelectorAll<HTMLElement>('.hiprint-option-item'))

  for (const cfg of GROUP_CONFIGS) {
    const targetItems = allItems.filter((item) => {
      if ((item.dataset as any)[cfg.datasetKey]) return false
      const label = item.querySelector('.hiprint-option-item-label')
      return cfg.labels.includes((label?.textContent || '').trim())
    })
    if (targetItems.length === 0) continue

    let wrapper: HTMLElement | null = null
    const existingGroup = allItems.find((item) => {
      const label = item.querySelector('.hiprint-option-item-label')
      return (label?.textContent || '').trim() === cfg.title
    })
    if (existingGroup && !(existingGroup.dataset as any)[cfg.datasetKey]) {
      wrapper = existingGroup
    } else {
      wrapper = document.createElement('div')
      wrapper.className = 'hiprint-option-item hiprint-option-item-row option-group-row'

      const titleEl = document.createElement('div')
      titleEl.className = 'hiprint-option-item-label'
      titleEl.textContent = cfg.title
      wrapper.appendChild(titleEl)

      const firstItem = targetItems[0]
      firstItem.parentNode?.insertBefore(wrapper, firstItem)
    }

    ;(wrapper.dataset as any)[cfg.datasetKey] = '1'
    wrapper.classList.add('option-group-row')

    const grid = document.createElement('div')
    grid.className = 'offset-grid'
    wrapper.appendChild(grid)

    targetItems.forEach((item, i) => {
      ;(item.dataset as any)[cfg.datasetKey] = '1'
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
    enhanceFieldInputs()
    enhanceFontSizeSelect()
    enhanceOptionGroups()
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(moveButtonsToFooter, 50)
  })

  observer.observe(container, { childList: true, subtree: true })

  nextTick(() => {
    setupAutoSubmitInputListener()
    enhanceColorInputs()
    enhanceFieldInputs()
    enhanceFontSizeSelect()
    enhanceOptionGroups()
    moveButtonsToFooter()
  })
})

watch(() => props.element, () => {
  nextTick(() => {
    enhanceColorInputs()
    enhanceFieldInputs()
    enhanceFontSizeSelect()
    enhanceOptionGroups()
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

#PrintElementOptionSetting .prop-tabs .hiprint-option-items {
  display: none;
}
#PrintElementOptionSetting .prop-tabs .hiprint-option-items.active {
  display: block;
}

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

#PrintElementOptionSetting .hiprint-option-item-label {
  font-size: 12px;
  color: #555;
  text-align: left;
  line-height: 1.4;
  padding: 0;
  font-weight: 500;
}

#PrintElementOptionSetting .hiprint-option-item-row {
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  margin-bottom: 8px;
}

#PrintElementOptionSetting .hiprint-option-item-row.option-group-row {
  background: #f5f5f5;
  padding: 2px 8px 8px;
}

#PrintElementOptionSetting .hiprint-option-item-row > .hiprint-option-item-label {
  font-weight: 500;
  color: #555;
  margin-bottom: 0;
}

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
#PrintElementOptionSetting .sync-lock-btn {
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

#PrintElementOptionSetting .hiprint-option-item-field {
  width: 100%;
}

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

#PrintElementOptionSetting input[type="checkbox"] {
  accent-color: #4C8BF5;
  width: 14px;
  height: 14px;
  margin: 6px 0;
}

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

/* ── Color picker: color swatch + hex text input ── */
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

/* ── Option groups: 2×2 网格 ── */
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

/* ── 字段选择器 ── */
#PrintElementOptionSetting .field-selector-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 6px;
  width: 100%;
}

#PrintElementOptionSetting .field-selector-display {
  flex: 1;
  min-width: 0;
  height: 28px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #f5f5f5;
  color: #333;
  cursor: pointer;
  box-sizing: border-box;
  text-overflow: ellipsis;
}

#PrintElementOptionSetting .field-selector-btn {
  height: 28px !important;
  font-size: 12px !important;
  padding: 2px 12px !important;
  border-radius: 4px !important;
  border: 1px solid #d9d9d9 !important;
  background: #fff !important;
  color: #333 !important;
  cursor: pointer !important;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}

#PrintElementOptionSetting .field-selector-btn:hover {
  color: #4C8BF5 !important;
  border-color: #4C8BF5 !important;
}

.field-selector-category {
  margin-bottom: 12px;
}

.field-selector-category-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.field-selector-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field-selector-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 5px 10px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
  user-select: none;
}

.field-selector-item:hover {
  border-color: #4C8BF5;
  background: #f0f5ff;
}

.field-selector-item.selected {
  border-color: #4C8BF5;
  background: #e6f0ff;
  color: #4C8BF5;
}

.field-selector-name {
  color: #333;
}

.field-selector-item.selected .field-selector-name {
  color: #4C8BF5;
  font-weight: 500;
}

.field-selector-sep {
  color: #ccc;
  margin: 0 1px;
}

.field-selector-field {
  color: #999;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
}

.field-selector-item.selected .field-selector-field {
  color: #7ab0ff;
}

.field-selector-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
