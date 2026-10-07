/**
 * 获取元素视图左侧距离（视觉左边界到文档左侧的距离）
 * 公式: getBoundingClientRect().left + scrollLeft
 * @param el - 目标元素
 * @returns 相对于文档左侧的视觉像素值
 */
export const getViewLeft = (el: HTMLElement): number => {
  return el.getBoundingClientRect().left + document.documentElement.scrollLeft
}

/**
 * 获取元素视图顶部距离（视觉上边界到文档顶部的距离）
 * 公式: getBoundingClientRect().top + scrollTop
 * @param el - 目标元素
 * @returns 相对于文档顶部的视觉像素值
 */
export const getViewTop = (el: HTMLElement): number => {
  return el.getBoundingClientRect().top + document.documentElement.scrollTop
}

/**
 * 获取元素视图右侧距离（视觉右边界到文档右侧的距离）
 * 公式: scrollWidth - (getBoundingClientRect().right + scrollLeft)
 * @param el - 目标元素
 * @returns 相对于文档右侧的视觉像素值
 */
export const getViewRight = (el: HTMLElement): number => {
  return (
    document.documentElement.scrollWidth -
    (el.getBoundingClientRect().right + document.documentElement.scrollLeft)
  )
}

/**
 * 获取元素视图底部距离（视觉下边界到文档底部的距离）
 * 公式: scrollHeight - (getBoundingClientRect().bottom + scrollTop)
 * @param el - 目标元素
 * @returns 相对于文档底部的视觉像素值
 */
export const getViewBottom = (el: HTMLElement): number => {
  return (
    document.documentElement.scrollHeight -
    (el.getBoundingClientRect().bottom + document.documentElement.scrollTop)
  )
}
