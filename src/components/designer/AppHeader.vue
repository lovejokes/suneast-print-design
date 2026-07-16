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
            <a-menu-item @click="$emit('new')">新建模板</a-menu-item>
            <a-menu-item @click="$emit('import')">导入 JSON</a-menu-item>
            <a-menu-item @click="$emit('export')">导出 JSON</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

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
        @change="$emit('update:paperType', $event)"
      >
        <a-select-option value="A3">A3</a-select-option>
        <a-select-option value="A4">A4</a-select-option>
        <a-select-option value="A5">A5</a-select-option>
        <a-select-option value="B3">B3</a-select-option>
        <a-select-option value="B4">B4</a-select-option>
        <a-select-option value="B5">B5</a-select-option>
        <a-select-option value="custom">自定义</a-select-option>
      </a-select>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('zoomOut')" :disabled="zoom <= 0.5">
        <ZoomOutIcon />
      </a-button>
      <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
      <a-button type="text" size="small" @click="$emit('zoomIn')" :disabled="zoom >= 5">
        <ZoomInIcon />
      </a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('undo')">
        <UndoIcon />
      </a-button>
      <a-button type="text" size="small" @click="$emit('redo')">
        <RedoIcon />
      </a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('alignLeft')"><AlignLeftIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignCenter')"><AlignCenterIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignRight')"><AlignRightIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignTop')"><AlignTopIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignMiddle')"><AlignMiddleIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('alignBottom')"><AlignBottomIcon /></a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('bringForward')"><BringForwardIcon /></a-button>
      <a-button type="text" size="small" @click="$emit('sendBackward')"><SendBackwardIcon /></a-button>

      <span class="tool-sep" />

      <a-button type="text" size="small" @click="$emit('toggleGrid')" :class="{ active: gridEnabled }">
        <GridIcon />
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
  GridIcon,
} from '@/assets/icons'

defineProps<{
  paperType: string
  zoom: number
  gridEnabled: boolean
}>()

defineEmits<{
  new: []
  import: []
  export: []
  print: []
  pdf: []
  'update:paperType': [val: string]
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
  toggleGrid: []
}>()
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
  color: var(--brand-600);
  background: var(--brand-50);
}
</style>
