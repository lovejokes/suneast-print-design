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
        <a-button
          size="small"
          :loading="printBusy"
          :disabled="pdfBusy || imagePdfBusy"
          @click="handlePrint"
        >
          <PrintIcon />
          打印
        </a-button>
        <a-button
          size="small"
          :loading="pdfBusy"
          :disabled="printBusy || imagePdfBusy"
          @click="handleExportPdf"
        >
          <PdfIcon />
          导出 PDF
        </a-button>
        <a-button
          size="small"
          :loading="imagePdfBusy"
          :disabled="printBusy || pdfBusy"
          @click="handleExportImagePdf"
        >
          <PdfIcon />
          图片 PDF
        </a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { PrintIcon, PdfIcon } from '@/assets/icons'
import {
  renderPreviewPages,
  printPreviewPapers,
  exportPreviewPapersToPdf,
  exportPreviewPapersToImagePdf,
} from '@/utils/previewRender'

const props = defineProps<{
  open: boolean
  template: object
  data: object
  paperHeight?: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const scrollContainer = ref<HTMLElement>()
const previewContent = ref<HTMLElement>()
const printBusy = ref(false)
const pdfBusy = ref(false)
const imagePdfBusy = ref(false)
let disposePreview: (() => void) | null = null

const anyBusy = computed(
  () => printBusy.value || pdfBusy.value || imagePdfBusy.value,
)

watch(
  () => props.open,
  (val) => {
    if (val) {
      // 等 ant-modal 开场动画结束再渲染，避免分页用 getBoundingClientRect
      // 读到 scale 中的坐标并写回错误 px
      nextTick(() => setTimeout(initPreview, 320))
    } else {
      destroyPreview()
    }
  }
)

function initPreview() {
  if (!window.hiprint || !previewContent.value) return

  try {
    destroyPreview()
    const result = renderPreviewPages(
      previewContent.value,
      props.template,
      props.data,
      props.paperHeight,
    )
    disposePreview = result.dispose
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = 0
    }
  } catch (e) {
    console.error('预览失败', e)
    message.error('预览失败')
  }
}

function destroyPreview() {
  if (disposePreview) {
    try {
      disposePreview()
    } catch {
      /* ignore */
    }
    disposePreview = null
  } else if (previewContent.value) {
    previewContent.value.innerHTML = ''
  }
}

async function handlePrint() {
  if (!previewContent.value || anyBusy.value) return
  printBusy.value = true
  try {
    await printPreviewPapers(previewContent.value)
  } catch (e: any) {
    console.error('打印失败', e)
    message.error(e?.message || '打印失败')
  } finally {
    printBusy.value = false
  }
}

async function handleExportPdf() {
  if (!previewContent.value || anyBusy.value) return
  pdfBusy.value = true
  try {
    message.info({
      content: '请在打印对话框中选择「另存为 PDF」或「Microsoft Print to PDF」',
      duration: 4,
    })
    await exportPreviewPapersToPdf(previewContent.value)
  } catch (e: any) {
    console.error('导出 PDF 失败', e)
    message.error(e?.message || '导出 PDF 失败')
  } finally {
    pdfBusy.value = false
  }
}

async function handleExportImagePdf() {
  if (!previewContent.value || anyBusy.value) return
  imagePdfBusy.value = true
  const hide = message.loading('正在生成图片 PDF…', 0)
  try {
    await exportPreviewPapersToImagePdf(previewContent.value, '打印.pdf')
    message.success('图片 PDF 已导出')
  } catch (e: any) {
    console.error('图片 PDF 导出失败', e)
    message.error(e?.message || '图片 PDF 导出失败')
  } finally {
    hide()
    imagePdfBusy.value = false
  }
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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

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
