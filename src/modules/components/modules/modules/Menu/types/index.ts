import type { OptionItem } from '@/modules/components/types/item'

export interface Props {
  /** 是否显示 */
  visible: boolean
  /** 位置 */
  position: [number, number]
  /** 最小宽度 */
  minWidth?: string
  /** z-index */
  zIndex?: number
  /** 选项 */
  options: OptionItem[]
  /** 选项点击事件 */
  onOptionClick?: (option: OptionItem, index: number) => void
}

export type MenuInstance = {
  root: HTMLElement | null
  props: Props
}
