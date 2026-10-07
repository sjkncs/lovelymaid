import { watch } from 'vue'

export type StyleObject = Record<string, Record<string, string | number>>

export const useCssVar = (el: HTMLElement, styles: StyleObject) => {
  const applyStyles = () => {
    if (!el) return
    Object.entries(styles).forEach(([key, value]) => {
      Object.entries(value).forEach(([prop, val]) => {
        const varName = `--${key}-${prop}`
        const cssValue = String(val)
        el.style.setProperty(varName, cssValue)
      })
    })
  }

  watch(() => styles, applyStyles, { deep: true, immediate: true })
}
