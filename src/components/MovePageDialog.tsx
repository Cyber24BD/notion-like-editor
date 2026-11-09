import { useEffect, useMemo, useRef, useState } from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import { Search, X } from './Icons'
import type { PageTreeNode } from '../types'

interface MovePageDialogProps {
  pageId: string
  tree: PageTreeNode[]
  onMove: (pageId: string, parentId: string, beforeId: string | null) => void
  onClose: () => void
}

function collectDescendants(nodes: PageTreeNode[], pageId: string): Set<string> {
  const blocked = new Set<string>()
  const walk = (list: PageTreeNode[], inside: boolean) => {
    for (const node of list) {
      const nextInside = inside || node.id === pageId
      if (nextInside) blocked.add(node.id)
      walk(node.children, nextInside)
    }
  }
  walk(nodes, false)
  return blocked
}

export function MovePageDialog({
  pageId,
  tree,
  onMove,
  onClose,
}: MovePageDialogProps) {
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useFocusTrap(dialogRef)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const rows = useMemo(() => {
    const blocked = collectDescendants(tree, pageId)
    const needle = query.trim().toLowerCase()
    const out: Array<{ node: PageTreeNode; depth: number }> = []
    const walk = (nodes: PageTreeNode[], depth: number) => {
      for (const node of nodes) {
        if (!blocked.has(node.id)) {
          if (!needle || node.title.toLowerCase().includes(needle)) {
            out.push({ node, depth })
          }
          walk(node.children, depth + 1)
        }
      }
    }
    walk(tree, 0)
    return out
  }, [pageId, query, tree])

  const move = (targetId: string) => {
    onMove(pageId, targetId, null)
    onClose()
  }

  return createNotionPortal(
    <div
      className="move-page-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="move-page-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-page-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="move-page-dialog__head">
          <div>
            <h2 id="move-page-title">Move page to…</h2>
            <p>Choose a page to nest the current page under.</p>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close move page dialog"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="move-page-dialog__search">
          <Search size={14} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a page…"
            aria-label="Find a target page"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
              }
            }}
          />
        </div>

        <div className="move-page-dialog__list notion-scroll" role="list">
          {rows.map(({ node, depth }) => (
            <button
              key={node.id}
              type="button"
              className="move-page-dialog__item"
              style={{ paddingLeft: `${10 + depth * 16}px` }}
              onClick={() => move(node.id)}
            >
              <span aria-hidden="true">{node.icon || '📄'}</span>
              <span>{node.title || 'Untitled'}</span>
            </button>
          ))}
          {rows.length === 0 && (
            <p className="move-page-dialog__empty">
              {query.trim() ? 'No matching pages.' : 'No pages available.'}
            </p>
          )}
        </div>
      </section>
    </div>,
  )
}
