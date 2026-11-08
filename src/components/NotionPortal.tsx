import type { ReactNode, ReactPortal } from 'react'
import { createPortal } from 'react-dom'

/**
 * Portals escape the editor's scroll container but stay inside the editor's
 * CSS scope. The wrapper has `display: contents` so it does not affect layout.
 */
export function createNotionPortal(children: ReactNode): ReactPortal {
  return createPortal(
    <div className="notion-editor-root notion-editor-portal">{children}</div>,
    document.body,
  )
}
