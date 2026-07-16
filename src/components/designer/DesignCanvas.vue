<template>
  <main class="canvas-area">
    <div id="hiprint-printTemplate" class="design-container"></div>
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

/* hiprint renders pages stacked vertically; add spacing between them */
:global(#hiprint-printTemplate .hiprint-printPagination) {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  align-items: center;
}

/* Paper shadow effect in design mode */
:global(#hiprint-printTemplate table) {
  box-shadow: var(--shadow-paper);
}
</style>
