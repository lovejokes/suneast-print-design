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
      @undo="hiprintTemplate?.undo()"
      @redo="hiprintTemplate?.redo()"
      @align-left="align('left')"
      @align-center="align('center')"
      @align-right="align('right')"
      @align-top="align('top')"
      @align-middle="align('middle')"
      @align-bottom="align('bottom')"
      @bring-forward="layer('up')"
      @send-backward="layer('down')"
      @toggle-grid="store.gridEnabled = !store.gridEnabled"
      @toggle-elements-panel="showElementsPanel = !showElementsPanel"
      @toggle-properties-panel="showPropertiesPanel = !showPropertiesPanel"
      @preview="handlePrint"
      @clear-canvas="handleClearCanvas"
      @increase-height="handleIncreaseHeight"
      @template="templateModalOpen = true"
    />

    <div class="app-body">
      <ElementsPanel v-show="showElementsPanel" ref="elementsPanelRef" />

      <DesignCanvas
        :canvas-height="canvasHeight"
        :paper-height="paperHeight"
        :paper-header="store.template.panels[0]?.paperHeader"
        :paper-footer="store.template.panels[0]?.paperFooter"
        @resize-canvas="onResizeCanvas"
        @zoom="onCanvasZoom"
      />

      <div v-show="showPropertiesPanel" class="properties-panel-wrapper">
        <PropertiesPanel
          :element="store.selectedElement"
          @update="onElementUpdate"
        />
      </div>
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
      :paper-height="paperHeight"
    />

    <TemplateModal
      v-model:open="templateModalOpen"
      @select="onTemplateSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useDesignerStore } from '@/stores/designer'
import { useHiprint } from '@/composables/useHiprint'
import { useTemplate } from '@/composables/useTemplate'
import { splitTallPanels } from '@/utils/splitPanel'

import AppHeader from '@/components/designer/AppHeader.vue'
import ElementsPanel from '@/components/designer/ElementsPanel.vue'
import DesignCanvas from '@/components/designer/DesignCanvas.vue'
import PropertiesPanel from '@/components/designer/PropertiesPanel.vue'
import PrintPreview from '@/components/preview/PrintPreview.vue'
import TemplateModal from '@/components/designer/TemplateModal.vue'

import defaultProviderFn from '@/providers/default-provider'
import customProviderFn from '@/providers/custom-provider'

const store = useDesignerStore()
const { hiprintTemplate, init, destroy, setZoom, print } = useHiprint()
const { downloadJSON, readFileAsJSON } = useTemplate()

const elementsPanelRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const previewOpen = ref(false)
const templateModalOpen = ref(false)
const showElementsPanel = ref(true)
const showPropertiesPanel = ref(true)

const paperSizes: Record<string, { width: number; height: number }> = {
  A3: { width: 420, height: 297 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B3: { width: 500, height: 353 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
}

const paperHeight = computed(() => paperSizes[store.paperType]?.height ?? 297)
const canvasHeight = computed(() => store.template.panels[0]?.height ?? paperHeight.value)

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

/** Ctrl+滚轮缩放 */
function onCanvasZoom(direction: 'in' | 'out') {
  direction === 'in' ? zoomIn() : zoomOut()
}

function handlePrint() {
  // 预览前同步 hiprint 当前状态到 store（拖拽添加的元素在 hiprint 内部，不在 store 中）
  syncStoreFromHiprint()
  previewOpen.value = true
}

function handlePdf() {
  try {
    // 导出 PDF 前同步最新状态，并按纸高拆分 panel，使每页重复页眉/页脚
    syncStoreFromHiprint()
    const templateCopy = JSON.parse(JSON.stringify(store.template))
    if (paperHeight.value) {
      templateCopy.panels = splitTallPanels(templateCopy.panels, paperHeight.value)
    }
    const pt = new (window as any).hiprint.PrintTemplate({ template: templateCopy })
    pt.toPdf({}, '打印.pdf')
  } catch (e) {
    console.error('导出 PDF 失败', e)
  }
}

function handleNew() {
  store.newTemplate()
  hiprintTemplate.value?.update?.(JSON.parse(JSON.stringify(store.template)))
}

function handleExport() {
  syncStoreFromHiprint()
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
    hiprintTemplate.value?.update?.(JSON.parse(JSON.stringify(store.template)))
    message.success('模板已导入')
  } catch (err) {
    message.error('导入失败：格式不正确')
  }
}

function align(dir: string) {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const ep = tpl.editingPanel
  if (!ep) return

  const map: Record<string, string> = {
    left: 'left', center: 'vertical', right: 'right',
    top: 'top', middle: 'horizontal', bottom: 'bottom',
  }

  // 多选非表格元素 → 使用 hiprint 内置 setElsAlign（经过充分测试的逻辑）
  const builtInSelected = (tpl as any).getSelectEls?.()
  if (builtInSelected && builtInSelected.length > 1) {
    ;(tpl as any).setElsAlign?.(map[dir])
    store.pushHistory()
    return
  }

  // 单个元素 / 表格元素 → 手动对齐到面板边界
  const hinnn = (window as any).hinnn
  const $ = (window as any).$
  if (!hinnn || !$) return

  const selectedEls: any[] = []
  ep.printElements.forEach((el: any) => {
    try {
      const isTable =
        el.printElementType?.type?.includes('table') ||
        el.printElementType?.type === 'table'
      const isSelected = isTable
        ? el.designTarget?.hasClass?.('selected')
        : (() => {
            const last = el.designTarget?.children?.()?.last?.()
            return (
              last &&
              last.css('display') === 'block' &&
              last.hasClass('selected')
            )
          })()
      if (isSelected) selectedEls.push(el)
    } catch {}
  })

  if (!selectedEls.length) return

  const pwPt = hinnn.mm.toPt(ep.width)
  const phPt = hinnn.mm.toPt(ep.height)
  // 面板偏移量：优先取面板上显式设置的值，fallback 到 HIPRINT_CONFIG 默认值（20pt）
  const cfgDef = (window as any).HIPRINT_CONFIG?.panel?.default || {}
  const lo = Number(ep.leftOffset ?? cfgDef.leftOffset ?? 0)
  const _to = Number(ep.topOffset ?? cfgDef.topOffset ?? 0)
  const ro = Number(ep.rightOffset ?? cfgDef.rightOffset ?? 0)
  const bo = Number(ep.bottomOffset ?? cfgDef.bottomOffset ?? 0)

  if (selectedEls.length === 1) {
    // 单个元素：相对面板边界对齐
    // 关键：使用 updateSizeAndPositionOptions（内部会调用 setLeft/setTop + 边界检查）
    //       然后用 designTarget.css() 更新视觉位置
    const el = selectedEls[0]
    const w = el.options.width ?? 0
    const h = el.options.height ?? 0

    switch (dir) {
      case 'left':
        el.updateSizeAndPositionOptions(lo)
        el.designTarget.css('left', el.options.displayLeft())
        break
      case 'center':
        el.updateSizeAndPositionOptions(lo + (pwPt - lo - ro - w) / 2)
        el.designTarget.css('left', el.options.displayLeft())
        break
      case 'right':
        el.updateSizeAndPositionOptions(pwPt - ro - w)
        el.designTarget.css('left', el.options.displayLeft())
        break
      case 'top':
        el.updateSizeAndPositionOptions(undefined, _to)
        el.designTarget.css('top', el.options.displayTop())
        break
      case 'middle':
        el.updateSizeAndPositionOptions(
          undefined,
          _to + (phPt - _to - bo - h) / 2,
        )
        el.designTarget.css('top', el.options.displayTop())
        break
      case 'bottom':
        el.updateSizeAndPositionOptions(undefined, phPt - bo - h)
        el.designTarget.css('top', el.options.displayTop())
        break
    }
  } else {
    // 多个元素（含表格）→ 计算包围盒后对齐
    let minLeft = Infinity,
      minTop = Infinity
    let maxRight = -Infinity,
      maxBottom = -Infinity
    selectedEls.forEach((el: any) => {
      const l = el.options.getLeft()
      const t = el.options.getTop()
      const w = el.options.width ?? 0
      const h = el.options.height ?? 0
      minLeft = Math.min(minLeft, l)
      minTop = Math.min(minTop, t)
      maxRight = Math.max(maxRight, l + w)
      maxBottom = Math.max(maxBottom, t + h)
    })

    switch (dir) {
      case 'left':
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(minLeft)
          el.designTarget.css('left', el.options.displayLeft())
        })
        break
      case 'center': {
        const cx = minLeft + (maxRight - minLeft) / 2
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(cx - el.options.width / 2)
          el.designTarget.css('left', el.options.displayLeft())
        })
        break
      }
      case 'right':
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(maxRight - el.options.width)
          el.designTarget.css('left', el.options.displayLeft())
        })
        break
      case 'top':
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(undefined, minTop)
          el.designTarget.css('top', el.options.displayTop())
        })
        break
      case 'middle': {
        const cy = minTop + (maxBottom - minTop) / 2
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(
            undefined,
            cy - el.options.height / 2,
          )
          el.designTarget.css('top', el.options.displayTop())
        })
        break
      }
      case 'bottom':
        selectedEls.forEach((el: any) => {
          el.updateSizeAndPositionOptions(
            undefined,
            maxBottom - el.options.height,
          )
          el.designTarget.css('top', el.options.displayTop())
        })
        break
    }
  }

  try {
    ;(window as any).hinnn?.event?.trigger?.(
      'hiprintTemplateDataChanged_' + tpl.id,
      '对齐',
    )
  } catch {}
  store.pushHistory()
}

function layer(dir: string) {
  if (dir === 'up') {
    hiprintTemplate.value?.moveUp?.()
  } else {
    hiprintTemplate.value?.moveDown?.()
  }
}

function onResizeCanvas(newHeight: number) {
  if (store.template.panels[0]) {
    store.template.panels[0].paperFooter = newHeight
    store.pushHistory()
  }
}

/** 同步 hiprint 内部状态到 Pinia store（拖拽添加的元素在 hiprint 内部，需在预览/导出前调用） */
function syncStoreFromHiprint() {
  if (!hiprintTemplate.value) return
  try {
    const json = hiprintTemplate.value.getJson()
    if (json && json.panels) {
      Object.assign(store.template, JSON.parse(JSON.stringify(json)))
    }
  } catch (e) {
    console.error('同步模板状态失败', e)
  }
}

function handleClearCanvas() {
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const ep = tpl.editingPanel
  if (!ep) return
  // 检查是否有元素，无元素则直接返回
  const els = [...(ep.printElements || [])]
  if (els.length === 0) return
  Modal.confirm({
    title: '确认清空画布',
    content: `将清除当前页的 ${els.length} 个元素，此操作不可撤销，是否继续？`,
    okText: '确认清空',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      // 逐个删除当前面板元素，避免 update() 重建导致状态丢失
      els.forEach((el: any) => { try { el.delete?.() } catch {} })
      store.clearPaper()
    },
  })
}

function handleIncreaseHeight() {
  if (!hiprintTemplate.value) return
  const ep = hiprintTemplate.value.editingPanel
  if (!ep) return

  const hinnn = (window as any).hinnn
  const $ = (window as any).$
  if (!hinnn || !$) return

  const addMm = paperHeight.value
  const addPt = hinnn.mm.toPt(addMm)
  const trim = (window as any).HIPRINT_CONFIG?.panel?.default?.paperHeightTrim ?? 0

  // 扩展面板高度和页脚线位置
  ep.height += addMm
  ep.paperFooter += addPt
  // 必须同步 designPaper.paperFooter 再调用 resize()，
  // 否则 resize() 内部的 triggerOnPaperBaseInfoChanged 回调会用旧值覆盖 ep.paperFooter
  ep.designPaper.paperFooter = ep.paperFooter

  // 更新 hiprint 内部渲染
  ep.designPaper.resize(ep.width, ep.height)
  ep.designPaper.mmheight = ep.height

  // 更新 DOM 中面板的 CSS 高度
  const heightCss = (ep.height - trim) + 'mm'
  ep.target.css('height', heightCss)
  ep.target.attr('original-height', ep.height)
  ep.target.parent().css('height', heightCss)
  ep.designPaper.target.css('height', heightCss)

  // 更新页脚线位置
  ep.designPaper.footerLinetarget.css('top', ep.paperFooter + 'pt')

  // 同步到 store
  const panel = store.template.panels[0]
  if (panel) {
    panel.height = ep.height
    panel.paperFooter = ep.paperFooter
  }
  store.pushHistory()
}

function onTemplateSelect(tpl: any) {
  if (tpl.template) {
    store.importTemplate(tpl.template)
    hiprintTemplate.value?.update?.(JSON.parse(JSON.stringify(store.template)))
  }
}

function onElementUpdate(options: Record<string, unknown>) {
  hiprintTemplate.value?.updateElementOption?.(options)
}

onMounted(() => {
  const hiprint = (window as any).hiprint
  if (!hiprint) {
    console.error('hiprint 未加载')
    return
  }

  const defaultProvider = defaultProviderFn(hiprint)()
  const customProvider = customProviderFn(hiprint)()

  // 必须传入原始 JSON 副本，Pinia reactive 代理会导致 hiprint 初始化失败
  const rawTemplate = JSON.parse(JSON.stringify(store.template))

  try {
    init(
      '#hiprint-printTemplate',
      '#PrintElementOptionSetting',
      [defaultProvider, customProvider],
      rawTemplate,
      undefined,
      {
        onDataChanged() {
          store.pushHistory()
        },
      }
    )
  } catch (e) {
    console.error('hiprint 初始化失败:', e)
  }

  nextTick(() => {
    const $ = (window as any).$
    if (!$) return
    const items = $('.ep-draggable-item')
    if (items.length > 0 && hiprint.PrintElementTypeManager) {
      hiprint.PrintElementTypeManager.buildByHtml(items)
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

.properties-panel-wrapper {
  display: flex;
  flex-shrink: 0;
}
</style>
