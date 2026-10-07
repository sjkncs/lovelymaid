<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'

import { useCssVar } from '@/modules/components/utils/css-var'
import { watchDOM } from '@/modules/components/utils/dom'

interface Props {
  /** 类型 */
  type?: 'common' | 'glass'
  /** 按钮点击事件 */
  onClick?: () => void
  /** 悬停提示 */
  title?: string
}
const props = withDefaults(defineProps<Props>(), {
  type: 'common',
  title: '',
})

// 初始化
const buttonRef = ref<HTMLElement | null>(null)
const style = reactive({
  button: {
    'border-radius': '0',
    'font-size': '0',
  },
})
let cleanup: (() => void) | undefined
onMounted(() => {
  if (!buttonRef.value) return
  cleanup = watchDOM(buttonRef.value, ({ width, height }) => {
    const shorter = Math.min(width, height)
    style.button['border-radius'] = `${shorter / 2}px`
    style.button['font-size'] = `${shorter / 2}px`
  })
  useCssVar(buttonRef.value, style)
})
onUnmounted(() => {
  cleanup?.()
})

// 暴露插槽
defineSlots<{
  default: () => void
}>()
</script>

<template>
  <div
    :class="[
      $style.button,
      {
        'lovelymai-glass-container': props.type === 'glass',
        [$style.common]: props.type === 'common',
      },
    ]"
    ref="buttonRef"
    :title="props.title"
    @click.stop="() => props.onClick?.()"
  >
    <slot></slot>
  </div>
</template>

<style module>
.button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--button-border-radius);
  font-size: var(--button-font-size);
  font-weight: 500;
  color: var(--lovelymai-color-gray-500);
  transition: transform 0.2s;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  --background-color: var(--lovelymai-color-blue-200);
}

.button.common {
  background-color: var(--background-color);
}

.button.lovelymai-glass-container:active {
  background-color: #fff;
}

.button:active {
  transform: scale(1.2);
}
</style>
