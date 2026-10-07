import { nextTick, reactive, ref, type Ref } from 'vue'

import { getViewLeft, getViewTop } from './modules/view-offset'

export type WindowManager = {
  readonly visible: boolean
  readonly position: [number, number]
  open: () => void
  close: () => void
  cleanup: () => void
}

const stopClickPropagation = (e: Event) => {
  e.stopPropagation()
  document.removeEventListener('click', stopClickPropagation, true)
}

/** 获取元素的所有可滚动祖先（含 document） */
const getScrollableParents = (el: HTMLElement): (HTMLElement | Document)[] => {
  const parents: (HTMLElement | Document)[] = []
  let current: HTMLElement | null = el.parentElement
  while (current) {
    const style = getComputedStyle(current)
    if (/(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY)) {
      parents.push(current)
    }
    current = current.parentElement
  }
  parents.push(document)
  return parents
}

export const createWindowManager = (
  triggerEl: HTMLElement,
  windowRef: Ref<HTMLElement | null>,
  type: 'fixed' | 'flex' = 'fixed',
  method: 'down' | 'contextmenu' = 'down',
): WindowManager => {
  const visible = ref<boolean>(false)
  const position = ref<[number, number]>([0, 0])
  const calcPos = (e?: PointerEvent) => {
    if (!windowRef.value) return
    let X: number = 0
    let Y: number = 0
    if (type === 'fixed') {
      X = getViewLeft(triggerEl) + Math.min(triggerEl.offsetWidth, triggerEl.offsetHeight) / 2
      Y = getViewTop(triggerEl) + triggerEl.offsetHeight + 3
      const offsetBottom =
        document.documentElement.scrollTop +
        document.documentElement.clientHeight -
        (Y + windowRef.value.offsetHeight)
      const centerIsBottom =
        getViewTop(triggerEl) + triggerEl.offsetHeight / 2 >
        document.documentElement.scrollTop + document.documentElement.clientHeight / 2
      if (offsetBottom < 3 && centerIsBottom) {
        Y = getViewTop(triggerEl) - windowRef.value.offsetHeight - 3
      }
    } else {
      if (e) {
        X = e.pageX
        Y = e.pageY
        const offsetBottom =
          document.documentElement.scrollTop +
          document.documentElement.clientHeight -
          (Y + windowRef.value.offsetHeight)
        if (offsetBottom < 3) {
          Y = Y + offsetBottom - 3
        }
      } else {
        console.error('flex 类型下 open 必须传入 event 事件对象')
      }
    }
    const offsetRight =
      document.documentElement.scrollLeft +
      document.documentElement.clientWidth -
      (X + windowRef.value.offsetWidth)
    if (offsetRight < 3) {
      X = X + offsetRight - 3
    }
    position.value = [X, Y]
  }
  let lastEvent: PointerEvent | undefined
  let ticking = false
  let scrollParents: (HTMLElement | Document)[] = []
  let openTimer: ReturnType<typeof setTimeout> | undefined
  const onScroll = () => {
    if (ticking) return
    requestAnimationFrame(() => {
      calcPos(lastEvent)
      ticking = false
    })
    ticking = true
  }
  const open = async (e?: PointerEvent) => {
    lastEvent = e
    visible.value = true
    await nextTick()
    if (!windowRef.value) return
    calcPos(e)
    scrollParents.forEach((p) => p.removeEventListener('scroll', onScroll))
    scrollParents = getScrollableParents(triggerEl)
    scrollParents.forEach((p) => p.addEventListener('scroll', onScroll))
    clearTimeout(openTimer)
    document.removeEventListener('click', onDocClick, true)
    openTimer = setTimeout(() => {
      document.removeEventListener('click', stopClickPropagation, true)
      document.addEventListener('click', onDocClick, true)
    }, 200)
  }
  const onTrigger = (e: PointerEvent) => {
    e.stopPropagation()
    document.addEventListener('click', stopClickPropagation, true)
    if (method === 'contextmenu') {
      e.preventDefault()
    }
    if (visible.value) return
    open(e)
  }
  if (method === 'down') {
    triggerEl.addEventListener('pointerdown', onTrigger)
  } else {
    triggerEl.addEventListener('contextmenu', onTrigger)
  }
  const close = () => {
    if (!visible.value) return
    visible.value = false
    scrollParents.forEach((p) => p.removeEventListener('scroll', onScroll))
    scrollParents = []
    clearTimeout(openTimer)
    document.removeEventListener('click', onDocClick, true)
  }
  const onDocClick = (e: PointerEvent) => {
    if (!windowRef.value) return
    if (windowRef.value.contains(e.target as HTMLElement)) return
    e.stopPropagation()
    e.preventDefault()
    close()
  }
  const cleanup = () => {
    triggerEl.removeEventListener('pointerdown', onTrigger)
    triggerEl.removeEventListener('contextmenu', onTrigger)
    clearTimeout(openTimer)
    document.removeEventListener('click', stopClickPropagation, true)
    scrollParents.forEach((p) => p.removeEventListener('scroll', onScroll))
    scrollParents = []
    document.removeEventListener('click', onDocClick, true)
  }

  return reactive({ visible, position, open, close, cleanup })
}
