import type { JSONContent } from '@tiptap/core'

export interface Page {
  id: string
  title: string
  icon: string
  parentId: string | null
  content: JSONContent | null
  createdAt: number
  updatedAt: number
}

export type PageMap = Record<string, Page>

export interface PageTreeNode extends Page {
  children: PageTreeNode[]
  depth: number
}

export type ThemeMode = 'light' | 'dark' | 'system'
