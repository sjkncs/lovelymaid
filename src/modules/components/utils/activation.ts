import { reactive, ref, watch, type Ref } from 'vue'

import type { Item } from '@/modules/components/types/item'

export type ActivationManager = {
  activeIndexes: Set<number>
  cleanup: () => void
}

export const createActivationManager = (
  items: Ref<Item[]>,
  activeIds: Ref<Set<string | number>>,
  parentEl: HTMLElement,
): ActivationManager => {
  const activeIndexes = ref<Set<number>>(new Set())
  let lastActiveIndex: number | undefined = undefined
  watch(
    activeIds,
    (newActiveIds) => {
      activeIndexes.value = new Set(
        items.value
          .map((item, index) => (newActiveIds.has(item.id) ? index : -1))
          .filter((index) => index !== -1),
      )
    },
    { immediate: true },
  )
  watch(items, (newItems) => {
    activeIndexes.value = new Set(
      newItems
        .map((item, index) => (activeIds.value.has(item.id) ? index : -1))
        .filter((index) => index !== -1),
    )
  })
  const removeContinuous = (set: Set<number>): Set<number> => {
    const result = new Set<number>()
    for (const num of set) {
      if (!set.has(num - 1) && !set.has(num + 1)) {
        result.add(num)
      }
    }
    return result
  }
  const activateItem = (e: PointerEvent, index: number) => {
    if (e.getModifierState('Meta')) {
      if (activeIndexes.value.has(index)) {
        activeIndexes.value.delete(index)
      } else {
        activeIndexes.value.add(index)
        lastActiveIndex = index
      }
    } else if (e.getModifierState('Shift') && activeIndexes.value.size > 0) {
      activeIndexes.value = removeContinuous(activeIndexes.value)
      const minIndex = Math.min(lastActiveIndex ?? 0, index)
      const maxIndex = Math.max(lastActiveIndex ?? 0, index)
      for (let i = minIndex; i <= maxIndex; i++) {
        activeIndexes.value.add(i)
      }
    } else {
      activeIndexes.value = new Set([index])
      lastActiveIndex = index
    }
    activeIds.value = new Set(Array.from(activeIndexes.value).map((index) => items.value[index].id))
  }
  const handlePointerDown = (e: PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.target as HTMLElement
    const parent = e.currentTarget as HTMLElement
    let el: HTMLElement | null = target
    while (el && el.parentElement !== parent) {
      el = el.parentElement
    }
    if (!el) return
    const index = Array.from(parent.children).indexOf(el)
    activateItem(e, Number(index))
  }
  parentEl.addEventListener('pointerdown', handlePointerDown)
  const cleanup = () => {
    parentEl.removeEventListener('pointerdown', handlePointerDown)
  }
  return reactive({ activeIndexes, cleanup })
}
