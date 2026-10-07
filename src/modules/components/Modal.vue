<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { useCssVar } from '@/modules/components/utils/css-var'

import ContentBar from './modules/ContentBar.vue'

interface Props {
  /** 宽 */
  width?: string
  /** 高 */
  height?: string
  /** z-index */
  zIndex?: number
  /** 关闭事件 */
  onClose?: () => void
  /** 加载状态 */
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  zIndex: 0,
})
/** 是否显示 */
const visible = defineModel<boolean>('visible', { required: true })

// 初始化
const modalRef = ref<HTMLElement | null>(null)
const style = reactive({
  contentbar: {
    get left() {
      return `calc(50% - ${this.width} / 2)`
    },
    get top() {
      return `calc(50% - ${this.height} / 2)`
    },
    get width() {
      return props.width ?? '50dvw'
    },
    get height() {
      return props.height ?? '90dvh'
    },
  },
})
onMounted(() => {
  if (!modalRef.value) return
  useCssVar(modalRef.value, style)
})

// 关闭
const close = () => {
  visible.value = false
  props.onClose?.()
}

// 暴露插槽
defineSlots<{
  default: () => void
  header: () => void
  center: () => void
}>()
</script>

<template>
  <teleport to="body">
    <div :class="$style.modal" ref="modalRef" :style="{ zIndex: props.zIndex }">
      <transition name="lovelymai-fade">
        <div :class="$style.mask" v-if="visible" @click.capture.stop="close"></div>
      </transition>
      <ContentBar
        :class="$style.contentbar"
        :visible="visible"
        :is-open="true"
        :on-close-click="close"
        :loading="props.loading"
      >
        <template #header>
          <slot name="header"></slot>
        </template>
        <slot></slot>
        <template #center>
          <slot name="center"></slot>
        </template>
      </ContentBar>
    </div>
  </teleport>
</template>

<style module>
.modal {
  position: relative;
}

.mask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100dvw;
  height: 100dvh;
  background-color: rgba(0, 0, 0, 0.1);
}

.contentbar {
  position: fixed;
  left: var(--contentbar-left);
  top: var(--contentbar-top);
  width: var(--contentbar-width);
  height: var(--contentbar-height);
}
</style>
