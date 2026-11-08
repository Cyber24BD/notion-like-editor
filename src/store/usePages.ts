import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { Page, PageMap, PageTreeNode } from '../types'
import { seedContent } from './seed'

const STORAGE_KEY = 'notion-like:workspace:v1'
const SCHEMA_VERSION = 1

interface WorkspaceState {
  pages: PageMap
  activeId: string
}

interface PersistedWorkspace extends WorkspaceState {
  version: number
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function createSeedState(): WorkspaceState {
  const now = Date.now()
  const pages: PageMap = {
    welcome: {
      id: 'welcome',
      title: 'Getting started',
      icon: '🌱',
      parentId: null,
      content: seedContent.welcome ?? null,
      createdAt: now - 3000,
      updatedAt: now - 60_000,
    },
    blocks: {
      id: 'blocks',
      title: 'Blocks & shortcuts',
      icon: '⌨️',
      parentId: 'welcome',
      content: seedContent.blocks ?? null,
      createdAt: now - 2000,
      updatedAt: now - 120_000,
    },
    design: {
      id: 'design',
      title: 'Design notes',
      icon: '🎨',
      parentId: 'welcome',
      content: seedContent.design ?? null,
      createdAt: now - 1000,
      updatedAt: now - 180_000,
    },
  }
  return { pages, activeId: 'welcome' }
}

function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw) as PersistedWorkspace
    if (
      !parsed ||
      parsed.version !== SCHEMA_VERSION ||
      typeof parsed.pages !== 'object' ||
      !parsed.pages ||
      typeof parsed.activeId !== 'string'
    ) {
      return createSeedState()
    }
    const pages = parsed.pages
    const ids = Object.keys(pages)
    if (ids.length === 0) return createSeedState()
    const hashId = window.location.hash.replace(/^#\/?/, '')
    const activeId = pages[hashId]
      ? hashId
      : pages[parsed.activeId]
        ? parsed.activeId
        : ids[0]
    return { pages, activeId }
  } catch {
    return createSeedState()
  }
}

function pageOrder(page: Page): number {
  return page.order ?? page.createdAt
}

function pageSort(a: Page, b: Page): number {
  return pageOrder(a) - pageOrder(b) || a.createdAt - b.createdAt
}

export function buildPageTree(pages: PageMap): PageTreeNode[] {
  const childrenOf = (parentId: string | null): Page[] =>
    Object.values(pages)
      .filter((page) => page.parentId === parentId)
      .sort(pageSort)

  const walk = (parentId: string | null, depth: number): PageTreeNode[] =>
    childrenOf(parentId).map((page) => ({
      ...page,
      depth,
      children: walk(page.id, depth + 1),
    }))

  return walk(null, 0)
}

export function getBreadcrumbs(pages: PageMap, id: string): Page[] {
  const trail: Page[] = []
  let cursor: Page | undefined = pages[id]
  const guard = new Set<string>()
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id)
    trail.unshift(cursor)
    cursor = cursor.parentId ? pages[cursor.parentId] : undefined
  }
  return trail
}

export function countWords(content: JSONContent | null): number {
  if (!content) return 0
  let words = 0
  const walk = (node: JSONContent) => {
    if (node.type === 'text' && node.text) {
      words += node.text.trim().split(/\s+/).filter(Boolean).length
    }
    node.content?.forEach(walk)
  }
  walk(content)
  return words
}

function descendantIds(pages: PageMap, id: string): string[] {
  const out: string[] = []
  const walk = (parentId: string) => {
    for (const page of Object.values(pages)) {
      if (page.parentId === parentId) {
        out.push(page.id)
        walk(page.id)
      }
    }
  }
  walk(id)
  return out
}

export interface WorkspaceApi {
  pages: PageMap
  activeId: string
  activePage: Page | null
  tree: PageTreeNode[]
  breadcrumbs: Page[]
  setActive: (id: string) => void
  createPage: (
    parentId?: string | null,
    title?: string,
    content?: JSONContent | null,
    activate?: boolean,
  ) => string
  updatePage: (
    id: string,
    patch: Partial<Pick<Page, 'title' | 'icon' | 'cover' | 'coverPosition' | 'parentId'>>,
  ) => void
  setContent: (id: string, content: JSONContent) => void
  deletePage: (id: string) => void
  /** Move a page before `beforeId` under `parentId`; null appends. */
  movePage: (id: string, parentId: string | null, beforeId: string | null) => void
  duplicatePage: (id: string) => string | null
  resetWorkspace: () => void
  storageError: boolean
}

export function useWorkspace(): WorkspaceApi {
  const [state, setState] = useState<WorkspaceState>(() => loadWorkspace())
  const [storageError, setStorageError] = useState(false)
  const skipPersist = useRef(true)

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false
      return
    }
    const handle = window.setTimeout(() => {
      try {
        const payload: PersistedWorkspace = { ...state, version: SCHEMA_VERSION }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        setStorageError((previous) => (previous ? false : previous))
      } catch {
        // Storage full or blocked — keep editing in memory and let the UI know.
        setStorageError(true)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [state])

  const setActive = useCallback((id: string) => {
    setState((prev) => (prev.pages[id] ? { ...prev, activeId: id } : prev))
  }, [])

  const createPage = useCallback(
    (
      parentId: string | null = null,
      title = '',
      content: JSONContent | null = null,
      activate = true,
    ) => {
      const id = uid()
      const now = Date.now()
      setState((prev) => ({
        pages: {
          ...prev.pages,
          [id]: {
            id,
            title,
            icon: '📄',
            cover: '',
            coverPosition: 50,
            parentId,
            order: now,
            content,
            createdAt: now,
            updatedAt: now,
          },
        },
        activeId: activate ? id : prev.activeId,
      }))
      return id
    },
    [],
  )

  const updatePage = useCallback(
    (
      id: string,
      patch: Partial<Pick<Page, 'title' | 'icon' | 'cover' | 'coverPosition' | 'parentId'>>,
    ) => {
      setState((prev) => {
        const page = prev.pages[id]
        if (!page) return prev
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [id]: { ...page, ...patch, updatedAt: Date.now() },
          },
        }
      })
    },
    [],
  )

  const setContent = useCallback((id: string, content: JSONContent) => {
    setState((prev) => {
      const page = prev.pages[id]
      if (!page) return prev
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [id]: { ...page, content, updatedAt: Date.now() },
        },
      }
    })
  }, [])

  const deletePage = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.pages[id]
      if (!target) return prev
      const doomed = new Set([id, ...descendantIds(prev.pages, id)])
      const pages: PageMap = {}
      for (const [key, page] of Object.entries(prev.pages)) {
        if (!doomed.has(key)) pages[key] = page
      }
      let activeId = prev.activeId
      if (doomed.has(activeId)) {
        const fallback =
          (target.parentId && pages[target.parentId] ? target.parentId : null) ??
          Object.values(pages).find((page) => page.parentId === null)?.id ??
          Object.keys(pages)[0] ??
          ''
        activeId = fallback
      }
      if (Object.keys(pages).length === 0) {
        const now = Date.now()
        const freshId = uid()
        pages[freshId] = {
          id: freshId,
          title: '',
          icon: '📄',
          cover: '',
          coverPosition: 50,
          parentId: null,
          order: now,
          content: null,
          createdAt: now,
          updatedAt: now,
        }
        activeId = freshId
      }
      return { pages, activeId }
    })
  }, [])

  const movePage = useCallback(
    (id: string, parentId: string | null, beforeId: string | null) => {
      setState((prev) => {
        const page = prev.pages[id]
        if (!page) return prev
        if (parentId !== null && (!prev.pages[parentId] || parentId === id)) {
          return prev
        }
        if (parentId !== null && descendantIds(prev.pages, id).includes(parentId)) {
          return prev
        }

        const siblings = Object.values(prev.pages)
          .filter((candidate) => candidate.id !== id && candidate.parentId === parentId)
          .sort(pageSort)
        const beforeIndex =
          beforeId === null
            ? siblings.length
            : siblings.findIndex((candidate) => candidate.id === beforeId)
        const insertAt = beforeIndex === -1 ? siblings.length : beforeIndex
        siblings.splice(insertAt, 0, page)

        const pages = { ...prev.pages }
        siblings.forEach((sibling, index) => {
          pages[sibling.id] = {
            ...sibling,
            parentId,
            order: index + 1,
            updatedAt: sibling.id === id ? Date.now() : sibling.updatedAt,
          }
        })
        return { ...prev, pages }
      })
    },
    [],
  )

  const duplicatePage = useCallback(
    (id: string) => {
      const source = state.pages[id]
      if (!source) return null
      const newId = uid()
      const now = Date.now()
      setState((prev) => {
        if (!prev.pages[id]) return prev
        return {
          pages: {
            ...prev.pages,
            [newId]: {
              ...source,
              id: newId,
              title: source.title ? `${source.title} (copy)` : 'Untitled',
              order: now,
              content: source.content
                ? (JSON.parse(JSON.stringify(source.content)) as JSONContent)
                : null,
              createdAt: now,
              updatedAt: now,
            },
          },
          activeId: newId,
        }
      })
      return newId
    },
    [state.pages],
  )

  const resetWorkspace = useCallback(() => {
    setState(createSeedState())
  }, [])

  const tree = useMemo(() => buildPageTree(state.pages), [state.pages])
  const activePage = state.pages[state.activeId] ?? null
  const breadcrumbs = useMemo(
    () => (activePage ? getBreadcrumbs(state.pages, activePage.id) : []),
    [state.pages, activePage],
  )

  return {
    pages: state.pages,
    activeId: state.activeId,
    activePage,
    tree,
    breadcrumbs,
    setActive,
    createPage,
    updatePage,
    setContent,
    deletePage,
    movePage,
    duplicatePage,
    resetWorkspace,
    storageError,
  }
}
