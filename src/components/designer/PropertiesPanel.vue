<template>
  <aside class="properties-panel">
    <div id="PrintElementOptionSetting"></div>
    <div v-if="!element" class="panel-empty-overlay">
      <p>请在画布中选择</p>
      <p>一个元素进行编辑</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  element: Record<string, unknown> | null
}>()

// Detect when hiprint renders settings (element selected)
let observer: MutationObserver | null = null

onMounted(() => {
  const container = document.getElementById('PrintElementOptionSetting')
  if (!container) return

  observer = new MutationObserver(() => {
    const hasContent = container.children.length > 0
    const overlay = document.querySelector('.panel-empty-overlay') as HTMLElement
    if (overlay) {
      overlay.style.display = hasContent ? 'none' : 'flex'
    }
  })

  observer.observe(container, { childList: true, subtree: true })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.properties-panel {
  width: var(--panel-width-right);
  background: var(--panel-bg);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  position: relative;
}

.panel-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  gap: 4px;
  pointer-events: none;
  z-index: 1;
}

.panel-empty-overlay p {
  margin: 0;
}
</style>

<style>
/* hiprint settings panel — compact overrides for antd integration */
#PrintElementOptionSetting .hiprint-option-items {
  font-size: 12px;
}

#PrintElementOptionSetting .hiprint-option-item-label {
  font-size: 12px;
  color: #666;
  min-width: 60px;
}

#PrintElementOptionSetting input,
#PrintElementOptionSetting select {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
}

#PrintElementOptionSetting .hiprint-option-item {
  margin-bottom: 6px;
}

#PrintElementOptionSetting .nav-tabs {
  font-size: 12px;
}
</style>
