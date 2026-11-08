import type { JSONContent } from '@tiptap/core'

export interface Page {
  id: string
  title: string
  icon: string
  cover?: string
  coverPosition?: number
  parentId: string | null
  /** Explicit sibling order; falls back to createdAt for legacy data. */
  order?: number
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
