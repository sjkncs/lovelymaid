const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1)
  const size = bytes / Math.pow(1024, i)
  return `${size === Math.floor(size) ? size : size.toFixed(1)} ${SIZE_UNITS[i]}`
}

export const readDirectoryEntries = (entry: FileSystemDirectoryEntry): Promise<File[]> =>
  new Promise((resolve) => {
    const reader = entry.createReader()
    const allFiles: File[] = []

    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (!entries.length) {
          resolve(allFiles)
          return
        }
        for (const e of entries) {
          if (e.isFile) {
            const file = await new Promise<File>((res) => (e as FileSystemFileEntry).file(res))
            allFiles.push(file)
          } else if (e.isDirectory) {
            const subFiles = await readDirectoryEntries(e as FileSystemDirectoryEntry)
            allFiles.push(...subFiles)
          }
        }
        readBatch()
      })
    }

    readBatch()
  })
