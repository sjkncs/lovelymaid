<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import type { Item } from './types/item'
import { useCssVar } from './utils/css-var'
import { watchDOM } from './utils/dom'
import { clearTimer, throttle } from './utils/function'
import { getLayoutLeft } from './utils/layout-offset'

import Button from './modules/Button'
import Card from './modules/Card'
import Input from './modules/Input.vue'

interface Props {
  /** 标签 */
  tabs: Item[]
  /** 是否启用搜索按钮 */
  showSearch?: boolean
  /** 输入框提示词 */
  placeholder?: string
  /** 激活项安全点击事件 */
  onActiveTabSafeClick?: (index: number) => void
  /** 搜索事件 */
  onSearch?: () => void
}
const props = defineProps<Props>()
/** 激活项 id */
const activeId = defineModel<string | number>('active-id', { required: true })
/** 搜索值（仅 showSearch 为 true 时有效） */
const inputValue = defineModel<string>('value', { default: '' })

// 初始化
const tabbarRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const slideRef = ref<HTMLElement | null>(null)
const style = reactive({
  bar: {
    width: 0,
    height: 0,
    'border-radius': 0,
    'background-color': 'var(--lovelymai-color-gray-100)',
    scale: 1,
    transition: 'none',
  },
  slide: {
    width: 0,
    background: 'var(--lovelymai-color-gray-200)',
    border: 'none',
    'box-shadow': 'none',
    translateX: 0,
    scale: 1,
    transition: 'background .1s',
    center: 0,
  },
  search: {
    width: 0,
  },
  contentTop: {
    clipLeft: 0,
    clipRight: 0,
    get scale() {
      return style.slide.scale === 1.2 ? 1.1 : 1
    },
  },
})
const activeIndex = computed<number>({
  get: () => props.tabs.findIndex((tab) => tab.id === activeId.value),
  set: (newActiveIndex) => (activeId.value = props.tabs[newActiveIndex].id),
})
const maxDistance = ref<number>(0)
let cleanup: () => void
let virtualFrame: number | undefined
let calcPosFrame: number | undefined
let backgroundTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (!tabbarRef.value) return
  cleanup = watchDOM(tabbarRef.value, () => {
    style.bar.width = props.showSearch
      ? tabbarRef.value!.offsetWidth - style.bar.height - 5
      : tabbarRef.value!.offsetWidth
    style.bar.height = tabbarRef.value!.offsetHeight
    style.search.width = tabbarRef.value!.offsetWidth - style.bar.height * 0.8 - 5
    style.bar['border-radius'] = style.bar.height / 2
    style.slide.width = (style.bar.width - 6) / props.tabs.length
    style.contentTop.clipLeft = activeIndex.value * style.slide.width
    style.contentTop.clipRight = style.contentTop.clipLeft + style.slide.width
    maxDistance.value = ((style.bar.width - 6) * (props.tabs.length - 1)) / props.tabs.length
    style.slide.translateX = activeIndex.value * style.slide.width
    style.slide.center = style.slide.translateX + style.slide.width / 2
  })
  useCssVar(tabbarRef.value, style)
  setTimeout(() => {
    style.bar.transition = 'width .3s, height .3s, transform .2s'
  }, 500)
})
onUnmounted(() => {
  cleanup()
  cancelAnimationFrame(virtualFrame!)
  cancelAnimationFrame(calcPosFrame!)
  clearTimer(backgroundTimer)
})

// 滑块动画
let followed = false
let moved = false
let startTime: number
const getSlideX = () => new DOMMatrix(window.getComputedStyle(slideRef.value!).transform).m41
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const getTargetLeft = (e: PointerEvent) => {
  if (!contentRef.value) return 0
  const clickX = e.pageX - getLayoutLeft(contentRef.value)
  const clickLeft = clickX - style.slide.width / 2
  const maxLeft = (props.tabs.length - 1) * style.slide.width
  return clamp(clickLeft, 0, maxLeft)
}
const stepToTarget = (targetLeft: number) => {
  const realLeft = getSlideX()
  if (Math.abs(targetLeft - realLeft) < maxDistance.value / 10) {
    style.slide.transition = `background .1s`
    style.slide.translateX = targetLeft
    followed = true
    calcPosFrame = undefined
  } else {
    style.slide.translateX +=
      targetLeft - realLeft > 0 ? maxDistance.value / 10 : -maxDistance.value / 10
    calcPosFrame = requestAnimationFrame(() => stepToTarget(targetLeft))
  }
}
const jumpToTarget = (targetLeft: number) => {
  style.slide.transition = `transform .5s, background .1s`
  style.slide.translateX = targetLeft
}
const moveTowardTarget = (targetLeft: number) => {
  if (!slideRef.value) return
  const realLeft = getSlideX()
  if (followed || Math.abs(targetLeft - realLeft) < maxDistance.value / 10) {
    style.slide.transition = `background .1s`
    style.slide.translateX = targetLeft
    followed = true
  } else {
    style.slide.transition = `background .1s`
    style.slide.translateX = realLeft
    calcPosFrame = requestAnimationFrame(() => stepToTarget(targetLeft))
  }
}
const updateVirtualPos = (duration: number | undefined) => {
  const calc = () => {
    const realLeft = getSlideX()
    style.slide.center = realLeft + style.slide.width / 2
    const virtualWidth = (style.slide.width * 1.2) / 1.1
    style.contentTop.clipLeft = style.slide.center - virtualWidth / 2
    style.contentTop.clipRight = style.slide.center + virtualWidth / 2
  }
  if (duration) {
    cancelAnimationFrame(virtualFrame!)
    const start = performance.now()
    const frame = () => {
      calc()
      if (performance.now() - start < duration) {
        virtualFrame = requestAnimationFrame(frame)
      } else {
        virtualFrame = undefined
      }
    }
    virtualFrame = requestAnimationFrame(frame)
  } else {
    cancelAnimationFrame(virtualFrame!)
    if (followed) {
      calc()
    } else {
      const frame = () => {
        calc()
        if (!followed) {
          virtualFrame = requestAnimationFrame(frame)
        } else {
          virtualFrame = undefined
        }
      }
      virtualFrame = requestAnimationFrame(frame)
    }
  }
}
const runStopAnimation = (stopIndex: number) => {
  style.slide.transition = `transform .5s, background .1s`
  cancelAnimationFrame(calcPosFrame!)
  calcPosFrame = undefined
  style.slide.translateX = stopIndex * style.slide.width
  cancelAnimationFrame(virtualFrame!)
  virtualFrame = undefined
  updateVirtualPos(500)
}
const applyHighlight = () => {
  style.bar['background-color'] = '#fff'
  style.slide.border = '1px solid rgba(255, 255, 255, 0.5)'
  style.slide['box-shadow'] = '0 0 10px 0 rgba(0, 0, 0, 0.1)'
  style.bar.scale = 1.05
  style.slide.scale = 1.2
  backgroundTimer = setTimeout(() => {
    style.slide.background = '#fff'
  }, 100)
}
const startSlide = (e: PointerEvent) => {
  startTime = Date.now()
  applyHighlight()
  const targetLeft = getTargetLeft(e)
  jumpToTarget(targetLeft)
  cancelAnimationFrame(virtualFrame!)
  virtualFrame = undefined
  updateVirtualPos(500)
  document.addEventListener('pointermove', moveSlide)
  document.addEventListener('pointerup', stopSlide)
}
const moveSlide = throttle((e: PointerEvent) => {
  moved = true
  if (searchIsActive.value) {
    searchIsActive.value = false
    return
  }
  cancelAnimationFrame(calcPosFrame!)
  calcPosFrame = undefined
  const targetLeft = getTargetLeft(e)
  moveTowardTarget(targetLeft)
  cancelAnimationFrame(virtualFrame!)
  virtualFrame = undefined
  updateVirtualPos(undefined)
}, 8)
const resetHighlight = () => {
  style.slide.background = 'var(--lovelymai-color-gray-200)'
  style.bar['background-color'] = 'var(--lovelymai-color-gray-100)'
  style.slide.border = 'none'
  style.slide['box-shadow'] = 'none'
  style.bar.scale = 1
  style.slide.scale = 1
}
const stopSlide = (e: PointerEvent) => {
  if (Date.now() - startTime < 100) {
    clearTimer(backgroundTimer)
  }
  resetHighlight()
  if (searchIsActive.value) {
    searchIsActive.value = false
    runStopAnimation(activeIndex.value)
  } else {
    if (!contentRef.value) return
    const clickX = e.pageX - getLayoutLeft(contentRef.value)
    const index = Math.floor(clickX / style.slide.width)
    const oldActiveIndex = activeIndex.value
    const newActiveIndex = clamp(index, 0, props.tabs.length - 1)
    activeIndex.value = newActiveIndex
    if (oldActiveIndex === newActiveIndex) {
      runStopAnimation(newActiveIndex)
      if (!moved) {
        props.onActiveTabSafeClick?.(newActiveIndex)
      }
    }
  }
  moved = false
  followed = false
  document.removeEventListener('pointermove', moveSlide)
  document.removeEventListener('pointerup', stopSlide)
}
watch(activeIndex, (newIndex) => {
  runStopAnimation(newIndex)
})
watch(
  () => props.tabs.length,
  () => {
    style.slide.translateX = 0
  },
)

// 模式切换
const searchIsActive = ref<boolean>(false)
const searchIsShow = ref<boolean>(false)
const clickSearch = () => {
  searchIsActive.value = true
  style.slide.translateX = 0
}
watch(searchIsActive, (newValue) => {
  if (newValue) {
    setTimeout(() => (searchIsShow.value = true), 100)
  } else {
    setTimeout(() => (searchIsShow.value = false), 200)
  }
})

// 暴露插槽
defineSlots<{
  default: (props: { tab: Item; index: number }) => void
}>()
</script>

<template>
  <div :class="$style.tabbar" ref="tabbarRef">
    <Card :class="[$style.bar, { [$style.active]: !searchIsActive }]">
      <ul :class="$style.content" ref="contentRef" @pointerdown.prevent="startSlide">
        <li :class="[$style.tab, $style.small]" v-show="searchIsActive">
          <slot :tab="props.tabs[activeIndex]" :index="activeIndex"></slot>
        </li>
        <li :class="$style.tab" v-for="(tab, index) in props.tabs" :key="index">
          <slot :tab="tab" :index="index"></slot>
        </li>
        <div
          :class="$style.slide"
          ref="slideRef"
          v-show="activeIndex !== -1 && !searchIsActive"
        ></div>
        <ul :class="[$style.content, $style.top]" v-show="!searchIsActive">
          <li :class="[$style.tab, $style.top]" v-for="(tab, index) in props.tabs" :key="index">
            <slot :tab="tab" :index="index"></slot>
          </li>
        </ul>
      </ul>
    </Card>
    <div :class="[$style.search, { [$style.active]: searchIsActive }]" v-if="props.showSearch">
      <Button :class="$style.button" v-show="!searchIsShow" type="glass" :on-click="clickSearch">
        <span class="lovelymai lovely-search button"></span>
      </Button>
      <Input
        :class="$style.input"
        v-show="searchIsShow"
        type="text"
        v-model:value="inputValue"
        :placeholder="props.placeholder"
        enterkeyhint="search"
        :on-enter="props.onSearch"
      >
        <span class="lovelymai lovely-search input"></span>
      </Input>
    </div>
  </div>
</template>

<style module>
.tabbar {
  display: flex;
  gap: 5px;
  height: 50px;
  user-select: none;
  -webkit-user-select: none;
  --top-color: var(--lovelymai-color-blue-300);
}

.bar {
  width: calc(var(--bar-height) * 0.8px);
  height: 80%;
  padding: 2px;
  background-color: var(--bar-background-color) !important;
  border-radius: calc(var(--bar-border-radius) * 1px);
  cursor: pointer;
  overflow: hidden;
  transition: var(--bar-transition);
}

.bar.active {
  width: calc(var(--bar-width) * 1px);
  height: 100%;
  overflow: visible;
  transform: scale(var(--bar-scale));
}

.bar:not(.active):active {
  transform: scale(1.2);
}

.search {
  width: calc(var(--bar-height) * 1px);
  height: 100%;
  transition: var(--bar-transition);
}

.search.active {
  width: calc(var(--search-width) * 1px);
  height: 80%;
}

.content {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.content.top {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  clip-path: inset(
    0 calc(100% - var(--contentTop-clipRight) * 1px) 0 calc(var(--contentTop-clipLeft) * 1px) round
      calc((var(--bar-border-radius) - 3) * 1px)
  );
  transform: translateZ(0) scale(var(--contentTop-scale));
  transform-origin: calc(var(--slide-center) * 1px) center;
  transition: transform 0.2s;
  backface-visibility: hidden;
}

.tab {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: calc(var(--slide-width) * 1px);
  height: 100%;
}

.tab.small {
  flex-shrink: 1;
  height: 100%;
  aspect-ratio: 1 /1;
}

.tab.small :not(:nth-child(1)) {
  display: none;
}

.tab.top {
  color: var(--top-color);
}

.search .button {
  width: 100%;
  height: 100%;
}

.search .input {
  height: 100%;
  font-size: 18px;
}

.slide {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  width: calc(var(--slide-width) * 1px);
  height: 100%;
  background: var(--slide-background);
  border: var(--slide-border);
  border-radius: calc((var(--bar-border-radius) - 3) * 1px);
  box-shadow: var(--slide-box-shadow);
  transform: translateX(calc(var(--slide-translateX) * 1px)) scale(var(--slide-scale));
  transition: var(--slide-transition);
}
</style>
