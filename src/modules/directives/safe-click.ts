import type { Directive } from 'vue'

const store = new WeakMap<HTMLElement, { moved: boolean; fn: (e: PointerEvent) => void }>()
export const vSafeClick: Directive<HTMLElement, (e: PointerEvent) => void> = {
  mounted: (el, binding) => {
    const state = { moved: false, fn: binding.value }
    el.addEventListener('pointerdown', () => {
      state.moved = false
    })
    el.addEventListener('pointermove', () => {
      state.moved = true
    })
    el.addEventListener('pointerup', (e) => {
      if (!state.moved) {
        state.fn(e)
      }
    })
    store.set(el, state)
  },
  updated: (el, binding) => {
    const state = store.get(el)
    if (state) {
      state.fn = binding.value
    }
  },
}
