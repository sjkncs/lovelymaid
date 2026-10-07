export type Item = {
  id: string | number
  [key: string]: unknown
}

export type ListItem = Item & { name: string }

export type OptionItem = ListItem & { options?: OptionItem[] }

export type DateItem = [number, number, number]
