<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, reactive, nextTick } from 'vue'

import { useCssVar } from './utils/css-var'
import { watchDOM } from './utils/dom'
import { debounce } from './utils/function'
import { getLayoutLeft } from './utils/layout-offset'

import Card from './modules/Card'
import Loading from './modules/Loading'

interface Props {
  /** 是否显示 */
  visible?: boolean
  /** 按钮点击事件 */
  onButtonClick?: (newIsOpen: boolean) => void
  /** 加载状态 */
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  visible: true,
})
/** 是否展开 */
const isOpen = defineModel<boolean>('open', { required: true })

// 初始化
const sidebarRef = ref<HTMLElement | null>(null)
const style = reactive({
  sidebar: {
    get translateX() {
      return isOpen.value ? '0' : `${-transformDistance.value}px`
    },
    scale: props.visible ? '1' : '0',
    transition: 'none',
  },
  button: {
    get translateX() {
      return isOpen.value
        ? '0'
        : `${transformDistance.value - (sidebarRef.value?.offsetWidth ?? 0) + 55}px`
    },
  },
})
onMounted(() => {
  if (!sidebarRef.value) return
  useCssVar(sidebarRef.value, style)
})

// 按钮点击事件
const clickButton = () => {
  isOpen.value = !isOpen.value
  props.onButtonClick?.(!isOpen.value)
}

// 计算平移距离
const transformDistance = ref<number>(0)
let cleanup: () => void
const calculateTransform = () => {
  if (!sidebarRef.value) return
  transformDistance.value = getLayoutLeft(sidebarRef.value) + sidebarRef.value.offsetWidth + 10
}
const debounceCalculateTransform = debounce(calculateTransform, 100)
onMounted(() => {
  if (!sidebarRef.value) return
  calculateTransform()
  cleanup = watchDOM(sidebarRef.value, () => {
    debounceCalculateTransform()
  })
  setTimeout(() => {
    style.sidebar.transition = 'transform .5s'
  }, 100)
  window.addEventListener('resize', debounceCalculateTransform)
})
onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', debounceCalculateTransform)
})

// 切换 visilble
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.visible,
  async (newVisible) => {
    clearTimeout(timer)
    style.sidebar.transition = 'transform .3s'
    timer = setTimeout(() => {
      style.sidebar.transition = 'transform .5s'
    }, 300)
    if (newVisible) {
      await nextTick()
      style.sidebar.scale = '1'
    } else {
      style.sidebar.scale = '0'
    }
  },
)

// 暴露插槽
defineSlots<{
  default: () => void
  header: () => void
}>()
</script>

<template>
  <Card
    :class="$style.sidebar"
    :ref="(ins) => (sidebarRef = (ins as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <div :class="$style.header">
      <div :class="$style.text">
        <slot name="header"></slot>
      </div>
      <div
        :class="[$style.button, { [$style.close]: !isOpen }]"
        :title="isOpen ? '收起侧边栏' : '打开侧边栏'"
        @click.stop="() => clickButton()"
      >
        <span class="lovelymai lovely-left-sidebar"></span>
      </div>
    </div>
    <div :class="$style.mask">
      <slot></slot>
      <Loading :loading="props.loading" />
    </div>
  </Card>
</template>

<style module>
.sidebar {
  border-radius: 20px;
  transform: translateX(var(--sidebar-translateX)) scale(var(--sidebar-scale));
  transition: var(--sidebar-transition);
}

.header {
  display: flex;
  align-items: center;
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 50px;
  padding: 0 10px;
}

.header .text {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  line-height: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header .button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 35px;
  height: 30px;
  border: none;
  border-radius: 15px;
  transform: translateX(var(--button-translateX));
  transition:
    transform 0.5s,
    box-shadow 0.5s;
  cursor: pointer;
}

.header .button.close {
  border: 1px solid #fff;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: var(--lovelymai-box-shadow-200);
}

@media (hover: hover) {
  .header .button:hover {
    background-color: var(--lovelymai-color-gray-150);
  }
}

.mask {
  position: relative;
  z-index: 0;
  min-height: 100%;
  padding-top: 50px;
  border-radius: inherit;
  overflow-y: auto;
}
</style>
<style scoped>
.lovely-left-sidebar {
  font-size: 20px;
  color: var(--lovelymai-color-gray-500);
}
</style>
