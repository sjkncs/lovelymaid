import type { Item } from '@/modules/components/types/item'

export type FileItem = Item & { file: File; loading?: boolean }
