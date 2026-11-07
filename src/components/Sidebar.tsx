import { useEffect, useRef, useState } from 'react'
import type { PageTreeNode } from '../types'
import type { WorkspaceApi } from '../store/usePages'
import type { ThemeApi } from '../hooks/useTheme'
import { Menu, type MenuNode } from './Menu'
import {
  Check,
  ChevronDown,
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

interface TreeItemProps {
  node: PageTreeNode
  activeId: string
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCreateChild: (parentId: string) => void
}

function TreeItem({
  node,
  activeId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onCreateChild,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.title)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  const cancelledRef = useRef(false)

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
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            activeId={activeId}
            onSelect={onSelect}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCreateChild={onCreateChild}
          />
        ))}

      {menuAt && (
        <Menu
          x={menuAt.x}
          y={menuAt.y}
          width={208}
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
            {workspace.tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                activeId={workspace.activeId}
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
