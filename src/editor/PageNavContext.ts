import { createContext, useContext } from 'react'

export interface PageNavContextValue {
  navigate: (pageId: string) => void
  createSubPage: (parentId: string, title?: string) => void
}

export const PageNavContext = createContext<PageNavContextValue | null>(null)

export function usePageNav(): PageNavContextValue {
  const value = useContext(PageNavContext)
  if (!value) {
    return { navigate: () => undefined, createSubPage: () => undefined }
  }
  return value
}
