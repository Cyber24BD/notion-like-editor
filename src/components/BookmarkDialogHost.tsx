import { useEffect } from 'react'
import { closeBookmarkDialog, useBookmarkDialog } from '../editor/bookmark/dialogStore'
import { LazyBookmarkDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function BookmarkDialogHost() {
  const state = useBookmarkDialog()
  const editor = state.editor

  useEffect(() => {
    if (!state.open) return
    return () => closeBookmarkDialog()
  }, [state.open])

  if (!state.open || !editor) return null

  return (
    <LazyBookmarkDialog
      mode="insert"
      onApply={(attributes) => {
        if (!editor.isDestroyed) {
          editor.chain().focus().setBookmark(attributes).run()
        }
        closeBookmarkDialog()
      }}
      onClose={closeBookmarkDialog}
    />
  )
}
