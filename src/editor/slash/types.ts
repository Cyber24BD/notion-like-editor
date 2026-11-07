import type { Editor, Range } from '@tiptap/core'
import type { ReactNode } from 'react'

export type SlashGroup = 'Basic blocks' | 'Media' | 'Advanced'

export interface SlashItem {
  id: string
  title: string
  subtitle: string
  group: SlashGroup
  icon: ReactNode
  keywords: string[]
  run: (context: { editor: Editor; range: Range | null }) => void
}

export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items
    .map((item, order) => {
      const title = item.title.toLowerCase()
      let score = 0
      if (title === needle) score = 40
      else if (title.startsWith(needle)) score = 30
      else if (title.includes(needle)) score = 20
      else if (item.keywords.some((keyword) => keyword.toLowerCase().includes(needle))) score = 10
      else if (item.subtitle.toLowerCase().includes(needle)) score = 5
      return { item, order, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.item)
}
