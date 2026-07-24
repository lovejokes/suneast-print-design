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
      @undo="store.undo()"
      @redo="store.redo()"
      @align-left="align('left')"
      @align-center="align('center')"
      @align-right="align('right')"
      @align-top="align('top')"
      @align-middle="align('middle')"
      @align-bottom="align('bottom')"
      @bring-forward="layer('up')"
      @send-backward="layer('down')"
      @toggle-grid="store.gridEnabled = !store.gridEnabled"
      @preview="previewOpen = true"
      @clear-canvas="handleClearCanvas"
      @increase-height="handleIncreaseHeight"
      @template="templateModalOpen = true"
    />

    <div class="app-body">
      <ElementsPanel ref="elementsPanelRef" />

      <DesignCanvas
        :canvas-height="canvasHeight"
        :paper-height="paperHeight"
        @resize-canvas="onResizeCanvas"
      />

      <PropertiesPanel
        :element="store.selectedElement"
        @update="onElementUpdate"
      />
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
    />

    <TemplateModal
      v-model:open="templateModalOpen"
      @select="onTemplateSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useDesignerStore } from '@/stores/designer'
import { useHiprint } from '@/composables/useHiprint'
import { useTemplate } from '@/composables/useTemplate'

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

const paperSizes: Record<string, { width: number; height: number }> = {
  A3: { width: 420, height: 297 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  B3: { width: 500, height: 353 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
}

const paperHeight = computed(() => paperSizes[store.paperType]?.height ?? 297)
const canvasHeight = computed(() => store.template.panels[0]?.paperFooter ?? paperHeight.value)

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

function handlePrint() {
  // 通过预览弹窗进行打印
  previewOpen.value = true
}

function handlePdf() {
  try {
    hiprintTemplate.value?.toPdf?.({}, '打印.pdf')
  } catch (e) {
    console.error('导出 PDF 失败', e)
  }
}

function handleNew() {
  store.newTemplate()
  hiprintTemplate.value?.update?.(store.template)
}

function handleExport() {
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
    hiprintTemplate.value?.update?.(store.template)
    message.success('模板已导入')
  } catch (err) {
    message.error('导入失败：格式不正确')
  }
}

function align(dir: string) {
  const map: Record<string, string> = {
    left: 'vLeft', center: 'vCenter', right: 'vRight',
    top: 'vTop', middle: 'vMiddle', bottom: 'vBottom',
  }
  hiprintTemplate.value?.align?.(map[dir])
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

function handleClearCanvas() {
  store.clearPaper()
  hiprintTemplate.value?.update?.(store.template)
}

function handleIncreaseHeight() {
  const ph = paperHeight.value
  const panel = store.template.panels[0]
  if (panel) {
    const currentHeight = panel.paperFooter ?? ph
    panel.paperFooter = currentHeight + ph
    store.pushHistory()
    hiprintTemplate.value?.update?.(store.template)
  }
}

function onTemplateSelect(tpl: any) {
  if (tpl.template) {
    store.importTemplate(tpl.template)
    hiprintTemplate.value?.update?.(store.template)
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
</style>
