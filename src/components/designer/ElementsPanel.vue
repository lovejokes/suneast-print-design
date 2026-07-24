<template>
  <aside class="elements-panel">
    <div class="panel-tabs">
      <button
        :class="['panel-tab', { active: activeTab === 'basic' }]"
        @click="switchTab('basic')"
      >基础组件</button>
      <button
        :class="['panel-tab', { active: activeTab === 'business' }]"
        @click="switchTab('business')"
      >业务组件</button>
    </div>

    <!-- 基础组件 Tab -->
    <div v-show="activeTab === 'basic'" class="tab-content">
      <div class="section-header">通用组件</div>
      <div class="elements-grid">
        <div
          v-for="el in generalElements"
          :key="el.tid"
          class="ep-draggable-item"
          :tid="el.tid"
          :title="`拖拽 ${el.title} 到画布`"
        >
          <span class="element-icon">
            <component :is="getIcon(el)" />
          </span>
          <span class="element-name">{{ el.title }}</span>
        </div>
      </div>

      <div class="section-header">辅助组件</div>
      <div class="elements-grid">
        <div
          v-for="el in auxiliaryElements"
          :key="el.tid"
          class="ep-draggable-item"
          :tid="el.tid"
          :title="`拖拽 ${el.title} 到画布`"
        >
          <span class="element-icon">
            <component :is="getIcon(el)" />
          </span>
          <span class="element-name">{{ el.title }}</span>
        </div>
      </div>
    </div>

    <!-- 业务组件 Tab -->
    <div v-show="activeTab === 'business'" class="tab-content">
      <div class="section-header">业务字段</div>
      <div class="elements-grid">
        <div
          v-for="el in businessFieldElements"
          :key="el.tid"
          class="ep-draggable-item"
          :tid="el.tid"
          :title="`拖拽 ${el.title} 到画布`"
        >
          <span class="element-icon">
            <component :is="getIcon(el)" />
          </span>
          <span class="element-name">{{ el.title }}</span>
        </div>
      </div>

      <div class="section-header">表格/其他</div>
      <div class="elements-grid">
        <div
          v-for="el in businessOtherElements"
          :key="el.tid"
          class="ep-draggable-item"
          :tid="el.tid"
          :title="`拖拽 ${el.title} 到画布`"
        >
          <span class="element-icon">
            <component :is="getIcon(el)" />
          </span>
          <span class="element-name">{{ el.title }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { elementIcons } from '@/assets/icons'
import type { Component } from 'vue'
import TextIcon from '@/assets/icons/TextIcon.vue'

const activeTab = ref('basic')

interface ElementItem { tid: string; title: string; type: string }

const generalElements: ElementItem[] = [
  { tid: 'defaultModule.text', title: '文本', type: 'text' },
  { tid: 'defaultModule.image', title: '图片', type: 'image' },
  { tid: 'defaultModule.longText', title: '文本域', type: 'longText' },
  { tid: 'defaultModule.table', title: '表格', type: 'table' },
  { tid: 'defaultModule.emptyTable', title: '空白表格', type: 'table' },
  { tid: 'defaultModule.barcode', title: '条形码', type: 'barcode' },
  { tid: 'defaultModule.qrcode', title: '二维码', type: 'qrcode' },
]

const auxiliaryElements: ElementItem[] = [
  { tid: 'defaultModule.hline', title: '横线', type: 'hline' },
  { tid: 'defaultModule.vline', title: '竖线', type: 'vline' },
  { tid: 'defaultModule.rect', title: '矩形', type: 'rect' },
  { tid: 'defaultModule.oval', title: '椭圆', type: 'oval' },
]

const businessFieldElements: ElementItem[] = [
  { tid: 'customModule.header', title: '单据表头', type: 'text' },
  { tid: 'customModule.orderNo', title: '订单编号', type: 'text' },
  { tid: 'customModule.customerName', title: '客户名称', type: 'text' },
  { tid: 'customModule.date', title: '日期', type: 'text' },
  { tid: 'customModule.amount', title: '金额', type: 'text' },
  { tid: 'customModule.barcode', title: '条形码', type: 'text' },
  { tid: 'customModule.qrcode', title: '二维码', type: 'text' },
]

const businessOtherElements: ElementItem[] = [
  { tid: 'customModule.table', title: '数据表格', type: 'table' },
  { tid: 'customModule.signer', title: '签字', type: 'text' },
]

function getIcon(el: ElementItem): Component {
  return elementIcons[el.tid] || elementIcons[el.type] || TextIcon
}

function setupDragProxy() {
  const $ = (window as any).$
  if (!$) return
  $('.ep-draggable-item').each(function (this: HTMLElement) {
    const data = $.data(this, 'hidraggable')
    if (!data || !data.opts) return
    data.opts.proxy = function (source: HTMLElement) {
      return $(source).clone()
        .css({
          position: 'absolute',
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: 0.85,
          boxShadow: '0 4px 12px rgba(76,139,245,0.25)',
          border: '1px solid #4C8BF5',
        })
        .appendTo('body')
    }
  })
}

function reinitDrag() {
  nextTick(() => {
    const $ = (window as any).$
    const hiprint = (window as any).hiprint
    if (!$ || !hiprint?.PrintElementTypeManager) return
    const items = $('.ep-draggable-item')
    if (items.length > 0) {
      hiprint.PrintElementTypeManager.buildByHtml(items)
      setupDragProxy()
    }
  })
}

function switchTab(key: string) {
  activeTab.value = key
  reinitDrag()
}

onMounted(() => {
  reinitDrag()
})

defineExpose({ reinitDrag })
</script>

<style scoped>
.elements-panel {
  width: var(--panel-width-left);
  background: var(--panel-bg);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  padding: 10px 0;
  font-size: 13px;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.panel-tab:hover {
  color: var(--brand-600);
}

.panel-tab.active {
  color: var(--brand-600);
  border-bottom-color: var(--brand-500);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

.section-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 10px 12px 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.elements-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding: 0 8px;
}

.ep-draggable-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  aspect-ratio: 1;
  padding: 8px 4px 6px;
  cursor: grab;
  border-radius: var(--radius-md);
  transition: all 0.15s;
  user-select: none;
  border: 1px solid var(--border-color);
  background: #fafbfc;
}

.ep-draggable-item:hover {
  background: #e8f0fe;
  border-color: var(--brand-300);
  color: var(--brand-600);
  box-shadow: 0 2px 6px rgba(76,139,245,0.12);
}

.ep-draggable-item:active {
  cursor: grabbing;
  background: var(--brand-50);
  border-color: var(--brand-400);
}

.element-icon {
  display: flex;
  align-items: center;
  color: #555;
  flex-shrink: 0;
  width: 23px;
  height: 23px;
}

.element-icon :deep(svg) {
  width: 23px;
  height: 23px;
}

.ep-draggable-item:hover .element-icon {
  color: var(--brand-500);
}

.element-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1;
}

.ep-draggable-item:hover .element-name {
  color: var(--brand-600);
}
</style>
