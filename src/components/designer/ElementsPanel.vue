<template>
  <aside class="elements-panel">
    <a-collapse v-model:active-key="activeKeys" :bordered="false" expand-icon-position="end">
      <a-collapse-panel key="default" header="默认组件">
        <a-collapse v-model:active-key="defaultSubKeys" :bordered="false" expand-icon-position="end">
          <a-collapse-panel v-for="group in defaultGroups" :key="group.name" :header="group.name">
            <div
              v-for="el in group.elements"
              :key="el.tid"
              class="element-item"
              :tid="el.tid"
              :title="`拖拽 ${el.title} 到画布`"
            >
              <span class="element-icon">
                <component :is="getIcon(el.type)" />
              </span>
              <span class="element-name">{{ el.title }}</span>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-collapse-panel>

      <a-collapse-panel key="custom" header="自定义组件">
        <a-collapse v-model:active-key="customSubKeys" :bordered="false" expand-icon-position="end">
          <a-collapse-panel v-for="group in customGroups" :key="group.name" :header="group.name">
            <div
              v-for="el in group.elements"
              :key="el.tid"
              class="element-item"
              :tid="el.tid"
              :title="`拖拽 ${el.title} 到画布`"
            >
              <span class="element-icon">
                <component :is="getIcon(el.type)" />
              </span>
              <span class="element-name">{{ el.title }}</span>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-collapse-panel>
    </a-collapse>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { elementIcons } from '@/assets/icons'
import { customElementGroups } from '@/config/custom-elements'
import type { Component } from 'vue'
import TextIcon from '@/assets/icons/TextIcon.vue'

const activeKeys = ref(['default', 'custom'])
const defaultSubKeys = ref(['常用', '辅助'])

const defaultGroups = [
  {
    name: '常用',
    elements: [
      { tid: 'defaultModule.text', title: '文本', type: 'text' },
      { tid: 'defaultModule.image', title: '图片', type: 'image' },
      { tid: 'defaultModule.longText', title: '长文', type: 'longText' },
      { tid: 'defaultModule.table', title: '表格', type: 'table' },
      { tid: 'defaultModule.emptyTable', title: '空白表格', type: 'table' },
      { tid: 'defaultModule.customText', title: '自定义文本', type: 'text' },
    ],
  },
  {
    name: '辅助',
    elements: [
      { tid: 'defaultModule.hline', title: '横线', type: 'hline' },
      { tid: 'defaultModule.vline', title: '竖线', type: 'vline' },
      { tid: 'defaultModule.rect', title: '矩形', type: 'rect' },
      { tid: 'defaultModule.oval', title: '椭圆', type: 'oval' },
      { tid: 'defaultModule.barcode', title: '条形码', type: 'barcode' },
      { tid: 'defaultModule.qrcode', title: '二维码', type: 'qrcode' },
    ],
  },
]

const customSubKeys = ref(customElementGroups.map(g => g.name))
const customGroups = customElementGroups

function getIcon(type: string): Component {
  return elementIcons[type] || TextIcon
}

defineExpose({ activeKeys, defaultSubKeys, customSubKeys })
</script>

<style scoped>
.elements-panel {
  width: var(--panel-width-left);
  background: var(--panel-bg);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  padding: 4px 0;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: grab;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  transition: all 0.15s;
  border-left: 2px solid transparent;
  user-select: none;
}

.element-item:hover {
  background: #e8f0fe;
  color: var(--brand-600);
  border-left-color: var(--brand-500);
}

.element-item:active {
  cursor: grabbing;
}

.element-icon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.element-item:hover .element-icon {
  color: var(--brand-500);
}

.element-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
