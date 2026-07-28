<template>
  <main class="canvas-area" ref="canvasAreaRef">
    <div
      id="hiprint-printTemplate"
      class="design-container"
      ref="designContainerRef"
    ></div>
    <!-- 拖拽手柄 -->
    <div
      class="resize-handle"
      :class="{ dragging: isDragging }"
      @mousedown="onHandleMouseDown"
    >
      <div class="resize-handle-bar"></div>
      <span class="resize-handle-label resize-handle-label--info">画布: {{ canvasHeight }} / 纸张: {{ paperHeight }} mm</span>
      <span class="resize-handle-label resize-handle-label--hint">拖动调整高度</span>
      <div class="resize-handle-bar"></div>
    </div>
    <!-- 拖拽预览线 -->
    <div
      v-if="isDragging"
      class="drag-preview-line"
      :style="{ bottom: previewLineBottom + 'px' }"
    >
      <span class="drag-preview-label">
        {{ previewHeight }} mm（{{ previewPages }}页）
      </span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  canvasHeight: number
  paperHeight: number
  paperHeader?: number
  paperFooter?: number
}>()

const emit = defineEmits<{
  resizeCanvas: [newHeight: number]
  zoom: [direction: 'in' | 'out']
}>()

const canvasAreaRef = ref<HTMLElement>()
const designContainerRef = ref<HTMLElement>()

const isDragging = ref(false)
const previewLineBottom = ref(0)
const previewHeight = ref(0)
const previewPages = ref(1)
let dragStartY = 0
let dragStartHeight = 0
let highlightedElements: HTMLElement[] = []

// hiprint 在 onBeforeDrag / selectEnd / mouseRect 等处调用原生 .focus()，
// 浏览器默认会把焦点元素滚动到视口内，导致拖拽时画布跳到顶部。
// 对设计容器内的元素强制 preventScroll: true，从源头阻断此行为。
let origFocus: ((this: HTMLElement, options?: FocusOptions) => void) | null = null

// ── 页面边界线 ──

let boundaryObserver: MutationObserver | null = null

function injectBoundaryLines() {
  const paper = designContainerRef.value?.querySelector('.hiprint-printPaper.design') as HTMLElement
  if (!paper) return

  // 先断开 observer，避免 DOM 修改触发自身导致死循环
  boundaryObserver?.disconnect()

  // 清除旧边界线
  paper.querySelectorAll('.canvas-page-boundary').forEach((el) => el.remove())

  const pageCount = Math.floor(props.canvasHeight / props.paperHeight)
  const paperPixelHeight = paper.offsetHeight
  if (!paperPixelHeight || !props.canvasHeight) {
    setupBoundaryObserver()
    return
  }
  const scale = paperPixelHeight / props.canvasHeight

  for (let i = 1; i < pageCount; i++) {
    const y = i * props.paperHeight * scale
    const line = document.createElement('div')
    line.className = 'canvas-page-boundary'
    line.style.cssText = `position:absolute;left:0;right:0;top:${y}px;height:0;border-top:1px dashed rgba(24,144,255,0.35);pointer-events:none;z-index:1;`
    line.title = `第 ${i + 1} 页起始 (${i * props.paperHeight}mm)`
    paper.appendChild(line)
  }

  // 重新挂载 observer
  setupBoundaryObserver()
}

function setupBoundaryObserver() {
  const container = designContainerRef.value
  if (!container) return
  boundaryObserver?.disconnect()
  boundaryObserver = new MutationObserver(() => {
    nextTick(injectBoundaryLines)
  })
  boundaryObserver.observe(container, { childList: true, subtree: true })
}

watch([() => props.canvasHeight, () => props.paperHeight], () => {
  nextTick(injectBoundaryLines)
})

// ── Ctrl + 滚轮缩放 ──

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const direction = e.deltaY < 0 ? 'in' : 'out'
  emit('zoom', direction)
}

// ── 拖拽手柄 ──

function onHandleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartY = e.clientY
  dragStartHeight = props.canvasHeight
  highlightedElements = []

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !canvasAreaRef.value) return

  const containerRect = canvasAreaRef.value.getBoundingClientRect()
  const handleY = e.clientY - containerRect.top
  // 手柄距离底部的距离
  const distFromTop = handleY
  // 计算比例：容器高度对应画布高度
  const areaHeight = containerRect.height
  if (!areaHeight) return

  // 拖拽位置映射到画布高度（mm）
  const ratio = distFromTop / areaHeight
  const rawHeight = Math.round(ratio * props.canvasHeight)
  // 贴靠到最近的纸张边界
  const snapped = snapToPage(rawHeight)
  const newHeight = Math.max(props.paperHeight, snapped)

  previewHeight.value = newHeight
  previewPages.value = Math.round(newHeight / props.paperHeight)
  // 预览线位置（从容器底部算）
  previewLineBottom.value = areaHeight * (1 - ratio)

  // 高亮被裁剪的元素
  highlightCutElements(newHeight)
}

function onMouseUp(_e: MouseEvent) {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)

  if (!isDragging.value) return
  isDragging.value = false

  clearHighlights()

  const newHeight = previewHeight.value
  if (newHeight && newHeight !== props.canvasHeight && newHeight >= props.paperHeight) {
    emit('resizeCanvas', newHeight)
  }
}

function snapToPage(height: number): number {
  // 向最近的纸张高度倍数贴靠
  const ph = props.paperHeight
  const pages = Math.round(height / ph)
  return Math.max(1, pages) * ph
}

// ── 裁剪元素高亮 ──

function highlightCutElements(newHeight: number) {
  clearHighlights()
  const designEls = designContainerRef.value?.querySelectorAll('.hiprint-printElement') || []
  designEls.forEach((el) => {
    const htmlEl = el as HTMLElement
    const top = parseFloat(htmlEl.style.top || '0')
    if (top >= newHeight) {
      // 红色闪烁边框
      const resizePanel = htmlEl.querySelector('.resize-panel') as HTMLElement
      if (resizePanel) {
        resizePanel.classList.add('will-be-cut')
        highlightedElements.push(resizePanel)
      }
    }
  })
}

function clearHighlights() {
  highlightedElements.forEach((el) => el.classList.remove('will-be-cut'))
  highlightedElements = []
}

// ── 表格选中效果 ──
// hiprint 对 noContainer 表格不会创建 .resize-panel，triggerResize 无法添加 selected 类
// 通过捕获阶段监听 click 手动管理选中态的视觉反馈

function onTableSelect(e: MouseEvent) {
  const target = e.target as HTMLElement
  const tableEl = target.closest('.hiprint-printElement-table') as HTMLElement | null

  if (!(e.ctrlKey || e.metaKey)) {
    designContainerRef.value
      ?.querySelectorAll('.hiprint-printElement-table.table-selected')
      .forEach((el) => {
        if (el !== tableEl) el.classList.remove('table-selected')
      })
  }

  if (tableEl) {
    tableEl.classList.add('table-selected')
  }
}

// ── lifecycle ──

onMounted(() => {
  nextTick(() => {
    injectBoundaryLines()
    setupBoundaryObserver()
  })

  // 安装 focus preventScroll 补丁：设计容器内的元素聚焦时不再触发浏览器滚动
  const container = designContainerRef.value
  if (container && !origFocus) {
    origFocus = HTMLElement.prototype.focus
    const scope = container
    HTMLElement.prototype.focus = function (this: HTMLElement, opts?: FocusOptions) {
      if (scope.contains(this)) {
        return origFocus!.call(this, { ...opts, preventScroll: true })
      }
      return origFocus!.call(this, opts)
    }
  }

  // hiprint 内部多处 .focus() 会触发浏览器滚动到中间。
  // MutationObserver（微任务）可能早于 focus 引起的 scroll 完成，
  // 因此用 rAF + setTimeout 推迟到下一帧之后强制置顶。
  if (container) {
    let attempts = 0
    const forceTop = () => {
      container.scrollTop = 0
      if (attempts++ < 5) {
        requestAnimationFrame(() => setTimeout(forceTop, 50))
      }
    }
    requestAnimationFrame(() => setTimeout(forceTop, 100))
  }

  // 表格元素选中效果：hiprint 的 triggerResize 对 noContainer 表格不会添加 selected 类
  designContainerRef.value?.addEventListener('click', onTableSelect, true)

  // Ctrl + 滚轮缩放
  canvasAreaRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  if (origFocus) {
    HTMLElement.prototype.focus = origFocus
    origFocus = null
  }
  boundaryObserver?.disconnect()
  designContainerRef.value?.removeEventListener('click', onTableSelect, true)
  canvasAreaRef.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #efefef;
  overflow: hidden;
  position: relative;
}

.design-container {
  flex: 1;
  overflow: auto;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-anchor: none;
  /* flex item 默认 min-height: auto 会阻止元素小于内容高度，
     导致内容溢出发生在父容器（被其 overflow:hidden 裁剪）而非本元素，
     滚动条无法出现 */
  min-height: 0;
}

/* ── 拖拽手柄 ── */
.resize-handle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #fafafa;
  border-top: 1px solid var(--border-color);
  cursor: ns-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  user-select: none;
}

.resize-handle:hover,
.resize-handle.dragging {
  background: #e6f7ff;
  border-top-color: var(--brand-400);
}

.resize-handle-bar {
  flex: 1;
  height: 0;
  border-top: 1px solid #d9d9d9;
}

.resize-handle-label {
  font-size: 10px;
  color: #999;
  white-space: nowrap;
  pointer-events: none;
}

.resize-handle-label--hint {
  display: none;
}

.resize-handle:hover .resize-handle-label--info,
.resize-handle.dragging .resize-handle-label--info {
  display: none;
}

.resize-handle:hover .resize-handle-label--hint,
.resize-handle.dragging .resize-handle-label--hint {
  display: inline;
}

.resize-handle:hover .resize-handle-label,
.resize-handle.dragging .resize-handle-label {
  color: var(--brand-500);
}

/* ── 拖拽预览线 ── 13 25 30 32 33 */
.drag-preview-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px dashed #ff4d4f;
  pointer-events: none;
  z-index: 99;
}

.drag-preview-label {
  position: absolute;
  right: 8px;
  bottom: 4px;
  font-size: 10px;
  color: #ff4d4f;
  background: rgba(255, 255, 255, 0.9);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>

<style>
/* 隐藏画布左边与顶部的刻度尺 */
#hiprint-printTemplate .hiprint_rul_wrapper {
  display: none !important;
}

#hiprint-printTemplate .hiprint-headerLine,
#hiprint-printTemplate .hiprint-footerLine {
  border-top: 1px dashed #9e9e9e !important;
  opacity: 0.8 !important;
}

#hiprint-printTemplate {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  /* 不能用 visible：会覆盖 .design-container 的 overflow: auto，
     导致长内容被父容器 .canvas-area 的 overflow: hidden 裁剪而无法滚动 */
  overflow: auto;
  margin: 0 auto;
  min-width: 100%;
  width: max-content;
  flex-shrink: 0;
  min-height: 0;
}

#hiprint-printTemplate .hiprint-printPagination {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px;
  align-items: center;
}

#hiprint-printTemplate table {
  margin-left: auto !important;
  margin-right: auto !important;
  float: none !important;
}

#hiprint-printTemplate .hiprint-printPaper.design {
  background-color: #fff;
  border: 1px dashed rgba(170, 170, 170, 0.7);
  position: relative;
  margin: 0 auto;
}

/* hiprint-printPanel 适应内部缩放后的内容，overflow: hidden 约束拖拽不溢出 */
#hiprint-printTemplate .hiprint-printPanel {
  margin: 0 auto;
  overflow: hidden;
  /* 本元素是 #hiprint-printTemplate（flex column）的 flex item。
     overflow: hidden 会让 min-height: auto 解析为 0（CSS 规范），
     默认 flex-shrink: 1 会让 panel 被压缩到比 paper 小，
     paper 被 overflow:hidden 裁剪，父容器看不到溢出，滚动条不出现。
     加 flex-shrink: 0 阻止压缩，panel 保持 paper 尺寸，
     溢出发生在父容器 #hiprint-printTemplate 上，触发其 overflow:auto 滚动条。 */
  flex-shrink: 0;
}

/* hover 时去黑色遮罩 */
#hiprint-printTemplate .hiprint-printElement:not(.editing):hover .resize-panel {
  display: block !important;
  background-color: transparent !important;
}

/* 选中元素：蓝色虚线边框 */
#hiprint-printTemplate .hiprint-printElement .resize-panel.selected {
  border: 2px dashed var(--selection-color, #1890ff) !important;
  background-color: transparent !important;
}

#hiprint-printTemplate .hiprint-printElement .resize-panel.selected .resizebtn {
  background: var(--selection-color, #1890ff) !important;
  border: 2px solid #fff !important;
  width: 10px !important;
  height: 10px !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) !important;
}

/* 将被裁剪的元素：红色闪烁 */
#hiprint-printTemplate .hiprint-printElement .resize-panel.will-be-cut {
  border: 2px solid #ff4d4f !important;
  animation: cut-blink 0.4s ease-in-out infinite alternate;
}

@keyframes cut-blink {
  from { opacity: 1; }
  to { opacity: 0.3; }
}

/* 缩放拖拽时保留宽高显示 */
#hiprint-printTemplate .resize-panel .size-box.hide {
  display: block !important;
}

/* 整表可拖动，隐藏左上角拖拽色块 */
#hiprint-printTemplate .hiprint-printElement-table-handle {
  display: none !important;
}

/* 表格选中效果：hiprint 对 noContainer 表格不会创建 .resize-panel */
#hiprint-printTemplate .hiprint-printElement-table.table-selected {
  border: 2px dashed var(--selection-color, #1890ff);
}

/* 网格线：使用 CSS 变量动态调整，确保缩放时可见 */
#hiprint-printTemplate .hiprint-printPaper.design.grid {
  background-image: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 3%, rgba(0, 0, 0, 0) 3%), linear-gradient(360deg, rgba(0, 0, 0, 0.1) 3%, rgba(0, 0, 0, 0) 3%);
  background-size: var(--grid-size, 5mm) var(--grid-size, 5mm);
  background-position: left top;
}

/* 表头选中行：黑色文字，移除深蓝色背景 */
#hiprint-printTemplate .hitable .selected {
  background: #e9e9e9 !important;
  color: #000 !important;
}

/* 表格编辑框：绝对定位铺满 td */
#hiprint-printTemplate .hitable td {
  position: relative;
}
#hiprint-printTemplate .hitable .hitable-editor-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  box-sizing: border-box;
}

/* ── 锁定元素：隐藏 resize 控制点 ── */
#hiprint-printTemplate .hiprint-printElement[data-fixed="true"] .resizebtn,
#hiprint-printTemplate .resize-panel[data-fixed="true"] .resizebtn {
  display: none !important;
}

/* ── 表格边框美化：使用浅灰色替代默认黑色 ── */
#hiprint-printTemplate .hiprint-printElement-table table {
  border-color: #d9d9d9 !important;
}
#hiprint-printTemplate .hiprint-printElement-table th {
  border-color: #d9d9d9 !important;
  color: #000 !important;
  font-weight: 600 !important;
}
#hiprint-printTemplate .hiprint-printElement-table td {
  border-color: #d9d9d9 !important;
}

/* 表格整体轻微圆角 + 阴影 */
#hiprint-printTemplate .hiprint-printElement-table table.hiprint-printElement-tableTarget {
  border-radius: 2px;
}

/* 表头浅灰背景 */
#hiprint-printTemplate .hiprint-printElement-table thead th {
  background: #f5f5f5 !important;
}

/* 表格行 hover 效果已取消：设计/预览模式下 tbody tr 悬停保持原有样式不变 */

/* 表格空单元格显示字段占位符：<td field="NAME"> → 显示 @NAME */
#hiprint-printTemplate .hiprint-printElement-table td[field]:not([field=""]):empty::after {
  content: '@' attr(field);
  color: #999;
  font-style: italic;
  font-size: 11px;
}
</style>
