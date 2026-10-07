<script setup lang="ts">
import { computed, onUnmounted } from 'vue'

import { formatFileSize } from '@/modules/components/utils/file.js'
import docxIcon from '@/assets/imgs/docx.svg'
import pdfIcon from '@/assets/imgs/pdf.svg'
import textIcon from '@/assets/imgs/text.svg'

import Card from '../modules/Card.vue'
import Loading from '../modules/Loading.vue'

interface Props {
  /** 文件 */
  file: File
  /** 关闭事件 */
  onCloseClick?: () => void
  /** 加载状态 */
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

// 文件内存 url
const url = computed<string>(() => URL.createObjectURL(props.file))
onUnmounted(() => {
  URL.revokeObjectURL(url.value)
})

// 文件图标
const ICON_MAP: Record<string, string> = {
  pdf: pdfIcon,
  txt: textIcon,
  docx: docxIcon,
  doc: docxIcon,
}
const ext = computed<string>(() => props.file.name.split('.').pop()?.toUpperCase() ?? '')
const fileIcon = computed<string>(() => ICON_MAP[ext.value.toLowerCase()])
const extra = computed<string>(() => `${ext.value} ${formatFileSize(props.file.size)}`)

// 打开文件
const openFile = () => {
  window.open(url.value, '_blank')
}
</script>

<template>
  <Card :class="$style.fileContainer" @click.stop="openFile">
    <span
      class="lovelymai lovely-clear"
      v-if="props.onCloseClick"
      @click.stop="() => props.onCloseClick?.()"
    ></span>
    <div :class="$style.img" v-if="file.type.startsWith('image/')">
      <img :src="url" />
    </div>
    <div :class="$style.other" v-else :title="props.file.name">
      <img :class="$style.icon" v-if="fileIcon" :src="fileIcon" />
      <div :class="$style.info">
        <div :class="$style.name">{{ props.file.name }}</div>
        <div :class="$style.extra">{{ extra }}</div>
      </div>
    </div>
    <Loading :loading="props.loading" />
  </Card>
</template>

<style module>
.fileContainer {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: none;
  cursor: pointer;
}

.fileContainer :global(.lovely-clear) {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 16px;
  color: var(--lovelymai-color-gray-300);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

@media (hover: none) {
  .fileContainer :global(.lovely-clear) {
    opacity: 1;
  }
}

@media (hover: hover) {
  .fileContainer:hover :global(.lovely-clear) {
    opacity: 1;
  }
}

.fileContainer .img {
  height: 100%;
}

.fileContainer .img img {
  height: 100%;
}

.fileContainer .other {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 200px;
  height: 100%;
  padding: 0 10px;
}

.other .icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.other .info {
  flex: 1;
  min-width: 0;
}

.other .info .name {
  font-size: 14px;
  color: var(--lovelymai-color-gray-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.other .info .extra {
  font-size: 12px;
  font-weight: 300;
  color: var(--lovelymai-color-gray-300);
}
</style>
