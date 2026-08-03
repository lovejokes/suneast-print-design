<template>
  <a-modal
    v-model:open="open"
    title="选择模板"
    :width="720"
    :footer="null"
    @cancel="open = false"
  >
    <div class="tm-grid">
      <div
        v-for="tpl in templateList"
        :key="tpl.id"
        class="tm-card"
        @click="selectTemplate(tpl)"
      >
        <div class="tm-card-preview">
          <div class="tm-card-paper" :class="`tm-paper-${tpl.paperType}`">
            <span class="tm-card-badge">{{ tpl.paperType }}</span>
          </div>
        </div>
        <div class="tm-card-body">
          <div class="tm-card-name">{{ tpl.name }}</div>
          <div class="tm-card-desc">{{ tpl.description }}</div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { templateList, type TemplateDef } from '@/data/templates'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  select: [tpl: TemplateDef]
}>()

function selectTemplate(tpl: TemplateDef) {
  open.value = false
  emit('select', tpl)
}
</script>

<style scoped>
.tm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 0;
}

.tm-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
}

.tm-card:hover {
  border-color: #4C8BF5;
  box-shadow: 0 4px 12px rgba(76, 139, 245, 0.15);
}

.tm-card-preview {
  height: 80px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.tm-card-paper {
  position: relative;
  background: #fff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.tm-paper-A4 {
  width: 42px;
  height: 60px;
}

.tm-paper-A5 {
  width: 42px;
  height: 42px;
}

.tm-card-badge {
  position: absolute;
  bottom: 2px;
  right: 3px;
  font-size: 8px;
  color: #999;
  font-weight: 600;
}

.tm-card-body {
  padding: 10px 12px;
}

.tm-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.tm-card-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}
</style>
