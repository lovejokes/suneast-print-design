<template>
  <aside class="properties-panel">
    <div v-if="!element" class="panel-empty">
      <p>请在画布中选择</p>
      <p>一个元素进行编辑</p>
    </div>

    <template v-else>
      <div class="panel-header">
        {{ (element as any).printElementType?.title || '元素' }}
      </div>

      <a-collapse v-model:active-key="activeKeys" :bordered="false" expand-icon-position="end">
        <a-collapse-panel key="basic" header="基本">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="字段名">
              <a-input v-model:value="options.field" size="small" @change="emitChange" />
            </a-form-item>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="X">
                  <a-input-number v-model:value="options.left" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Y">
                  <a-input-number v-model:value="options.top" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="宽度">
                  <a-input-number v-model:value="options.width" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="高度">
                  <a-input-number v-model:value="options.height" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="style" header="样式">
          <a-form layout="vertical" :model="options" size="small">
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="字号">
                  <a-input-number v-model:value="options.fontSize" size="small" :step="1" :min="4" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="颜色">
                  <a-input v-model:value="options.color" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="对齐">
              <a-radio-group v-model:value="options.textAlign" size="small" @change="emitChange">
                <a-radio-button value="left">左</a-radio-button>
                <a-radio-button value="center">中</a-radio-button>
                <a-radio-button value="right">右</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="垂直对齐">
              <a-radio-group v-model:value="options.textContentVerticalAlign" size="small" @change="emitChange">
                <a-radio-button value="top">上</a-radio-button>
                <a-radio-button value="middle">中</a-radio-button>
                <a-radio-button value="bottom">下</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item label="行高">
                  <a-input-number v-model:value="options.lineHeight" size="small" :step="1" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="字间距">
                  <a-input-number v-model:value="options.letterSpacing" size="small" :step="0.5" style="width:100%" @change="emitChange" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="字体加粗">
              <a-switch v-model:checked="isBold" size="small" @change="onBoldChange" />
            </a-form-item>

            <a-form-item label="背景色">
              <a-input v-model:value="options.backgroundColor" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
            </a-form-item>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="border" header="边框">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="边框宽度">
              <a-input-number v-model:value="options.borderWidth" size="small" :step="0.5" :min="0" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="边框颜色">
              <a-input v-model:value="options.borderColor" size="small" type="color" style="width:100%; padding:2px" @change="emitChange" />
            </a-form-item>
            <a-form-item label="边框样式">
              <a-select v-model:value="options.borderStyle" size="small" @change="emitChange">
                <a-select-option value="solid">实线</a-select-option>
                <a-select-option value="dashed">虚线</a-select-option>
                <a-select-option value="dotted">点线</a-select-option>
                <a-select-option value="">无</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-collapse-panel>

        <a-collapse-panel key="advanced" header="高级">
          <a-form layout="vertical" :model="options" size="small">
            <a-form-item label="旋转角度(°)">
              <a-input-number v-model:value="options.rotate" size="small" :step="1" :min="0" :max="360" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="透明度">
              <a-input-number v-model:value="options.opacity" size="small" :step="0.1" :min="0" :max="1" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="层级">
              <a-input-number v-model:value="options.zIndex" size="small" :step="1" style="width:100%" @change="emitChange" />
            </a-form-item>
            <a-form-item label="锁定">
              <a-switch v-model:checked="isFixed" size="small" @change="onFixedChange" />
            </a-form-item>
            <a-form-item label="标题">
              <a-input v-model:value="options.title" size="small" @change="emitChange" />
            </a-form-item>
          </a-form>
        </a-collapse-panel>
      </a-collapse>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  element: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  (e: 'update', options: Record<string, unknown>): void
}>()

const activeKeys = ref(['basic', 'style'])

const options = ref<Record<string, unknown>>({})

const isBold = computed(() => options.value.fontWeight === '700' || options.value.fontWeight === 'bold')
const isFixed = computed(() => options.value.fixed === true)

watch(
  () => props.element,
  (el) => {
    if (el && (el as any).options) {
      options.value = { ...(el as any).options }
    } else {
      options.value = {}
    }
  },
  { immediate: true }
)

function emitChange() {
  emit('update', { ...options.value })
}

function onBoldChange(val: boolean) {
  options.value.fontWeight = val ? '700' : '400'
  emitChange()
}

function onFixedChange(val: boolean) {
  options.value.fixed = val
  emitChange()
}
</script>

<style scoped>
.properties-panel {
  width: var(--panel-width-right);
  background: var(--panel-bg);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  padding: 4px 0;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  gap: 4px;
}

.panel-empty p {
  margin: 0;
}

.panel-header {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 4px;
}
</style>
