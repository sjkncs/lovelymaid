<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, reactive, nextTick } from 'vue'

import { useCssVar } from '@/modules/components/utils/css-var.js'
import { watchDOM } from '@/modules/components/utils/dom.js'
import { debounce } from '@/modules/components/utils/function.js'
import { getLayoutLeft } from '@/modules/components/utils/layout-offset.js'

import Button from './modules/Button/index.vue'
import Card from './modules/Card/index.js'
import Loading from './modules/Loading/index.js'

interface Props {
  /** 是否显示 */
  visible?: boolean
  /** 是否展开 */
  isOpen: boolean
  /** 关闭事件 */
  onCloseClick: () => void
  /** 加载状态 */
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  visible: true,
  isOpen: true,
  loading: false,
})

// 初始化
const style = reactive({
  contentbar: {
    get translateX() {
      return props.isOpen ? '0' : `${-transformDistance.value}px`
    },
    scale: props.visible ? '1' : '0',
    transition: 'none',
  },
})
onMounted(() => {
  if (!contentbarRef.value) return
  useCssVar(contentbarRef.value, style)
})

// 计算平移距离
const contentbarRef = ref<HTMLElement | null>(null)
const transformDistance = ref<number>(0)
let cleanup: () => void
const calculateTransform = () => {
  if (!contentbarRef.value) return
  transformDistance.value =
    getLayoutLeft(contentbarRef.value) + contentbarRef.value.offsetWidth + 10
}
const debounceCalculateTransform = debounce(calculateTransform, 100)
onMounted(() => {
  if (!contentbarRef.value) return
  calculateTransform()
  cleanup = watchDOM(contentbarRef.value, () => {
    debounceCalculateTransform()
  })
  setTimeout(() => {
    style.contentbar.transition = 'transform .5s'
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
    style.contentbar.transition = 'transform .3s'
    timer = setTimeout(() => {
      style.contentbar.transition = 'transform .5s'
    }, 300)
    if (newVisible) {
      await nextTick()
      style.contentbar.scale = '1'
    } else {
      style.contentbar.scale = '0'
    }
  },
)

// 暴露插槽
defineSlots<{
  default: () => void
  header: () => void
  center: () => void
}>()
</script>

<template>
  <Card
    :class="$style.contentbar"
    :ref="(ins) => (contentbarRef = (ins as InstanceType<typeof Card> | null)?.$el ?? null)"
  >
    <div :class="$style.header">
      <div :class="$style.title">
        <slot name="header"></slot>
      </div>
      <Button :class="$style.button" type="glass" :on-click="props.onCloseClick" title="收起内容栏">
        <span class="lovelymai lovely-close"></span>
      </Button>
    </div>
    <div :class="$style.content">
      <slot></slot>
    </div>
    <div :class="$style.center">
      <slot name="center"></slot>
    </div>
    <Loading :loading="props.loading" :z-index="1" />
  </Card>
</template>

<style module>
.contentbar {
  border-radius: 20px;
  transform: translateX(var(--contentbar-translateX)) scale(var(--contentbar-scale));
  transition: var(--contentbar-transition);
  overflow: auto;
  scrollbar-width: thin;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  position: sticky;
  top: 0;
  z-index: 2;
  height: 0;
  margin-bottom: 50px;
  padding: 0 10px 0 10px;
  box-shadow: 0 0px 20px 35px var(--lovelymai-color-gray-100);
}

.title {
  flex: 1;
  min-width: 0;
  height: 30px;
  margin-top: 10px;
  font-size: 16px;
  font-weight: 500;
  line-height: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button {
  margin-top: 10px;
  font-size: 20px;
}

.content {
  display: flow-root;
  position: relative;
  z-index: 0;
  min-height: calc(100% - 50px);
}

.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
