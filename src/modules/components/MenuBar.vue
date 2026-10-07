<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'

import type { Item } from './types/item'
import { useCssVar } from '@/modules/components/utils/css-var'
import { watchDOM } from '@/modules/components/utils/dom'

import Card from './modules/Card'

type MenuItem = Item & {
  /** 是否禁用 */
  disabled?: boolean
}
interface Props {
  /** 菜单 */
  menus: MenuItem[]
  /** 菜单点击事件 */
  onMenuClick?: (menu: MenuItem, index: number) => void
}
const props = defineProps<Props>()

// 初始化
const menubarRef = ref<HTMLElement | null>(null)
const style = reactive({
  menubar: {
    'border-radius': '0',
  },
})
let cleanup: (() => void) | undefined
onMounted(() => {
  if (!menubarRef.value) return
  cleanup = watchDOM(menubarRef.value, ({ width, height }) => {
    const shorter = Math.min(width, height)
    style.menubar['border-radius'] = `${shorter / 2}px`
  })
  useCssVar(menubarRef.value, style)
})
onUnmounted(() => {
  cleanup?.()
})

// 暴露插槽
defineSlots<{
  default: (props: { menu: MenuItem; index: number }) => void
}>()
</script>

<template>
  <Card
    :class="$style.menubar"
    :ref="(el) => (menubarRef = (el as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <ul :class="$style.menus">
      <li
        :class="[$style.menu, { [$style.disabled]: menu.disabled }]"
        v-for="(menu, index) in props.menus"
        @click.stop="() => props.onMenuClick?.(menu, index)"
      >
        <slot :menu="menu" :index="index"></slot>
      </li>
    </ul>
  </Card>
</template>

<style module>
.menubar {
  padding: 3px;
  border-radius: var(--menubar-border-radius);
  user-select: none;
  -webkit-user-select: none;
}

.menus {
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.menus .menu {
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  cursor: pointer;
}

.menus .menu.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (hover: hover) {
  .menu:not(.disabled):hover {
    background-color: var(--lovelymai-color-gray-150);
  }
}
</style>
