<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, useSlots, watch } from 'vue'

import type { FileItem } from './types/file'
import type { EnterKeyHint } from './types/input'
import { useCssVar } from '@/modules/components/utils/css-var'
import { watchDOM } from '@/modules/components/utils/dom'
import { readDirectoryEntries } from '@/modules/components/utils/file'

import Card from './modules/Card'
import File from './modules/File/index.vue'

interface Props {
  /** 最小行数 */
  minrow?: number
  /** 输入框提示词 */
  placeholder?: string
  /** 移动端键盘回车图标 */
  enterkeyhint?: EnterKeyHint
  /** 是否禁用 */
  disabled?: boolean
  /** 回车事件 */
  onEnter?: () => void
  /** 粘贴文件 */
  pasteFile?: boolean
  /** 过滤文件（仅 pasteFile 开启时有效） */
  filterFile?: (files: File[]) => File[]
}
const props = withDefaults(defineProps<Props>(), {
  minrow: 1,
  placeholder: '输入...',
  disabled: false,
  pasteFile: false,
  filterFile: (files: File[]) => files,
})
/** 值 */
const inputValue = defineModel<string>('value', { required: true })
/** 文件 */
const files = defineModel<FileItem[]>('files', { default: () => [] })

// 初始化
const textareaContainerRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const footerRef = ref<HTMLElement | null>(null)
const slots = useSlots()
const style = reactive({
  textarea: {
    get paddingTop() {
      return props.pasteFile && files.value.length > 0 ? 80 + 12 : 12
    },
    paddingBottom: 12,
  },
})
let cleanup: (() => void) | undefined
onMounted(() => {
  if (!textareaContainerRef.value) return
  if (footerRef.value) {
    cleanup = watchDOM(footerRef.value, ({ height }) => {
      style.textarea.paddingBottom = height + 12
    })
  }
  useCssVar(textareaContainerRef.value, style)
})
onUnmounted(() => {
  cleanup?.()
})

// 输入事件
watch([inputValue, files], async () => {
  await nextTick()
  autoResize()
})
const autoResize = () => {
  textareaRef.value!.style.height = 'auto'
  textareaRef.value!.style.height = `${textareaRef.value!.scrollHeight}px`
  textareaRef.value!.scrollTop = textareaRef.value!.scrollHeight
}

// 中文输入法下不触发回车事件
let isComposing = false
const compositionend = () => {
  setTimeout(() => {
    isComposing = false
  }, 10)
}
const compositionstart = () => {
  isComposing = true
}

// 回车事件
const enter = (e: KeyboardEvent) => {
  // 正在打字或按住了 shift 直接无视
  if (isComposing || e.shiftKey) return
  // 普通 enter 才阻止换行+触发回车事件
  e.preventDefault()
  props.onEnter?.()
}

// 文件
const pasteFile = async (e: ClipboardEvent) => {
  if (!props.pasteFile) return
  const items = e.clipboardData?.items
  if (!items?.length) return
  const pastedFiles: File[] = []
  for (const item of [...items]) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.()
      if (entry?.isDirectory) {
        const dirFiles = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
        pastedFiles.push(...dirFiles)
      } else {
        const file = item.getAsFile()
        if (file) {
          pastedFiles.push(file)
        }
      }
    }
  }
  if (!pastedFiles.length) return
  e.preventDefault()
  const filtered = props.filterFile(pastedFiles)
  files.value = [...files.value, ...filtered.map((file) => ({ id: crypto.randomUUID(), file }))]
}
const removeFile = (id: string | number) => {
  files.value = files.value.filter((file) => file.id !== id)
}

// 暴露
defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  select: () => textareaRef.value?.select(),
})

// 暴露插槽
defineSlots<{
  default: () => void
}>()
</script>

<template>
  <Card
    :class="$style.textareaContainer"
    :ref="(el) => (textareaContainerRef = (el as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <div :class="$style.header" v-if="props.pasteFile && files.length > 0">
      <File
        :class="$style.fileContainer"
        v-for="file in files"
        :file="file.file"
        :loading="file.loading"
        :on-close-click="() => removeFile(file.id)"
      />
    </div>
    <textarea
      :class="$style.textarea"
      ref="textareaRef"
      :rows="props.minrow"
      :value="inputValue"
      @input="(e) => (inputValue = (e.target as HTMLTextAreaElement).value)"
      :placeholder="props.placeholder"
      :enterkeyhint="props.enterkeyhint"
      :disabled="props.disabled"
      @keydown.enter="enter"
      @compositionstart="compositionstart"
      @compositionend="compositionend"
      @paste="pasteFile"
    />
    <div :class="$style.footer" v-if="slots.default" ref="footerRef">
      <slot></slot>
    </div>
  </Card>
</template>

<style module>
.textareaContainer {
  position: relative;
  border-radius: 20px;
  max-height: auto;
  font-size: 14px;
  font-weight: 00;
  line-height: 18px;
}

.textarea {
  display: block;
  width: 100%;
  max-height: inherit;
  padding: 12px;
  padding-top: calc(var(--textarea-paddingTop) * 1px);
  padding-bottom: calc(var(--textarea-paddingBottom) * 1px);
  background-color: transparent;
  border: none;
  border-radius: calc(20px - 1px);
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  caret-color: var(--lovelymai-color-blue-200);
  outline: 0px solid transparent;
  transition: outline 0.2s ease;
  resize: none;
  overflow-y: auto;
  scrollbar-width: thin;
}

.textarea::placeholder {
  color: var(--lovelymai-color-gray-400);
}

.textarea:focus {
  outline: 3px solid var(--lovelymai-color-blue-100);
}

.header {
  display: flex;
  gap: 10px;
  position: absolute;
  left: 2px;
  top: 2px;
  width: calc(100% - 2 * 2px);
  height: calc(80px - 2px);
  padding: calc(12px - 2px) calc(12px - 2px) 0 calc(12px - 2px);
  border-radius: calc(20px - 1px - 2px) calc(20px - 1px - 2px) 0 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.header .fileContainer {
  flex-shrink: 0;
  height: 100%;
}

.footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 0 12px 12px 12px;
  pointer-events: none;
}
</style>
