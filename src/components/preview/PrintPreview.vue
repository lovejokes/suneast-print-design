<template>
  <a-modal
    v-model:open="visible"
    title="打印预览"
    :footer="null"
    width="100%"
    wrap-class-name="preview-fullscreen-modal"
    :body-style="{ padding: '0', background: '#eef0f4', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }"
    destroy-on-close
  >
    <div class="preview-container" ref="scrollContainer">
      <div
        ref="previewContent"
        class="preview-content"
      />
    </div>
    <div class="preview-footer">
      <a-space>
        <a-button size="small" @click="handlePrint">
          <PrintIcon />
          打印
        </a-button>
        <a-button size="small" @click="handleExportPdf">
          <PdfIcon />
          导出 PDF
        </a-button>
        <a-button size="small" @click="zoomOut">
          <ZoomOutIcon />
        </a-button>
        <span style="font-size:12px; color:#666">{{ Math.round(previewZoom * 100) }}%</span>
        <a-button size="small" @click="zoomIn">
          <ZoomInIcon />
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { PrintIcon, PdfIcon, ZoomInIcon, ZoomOutIcon } from '@/assets/icons'

const props = defineProps<{
  open: boolean
  template: object
  data: object
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'pdf'): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const scrollContainer = ref<HTMLElement>()
const previewContent = ref<HTMLElement>()
const previewZoom = ref(1)

watch(
  () => props.open,
  (val) => {
    if (val) {
      nextTick(() => setTimeout(initPreview, 150))
    } else {
      destroyPreview()
    }
  }
)

function initPreview() {
  if (!window.hiprint || !previewContent.value) return

  try {
    const templateCopy = JSON.parse(JSON.stringify(props.template))
    const dataCopy = JSON.parse(JSON.stringify(props.data))

    const pt = new window.hiprint.PrintTemplate({ template: templateCopy })
    const $ = (window as any).$

    // 续排渲染：后续 panel 基于前一个 panel 的 referenceElement 定位，
    // 内容流入前一页剩余空间，而不是每个 panel 都另起新页。
    // 注意：续排 panel 的页眉/页脚填充由首个 panel 统一完成，
    // 若续排产生新页，新页不会重复填充页眉页脚。
    const $result = $('<div class="hiprint-printTemplate"></div>')
    const sharedPages: any[] = []
    const panels = pt.printPanels || []

    // hiprint 全局页码续排列表在多次渲染间会残留，渲染前清理
    if ((window as any).hinnn) delete (window as any).hinnn._paperList

    panels.forEach((panel: any, idx: number) => {
      const target = panel.getHtml(dataCopy, {}, sharedPages, idx > 0 ? panels[idx - 1] : undefined)
      // idx > 0 时返回的是前一个 panel 的容器（已在 DOM 中），无需重复 append
      if (idx === 0 && target) $result.append(target)
    })

    // 续排模式下后续 panel 跳过了页码最终化，这里统一重排页码
    sharedPages.forEach((page: any, i: number) => {
      page.updatePaperNumber?.(i + 1, sharedPages.length)
    })
    if ((window as any).hinnn) delete (window as any).hinnn._paperList

    const $container = $(previewContent.value)
    $container.empty().append($result)

    const papers = previewContent.value.querySelectorAll('.hiprint-printPaper')

    papers.forEach((paper: Element) => {
      const el = paper as HTMLElement
      el.style.overflow = 'hidden'
      el.style.background = '#ffffff'

      const contentEl = el.querySelector('.hiprint-printPaper-content') as HTMLElement
      if (contentEl) {
        contentEl.style.height = 'auto'
        contentEl.style.minHeight = '100%'
        contentEl.style.overflow = 'visible'
      }

      Array.from(el.children).forEach((child) => {
        const c = child as HTMLElement
        if (window.getComputedStyle(c).position === 'absolute') {
          c.style.pointerEvents = 'none'
        }
      })
    })

    previewContent.value.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())

    ;(previewContent.value as any).__pt = pt

    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }

    // 发布分页完成事件，让画布可以接收选区元素
    if (typeof window !== 'undefined' && window.hinnn) {
      window.hinnn.trigger && window.hinnn.trigger('previewReady', pt)
    }
  } catch (e) {
    console.error('预览失败', e)
  }
}

function destroyPreview() {
  if (previewContent.value) {
    const pt = (previewContent.value as any).__pt
    if (pt) {
      try { pt.clear() } catch (e) { /* ignore */ }
    }
    previewContent.value.innerHTML = ''
  }
}

function handlePrint() {
  window.print()
}

function handleExportPdf() {
  emit('pdf')
}

function zoomOut() {
  previewZoom.value = Math.max(0.25, previewZoom.value - 0.1)
}

function zoomIn() {
  previewZoom.value = Math.min(3, previewZoom.value + 0.1)
}

onUnmounted(destroyPreview)
</script>

<style scoped>
.preview-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  justify-content: center;
  background: #eef0f4;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.preview-content :deep(.hiprint-printPaper) {
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  margin-bottom: 13px;
}
.preview-content :deep(.hiprint-printPaper):last-child {
  margin-bottom: 0;
}

/* 页码样式 */
.preview-content :deep(.hiprint-paperNumber) {
  font-size: 11px;
  color: #888;
  font-family: Arial, sans-serif;
}

.preview-footer {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
</style>

<style>
.preview-fullscreen-modal {
  position: fixed !important;
  inset: 0 !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.preview-fullscreen-modal .ant-modal {
  position: fixed !important;
  inset: 0 !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.preview-fullscreen-modal .ant-modal-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: 0 !important;
}

.preview-fullscreen-modal .ant-modal-body {
  flex: 1;
  overflow: hidden;
}
</style>
