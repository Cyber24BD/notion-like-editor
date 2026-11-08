import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createNotionPortal } from './NotionPortal'

export interface MenuEntry {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  keepOpen?: boolean
  onSelect: () => void
}

export interface MenuSeparator {
  type: 'separator'
  id: string
}

export type MenuNode = MenuEntry | MenuSeparator

interface MenuProps {
  x: number
  y: number
  entries: MenuNode[]
  onClose: () => void
  width?: number
  align?: 'left' | 'right'
  header?: ReactNode
}

export function Menu({ x, y, entries, onClose, width = 220, align = 'left', header }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: x,
    top: y,
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const height = el.offsetHeight
    const left = align === 'right' ? x - width : x
    setPosition({
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    })
  }, [x, y, width, align])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return createNotionPortal(
    <div
      ref={ref}
      className="notion-menu notion-popover"
      role="menu"
      style={{ left: position.left, top: position.top, width }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {header}
      {entries.map((entry) =>
        'type' in entry ? (
          <div key={entry.id} className="notion-menu__separator" role="separator" />
        ) : (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            className="notion-menu__item"
            data-danger={entry.danger ? 'true' : 'false'}
            onMouseDown={(event) => event.preventDefault()}
            disabled={entry.disabled}
            onClick={() => {
              entry.onSelect()
              if (!entry.keepOpen) onClose()
            }}
          >
            {entry.icon && <span className="notion-menu__icon">{entry.icon}</span>}
            <span className="notion-menu__label">{entry.label}</span>
            {entry.shortcut && <span className="notion-menu__shortcut">{entry.shortcut}</span>}
          </button>
        ),
      )}
    </div>)
}
