<script setup lang="ts">
import { ref, nextTick, onMounted, watch, computed, reactive } from 'vue'

import type { ListItem } from './types/item'
import { useCssVar } from '@/modules/components/utils/css-var'
import { watchDOM } from '@/modules/components/utils/dom'
import { getSlideCount } from '@/modules/components/utils/slide'

interface Props {
  /** 标题 */
  title?: string
  /** 列表 */
  list: ListItem[]
  /** 头部点击事件 */
  onHeaderClick?: () => void
  /** 列表项点击事件 */
  onItemClick?: (item: ListItem, index: number) => void
}
const props = withDefaults(defineProps<Props>(), {
  title: '标题',
})
/** 是否展开 */
const isOpen = defineModel<boolean>('open', { required: true })
/** 激活项 id */
const activeId = defineModel<string | number>('active-id')

// 初始化
const foldlistRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const listHeight = ref<number>(0)
const style = reactive({
  container: {
    get height() {
      return isOpen.value ? `${listHeight.value}px` : '0px'
    },
  },
})
onMounted(() => {
  if (!foldlistRef.value || !listRef.value) return
  watchDOM(listRef.value, ({ height }) => {
    listHeight.value = height
  })
  useCssVar(foldlistRef.value, style)
})

// 列表项动画
const slideCount = ref<number[]>([])
const slideAnimating = ref<boolean>(false)
const oldlist = ref<{ id: string | number; name: string }[]>(props.list)
const listSnapshot = computed<string>(() => props.list.map((item) => item.id).join(','))
watch(listSnapshot, async (newSnapshot, oldSnapshot) => {
  if (newSnapshot === oldSnapshot) return
  slideAnimating.value = false
  slideCount.value = getSlideCount(props.list, oldlist.value)
  await nextTick()
  slideAnimating.value = true
  oldlist.value = [...props.list]
})

// 列表项点击事件
const onItemClick = (item: ListItem, index: number) => {
  activeId.value = item.id
  props.onItemClick?.(item, index)
}

// 暴露插槽
defineSlots<{
  default: (props: { item: ListItem; index: number }) => void
}>()
</script>

<template>
  <div :class="$style.foldlist" ref="foldlistRef">
    <div :class="$style.header" @click="onHeaderClick">
      <span :class="$style.title">
        {{ props.title }}
      </span>
      <span
        class="lovelymai lovely-right-arrow"
        :style="{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }"
        :title="isOpen ? '收起列表' : '展开列表'"
        @click.stop="() => (isOpen = !isOpen)"
      ></span>
    </div>
    <div :class="$style.container">
      <ul :class="[$style.list, { [$style.close]: !isOpen }]" ref="listRef">
        <li
          :class="[
            $style.item,
            { [$style.active]: item.id === activeId, [$style.slideAnimation]: slideAnimating },
          ]"
          v-for="(item, index) in props.list"
          :key="item.id"
          :style="{
            '--translateY': `${slideCount[index] * 100}%`,
            'z-index': `${props.list.length - index}`,
          }"
          @click.stop="() => onItemClick(item, index)"
          @animationend="() => (slideAnimating = false)"
        >
          <slot :item="item" :index="index">{{ item.name }}</slot>
        </li>
      </ul>
    </div>
  </div>
</template>

<style module>
.foldlist {
  --header-height: 30px;
  --header-font-size: 12px;
  --header-color: var(--lovelymai-color-gray-300);
  --list-font-size: 14px;
  --list-line-height: 30px;
  --list-color: inherit;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--header-height);
  cursor: pointer;
}

.header .title {
  font-size: var(--header-font-size);
  color: var(--header-color);
  font-weight: 500;
}

.container {
  height: var(--container-height);
  overflow: hidden;
  transition: height 0.5s ease;
}

.list {
  transform: translateY(0);
  transition: transform 0.5s ease;
}

.list.close {
  transform: translateY(-100%);
}

.list .item {
  position: relative;
  padding: 0 10px;
  border-radius: 6px;
  font-size: var(--list-font-size);
  line-height: var(--list-line-height);
  color: var(--list-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
}

.list .item.active {
  background-color: var(--lovelymai-color-gray-200);
  color: var(--lovelymai-color-blue-300);
}

@keyframes slideAnimation {
  from {
    transform: translateY(var(--translateY));
  }

  to {
    transform: translateY(0);
  }
}

.slideAnimation {
  animation: slideAnimation 0.5s;
}
</style>

<style scoped>
.lovely-right-arrow {
  font-size: 16px;
  color: var(--header-color);
  font-weight: 700;
  transition: transform 0.3s;
  cursor: pointer;
}
</style>
