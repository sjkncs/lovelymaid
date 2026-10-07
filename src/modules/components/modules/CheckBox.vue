<script setup lang="ts">
import { onMounted, ref, useSlots, onUnmounted, reactive, computed, watch } from 'vue'

import type { OptionItem } from '@/modules/components/types/item'
import { useCssVar } from '@/modules/components/utils/css-var'
import { watchDOM } from '@/modules/components/utils/dom'
import { createWindowManager, type WindowManager } from '@/modules/components/utils/window'

import Card from './modules/Card'
import Menu, { type MenuInstance } from './modules/Menu/index.vue'

interface Props {
  /** 输入框提示词 */
  placeholder?: string
  /** 移动端键盘回车图标 */
  enterkeyhint?: 'enter' | 'search' | 'done' | 'go' | 'next' | 'previous' | 'send'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 选项 */
  options?: OptionItem[]
  /** 是否启用选项过滤（输入文字时过滤选项） */
  filter?: boolean
  /** 弹窗 z-index */
  zIndex?: number
  /** 回车事件 */
  onEnter?: () => void
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  readonly: false,
  options: () => [],
  filter: false,
})
/** 值 */
const selectedValue = defineModel<string[]>('value', { required: true })
/** 警告 */
const warning = defineModel<boolean>('warning', { default: false })

// 输入框展示文本：输入时显示过滤关键词，否则显示已选中项
const keyword = ref('')
const showValue = computed<string>(() =>
  menuManager.value?.visible
    ? keyword.value
    : selectedValue.value.length > 0
      ? `已选择 ${selectedValue.value.length} 项`
      : '',
)

// 初始化
const inputContainerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const slots = useSlots()
const style = reactive({
  inputContainer: {
    width: 0,
    height: 0,
  },
  input: {
    height: 0,
    get paddingLeft() {
      return slots.default ? style.inputContainer.height : style.inputContainer.height / 2
    },
  },
})
let cleanup: () => void
onMounted(() => {
  if (!inputContainerRef.value) return
  cleanup = watchDOM(inputContainerRef.value, ({ width, height }) => {
    style.inputContainer.width = width
    style.inputContainer.height = height
    style.input.height = height - 2
  })
  useCssVar(inputContainerRef.value, style)
})
onUnmounted(() => cleanup())

// 中文输入法下回车防止搜索
let isComposing = false
const compositionend = () => {
  setTimeout(() => {
    isComposing = false
  }, 10)
}
const compositionstart = () => {
  isComposing = true
}

// 菜单
const menuRef = ref<HTMLElement | null>(null)
const menuManager = ref<WindowManager | null>(null)
onMounted(() => {
  if (!inputRef.value) return
  menuManager.value = createWindowManager(inputRef.value, menuRef)
})
onUnmounted(() => {
  menuManager.value?.cleanup()
})
const collectLeafNames = (options: OptionItem[]): string[] =>
  options.map((option) => (option.options ? collectLeafNames(option.options) : option.name)).flat()
const checkState = (option: OptionItem): 0 | 1 | 2 => {
  if (!option.options) return selectedValue.value.includes(option.name) ? 2 : 0
  const leaves = collectLeafNames(option.options)
  const selectedCount = leaves.filter((name) => selectedValue.value.includes(name)).length
  if (selectedCount === 0) return 0
  return selectedCount === leaves.length ? 2 : 1
}
const onOptionClick = (option: OptionItem) => {
  inputRef.value?.focus()
  const leaves = option.options ? collectLeafNames(option.options) : [option.name]
  const leafSet = new Set(leaves)
  selectedValue.value =
    checkState(option) === 2
      ? selectedValue.value.filter((name) => !leafSet.has(name))
      : [...new Set([...selectedValue.value, ...leaves])]
}

// 过滤
const filterOptions = (options: OptionItem[], keyword: string): OptionItem[] =>
  options.reduce<OptionItem[]>((acc, option) => {
    if (option.name.includes(keyword)) {
      acc.push(option)
    } else if (option.options) {
      const children = filterOptions(option.options, keyword)
      if (children.length > 0) {
        acc.push({ ...option, options: children })
      }
    }
    return acc
  }, [])
const filteredOptions = computed<OptionItem[]>(() => {
  const text = keyword.value.trim()
  return text ? filterOptions(props.options, text) : props.options
})
const showingOptions = computed<OptionItem[]>(() =>
  props.filter ? filteredOptions.value : props.options,
)

// 回车
const enter = () => {
  if (isComposing) return
  props.onEnter?.()
}

// Tab 补全
const tab = () => {
  if (!menuManager.value || !keyword.value) return
  const leaves = collectLeafNames(filteredOptions.value)
  selectedValue.value = [...leaves.filter((leave) => leave.includes(keyword.value))]
}

// 清空
const clear = () => {
  selectedValue.value = []
  keyword.value = ''
  inputRef.value?.focus()
  menuManager.value?.open()
}

// 选中项变化时自动清除警告
watch(selectedValue, () => {
  warning.value = false
})

// 暴露
defineExpose({
  focus: () => {
    inputRef.value?.focus()
    menuManager.value?.open()
  },
  blur: () => {
    inputRef.value?.blur()
    menuManager.value?.close()
  },
  select: () => inputRef.value?.select(),
})

// 暴露插槽
defineSlots<{
  default: () => void
}>()
</script>

<template>
  <Card
    :class="$style.inputContainer"
    :ref="(el) => (inputContainerRef = (el as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <div :class="[$style.icon, $style.custom]" v-if="$slots.default">
      <slot></slot>
    </div>
    <input
      :class="$style.input"
      ref="inputRef"
      :style="{ outline: warning ? '3px solid var(--lovelymai-color-red-200)' : '' }"
      type="text"
      :value="showValue"
      @input="(e) => (keyword = (e.target as HTMLInputElement).value)"
      :placeholder="props.placeholder ?? '选择...'"
      :enterkeyhint="props.enterkeyhint"
      :disabled="props.disabled"
      :readonly="props.readonly"
      @keydown.enter.prevent="enter"
      @keydown.tab.prevent="tab"
      @compositionstart="compositionstart"
      @compositionend="compositionend"
    />
    <div :class="[$style.icon, $style.clear]">
      <span
        class="lovelymai lovely-clear"
        v-show="!props.disabled && selectedValue.length > 0"
        @pointerup.stop="() => clear()"
      ></span>
    </div>
    <Menu
      :ref="(ins) => (menuRef = (ins as MenuInstance | null)?.root ?? null)"
      :visible="menuManager?.visible ?? false"
      :position="menuManager?.position ?? [0, 0]"
      :options="showingOptions"
      :min-width="style.inputContainer.width + 'px'"
      :z-index="props.zIndex"
      :on-option-click="onOptionClick"
      v-slot="{ item }"
    >
      <span class="lovelymai lovely-horizontal" v-if="checkState(item) === 1"></span>
      <span class="lovelymai lovely-check" v-else-if="checkState(item) === 2"></span>
    </Menu>
  </Card>
</template>

<style module>
.inputContainer {
  display: flex;
  position: relative;
  height: 35px;
  border-radius: calc(var(--inputContainer-height) * 0.5px);
  font-size: 14px;
  font-weight: 400;
  --clear-color: var(--lovelymai-color-gray-300);
  --placeholder-color: var(--lovelymai-color-gray-400);
}

.icon {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  width: calc(var(--input-height) * 1px);
  height: 100%;
  font-size: calc(var(--input-height) * 0.5px);
  color: var(--lovelymai-color-gray-500);
  pointer-events: none;
}

.icon.custom {
  left: 0;
}

.icon.clear {
  right: 0;
}

.input {
  flex: 1;
  min-width: 0;
  padding-left: calc(var(--input-paddingLeft) * 1px);
  padding-right: calc(var(--input-height) * 1px);
  background-color: transparent;
  border: none;
  border-radius: calc(var(--input-height) * 0.5px);
  font-size: inherit;
  font-weight: inherit;
}

.input {
  caret-color: var(--lovelymai-color-blue-200);
  outline: 0px solid transparent;
  transition: outline 0.2s ease;
}

.input::placeholder {
  color: var(--placeholder-color);
}

.input:focus {
  outline: 3px solid var(--lovelymai-color-blue-100);
}
</style>
<style scoped>
.lovely-clear {
  font-size: calc(var(--input-height) * 0.5px);
  color: var(--clear-color);
  cursor: pointer;
  pointer-events: auto;
}

.lovely-horizontal,
.lovely-check {
  font-size: 16px;
}
</style>
