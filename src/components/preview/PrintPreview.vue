<template>
  <a-modal
    v-model:open="visible"
    title="打印预览"
    :footer="null"
    width="90vw"
    :body-style="{ padding: '0', background: '#eef0f4', height: '80vh', display: 'flex', flexDirection: 'column' }"
    destroy-on-close
  >
    <div ref="previewContainer" class="preview-container"></div>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { PrintIcon, PdfIcon, ZoomInIcon, ZoomOutIcon } from '@/assets/icons'

const props = defineProps<{
  open: boolean
  template: object
  data: object
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const previewContainer = ref<HTMLElement>()
const previewZoom = ref(1)
let printTemplate: any = null

watch(
  () => props.open,
  (val) => {
    if (val) {
      setTimeout(initPreview, 100)
    } else {
      destroyPreview()
    }
  }
)

function initPreview() {
  if (!window.hiprint) return
  try {
    printTemplate = new window.hiprint.PrintTemplate({
      template: props.template,
    })
    printTemplate.print(previewContainer.value, {})
  } catch (e) {
    console.error('预览失败', e)
  }
}

function destroyPreview() {
  if (printTemplate) {
    printTemplate.destroy()
    printTemplate = null
  }
}

function handlePrint() {
  printTemplate?.print()
}

function handleExportPdf() {
  printTemplate?.exportPdf?.()
}

function zoomOut() {
  previewZoom.value = Math.max(0.5, previewZoom.value - 0.1)
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
}

.preview-footer {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
}
</style>
