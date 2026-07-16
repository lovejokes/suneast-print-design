<template>
  <main class="canvas-area">
    <div id="hiprint-printTemplate" class="design-container"></div>
    <div class="canvas-page-tabs">
      <a-tag
        v-for="(panel, idx) in panels"
        :key="idx"
        :color="currentPage === idx ? 'blue' : undefined"
        style="cursor: pointer; margin-right: 4px"
        @click="$emit('update:currentPage', idx)"
      >
        页面 {{ panel.name }}
      </a-tag>
      <a-button type="dashed" size="small" @click="$emit('addPage')" style="font-size: 11px">
        + 添加页面
      </a-button>
    </div>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  panels: Array<{ name: string | number; index: number }>
  currentPage: number
}>()

defineEmits<{
  'update:currentPage': [idx: number]
  addPage: []
}>()
</script>

<style scoped>
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg);
  overflow: hidden;
  position: relative;
}

.design-container {
  flex: 1;
  overflow: auto;
}

.canvas-page-tabs {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-color);
  gap: 4px;
  flex-shrink: 0;
}
</style>
