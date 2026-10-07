/**
 * 计算列表增删后每项需要滑动的格数（用于 FLIP 动画）
 * @param newList - 新列表
 * @param oldList - 旧列表
 * @returns 每项对应的滑动格数
 */
export const getSlideCount = <T extends { id: string | number }>(
  newList: T[],
  oldList: T[],
): number[] => {
  const result: number[] = new Array(newList.length)

  const oldIndexMap = new Map<string | number, number>()
  for (let i = 0; i < oldList.length; i++) {
    oldIndexMap.set(oldList[i].id, i)
  }

  let lastExistingOldIndex = -1

  for (let i = 0; i < newList.length; i++) {
    const id = newList[i].id
    const oldIndex = oldIndexMap.get(id)

    if (oldIndex !== undefined) {
      // 已存在的元素
      result[i] = oldIndex - i
      lastExistingOldIndex = oldIndex
    } else {
      // 新增元素
      if (lastExistingOldIndex === -1) {
        // 前面没有任何原数组元素，使用 -1 作为虚拟索引
        result[i] = -1 - i
      } else {
        result[i] = lastExistingOldIndex - i
      }
    }
  }

  return result
}
