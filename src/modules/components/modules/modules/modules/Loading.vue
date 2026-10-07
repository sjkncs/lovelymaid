<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  /** 加载状态 */
  loading: boolean
  /** z-index */
  zIndex?: number
}
const props = withDefaults(defineProps<Props>(), {
  showMask: true,
  zIndex: 0,
})

// 锁定包含块，加载期间禁止滚动
const loadingRef = ref<HTMLElement | null>(null)
let scrollParent: HTMLElement | null = null
let originalOverflow = ''
const lockScroll = () => {
  if (scrollParent) return
  scrollParent =
    (loadingRef.value?.offsetParent as HTMLElement | null) ??
    loadingRef.value?.parentElement ??
    null
  if (!scrollParent) return
  originalOverflow = scrollParent.style.overflow
  scrollParent.style.overflow = 'hidden'
}
const unlockScroll = () => {
  if (!scrollParent) return
  scrollParent.style.overflow = originalOverflow
  scrollParent = null
}
onMounted(() => {
  if (!props.loading) return
  lockScroll()
})
watch(
  () => props.loading,
  (newLoading) => {
    if (newLoading) {
      lockScroll()
    } else {
      unlockScroll()
    }
  },
  { flush: 'post' },
)
onUnmounted(() => {
  unlockScroll()
})
</script>

<template>
  <div
    :class="$style.loading"
    v-if="props.loading"
    ref="loadingRef"
    :style="{ zIndex: props.zIndex }"
  >
    <div :class="$style.spinner"></div>
  </div>
</template>

<style module>
.loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--lovelymai-color-gray-100);
  opacity: 0.8;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--lovelymai-color-gray-200);
  border-top-color: var(--lovelymai-color-blue-300);
  border-radius: 50%;
  animation: lovelymai-spin 0.8s linear infinite;
}

@keyframes lovelymai-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
