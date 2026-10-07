import { reactive, ref } from 'vue'

import type { MenuInstance } from '../types'
import { watchDOM } from '@/modules/components/utils/dom'
import type { WindowManager } from '@/modules/components/utils/window'

export const createSubMenuManager = (
  triggerEl: HTMLElement,
  menuInstance: MenuInstance,
): WindowManager => {
  const visible = ref<boolean>(false)
  const parentEl = triggerEl.parentElement
  const position = ref<[number, number]>([0, 0])
  let cleanWatchDOM: (() => void) | undefined

  const open = () => {
    if (visible.value || !parentEl) return
    cleanWatchDOM = watchDOM(triggerEl, ({ width }) => {
      position.value = [width, -5]
    })
    visible.value = true
    parentEl.addEventListener('pointerover', onParentOverToChange)
    parentEl.addEventListener('pointerover', onParentOverToClose)
  }
  triggerEl.addEventListener('pointerenter', open)
  const onParentOverToChange = (e: PointerEvent) => {
    if (!menuInstance.root) return
    const target = e.target as HTMLElement
    if (menuInstance.root.contains(target)) {
      triggerEl.style.backgroundColor = 'var(--lovelymai-color-gray-225)'
      triggerEl.style.color = '#000'
    } else {
      triggerEl.style.backgroundColor = ''
      triggerEl.style.color = ''
    }
  }
  const close = () => {
    if (!visible.value) return
    visible.value = false
    cleanWatchDOM?.()
    parentEl?.removeEventListener('pointerover', onParentOverToChange)
    parentEl?.removeEventListener('pointerover', onParentOverToClose)
  }
  const onParentOverToClose = (e: PointerEvent) => {
    if (!parentEl) return
    const target = e.target as HTMLElement
    // 离开 triggerEl 但还在它的父元素内时关闭
    if (parentEl.contains(target) && !triggerEl.contains(target) && visible.value) {
      close()
    }
  }
  if (triggerEl.matches(':hover')) {
    open()
  }
  const cleanup = () => {
    triggerEl.removeEventListener('pointerenter', open)
    parentEl?.removeEventListener('pointerover', onParentOverToChange)
    parentEl?.removeEventListener('pointerover', onParentOverToClose)
  }

  return reactive({ visible, position, open, close, cleanup })
}
