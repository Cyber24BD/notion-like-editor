import { useEffect, useRef, useState } from 'react'
import type { PageTreeNode } from '../types'
import type { WorkspaceApi } from '../store/usePages'
import type { ThemeApi } from '../hooks/useTheme'
import { Menu, type MenuNode } from './Menu'
import { MovePageDialog } from './MovePageDialog'
import { formatShortcut } from '../editor/shortcuts'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sun,
  Trash,
  Warning,
} from './Icons'

interface SidebarProps {
  workspace: WorkspaceApi
  open: boolean
  isMobile: boolean
  onClose: () => void
  onOpenSearch: () => void
  onReset: () => void
  theme: ThemeApi
}

type DropPosition = 'before' | 'after' | 'inside'

interface TreeItemProps {
  node: PageTreeNode
  activeId: string
  nextSiblingId: string | null
  siblings: PageTreeNode[]
  parentParentId: string | null
  parentNextSiblingId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateChild: (parentId: string) => void
  onMove: (id: string, parentId: string | null, beforeId: string | null) => void
  onMoveToPage: (id: string) => void
}

function TreeItem({
  node,
  activeId,
  nextSiblingId,
  siblings,
  parentParentId,
  parentNextSiblingId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onCreateChild,
  onMove,
  onMoveToPage,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.title)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null)
  const dropPositionRef = useRef<DropPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const cancelledRef = useRef(false)

  const updateDropPosition = (position: DropPosition | null) => {
    dropPositionRef.current = position
    setDropPosition(position)
  }

  useEffect(() => {
    if (node.children.length > 0) setExpanded(true)
  }, [node.children.length])

  useEffect(() => {
    if (!editing) setDraft(node.title)
  }, [node.title, editing])

  const commit = () => {
    setEditing(false)
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    if (draft !== node.title) onRename(node.id, draft)
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (editing) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-notion-page', node.id)
    event.dataTransfer.setData('text/plain', node.id)
    setDragging(true)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (editing) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    const offset = (event.clientY - rect.top) / Math.max(1, rect.height)
    updateDropPosition(offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'inside')
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      updateDropPosition(null)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const id =
      event.dataTransfer.getData('application/x-notion-page') ||
      event.dataTransfer.getData('text/plain')
    const position = dropPositionRef.current
    updateDropPosition(null)
    setDragging(false)
    if (!id || id === node.id || !position) return
    if (position === 'inside') {
      setExpanded(true)
      onMove(id, node.id, null)
      return
    }
    onMove(id, node.parentId, position === 'before' ? node.id : nextSiblingId)
  }

  const siblingIndex = siblings.findIndex((sibling) => sibling.id === node.id)
  const previousSibling = siblingIndex > 0 ? siblings[siblingIndex - 1] : null
  const nextSibling = siblingIndex >= 0 ? siblings[siblingIndex + 1] ?? null : null
  const nextNextSibling = siblingIndex >= 0 ? siblings[siblingIndex + 2] ?? null : null

  const entries: MenuNode[] = [
    {
      id: 'rename',
      label: 'Rename',
      icon: <FileText size={15} />,
      onSelect: () => setEditing(true),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Plus size={15} />,
      onSelect: () => onDuplicate(node.id),
    },
    {
      id: 'add-child',
      label: 'Add sub-page',
      icon: <Plus size={15} />,
      onSelect: () => onCreateChild(node.id),
    },
    { type: 'separator', id: 'move-sep' },
    {
      id: 'move-up',
      label: 'Move up',
      icon: <ArrowUp size={15} />,
      disabled: !previousSibling,
      onSelect: () => {
        if (previousSibling) onMove(node.id, node.parentId, previousSibling.id)
      },
    },
    {
      id: 'move-down',
      label: 'Move down',
      icon: <ArrowDown size={15} />,
      disabled: !nextSibling,
      onSelect: () => {
        if (nextSibling) onMove(node.id, node.parentId, nextNextSibling?.id ?? null)
      },
    },
    {
      id: 'indent',
      label: 'Indent / nest',
      icon: <ChevronRight size={15} />,
      disabled: !previousSibling,
      onSelect: () => {
        if (!previousSibling) return
        setExpanded(true)
        onMove(node.id, previousSibling.id, null)
      },
    },
    {
      id: 'outdent',
      label: 'Move out',
      icon: <ChevronLeft size={15} />,
      disabled: node.parentId === null,
      onSelect: () => {
        if (node.parentId === null) return
        onMove(node.id, parentParentId, parentNextSiblingId)
      },
    },
    {
      id: 'move-to-page',
      label: 'Move to page…',
      icon: <FileText size={15} />,
      onSelect: () => onMoveToPage(node.id),
    },
    { type: 'separator', id: 'sep' },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash size={15} />,
      danger: true,
      onSelect: () => onDelete(node.id),
    },
  ]

  return (
    <div className="tree-item">
      <div
        className="tree-row"
        data-active={node.id === activeId ? 'true' : 'false'}
        data-drop={dropPosition ?? undefined}
        data-dragging={dragging ? 'true' : undefined}
        draggable={!editing}
        onDragStart={handleDragStart}
        onDragEnd={() => {
          setDragging(false)
          updateDropPosition(null)
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ paddingLeft: 6 + node.depth * 14 }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            className="tree-chevron"
            data-open={expanded ? 'true' : 'false'}
            aria-label={expanded ? 'Collapse page' : 'Expand page'}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronRight size={12} />
          </button>
        ) : (
          <span className="tree-chevron tree-chevron--empty" />
        )}

        {editing ? (
          <input
            className="tree-rename"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                cancelledRef.current = true
                setDraft(node.title)
                setEditing(false)
              }
            }}
            aria-label="Page title"
          />
        ) : (
          <button
            type="button"
            className="tree-label"
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => setEditing(true)}
            aria-current={node.id === activeId ? 'page' : undefined}
          >
            <span className="tree-icon" aria-hidden="true">
              {node.icon || '📄'}
            </span>
            <span className="tree-title">{node.title || 'Untitled'}</span>
          </button>
        )}

        <div className="tree-actions">
          <button
            type="button"
            className="tree-action"
            aria-label="Page options"
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              setMenuAt({ x: rect.left, y: rect.bottom + 4 })
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {expanded &&
        node.children.map((child, index) => (
          <TreeItem
            key={child.id}
            node={child}
            activeId={activeId}
            nextSiblingId={node.children[index + 1]?.id ?? null}
            siblings={node.children}
            parentParentId={node.parentId}
            parentNextSiblingId={nextSiblingId}
            onSelect={onSelect}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCreateChild={onCreateChild}
            onMove={onMove}
            onMoveToPage={onMoveToPage}
          />
        ))}

      {menuAt && (
        <Menu
          x={menuAt.x}
          y={menuAt.y}
          width={232}
          entries={entries}
          onClose={() => setMenuAt(null)}
        />
      )}
    </div>
  )
}

export function Sidebar({
  workspace,
  open,
  isMobile,
  onClose,
  onOpenSearch,
  onReset,
  theme,
}: SidebarProps) {
  const [workspaceMenuAt, setWorkspaceMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [movePageId, setMovePageId] = useState<string | null>(null)
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  const workspaceEntries: MenuNode[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun size={15} />,
      shortcut: theme.mode === 'light' ? '✓' : undefined,
      onSelect: () => theme.setMode('light'),
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon size={15} />,
      shortcut: theme.mode === 'dark' ? '✓' : undefined,
      onSelect: () => theme.setMode('dark'),
    },
    {
      id: 'system',
      label: 'Use system setting',
      icon: <Monitor size={15} />,
      shortcut: theme.mode === 'system' ? '✓' : undefined,
      onSelect: () => theme.setMode('system'),
    },
    { type: 'separator', id: 'theme-sep' },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      icon: <FileText size={15} />,
      shortcut: formatShortcut('Mod+/', isMac),
      onSelect: () => window.dispatchEvent(new Event('notion:shortcuts')),
    },
    {
      id: 'reset',
      label: 'Reset demo workspace',
      icon: <Settings size={15} />,
      danger: true,
      onSelect: onReset,
    },
  ]

  const themeIcon =
    theme.resolved === 'dark' ? <Moon size={15} /> : <Sun size={15} />

  return (
    <aside
      className="sidebar notion-scroll"
      data-mobile={isMobile ? 'true' : 'false'}
      aria-hidden={!open}
    >
      <div className="sidebar__inner">
        <div className="sidebar__top">
          <button
            type="button"
            className="workspace-switch"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              setWorkspaceMenuAt({ x: rect.left, y: rect.bottom + 4 })
            }}
          >
            <span className="workspace-avatar" aria-hidden="true">
              N
            </span>
            <span className="workspace-name">Notion-like</span>
            <ChevronDown size={13} />
          </button>
        </div>

        <div className="sidebar__actions">
          <button type="button" className="sidebar-action" onClick={onOpenSearch}>
            <Search size={15} />
            <span>Search</span>
            <kbd className="sidebar-action__kbd">⌘K</kbd>
          </button>
          <button
            type="button"
            className="sidebar-action"
            onClick={() => {
              workspace.createPage(null)
              if (isMobile) onClose()
            }}
          >
            <FileText size={15} />
            <span>New page</span>
          </button>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-head">
            <span>Private</span>
            <button
              type="button"
              className="sidebar__section-add"
              aria-label="New page"
              data-tooltip="New page"
              onClick={() => workspace.createPage(null)}
            >
              <Plus size={14} />
            </button>
          </div>

          <nav className="sidebar__tree" aria-label="Pages">
            {workspace.tree.map((node, index) => (
              <TreeItem
                key={node.id}
                node={node}
                activeId={workspace.activeId}
                nextSiblingId={workspace.tree[index + 1]?.id ?? null}
                siblings={workspace.tree}
                parentParentId={null}
                parentNextSiblingId={null}
                onSelect={(id) => {
                  workspace.setActive(id)
                  if (isMobile) onClose()
                }}
                onRename={(id, title) => workspace.updatePage(id, { title })}
                onDuplicate={(id) => workspace.duplicatePage(id)}
                onDelete={(id) => {
                  const page = workspace.pages[id]
                  const hasChildren = Object.values(workspace.pages).some(
                    (candidate) => candidate.parentId === id,
                  )
                  if (
                    !hasChildren ||
                    window.confirm(`Delete “${page?.title || 'Untitled'}” and its sub-pages?`)
                  ) {
                    workspace.deletePage(id)
                  }
                }}
                onCreateChild={(parentId) => {
                  workspace.createPage(parentId)
                  if (isMobile) onClose()
                }}
                onMove={workspace.movePage}
                onMoveToPage={setMovePageId}
              />
            ))}
            {workspace.tree.length === 0 && (
              <p className="sidebar__empty">No pages yet — create one.</p>
            )}
          </nav>
        </div>

        <div className="sidebar__footer">
          <button type="button" className="sidebar-action" onClick={theme.cycle}>
            {themeIcon}
            <span>{theme.resolved === 'dark' ? 'Dark' : 'Light'} mode</span>
          </button>
          <button type="button" className="sidebar-action" onClick={onReset}>
            <Settings size={15} />
            <span>Reset demo</span>
          </button>
          <div
            className="sidebar__hint"
            data-warning={workspace.storageError ? 'true' : 'false'}
          >
            {workspace.storageError ? <Warning size={12} /> : <Check size={12} />}
            {workspace.storageError
              ? 'Storage full — changes are not saved'
              : 'Saved to this browser'}
          </div>
        </div>
      </div>

      {movePageId && (
        <MovePageDialog
          pageId={movePageId}
          tree={workspace.tree}
          onMove={workspace.movePage}
          onClose={() => setMovePageId(null)}
        />
      )}

      {workspaceMenuAt && (
        <Menu
          x={workspaceMenuAt.x}
          y={workspaceMenuAt.y}
          width={232}
          entries={workspaceEntries}
          onClose={() => setWorkspaceMenuAt(null)}
        />
      )}
    </aside>
  )
}
