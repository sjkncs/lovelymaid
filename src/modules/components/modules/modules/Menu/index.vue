<script setup lang="ts">
import { inject, onUnmounted, provide, reactive, ref, watch, nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import type { MenuInstance, Props } from './types'
import type { OptionItem } from '@/modules/components/types/item'
import { useCssVar, type StyleObject } from '@/modules/components/utils/css-var'
import type { WindowManager } from '@/modules/components/utils/window'
import { createSubMenuManager } from './services/sub-menu'

import Menu from './index.vue'

const props = withDefaults(defineProps<Props>(), {
  zIndex: 0,
})

// 子菜单
const isSubMenu = inject('menu-is-sub', false)
provide('menu-is-sub', true)
const menuRef = ref<HTMLElement | null>(null)
const submenuInstances = ref<Record<string, MenuInstance | null>>({})
const submenuManagers = ref<Record<string, WindowManager>>({})
const initSubManagers = async () => {
  await nextTick()
  if (!menuRef.value) return
  menuRef.value.querySelectorAll('[data-has-children="true"]').forEach((el) => {
    const index = Number((el as HTMLElement).dataset.index)
    if (submenuManagers.value[index] || !submenuInstances.value[index]) return
    submenuManagers.value[index] = createSubMenuManager(
      el as HTMLElement,
      submenuInstances.value[index],
    )
  })
}
const clearSubManagers = () => {
  Object.values(submenuManagers.value).forEach((manager) => manager.cleanup())
  submenuManagers.value = {}
}
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      initSubManagers()
    } else {
      clearSubManagers()
    }
  },
  { immediate: true },
)
watch(
  () => props.options,
  () => {
    if (props.visible) {
      clearSubManagers()
      initSubManagers()
    }
  },
  { deep: true },
)
onUnmounted(() => {
  clearSubManagers()
})

// 悬浮高亮
const itemsRef = ref<(HTMLElement | null)[]>([])
const styles = reactive<Record<number, StyleObject>>({})
const setItemRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  const item = el as HTMLElement | null
  itemsRef.value[index] = item
  if (item) {
    if (!styles[index]) {
      styles[index] = {
        item: {
          'background-color': 'transparent',
          color: '#000',
        },
      }
      useCssVar(item, styles[index])
    }
  } else {
    delete styles[index]
  }
}
const onItemEnter = (index: number) => {
  const style = styles[index]
  if (!style) return
  style.item['background-color'] = 'var(--lovelymai-color-blue-200)'
  style.item.color = '#fff'
}
const onItemLeave = (index: number) => {
  const style = styles[index]
  if (!style) return
  style.item['background-color'] = 'transparent'
  style.item.color = '#000'
}

// 暴露菜单
export type { MenuInstance }
defineExpose<MenuInstance>({
  get root() {
    return menuRef.value
  },
  props,
})

// 暴露插槽
defineSlots<{
  default: (props: { item: OptionItem; index: number }) => void
}>()
</script>

<template>
  <teleport to="body" :disabled="isSubMenu">
    <transition name="lovelymai-fade-leave">
      <ul
        :class="$style.menu"
        ref="menuRef"
        v-if="props.visible && props.options.length > 0"
        :style="{
          left: `${props.position[0]}px`,
          top: `${props.position[1]}px`,
          zIndex: props.zIndex,
          minWidth: props.minWidth ?? '',
        }"
        @pointerup.stop
        @click.stop
      >
        <li
          :class="$style.item"
          v-for="(item, index) in props.options"
          :key="item.id"
          :ref="setItemRef(index)"
          :data-index="index"
          :data-has-children="item.options ? 'true' : 'false'"
          @pointerup.stop="() => props.onOptionClick?.(item, index)"
          @pointerenter="() => onItemEnter(index)"
          @pointerleave="() => onItemLeave(index)"
        >
          <div :class="$style.left">
            <slot :item="item" :index="index"></slot>
            <span :class="$style.text">{{ item.name }}</span>
          </div>
          <span class="lovelymai lovely-right-arrow" v-if="item.options"></span>
          <Menu
            v-if="item.options"
            :ref="(ins) => (submenuInstances[index] = ins as MenuInstance | null)"
            :visible="submenuManagers[index]?.visible ?? false"
            :position="submenuManagers[index]?.position ?? [0, 0]"
            :options="item.options"
            :on-option-click="props.onOptionClick"
            v-slot="{ item, index }"
          >
            <slot :item="item" :index="index"></slot>
          </Menu>
        </li>
      </ul>
    </transition>
  </teleport>
</template>

<style module>
.menu {
  position: absolute;
  padding: 4px;
  background-color: var(--lovelymai-color-gray-150);
  border: 1px solid #fff;
  border-radius: 10px;
  outline: 0.5px solid var(--lovelymai-color-gray-250);
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.3);
  user-select: none;
  -webkit-user-select: none;
}

.menu .item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  position: relative;
  z-index: 0;
  padding: 5px;
  height: 28px;
  background-color: var(--item-background-color);
  border-radius: 8px;
  color: var(--item-color);
  cursor: pointer;
}

.menu .item .left {
  display: flex;
  gap: 5px;
}

.menu .item .left .text {
  font-size: 12px;
  font-weight: 450;
  line-height: 18px;
  white-space: nowrap;
}
</style>
<style scoped>
.lovely-right-arrow {
  font-weight: 600;
  transform: translateY(1px);
}
</style>
