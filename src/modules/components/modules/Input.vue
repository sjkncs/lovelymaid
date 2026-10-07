<script setup lang="ts">
import { onMounted, ref, useSlots, onUnmounted, reactive, computed, watch } from 'vue'

import type { EnterKeyHint } from './types/input'
import type { OptionItem, DateItem } from '@/modules/components/types/item'
import { useCssVar } from '@/modules/components/utils/css-var'
import { formatDate, verifyDate } from '@/modules/components/utils/date'
import { watchDOM } from '@/modules/components/utils/dom'
import { createWindowManager, type WindowManager } from '@/modules/components/utils/window'

import Card from './modules/Card'
import DateWindow, { type DateInstance } from './modules/Date/index.vue'
import Menu, { type MenuInstance } from './modules/Menu/index.vue'

interface Props {
  /** 输入框类型 */
  type?: 'text' | 'password' | 'number' | 'radio' | 'date'
  /** 输入框提示词 */
  placeholder?: string
  /** 移动端键盘回车图标 */
  enterkeyhint?: EnterKeyHint
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 选项 (仅 type 为 radio 时有效) */
  options?: OptionItem[]
  /** 是否启用选项过滤 (仅 type 为 radio 时有效) */
  filter?: boolean
  /** 格式化 (仅 type 为 date 时有效) */
  format?: (date: DateItem) => string
  /** 是否启用校验 (仅 type 为 radio 或 date 时有效) */
  verify?: boolean
  /** 弹窗 z-index（仅 type 为 radio 或 date 时有效）*/
  zIndex?: number
  /** 回车事件 */
  onEnter?: () => void
}
const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  options: () => [],
  filter: false,
  format: ([year, month, day]: DateItem): string =>
    `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
  verify: true,
})
/** 值 */
const inputValue = defineModel<string>('value', { required: true })
/** 警告 */
const warning = defineModel<boolean>('warning', { default: false })

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
let isSelecting: boolean = false
let isFocused: boolean = false
onMounted(() => {
  if (!inputRef.value || props.type !== 'radio') return
  menuManager.value = createWindowManager(inputRef.value, menuRef)
  inputRef.value.addEventListener('focus', () => {
    isFocused = true
  })
  inputRef.value.addEventListener('blur', () => {
    isFocused = false
  })
})
onUnmounted(() => {
  menuManager.value?.cleanup()
})
const onOptionClick = (option: OptionItem) => {
  inputRef.value?.focus()
  if (option.options) return
  isSelecting = true
  inputValue.value = option.name
  menuManager.value?.close()
}
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
  const keyword = inputValue.value.trim()
  return keyword ? filterOptions(props.options, keyword) : props.options
})
const showingOptions = computed<OptionItem[]>(() =>
  props.filter ? filteredOptions.value : props.options,
)
watch(showingOptions, () => {
  if (!menuManager.value) return
  if (isSelecting) {
    isSelecting = false
  } else {
    if (!isFocused) return
    menuManager.value.open()
  }
})

// 日历
const date = ref<DateItem>(formatDate(Date.now()))
const dateRef = ref<HTMLElement | null>(null)
const dateManager = ref<WindowManager | null>(null)
onMounted(() => {
  if (!inputRef.value || props.type !== 'date') return
  dateManager.value = createWindowManager(inputRef.value, dateRef)
})
onUnmounted(() => {
  dateManager.value?.cleanup()
})
const onDateClick = () => {
  inputRef.value?.focus()
  inputValue.value = props.format(date.value)
  dateManager.value?.close()
}

// 回车
const enter = () => {
  if (isComposing) return
  props.onEnter?.()
}

// 清空
const clear = () => {
  inputValue.value = ''
  inputRef.value?.focus()
  menuManager.value?.open()
  dateManager.value?.open()
}

// 非弹窗类时输入自动清除警告
watch(inputValue, () => {
  if (props.type === 'radio' || props.type === 'date') return
  warning.value = false
})

// Tab 补全
const collectLeafNames = (options: OptionItem[]): string[] =>
  options.map((option) => (option.options ? collectLeafNames(option.options) : option.name)).flat()
const tab = () => {
  if (!inputValue.value) return
  if (props.type === 'radio') {
    if (!menuManager.value) return
    const leaves = collectLeafNames(filteredOptions.value)
    if (leaves.length !== 1) return
    isSelecting = true
    inputValue.value = leaves[0]
    menuManager.value.close()
  } else if (props.type === 'date') {
    if (!dateManager.value) return
    const match = inputValue.value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!match) return
    const newDate: DateItem = [Number(match[1]), Number(match[2]), Number(match[3])]
    date.value = newDate
    inputValue.value = props.format(newDate)
    dateManager.value.close()
  }
}

// 校验是否通过
const verified = computed<boolean>(() => {
  if (!inputValue.value || !props.verify) return true
  if (props.type === 'radio') {
    const isValidOption = (options: OptionItem[]): boolean =>
      options.some(
        (option) =>
          option.name === inputValue.value || (!!option.options && isValidOption(option.options)),
      )
    return isValidOption(props.options)
  }
  if (props.type === 'date') {
    const match = inputValue.value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!match) return false
    const dateItem: DateItem = [Number(match[1]), Number(match[2]), Number(match[3])]
    return verifyDate(dateItem) && props.format(dateItem) === inputValue.value
  }
  return true
})
watch(inputValue, () => {
  if (props.type !== 'radio' && props.type !== 'date') return
  if (verified.value) {
    warning.value = false
  } else {
    warning.value = true
  }
})

// 暴露
defineExpose({
  verification: verified,
  focus: () => {
    inputRef.value?.focus()
    menuManager.value?.open()
    dateManager.value?.open()
  },
  blur: () => {
    inputRef.value?.blur()
    menuManager.value?.close()
    dateManager.value?.close()
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
    :ref="(ins) => (inputContainerRef = (ins as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <div :class="[$style.icon, $style.custom]" v-if="$slots.default">
      <slot></slot>
    </div>
    <input
      :class="$style.input"
      ref="inputRef"
      :style="{ outline: warning ? '3px solid var(--lovelymai-color-red-200)' : '' }"
      :type="props.type === 'radio' || props.type === 'date' ? 'text' : props.type"
      :value="inputValue"
      @input="(e) => (inputValue = (e.target as HTMLInputElement).value)"
      :placeholder="
        props.placeholder ??
        (props.type === 'radio' || props.type === 'date' ? '选择...' : '输入...')
      "
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
        v-show="!props.disabled && inputValue"
        @pointerup.stop="() => clear()"
      ></span>
    </div>
    <Menu
      :ref="(ins) => (menuRef = (ins as MenuInstance | null)?.root ?? null)"
      v-if="props.type === 'radio'"
      :visible="menuManager?.visible ?? false"
      :position="menuManager?.position ?? [0, 0]"
      :options="showingOptions"
      :min-width="style.inputContainer.width + 'px'"
      :z-index="props.zIndex"
      :on-option-click="onOptionClick"
    />
    <DateWindow
      :ref="(ins) => (dateRef = (ins as DateInstance | null)?.root ?? null)"
      v-if="props.type === 'date'"
      :visible="dateManager?.visible ?? false"
      :position="dateManager?.position ?? [0, 0]"
      v-model:date="date"
      :z-index="props.zIndex"
      :on-date-click="onDateClick"
    />
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
  color: var(--lovelymai-color-gray-400);
}

.input:focus {
  outline: 3px solid var(--lovelymai-color-blue-100);
}

.input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
<style scoped>
.lovely-clear {
  font-size: calc(var(--input-height) * 0.5px);
  color: var(--lovelymai-color-gray-300);
  cursor: pointer;
  pointer-events: auto;
}
</style>
