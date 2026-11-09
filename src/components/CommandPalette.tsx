import { useEffect, useMemo, useRef, useState } from 'react'
import type { PageTreeNode } from '../types'
import { FileText, Plus, Search } from './Icons'
import { useFocusTrap } from './useFocusTrap'

interface CommandPaletteProps {
  open: boolean
  tree: PageTreeNode[]
  onClose: () => void
  onSelect: (pageId: string) => void
  onCreate: (title: string) => void
}

interface FlatPage {
  id: string
  title: string
  icon: string
  depth: number
}

export function CommandPalette({
  open,
  tree,
  onClose,
  onSelect,
  onCreate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useFocusTrap(dialogRef, open)

  const flatPages = useMemo(() => {
    const out: FlatPage[] = []
    const walk = (nodes: PageTreeNode[]) => {
      nodes.forEach((node) => {
        out.push({ id: node.id, title: node.title, icon: node.icon, depth: node.depth })
        walk(node.children)
      })
    }
    walk(tree)
    return out
  }, [tree])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return flatPages.slice(0, 8)
    return flatPages
      .filter((page) => (page.title || 'Untitled').toLowerCase().includes(needle))
      .slice(0, 10)
  }, [flatPages, query])

  const createLabel = query.trim() ? `Create “${query.trim()}”` : 'Create a new page'
  const itemCount = results.length + 1

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 20)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open) return null

  const activate = (nextIndex: number) => {
    if (nextIndex < results.length) {
      const page = results[nextIndex]
      if (page) {
        onSelect(page.id)
        onClose()
      }
    } else {
      onCreate(query.trim())
      onClose()
    }
  }

  return (
    <div className="palette-scrim" onPointerDown={onClose}>
      <div
        ref={dialogRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search pages"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="palette__search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search pages or type a new title…"
            aria-label="Search pages"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setIndex((value) => (value + 1) % itemCount)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setIndex((value) => (value - 1 + itemCount) % itemCount)
              } else if (event.key === 'Enter') {
                event.preventDefault()
                activate(index)
              } else if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
              }
            }}
          />
          <kbd>esc</kbd>
        </div>

        <div className="palette__results notion-scroll">
          {results.length > 0 && <div className="palette__label">Pages</div>}
          {results.map((page, pageIndex) => (
            <button
              key={page.id}
              type="button"
              className="palette__row"
              data-active={index === pageIndex ? 'true' : 'false'}
              onPointerEnter={() => setIndex(pageIndex)}
              onClick={() => {
                onSelect(page.id)
                onClose()
              }}
            >
              <span className="palette__icon" aria-hidden="true">
                {page.icon || '📄'}
              </span>
              <span className="palette__title">{page.title || 'Untitled'}</span>
            </button>
          ))}

          {results.length === 0 && (
            <div className="palette__empty">
              <FileText size={18} />
              <p>No pages match “{query.trim()}”.</p>
            </div>
          )}

          <div className="palette__label">Actions</div>
          <button
            type="button"
            className="palette__row palette__row--create"
            data-active={index === results.length ? 'true' : 'false'}
            onPointerEnter={() => setIndex(results.length)}
            onClick={() => {
              onCreate(query.trim())
              onClose()
            }}
          >
            <span className="palette__icon" aria-hidden="true">
              <Plus size={15} />
            </span>
            <span className="palette__title">{createLabel}</span>
            <span className="palette__hint">
              <kbd>↵</kbd>
            </span>
          </button>
        </div>

        <div className="palette__footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
