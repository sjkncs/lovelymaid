// 观察 DOM
export function watchDOM(
  element: HTMLElement,
  callback: (size: { width: number; height: number }) => void,
): () => void {
  callback({
    width: element.offsetWidth,
    height: element.offsetHeight,
  })
  const observer = new ResizeObserver(() => {
    callback({
      width: element.offsetWidth,
      height: element.offsetHeight,
    })
  })
  observer.observe(element)

  return () => observer.disconnect()
}
