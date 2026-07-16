<template>
  <a-modal
    v-model:open="visible"
    title="模板 JSON"
    :footer="null"
    width="700px"
    :body-style="{ padding: '12px', maxHeight: '70vh', overflow: 'auto' }"
  >
    <a-button type="link" size="small" @click="copyJSON" style="margin-bottom: 8px">
      复制 JSON
    </a-button>
    <pre
      style="
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 16px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.6;
        overflow: auto;
        max-height: 55vh;
        margin: 0;
      "
    ><code>{{ jsonText }}</code></pre>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps<{
  open: boolean
  template: object
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const jsonText = computed(() => JSON.stringify(props.template, null, 2))

function copyJSON() {
  navigator.clipboard.writeText(jsonText.value).then(() => {
    message.success('JSON 已复制到剪贴板')
  })
}
</script>
