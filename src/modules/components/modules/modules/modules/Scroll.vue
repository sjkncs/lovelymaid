<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { ListItem } from '@/modules/components/types/item'
import { debounce } from '@/modules/components/utils/function'

interface Props {
  /** 列表 */
  lists: [ListItem[], ListItem[]]
}
const props = defineProps<Props>()
/** 激活项 */
const activeIds = defineModel<[string | number, string | number]>('active-ids')
watch(
  () => props.lists,
  (newLists) => {
    if (activeIds.value === undefined) {
      activeIds.value = newLists.map((list) => list[0].id) as [string | number, string | number]
    }
  },
  { immediate: true },
)

// 激活 id
const leftRef = ref<HTMLElement | null>(null)
const rightRef = ref<HTMLElement | null>(null)
let stopWatch: (() => void) | undefined
const calculateActiveIds = debounce((el: 'left' | 'right') => {
  let index: number | undefined
  if (el === 'left' && leftRef.value) {
    index = Math.floor(leftRef.value.scrollTop / 24)
    activeIds.value = [props.lists[0][index].id, activeIds.value![1]]
  } else if (el === 'right' && rightRef.value) {
    index = Math.floor(rightRef.value.scrollTop / 24)
    activeIds.value = [activeIds.value![0], props.lists[1][index].id]
  }
}, 100)
onMounted(() => {
  if (!leftRef.value || !rightRef.value) return
  stopWatch = watch(
    [() => props.lists, activeIds],
    ([newLists, newActiveIds]) => {
      leftRef.value!.scrollTop = 24 * newLists[0].findIndex((item) => item.id === newActiveIds![0])
      rightRef.value!.scrollTop = 24 * newLists[1].findIndex((item) => item.id === newActiveIds![1])
    },
    { immediate: true, deep: true },
  )
})
onUnmounted(() => {
  stopWatch?.()
})

// 点击滚动
const scrollToCenter = (container: HTMLElement, index: number) => {
  container.scrollTo({ top: 24 * index, behavior: 'smooth' })
}
const onListClick = (e: MouseEvent, side: 'left' | 'right') => {
  const li = (e.target as HTMLElement).closest('li')
  if (!li) return
  const index = li.dataset.index
  if (index === undefined) return
  const container = side === 'left' ? leftRef.value : rightRef.value
  if (container) {
    scrollToCenter(container, Number(index))
  }
}
</script>

<template>
  <div :class="$style.scroll">
    <div :class="$style.selected"></div>
    <ul
      :class="[$style.list, $style.left]"
      ref="leftRef"
      @scroll="() => calculateActiveIds('left')"
      @click="(e) => onListClick(e, 'left')"
    >
      <li :class="$style.item" v-for="item in Array(3).fill('')">
        <span>{{ item }}</span>
      </li>
      <li :class="$style.item" v-for="(item, index) in props.lists[0]" :data-index="index">
        <span>{{ item.name }}</span>
      </li>
      <li :class="$style.item" v-for="item in Array(3).fill('')">
        <span>{{ item }}</span>
      </li>
    </ul>
    <ul
      :class="[$style.list, $style.right]"
      ref="rightRef"
      @scroll="() => calculateActiveIds('right')"
      @click="(e) => onListClick(e, 'right')"
    >
      <li :class="$style.item" v-for="item in Array(3).fill('')">
        <span>{{ item }}</span>
      </li>
      <li :class="$style.item" v-for="(item, index) in props.lists[1]" :data-index="index">
        <span>{{ item.name }}</span>
      </li>
      <li :class="$style.item" v-for="item in Array(3).fill('')">
        <span>{{ item }}</span>
      </li>
    </ul>
  </div>
</template>

<style module>
.scroll {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 0;
  padding: 16px 0;
  height: 200px;
}

.selected {
  position: absolute;
  left: 0;
  top: calc(50% - 12px);
  z-index: 0;
  width: 100%;
  height: 24px;
  background-color: var(--lovelymai-color-gray-150);
  border-radius: 12px;
}

.list {
  position: relative;
  z-index: 1;
  width: 50%;
  height: 168px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  scroll-snap-type: y mandatory;
}

.list.left {
  padding-left: 5px;
}

.list.right {
  padding: 0 5px 0 10px;
}

.list .item {
  display: flex;
  height: 24px;
  font-size: 16px;
  line-height: 24px;
  scroll-snap-align: start;
}

.list.left .item {
  justify-content: flex-end;
}

.list.right .item {
  justify-content: flex-start;
}
</style>
