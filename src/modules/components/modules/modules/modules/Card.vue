<script setup lang="ts">
// 暴露插槽
defineSlots<{
  default: () => void
}>()
</script>

<template>
  <div class="lovelymai-glass-container">
    <slot></slot>
  </div>
</template>
