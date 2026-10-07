<script setup lang="ts">
import { computed, ref } from 'vue'

import type { DateItem, OptionItem } from './types/item'

import CheckBox from './modules/CheckBox.vue'
import Input from './modules/Input.vue'
import TextArea from './modules/TextArea.vue'

export type FormItem = {
  id: string | number
  name: string
  type?: 'text' | 'number' | 'password' | 'radio' | 'checkbox' | 'textarea' | 'date'
  /** 值（仅 type 为 checkbox 时为 string[]） */
  value: string | string[]
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  width?: string
  height?: string
  options?: OptionItem[]
  /** 是否启用选项过滤 (仅 type 为 radio 时有效) */
  filter?: boolean
  /** 格式化 (仅 type 为 date 时有效) */
  format?: (date: DateItem) => string
  /** 是否启用校验（仅 type 为 radio 或 date 时有效） */
  verify?: boolean
  /** 弹窗 z-index（仅 type 为 radio 或 date 时有效）*/
  zIndex?: number
  /** 是否警告 */
  warning?: boolean
}
interface Props {
  /** 表单项默认宽 */
  itemWidth?: string
  /** 标单项默认高 */
  itemHeight?: string
}
const props = defineProps<Props>()
/** 表单项 */
const items = defineModel<FormItem[]>('items', { required: true })

// 回车聚焦下一个输入框
const textareaInstancesRef = ref<Record<string, InstanceType<typeof TextArea> | null>>({})
const checkboxInstancesRef = ref<Record<string, InstanceType<typeof CheckBox> | null>>({})
const inputInstancesRef = ref<Record<string, InstanceType<typeof Input> | null>>({})

const onEnter = (index: number) => {
  textareaInstancesRef.value[index]?.blur()
  textareaInstancesRef.value[index + 1]?.focus()
  checkboxInstancesRef.value[index]?.blur()
  checkboxInstancesRef.value[index + 1]?.focus()
  inputInstancesRef.value[index]?.blur()
  inputInstancesRef.value[index + 1]?.focus()
}

// 校验结果
const verifications = computed<Record<string, boolean>>(() => {
  const result: Record<string, boolean> = {}
  items.value.forEach((item, index) => {
    if (item.type === 'textarea' || item.type === 'checkbox') return
    result[item.id] = inputInstancesRef.value[index]?.verification ?? false
  })
  return result
})

// 暴露
defineExpose({
  /** 校验结果（key 为表单项 id，textarea 和 checkbox 不参与校验） */
  verifications,
})
</script>
<template>
  <ul :class="$style.form" ref="FormRef">
    <li
      :class="$style.formItem"
      v-for="(item, index) in items"
      :key="item.id"
      :style="{
        width:
          item.type === 'textarea'
            ? '100%'
            : (item.width ?? props.itemWidth ?? (item.type === 'checkbox' || item.type === 'date'))
              ? '200px'
              : '150px',
        height: item.type === 'textarea' ? '' : (item.height ?? props.itemHeight ?? '35px'),
      }"
    >
      <span
        :class="$style.name"
        v-if="item.name"
        :style="{
          lineHeight:
            item.type === 'textarea' ? '42px' : (item.height ?? props.itemHeight ?? 35) + 'px',
        }"
      >
        {{ item.name }}</span
      >
      <TextArea
        :class="$style.textarea"
        v-if="item.type === 'textarea'"
        :ref="(el) => (textareaInstancesRef[index] = el as InstanceType<typeof TextArea> | null)"
        v-model:value="item.value as string"
        :placeholder="item.placeholder"
        :enterkeyhint="index === items.length - 1 ? 'done' : 'next'"
        :disabled="item.disabled"
        :on-enter="() => onEnter(index)"
      />
      <CheckBox
        :class="$style.checkbox"
        v-else-if="item.type === 'checkbox'"
        :ref="(el) => (checkboxInstancesRef[index] = el as InstanceType<typeof CheckBox> | null)"
        v-model:value="item.value as string[]"
        :placeholder="item.placeholder"
        :enterkeyhint="index === items.length - 1 ? 'done' : 'next'"
        :disabled="item.disabled"
        :readonly="item.readonly"
        :options="item.options"
        :filter="item.filter"
        :z-index="item.zIndex"
        v-model:warning="item.warning"
        :on-enter="() => onEnter(index)"
      />
      <Input
        :class="$style.input"
        v-else
        :ref="(el) => (inputInstancesRef[index] = el as InstanceType<typeof Input> | null)"
        :type="item.type"
        v-model:value="item.value as string"
        :placeholder="item.placeholder"
        :enterkeyhint="index === items.length - 1 ? 'done' : 'next'"
        :disabled="item.disabled"
        :readonly="item.readonly"
        :options="item.options"
        :filter="item.filter"
        :format="item.format"
        :verify="item.verify"
        :z-index="item.zIndex"
        v-model:warning="item.warning"
        :on-enter="() => onEnter(index)"
      />
    </li>
  </ul>
</template>
<style module>
.form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
}

.formItem {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.formItem .textarea,
.formItem .checkbox,
.formItem .input {
  flex: 1;
  min-width: 0;
}

.formItem .input {
  height: 100%;
}
</style>
