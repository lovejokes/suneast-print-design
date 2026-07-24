<template>
  <header class="app-header">
    <div class="header-left">
      <span class="header-logo">
        <LogoIcon />
      </span>
      <span class="header-title">日东打印设计器</span>
    </div>

    <div class="header-tools">
      <a-dropdown>
        <a-button type="text" size="small">文件</a-button>
        <template #overlay>
          <a-menu>
            <!-- <a-menu-item @click="$emit('new')">新建模板</a-menu-item> -->
            <a-menu-item @click="$emit('import')">导入 JSON</a-menu-item>
            <a-menu-item @click="$emit('export')">导出 JSON</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-button type="text" size="small" @click="$emit('template')">模板</a-button>

      <a-dropdown>
        <a-button type="text" size="small">导出</a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="$emit('print')">
              <PrintIcon />
              <span style="margin-left:6px">打印</span>
            </a-menu-item>
            <a-menu-item @click="$emit('pdf')">
              <PdfIcon />
              <span style="margin-left:6px">导出 PDF</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <span class="tool-sep" />

      <a-select
        :value="paperType"
        size="small"
        style="width: 72px"
        @change="onPaperChange"
      >
        <a-select-option value="A3">A3</a-select-option>
        <a-select-option value="A4">A4</a-select-option>
        <a-select-option value="A5">A5</a-select-option>
        <a-select-option value="B3">B3</a-select-option>
        <a-select-option value="B4">B4</a-select-option>
        <a-select-option value="B5">B5</a-select-option>
        <a-select-option value="custom">自定义</a-select-option>
      </a-select>

      <a-modal
        v-model:open="customPaperOpen"
        title="自定义纸张"
        :width="280"
        :footer="null"
        @cancel="customPaperOpen = false"
      >
        <a-form size="small" layout="vertical">
          <a-form-item label="宽度 (mm)">
            <a-input-number v-model:value="customWidth" :min="50" :max="1000" style="width:100%" />
          </a-form-item>
          <a-form-item label="高度 (mm)">
            <a-input-number v-model:value="customHeight" :min="50" :max="1000" style="width:100%" />
          </a-form-item>
          <a-button type="primary" block @click="confirmCustomPaper">确定</a-button>
        </a-form>
      </a-modal>

      <span class="tool-sep" />

      <a-tooltip title="缩小">
        <a-button type="text" size="small" @click="$emit('zoomOut')" :disabled="zoom <= 0.5">
          <ZoomOutIcon />
        </a-button>
      </a-tooltip>
      <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
      <a-tooltip title="放大">
        <a-button type="text" size="small" @click="$emit('zoomIn')" :disabled="zoom >= 5">
          <ZoomInIcon />
        </a-button>
      </a-tooltip>

      <span class="tool-sep" />

      <a-tooltip title="撤销">
        <a-button type="text" size="small" @click="$emit('undo')">
          <UndoIcon />
        </a-button>
      </a-tooltip>
      <a-tooltip title="重做">
        <a-button type="text" size="small" @click="$emit('redo')">
          <RedoIcon />
        </a-button>
      </a-tooltip>

      <span class="tool-sep" />

      <a-tooltip title="左对齐">
        <a-button type="text" size="small" @click="$emit('alignLeft')"><AlignLeftIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="水平居中">
        <a-button type="text" size="small" @click="$emit('alignCenter')"><AlignCenterIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="右对齐">
        <a-button type="text" size="small" @click="$emit('alignRight')"><AlignRightIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="上对齐">
        <a-button type="text" size="small" @click="$emit('alignTop')"><AlignTopIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="垂直居中">
        <a-button type="text" size="small" @click="$emit('alignMiddle')"><AlignMiddleIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="下对齐">
        <a-button type="text" size="small" @click="$emit('alignBottom')"><AlignBottomIcon /></a-button>
      </a-tooltip>

      <span class="tool-sep" />

      <a-tooltip title="上移一层">
        <a-button type="text" size="small" @click="$emit('bringForward')"><BringForwardIcon /></a-button>
      </a-tooltip>
      <a-tooltip title="下移一层">
        <a-button type="text" size="small" @click="$emit('sendBackward')"><SendBackwardIcon /></a-button>
      </a-tooltip>

      <span class="tool-sep" />

      <a-tooltip title="清空画布">
        <a-button type="text" size="small" @click="$emit('clearCanvas')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 18"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </a-button>
      </a-tooltip>

      <span class="tool-sep" />

      <a-tooltip title="加高一页">
        <a-button type="text" size="small" @click="$emit('increaseHeight')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="8 15 12 19 16 15"></polyline>
            <line x1="5" y1="3" x2="19" y2="3"></line>
          </svg>
        </a-button>
      </a-tooltip>

      <a-button type="text" size="small" @click="$emit('preview')">
        预览
      </a-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  LogoIcon,
  PrintIcon, PdfIcon,
  ZoomInIcon, ZoomOutIcon,
  UndoIcon, RedoIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
  AlignTopIcon, AlignMiddleIcon, AlignBottomIcon,
  BringForwardIcon, SendBackwardIcon,
} from '@/assets/icons'
import { ref } from 'vue'

defineProps<{
  paperType: string
  zoom: number
}>()

const emit = defineEmits<{
  new: []
  import: []
  export: []
  print: []
  pdf: []
  'update:paperType': [val: string]
  customPaper: [width: number, height: number]
  zoomIn: []
  zoomOut: []
  undo: []
  redo: []
  alignLeft: []
  alignCenter: []
  alignRight: []
  alignTop: []
  alignMiddle: []
  alignBottom: []
  bringForward: []
  sendBackward: []
  preview: []
  clearCanvas: []
  increaseHeight: []
  template: []
  'update:selectionColor': [color: string]
}>()

const customPaperOpen = ref(false)
const customWidth = ref(210)
const customHeight = ref(297)

function onPaperChange(val: string) {
  if (val === 'custom') {
    customPaperOpen.value = true
  } else {
    emit('update:paperType', val)
  }
}

function confirmCustomPaper() {
  customPaperOpen.value = false
  emit('customPaper', customWidth.value, customHeight.value)
}
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--border-color);
  gap: 4px;
  flex-shrink: 0;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--brand-600);
  flex-shrink: 0;
}

.header-logo {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.header-tools::-webkit-scrollbar {
  height: 0;
}

.tool-sep {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.zoom-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
  cursor: default;
}

.ant-btn-text.active {
  color: inherit;
  background: transparent;
}
</style>
