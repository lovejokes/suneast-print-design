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
      @custom-paper="handleCustomPaper"
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
      @apply-table-layout="applyTableLayout"
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
      :data="PREVIEW_DATA"
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
import {
  renderPreviewPages,
  exportPreviewPapersToPdf,
} from '@/utils/previewRender'
import { PREVIEW_DATA } from '@/data/preview-data'
import {
  computeTableLayout,
  isTableLayoutElementType,
  writeTableCellBorderOptions,
} from '@/utils/tableLayout'

import AppHeader from '@/components/designer/AppHeader.vue'
import ElementsPanel from '@/components/designer/ElementsPanel.vue'
import DesignCanvas from '@/components/designer/DesignCanvas.vue'
import PropertiesPanel from '@/components/designer/PropertiesPanel.vue'
import PrintPreview from '@/components/preview/PrintPreview.vue'
import TemplateModal from '@/components/designer/TemplateModal.vue'

import defaultProviderFn from '@/providers/default-provider'
import customProviderFn from '@/providers/custom-provider'

const store = useDesignerStore()
const { hiprintTemplate, init, destroy, setZoom } = useHiprint()
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

const customPaperHeightMm = ref(297)

/** 单页纸高：纵向取长边，横向取短边（与方向切换后的画布分页一致） */
const paperHeight = computed(() => {
  if (store.paperType === 'custom') {
    return customPaperHeightMm.value
  }
  const size = paperSizes[store.paperType] ?? { width: 210, height: 297 }
  const shortEdge = Math.min(size.width, size.height)
  const longEdge = Math.max(size.width, size.height)
  const orient = Number((store.template.panels[0] as any)?.orient) || 1
  return orient === 2 ? shortEdge : longEdge
})
const canvasHeight = computed(() => store.template.panels[0]?.height ?? paperHeight.value)

function paperTypeChange(type: string) {
  store.setPaperType(type)
  const size = paperSizes[type]
  if (size) {
    hiprintTemplate.value?.setPaper(type, size)
  }
}

function handleCustomPaper(width: number, height: number) {
  customPaperHeightMm.value = height
  store.setPaperType('custom')
  const tpl = hiprintTemplate.value
  if (!tpl) return
  const ep = tpl.editingPanel
  if (!ep) return
  const hinnn = (window as any).hinnn
  if (!hinnn?.mm) return
  ep.width = width
  ep.height = height
  ep.designPaper.width = hinnn.mm.toPt(width)
  ep.designPaper.height = hinnn.mm.toPt(height)
  const trim = (window as any).HIPRINT_CONFIG?.panel?.default?.paperHeightTrim ?? 0
  const heightCss = height - trim + 'mm'
  ep.designPaper.resize(ep.width, ep.height)
  ep.designPaper.mmwidth = width
  ep.designPaper.mmheight = height
  ep.target.css('height', heightCss)
  ep.target.attr('original-height', height)
  ep.target.parent().css('height', heightCss)
  ep.designPaper.target.css('height', heightCss)
  const panel = store.template.panels[0]
  if (panel) {
    panel.width = width
    panel.height = height
  }
  try {
    ;(window as any).hinnn?.event?.trigger?.(
      'hiprintTemplateDataChanged_' + tpl.id,
      '自定义纸张',
    )
  } catch {}
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

function clearDesignSelection() {
  const root = document.querySelector('#hiprint-printTemplate')
  if (!root) return
  root.querySelectorAll('div[panelindex].selected').forEach((el) => {
    const node = el as HTMLElement
    node.classList.remove('selected')
    node.style.display = 'none'
  })
  root.querySelectorAll('.hiprint-printElement-table.selected').forEach((el) => {
    el.classList.remove('selected')
  })
  // 清掉可能残留的 inline display，交给 CSS 按选中态控制拖动点显隐
  root.querySelectorAll('.resizebtn').forEach((el) => {
    ;(el as HTMLElement).style.removeProperty('display')
  })
}

function handlePrint() {
  // 预览前同步 hiprint 当前状态到 store（拖拽添加的元素在 hiprint 内部，不在 store 中）
  syncStoreFromHiprint()
  clearDesignSelection()
  previewOpen.value = true
}

function handlePdf() {
  try {
    syncStoreFromHiprint()
    const host = document.createElement('div')
    host.style.cssText =
      'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;z-index:-1;'
    document.body.appendChild(host)
    const { dispose } = renderPreviewPages(
      host,
      store.template,
      PREVIEW_DATA,
      paperHeight.value,
    )
    message.info({
      content: '请在打印对话框中选择「另存为 PDF」或「Microsoft Print to PDF」',
      duration: 4,
    })
    exportPreviewPapersToPdf(host)
      .catch((e) => {
        console.error('导出 PDF 失败', e)
        message.error('导出 PDF 失败')
      })
      .finally(() => {
        dispose()
        host.remove()
      })
  } catch (e) {
    console.error('导出 PDF 失败', e)
    message.error('导出 PDF 失败')
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
    try {
      ;(window as any).hinnn?.event?.trigger?.(
        'hiprintTemplateDataChanged_' + tpl.id,
        '对齐',
      )
    } catch {}
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
}

/** 多选文本 → 假表格布局 */
function applyTableLayout() {
  const tpl = hiprintTemplate.value as any
  if (!tpl?.editingPanel) {
    message.warning('请先选中画布上的元素')
    return
  }

  let selectedEls: any[] = Array.isArray(tpl.getSelectEls?.())
    ? [...tpl.getSelectEls()]
    : []
  if (selectedEls.length < 2) {
    selectedEls = (tpl.editingPanel.printElements || []).filter((el: any) => {
      try {
        const last = el.designTarget?.children?.()?.last?.()
        return last?.css?.('display') === 'block' && last?.hasClass?.('selected')
      } catch {
        return false
      }
    })
  }

  if (selectedEls.length < 2) {
    message.warning('请先框选至少 2 个文本元素')
    return
  }
  if (
    selectedEls.some(
      (el) => !isTableLayoutElementType(String(el.printElementType?.type || '')),
    )
  ) {
    message.warning('仅支持文本 / 长文，请去掉表格、图片、线条等后再试')
    return
  }

  const rects = selectedEls.map((el, id) => ({
    id,
    left: Number(el.options?.getLeft?.() ?? el.options?.left ?? 0),
    top: Number(el.options?.getTop?.() ?? el.options?.top ?? 0),
    width: Number(el.options?.getWidth?.() ?? el.options?.width ?? 0),
    height: Number(el.options?.getHeight?.() ?? el.options?.height ?? 0),
  }))

  const computed = computeTableLayout(rects)
  if (!computed.ok) {
    message.warning('无法识别为表格行列，请调整位置后再试')
    return
  }

  const byId = new Map(computed.results.map((r) => [r.id, r]))
  selectedEls.forEach((el, id) => {
    const next = byId.get(id)
    if (!next || !el.options) return

    el.options.setLeft?.(next.left)
    el.options.setTop?.(next.top)
    el.options.copyDesignTopFromTop?.()
    el.options.setWidth?.(next.width)
    el.options.setHeight?.(next.height)
    el.options.left = next.left
    el.options.top = next.top
    el.options.width = next.width
    el.options.height = next.height
    if (String(el.printElementType?.type || '').toLowerCase().includes('longtext')) {
      el.options.lHeight = next.height
    }
    try {
      el.designTarget?.css?.('left', el.options.displayLeft?.() ?? `${next.left}pt`)
      el.designTarget?.css?.('top', el.options.displayTop?.() ?? `${next.top}pt`)
      el.designTarget?.css?.('width', el.options.displayWidth?.() ?? `${next.width}pt`)
      el.designTarget?.css?.('height', el.options.displayHeight?.() ?? `${next.height}pt`)
    } catch {
      /* ignore */
    }

    writeTableCellBorderOptions(el.options, next.rowIndex, next.colIndex)
    try {
      el.updateDesignViewFromOptions?.()
    } catch {
      /* ignore */
    }
  })

  try {
    ;(window as any).hinnn?.event?.trigger?.(
      'hiprintTemplateDataChanged_' + tpl.id,
      '应用表格布局',
    )
    const key = selectedEls[0]?.getPrintElementSelectEventKey?.()
    if (key) {
      ;(window as any).hinnn?.event?.trigger?.(key, { printElement: selectedEls[0] })
    }
  } catch {
    /* ignore */
  }

  message.success(`已应用表格布局（${selectedEls.length} 个元素）`)
}

function layer(dir: string) {
  if (dir === 'up') {
    hiprintTemplate.value?.moveUp?.()
  } else {
    hiprintTemplate.value?.moveDown?.()
  }
}

/** 将画布高度设为指定 mm，并同步 DOM / store（增减均可） */
function applyCanvasHeight(newHeight: number) {
  if (!hiprintTemplate.value) return
  const ep = hiprintTemplate.value.editingPanel
  if (!ep) return

  const hinnn = (window as any).hinnn
  const $ = (window as any).$
  if (!hinnn || !$) return

  const oldHeight = Number(ep.height) || 0
  if (!newHeight || newHeight === oldHeight) return

  const trim = (window as any).HIPRINT_CONFIG?.panel?.default?.paperHeightTrim ?? 0
  const deltaPt = hinnn.mm.toPt(newHeight - oldHeight)
  const oldHPt = hinnn.mm.toPt(oldHeight)
  const newHPt = hinnn.mm.toPt(newHeight)

  ep.height = newHeight
  // paperFooter 贴近画布底边：按原底部间距等比落到新高度
  if (ep.paperFooter != null) {
    const gap = Math.max(0, oldHPt - Number(ep.paperFooter))
    ep.paperFooter = Math.max(0, newHPt - gap)
  } else {
    ep.paperFooter = (ep.paperFooter || 0) + deltaPt
  }
  ep.designPaper.paperFooter = ep.paperFooter

  // 画布增减时保持页码贴底（与页尾元素同逻辑），避免顶坐标悬空或落在 overflow 外
  const dp = ep.designPaper
  if (dp) {
    const rawTop = Number(dp.paperNumberTop)
    const gap =
      Number.isFinite(rawTop) && rawTop > 0
        ? Math.max(0, oldHPt - rawTop - 22)
        : 0
    dp.paperNumberTop = Math.max(0, Math.round(newHPt - gap - 22))
    ep.paperNumberTop = dp.paperNumberTop
    const rawLeft = Number(dp.paperNumberLeft)
    const wPt = Number(dp.width) || hinnn.mm.toPt(ep.width)
    if (!(rawLeft > 0) || rawLeft > wPt) {
      dp.paperNumberLeft = Math.max(0, Math.round(wPt - 30))
      ep.paperNumberLeft = dp.paperNumberLeft
    }
  }

  ep.designPaper.resize(ep.width, ep.height)
  ep.designPaper.mmheight = ep.height

  const heightCss = ep.height - trim + 'mm'
  ep.target.css('height', heightCss)
  ep.target.attr('original-height', ep.height)
  ep.target.parent().css('height', heightCss)
  ep.designPaper.target.css('height', heightCss)
  ep.designPaper.footerLinetarget?.css('top', ep.paperFooter + 'pt')

  const panel = store.template.panels[0]
  if (panel) {
    panel.height = ep.height
    panel.paperFooter = ep.paperFooter
  }
  try {
    ;(window as any).hinnn?.event?.trigger?.(
      'hiprintTemplateDataChanged_' + hiprintTemplate.value.id,
      '调整大小',
    )
  } catch {}
}

/**
 * 拖拽手柄从底部向上裁剪画布：保留高度以上的内容，删除 top 落在裁剪线下方的元素。
 */
function onResizeCanvas(newHeight: number) {
  if (!hiprintTemplate.value) return
  const ep = hiprintTemplate.value.editingPanel
  if (!ep) return

  const hinnn = (window as any).hinnn
  if (!hinnn?.mm) return

  const oldHeight = Number(ep.height) || Number(store.template.panels[0]?.height) || 0
  const targetHeight = Math.round(Number(newHeight) * 10) / 10
  if (!targetHeight || Math.abs(targetHeight - oldHeight) < 0.5) return
  if (targetHeight < paperHeight.value) return

  const apply = () => applyCanvasHeight(targetHeight)

  if (targetHeight >= oldHeight) {
    apply()
    return
  }

  const cutPt = hinnn.mm.toPt(targetHeight)
  const toDelete = (ep.printElements || []).filter((el: any) => {
    const top = Number(el?.options?.top)
    return Number.isFinite(top) && top >= cutPt
  })

  if (toDelete.length === 0) {
    apply()
    message.success(`画布已裁剪为 ${targetHeight} mm`)
    return
  }

  Modal.confirm({
    title: '确认裁剪画布',
    content: `裁剪线下方有 ${toDelete.length} 个元素将被删除，是否继续？`,
    okText: '确认裁剪',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    onOk: () => {
      toDelete.forEach((el: any) => {
        try {
          el.delete?.()
        } catch {}
      })
      apply()
    },
  })
}

/** 同步 hiprint 内部状态到 Pinia store（拖拽添加的元素在 hiprint 内部，需在预览/导出前调用） */
function syncStoreFromHiprint() {
  if (!hiprintTemplate.value) return
  try {
    const json = hiprintTemplate.value.getJson()
    if (json && json.panels) {
      // 运行时面板上的右/下偏移以 live 为准，避免序列化链路漏字段导致预览停行线失效
      const lives = (hiprintTemplate.value as any).printPanels || []
      json.panels.forEach((p: any, i: number) => {
        const live = lives[i]
        if (!live) return
        if (live.bottomOffset != null) p.bottomOffset = live.bottomOffset
        if (live.rightOffset != null) p.rightOffset = live.rightOffset
        if (live.leftOffset != null) p.leftOffset = live.leftOffset
        if (live.topOffset != null) p.topOffset = live.topOffset
      })
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
  const ep = hiprintTemplate.value?.editingPanel
  if (!ep) return
  applyCanvasHeight(Number(ep.height) + paperHeight.value)
}

function onTemplateSelect(tpl: any) {
  if (!tpl?.template?.panels?.length) {
    message.warning('该模板数据无效')
    return
  }
  store.importTemplate(tpl.template)
  if (tpl.paperType) store.setPaperType(tpl.paperType)
  hiprintTemplate.value?.update?.(JSON.parse(JSON.stringify(store.template)))
  message.success(`已加载模板：${tpl.name || '未命名'}`)
}

function onElementUpdate(options: Record<string, unknown>) {
  const tpl = hiprintTemplate.value as any
  if (!tpl?.editingPanel) return

  const selected = (tpl.editingPanel.printElements || []).filter((el: any) => {
    try {
      const type = String(el.printElementType?.type || '')
      if (type.includes('table')) {
        return !!el.designTarget?.hasClass?.('selected')
      }
      const last = el.designTarget?.children?.()?.last?.()
      return !!(last && last.css?.('display') === 'block' && last.hasClass?.('selected'))
    } catch {
      return false
    }
  })

  const targets =
    selected.length > 0
      ? selected
      : (tpl.getSelectEls?.() || [])

  if (!targets.length) return

  Object.keys(options).forEach((key) => {
    targets.forEach((el: any) => {
      el.updateOption?.(key, options[key], true)
    })
  })
  try {
    ;(window as any).hinnn?.event?.trigger(
      'hiprintTemplateDataChanged_' + tpl.id,
      '参数修改',
    )
  } catch {
    /* ignore */
  }
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
