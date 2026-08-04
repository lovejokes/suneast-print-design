<template>
  <main class="canvas-area" ref="canvasAreaRef">
    <div
      id="hiprint-printTemplate"
      class="design-container"
      ref="designContainerRef"
    ></div>
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
    <div v-if="isDragging" class="resize-drag-mask"></div>
    <div
      v-if="isDragging"
      class="drag-preview-line"
      :style="{ bottom: previewLineBottom + 'px' }"
    >
      <span class="drag-preview-label">
        保留 {{ previewHeight }} mm
        <template v-if="previewHeight < canvasHeight">
          · 下方 {{ cutCount }} 个元素将被删除
        </template>
      </span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  canvasHeight: number
  paperHeight: number
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
const cutCount = ref(0)
let highlightedElements: HTMLElement[] = []
let dragStartClientY = 0
let dragStartHeightMm = 0
let dragPxPerMm = 3.78

// hiprint 在 onBeforeDrag / selectEnd / mouseRect 等处调用原生 .focus()，
// 浏览器默认会把焦点元素滚动到视口内，导致拖拽时画布跳到顶部。
let origFocus: ((this: HTMLElement, options?: FocusOptions) => void) | null = null

let boundaryObserver: MutationObserver | null = null

function injectBoundaryLines() {
  const paper = designContainerRef.value?.querySelector('.hiprint-printPaper.design') as HTMLElement
  if (!paper) return

  boundaryObserver?.disconnect()
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

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  emit('zoom', e.deltaY < 0 ? 'in' : 'out')
}

function getPaperEl(): HTMLElement | null {
  return (
    (designContainerRef.value?.querySelector(
      '.hiprint-printPaper.design',
    ) as HTMLElement | null) || null
  )
}

function getPxPerMm(): number {
  const paper = getPaperEl()
  if (paper && props.canvasHeight > 0) {
    const h = paper.getBoundingClientRect().height
    if (h > 0) return h / props.canvasHeight
  }
  return 96 / 25.4
}

function mmToPt(mm: number): number {
  const hinnn = (window as any).hinnn
  if (hinnn?.mm?.toPt) return hinnn.mm.toPt(mm)
  return (mm * 72) / 25.4
}

function setPreviewLineBottom(areaRect: DOMRect, cutClientY: number) {
  previewLineBottom.value = Math.max(
    0,
    Math.min(areaRect.height, areaRect.bottom - cutClientY),
  )
}

/** 从底部向上拖：按位移连续减少保留高度；红线对齐纸面裁剪位置 */
function updateDragPreview(clientY: number) {
  if (!canvasAreaRef.value) return
  const areaRect = canvasAreaRef.value.getBoundingClientRect()
  if (!areaRect.height) return

  const deltaPx = dragStartClientY - clientY
  const newHeight = Math.max(
    props.paperHeight,
    Math.round((dragStartHeightMm - deltaPx / dragPxPerMm) * 10) / 10,
  )
  previewHeight.value = newHeight

  const paper = getPaperEl()
  if (paper && props.canvasHeight > 0) {
    const paperRect = paper.getBoundingClientRect()
    const pxPerMm = paperRect.height / props.canvasHeight
    if (pxPerMm > 0) {
      setPreviewLineBottom(areaRect, paperRect.top + newHeight * pxPerMm)
    } else {
      setPreviewLineBottom(areaRect, clientY)
    }
  } else {
    setPreviewLineBottom(areaRect, clientY)
  }

  cutCount.value = highlightCutElements(newHeight)
}

function onHandleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartClientY = e.clientY
  dragStartHeightMm = props.canvasHeight
  dragPxPerMm = Math.max(0.5, getPxPerMm())
  previewHeight.value = props.canvasHeight
  cutCount.value = 0
  highlightedElements = []

  const paper = getPaperEl()
  if (canvasAreaRef.value && paper && props.canvasHeight > 0) {
    const areaRect = canvasAreaRef.value.getBoundingClientRect()
    const paperRect = paper.getBoundingClientRect()
    const pxPerMm = paperRect.height / props.canvasHeight
    const paperBottomY = paperRect.top + props.canvasHeight * pxPerMm
    dragStartClientY = paperBottomY
    setPreviewLineBottom(areaRect, paperBottomY)
  }

  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('mouseup', onMouseUp, true)
  e.preventDefault()
  e.stopPropagation()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  updateDragPreview(e.clientY)
}

function onMouseUp(e: MouseEvent) {
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('mouseup', onMouseUp, true)
  if (!isDragging.value) return

  updateDragPreview(e.clientY)
  isDragging.value = false
  const newHeight = previewHeight.value
  clearHighlights()

  if (
    newHeight &&
    Math.abs(newHeight - props.canvasHeight) >= 0.5 &&
    newHeight >= props.paperHeight
  ) {
    emit('resizeCanvas', newHeight)
  }
}

function highlightCutElements(newHeightMm: number): number {
  clearHighlights()
  if (newHeightMm >= props.canvasHeight - 0.05) return 0

  const cutPt = mmToPt(newHeightMm)
  let count = 0
  const designEls = designContainerRef.value?.querySelectorAll('.hiprint-printElement') || []
  designEls.forEach((el) => {
    const htmlEl = el as HTMLElement
    const topPt = parseFloat(htmlEl.style.top || '')
    if (!Number.isFinite(topPt) || topPt < cutPt) return

    const target =
      (htmlEl.querySelector('.resize-panel') as HTMLElement | null) || htmlEl
    target.classList.add('will-be-cut')
    highlightedElements.push(target)
    count++
  })
  return count
}

function clearHighlights() {
  highlightedElements.forEach((el) => el.classList.remove('will-be-cut'))
  highlightedElements = []
}

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

onMounted(() => {
  nextTick(() => {
    injectBoundaryLines()
    setupBoundaryObserver()
  })

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

  designContainerRef.value?.addEventListener('click', onTableSelect, true)
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
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('mouseup', onMouseUp, true)
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
  min-height: 0;
}

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

.resize-drag-mask {
  position: absolute;
  inset: 0;
  z-index: 98;
  cursor: ns-resize;
  background: rgba(24, 144, 255, 0.06);
}

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
#hiprint-printTemplate .hiprint_rul_wrapper {
  display: none !important;
}

#hiprint-printTemplate .hiprint-headerLine,
#hiprint-printTemplate .hiprint-footerLine {
  left: 0 !important;
  border-top: 1px dashed #9e9e9e !important;
  opacity: 0.8 !important;
}

#hiprint-printTemplate {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
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
  /* hiprint 给纸张设了 tabindex，点击空白会 focus；去掉浏览器默认黑色焦点框 */
  outline: none;
}

#hiprint-printTemplate .hiprint-printPaper.design:focus,
#hiprint-printTemplate .hiprint-printPaper.design:focus-visible {
  outline: none;
  box-shadow: none;
}

#hiprint-printTemplate .hiprint-printPanel {
  margin: 0 auto;
  overflow: hidden;
  flex-shrink: 0;
}

#hiprint-printTemplate .hiprint-printElement:not(.editing):hover .resize-panel {
  display: block !important;
  background-color: transparent !important;
}

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

#hiprint-printTemplate .hiprint-printElement .resize-panel.will-be-cut,
#hiprint-printTemplate .hiprint-printElement.will-be-cut {
  border: 2px solid #ff4d4f !important;
  animation: cut-blink 0.4s ease-in-out infinite alternate;
}

@keyframes cut-blink {
  from { opacity: 1; }
  to { opacity: 0.3; }
}

#hiprint-printTemplate .resize-panel .size-box.hide {
  display: block !important;
}

#hiprint-printTemplate .hiprint-printElement-table-handle {
  display: none !important;
}

#hiprint-printTemplate .hiprint-printElement-table.table-selected {
  border: 2px dashed var(--selection-color, #1890ff);
}

#hiprint-printTemplate .hiprint-printPaper.design.grid {
  background-image: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 3%, rgba(0, 0, 0, 0) 3%), linear-gradient(360deg, rgba(0, 0, 0, 0.1) 3%, rgba(0, 0, 0, 0) 3%);
  background-size: var(--grid-size, 5mm) var(--grid-size, 5mm);
  background-position: left top;
}

#hiprint-printTemplate .hitable .selected {
  background: #e9e9e9 !important;
  color: #000 !important;
}

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

#hiprint-printTemplate .hiprint-printElement[data-fixed="true"] .resizebtn,
#hiprint-printTemplate .resize-panel[data-fixed="true"] .resizebtn {
  display: none !important;
}

#hiprint-printTemplate .hiprint-printElement-table table {
  border-color: #000 !important;
}
#hiprint-printTemplate .hiprint-printElement-table th {
  border-color: #000 !important;
  color: #000 !important;
  font-weight: 600 !important;
}
#hiprint-printTemplate .hiprint-printElement-table td {
  border-color: #000 !important;
}

#hiprint-printTemplate .hiprint-printElement-table table.hiprint-printElement-tableTarget {
  border-radius: 2px;
}

#hiprint-printTemplate .hiprint-printElement-table thead th {
  background: #f5f5f5 !important;
}

#hiprint-printTemplate .hiprint-printElement-table td[field]:not([field=""]):empty::after {
  content: '@' attr(field);
  color: #999;
  font-style: italic;
  font-size: 11px;
}
</style>
