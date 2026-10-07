<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import type { Item } from './types/item'
import {
  createActivationManager,
  type ActivationManager,
} from '@/modules/components/utils/activation'
import { createWindowManager, type WindowManager } from '@/modules/components/utils/window'

import Card from './modules/Card'
import Loading from './modules/Loading'
import Menu, { type MenuInstance } from './modules/Menu'

export type ColumnConfig = {
  id: string | number
  name: string
  prop: string
  width?: string
}
export type SortConfig = {
  /** 列 id */
  id: string | number
  /** 排序规则 */
  order: 'asc' | 'desc'
}
interface Props {
  /** 列 */
  columns: ColumnConfig[]
  /** 行 */
  rows: Item[]
  /** 弹窗 z-index */
  zIndex?: number
  /** 加载状态 */
  loading?: boolean
}
const props = defineProps<Props>()
/** 排序 */
const sort = defineModel<SortConfig>('sort')
/** 激活项 id */
const activeIds = defineModel<Set<string | number>>('active-ids', { default: () => new Set() })

// 表头排序
const onHeaderClick = (column: ColumnConfig) => {
  const valid = props.rows.every(
    (row) => typeof row[column.prop] === 'string' || typeof row[column.prop] === 'number',
  )
  if (!valid) return
  sort.value = { id: column.id, order: sort.value?.order === 'asc' ? 'desc' : 'asc' }
}
const sortedRows = computed<Item[]>(() => {
  if (!sort.value) return props.rows
  const sortProp = props.columns.find((column) => column.id === sort.value!.id)!.prop
  const valid = props.rows.every(
    (row) => typeof row[sortProp] === 'string' || typeof row[sortProp] === 'number',
  )
  if (!valid) return props.rows
  return [...props.rows].sort((a, b) => {
    if (sort.value!.order === 'asc') {
      return String(a[sortProp]).localeCompare(String(b[sortProp]), undefined, { numeric: true })
    } else {
      return String(b[sortProp]).localeCompare(String(a[sortProp]), undefined, { numeric: true })
    }
  })
})

// 列表项激活
const listRef = ref<HTMLElement | null>(null)
const activationManager = ref<ActivationManager | null>(null)
onMounted(() => {
  if (!listRef.value) return
  activationManager.value = createActivationManager(sortedRows, activeIds, listRef.value)
})
onUnmounted(() => {
  activationManager.value?.cleanup()
})
const getBorderRadius = (index: number): string => {
  if (!activationManager.value?.activeIndexes.has(index)) return '8px'
  const hasPrev = activationManager.value.activeIndexes.has(index - 1)
  const hasNext = activationManager.value.activeIndexes.has(index + 1)
  if (!hasPrev && !hasNext) return '8px'
  if (hasPrev && hasNext) return '0'
  if (!hasPrev && hasNext) return '8px 8px 0 0'
  return '0 0 8px 8px'
}

// 启用/关闭排序
const headerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuManager = ref<WindowManager | null>(null)
onMounted(() => {
  if (!headerRef.value) return
  menuManager.value = createWindowManager(headerRef.value, menuRef, 'flex', 'contextmenu')
})
onUnmounted(() => {
  menuManager.value?.cleanup()
})

// 暴露插槽
defineSlots<{
  default: (props: { row: Item; column: ColumnConfig }) => void
}>()
</script>

<template>
  <Card :class="$style.table">
    <ul :class="$style.header" ref="headerRef">
      <li
        :class="$style.column"
        v-for="column in props.columns"
        :key="column.id"
        :style="{
          width: column.width ?? '200px',
          color: sort?.id === column.id ? '#000' : 'var(--lovelymai-color-gray-300)',
        }"
        @click.stop="() => onHeaderClick(column)"
      >
        <span :class="$style.text">{{ column.name }}</span>
        <span
          class="lovelymai lovely-down-arrow"
          v-show="column.id === sort?.id"
          :style="{ transform: sort?.order === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)' }"
        ></span>
      </li>
      <Menu
        :ref="(ins) => (menuRef = (ins as MenuInstance | null)?.root ?? null)"
        :visible="menuManager?.visible ?? false"
        :position="menuManager?.position ?? [0, 0]"
        :z-index="props.zIndex"
        :options="[{ id: '1', name: '关闭排序' }]"
        :on-option-click="
          () => {
            sort = undefined
            menuManager?.close()
          }
        "
      />
    </ul>
    <ul :class="$style.list" ref="listRef">
      <li
        :class="$style.row"
        v-for="(row, index) in sortedRows"
        :key="row.id"
        :style="{
          backgroundColor: activationManager?.activeIndexes.has(index)
            ? 'var(--lovelymai-color-blue-450)'
            : '',
          borderRadius: getBorderRadius(index),
        }"
      >
        <span
          :class="$style.cell"
          v-for="column in props.columns"
          :key="column.id"
          :style="{
            width: column.width ?? '200px',
            color: activationManager?.activeIndexes.has(index)
              ? sort?.id === column.id
                ? '#fff'
                : 'var(--lovelymai-color-blue-50)'
              : sort?.id === column.id
                ? '#000'
                : 'var(--lovelymai-color-gray-300)',
          }"
        >
          <slot :row="row" :column="column">{{ row[column.prop] }}</slot>
        </span>
      </li>
    </ul>
    <Loading :loading="props.loading" :z-index="1" />
  </Card>
</template>

<style module>
.table {
  position: relative;
  z-index: 0;
  padding: 12px;
  border-radius: 16px;
  overflow: auto;
  scrollbar-width: thin;
}

.header {
  display: flex;
  margin-bottom: 4px;
  width: max-content;
  height: 28px;
  border-bottom: 0.5px solid var(--lovelymai-color-gray-300);
  user-select: none;
  -webkit-user-select: none;
}

.header .column {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
}

.header .column:not(:last-child) {
  border-right: 0.5px solid var(--lovelymai-color-gray-300);
}

.header .column .text {
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list .row {
  display: flex;
  width: max-content;
  height: 35px;
}

.list .row:nth-child(even) {
  background-color: var(--lovelymai-color-gray-150);
}

.list .row .cell {
  flex-shrink: 0;
  padding: 0 8px;
  font-size: 16px;
  line-height: 35px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
<style scoped>
.lovely-down-arrow {
  font-size: 12px;
  color: var(--lovelymai-color-gray-300);
  font-weight: 700;
}
</style>
