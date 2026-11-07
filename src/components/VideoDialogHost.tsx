import { useEffect } from 'react'
import { closeVideoDialog, useVideoDialog } from '../editor/video/dialogStore'
import { LazyVideoDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function VideoDialogHost() {
  const state = useVideoDialog()
  const editor = state.editor

  useEffect(() => {
    if (!state.open) return
    return () => closeVideoDialog()
  }, [state.open])

  if (!state.open || !editor) return null

  return (
    <LazyVideoDialog
      mode="insert"
      onApply={(attributes) => {
        if (!editor.isDestroyed) {
          editor.chain().focus().setVideoEmbed(attributes).run()
        }
        closeVideoDialog()
      }}
      onClose={closeVideoDialog}
    />
  )
}
