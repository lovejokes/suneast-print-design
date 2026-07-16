<template>
  <div class="print-renderer">
    <div ref="renderContainer" class="render-container"></div>
    <div v-if="showToolbar" class="render-toolbar">
      <a-space>
        <a-button size="small" @click="handlePrint">
          <PrintIcon />
          打印
        </a-button>
        <a-button size="small" @click="handlePdf">
          <PdfIcon />
          PDF
        </a-button>
        <a-button size="small" @click="zoomOut">
          <ZoomOutIcon />
        </a-button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <a-button size="small" @click="zoomIn">
          <ZoomInIcon />
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { PrintIcon, PdfIcon, ZoomInIcon, ZoomOutIcon } from '@/assets/icons'

const props = withDefaults(
  defineProps<{
    templateJson: object
    dataJson?: object
    paperSize?: string
    showToolbar?: boolean
  }>(),
  {
    paperSize: 'A4',
    showToolbar: false,
  }
)

const renderContainer = ref<HTMLElement>()
const zoom = ref(1)
let printTemplate: any = null

function initRenderer() {
  if (!window.hiprint || !renderContainer.value) return
  destroyRenderer()
  try {
    printTemplate = new window.hiprint.PrintTemplate({
      template: props.templateJson,
    })
    printTemplate.print(renderContainer.value, props.dataJson || {})
  } catch (e) {
    console.error('渲染失败', e)
  }
}

function destroyRenderer() {
  if (printTemplate) {
    printTemplate.destroy()
    printTemplate = null
  }
}

function handlePrint() {
  printTemplate?.print(props.dataJson || {})
}

function handlePdf() {
  printTemplate?.exportPdf?.()
}

function zoomOut() {
  zoom.value = Math.max(0.5, zoom.value - 0.1)
}

function zoomIn() {
  zoom.value = Math.min(3, zoom.value + 0.1)
}

watch(
  () => [props.templateJson, props.dataJson],
  () => initRenderer(),
  { deep: true }
)

onMounted(initRenderer)
onUnmounted(destroyRenderer)
</script>

<style scoped>
.print-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.render-container {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #eef0f4;
}

.render-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  flex-shrink: 0;
}
</style>
