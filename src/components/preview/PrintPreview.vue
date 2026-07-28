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
import { splitTallPanels } from '@/utils/splitPanel'

const props = defineProps<{
  open: boolean
  template: object
  data: object
  paperHeight?: number
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

    // 将超高 panel 拆分为标准纸高的多个 panel，使预览呈现多页效果
    if (props.paperHeight && templateCopy.panels) {
      templateCopy.panels = splitTallPanels(templateCopy.panels, props.paperHeight)
    }

    const pt = new window.hiprint.PrintTemplate({ template: templateCopy })
    const $ = (window as any).$

    // 独立渲染：每个 panel 渲染为自己的页面，不做续排
    // 这样拆分后的多个 panel 会各自产生独立的 .hiprint-printPaper
    const $result = $('<div class="hiprint-printTemplate"></div>')
    const panels = pt.printPanels || []

    const allPages: any[] = []

    panels.forEach((panel: any) => {
      const localPages: any[] = []
      const target = panel.getHtml(dataCopy, {}, localPages)
      if (target) $result.append(target)
      allPages.push(...localPages)
    })

    // 统一更新所有页码，避免局部与全局页码不一致
    // 优先使用 panel.getHtml 返回的 localPages；若为空，则回退到 hiprint 全局 _paperList
    const paperList = (window as any).hinnn?._paperList || []
    const pagesToUpdate = allPages.length > 0 ? allPages : paperList
    pagesToUpdate.forEach((page: any, pi: number) => {
      page.updatePaperNumber?.(pi + 1, pagesToUpdate.length)
    })

    // 清空 hiprint 全局页码状态，防止下次预览时页码累加
    if (window.hinnn) {
      window.hinnn._paperList = []
    }

    const $container = $(previewContent.value)
    $container.empty().append($result)

    const papers = previewContent.value.querySelectorAll('.hiprint-printPaper')

    papers.forEach((paper: Element) => {
      const el = paper as HTMLElement
      el.style.overflow = 'hidden'
      el.style.background = '#ffffff'

      const contentEl = el.querySelector('.hiprint-printPaper-content') as HTMLElement
      if (contentEl) {
        // 重置 getHtml() 注入的 left/top offset（默认为 20pt），
        // 否则预览时所有元素会额外偏移 20pt，跑到纸张外部。
        // 设计模式下元素位置已包含 offset 钳位，无需二次偏移。
        contentEl.style.left = '0pt'
        contentEl.style.top = '0pt'
        contentEl.style.bottom = ''
        contentEl.style.right = ''
        contentEl.style.width = '100%'
        contentEl.style.height = '100%'
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
  gap: 16px;
}

.preview-content :deep(.hiprint-printPaper) {
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  flex-shrink: 0;
}

/* 页码样式 */
.preview-content :deep(.hiprint-paperNumber) {
  font-size: 11px;
  color: #888;
  font-family: Arial, sans-serif;
  /* 强制页码显示在 paper 右下角，避免 contentEl 高度变化导致被裁剪 */
  top: auto !important;
  left: auto !important;
  right: 12px !important;
  bottom: 12px !important;
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
