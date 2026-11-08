import { useState } from 'react'
import type { Page } from '../types'
import type { ThemeApi } from '../hooks/useTheme'
import { Menu, type MenuNode } from './Menu'
import {
  ChevronRight,
  Copy,
  FileText,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Share,
  Sun,
  Trash,
} from './Icons'

interface TopBarProps {
  page: Page
  breadcrumbs: Page[]
  wordCount: number
  onToggleSidebar: () => void
  onNavigate: (id: string) => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  theme: ThemeApi
}

export function TopBar({
  page,
  breadcrumbs,
  wordCount,
  onToggleSidebar,
  onNavigate,
  onDuplicate,
  onExport,
  onDelete,
  theme,
}: TopBarProps) {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const entries: MenuNode[] = [
    {
      id: 'duplicate',
      label: 'Duplicate page',
      icon: <Copy size={15} />,
      onSelect: onDuplicate,
    },
    {
      id: 'export',
      label: 'Export as JSON',
      icon: <FileText size={15} />,
      onSelect: onExport,
    },
    {
      id: 'share',
      label: 'Copy page link',
      icon: <Share size={15} />,
      onSelect: () => void share(),
    },
    { type: 'separator', id: 'sep' },
    {
      id: 'delete',
      label: 'Delete page',
      icon: <Trash size={15} />,
      danger: true,
      onSelect: onDelete,
    },
  ]

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="notion-icon-btn topbar__toggle"
          aria-label="Toggle sidebar"
          data-tooltip="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <PanelLeft size={16} />
        </button>
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span className="breadcrumbs__item" key={crumb.id}>
              {index > 0 && (
                <span className="breadcrumbs__sep" aria-hidden="true">
                  <ChevronRight size={11} />
                </span>
              )}
              <button
                type="button"
                className="breadcrumbs__link"
                data-current={crumb.id === page.id ? 'true' : 'false'}
                onClick={() => onNavigate(crumb.id)}
              >
                <span className="breadcrumbs__icon" aria-hidden="true">
                  {crumb.icon || '📄'}
                </span>
                <span className="breadcrumbs__title">{crumb.title || 'Untitled'}</span>
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div className="topbar__right">
        <span className="topbar__meta">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <button type="button" className="notion-btn" onClick={() => void share()}>
          {copied ? 'Link copied' : 'Share'}
        </button>
        <button
          type="button"
          className="notion-icon-btn"
          aria-label="Page options"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setMenuAt({ x: rect.right, y: rect.bottom + 4 })
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        <button
          type="button"
          className="notion-icon-btn"
          aria-label="Toggle dark mode"
          data-tooltip="Toggle theme (⌘⇧M)"
          onClick={theme.cycle}
        >
          {theme.resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {menuAt && (
        <Menu
          x={menuAt.x}
          y={menuAt.y}
          width={228}
          align="right"
          entries={entries}
          onClose={() => setMenuAt(null)}
        />
      )}
    </header>
  )
}
