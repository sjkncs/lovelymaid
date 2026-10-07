<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import type { OptionItem } from './types/item'
import { createWindowManager, type WindowManager } from '@/modules/components/utils/window'

import Menu, { type MenuInstance } from './modules/Menu'

interface Props {
  /** 选项配置 */
  options: OptionItem[]
  /** 弹窗 z-index */
  zIndex?: number
  /** 选项点击事件 */
  onOptionClick?: (option: OptionItem, index: number) => void
}
const props = defineProps<Props>()

// 菜单
const selectRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuManager = ref<WindowManager | null>(null)
onMounted(() => {
  if (!selectRef.value) return
  menuManager.value = createWindowManager(selectRef.value, menuRef)
})
onUnmounted(() => {
  menuManager.value?.cleanup()
})
const onOptionClick = (option: OptionItem, index: number) => {
  props.onOptionClick?.(option, index)
  menuManager.value?.close()
}

// 暴露插槽
defineSlots<{
  default: () => void
  item: (props: { item: OptionItem; index: number }) => void
}>()
</script>

<template>
  <div :class="$style.select" ref="selectRef">
    <slot>
      <div :class="['lovelymai', 'lovely-ellipsis', $style.ellipsis]"></div>
    </slot>
    <Menu
      :ref="(ins) => (menuRef = (ins as MenuInstance | null)?.root ?? null)"
      :visible="menuManager?.visible ?? false"
      :position="menuManager?.position ?? [0, 0]"
      :z-index="props.zIndex"
      :options="props.options"
      :on-option-click="onOptionClick"
      v-slot="{ item, index }"
    >
      <slot name="item" :item="item" :index="index"></slot>
    </Menu>
  </div>
</template>

<style module>
.ellipsis {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  font-size: inherit;
  cursor: pointer;
}
</style>
