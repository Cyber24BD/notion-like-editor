import { useEffect, useRef } from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import { X } from './Icons'
import { SHORTCUT_GROUPS, formatShortcut } from '../editor/shortcuts'

interface ShortcutsDialogProps {
  onClose: () => void
}

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef)

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createNotionPortal(
    <div
      className="shortcuts-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <header className="shortcuts-dialog__head">
          <div>
            <h2 id="shortcuts-title" className="shortcuts-dialog__title">
              Keyboard shortcuts
            </h2>
            <p className="shortcuts-dialog__subtitle">
              Work faster without leaving the keyboard.
            </p>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close keyboard shortcuts"
            onClick={onClose}
            autoFocus
          >
            <X size={16} />
          </button>
        </header>

        <div className="shortcuts-dialog__grid">
          {SHORTCUT_GROUPS.map((group) => (
            <section className="shortcuts-group" key={group.title}>
              <h3 className="shortcuts-group__title">{group.title}</h3>
              <dl className="shortcuts-list">
                {group.items.map((item) => (
                  <div className="shortcuts-list__row" key={`${group.title}-${item.keys}-${item.label}`}>
                    <dt>
                      <kbd className="shortcuts-kbd">
                        {formatShortcut(item.keys, isMac)}
                      </kbd>
                    </dt>
                    <dd>
                      {item.label}
                      {item.note && (
                        <span className="shortcuts-list__note">{item.note}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="shortcuts-dialog__footer">
          Tip: press <kbd className="shortcuts-kbd">/</kbd> on an empty line for
          the full block menu, or <kbd className="shortcuts-kbd">{formatShortcut('Mod+F', isMac)}</kbd> to
          search this page.
        </footer>
      </section>
    </div>,
  )
}
