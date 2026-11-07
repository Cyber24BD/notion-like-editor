import { useEffect } from 'react'
import { closeIframeDialog, useIframeDialog } from '../editor/iframe/dialogStore'
import { LazyIframeDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function IframeDialogHost() {
  const state = useIframeDialog()
  const editor = state.editor

  useEffect(() => {
    if (!state.open) return
    return () => closeIframeDialog()
  }, [state.open])

  if (!state.open || !editor) return null

  return (
    <LazyIframeDialog
      mode="insert"
      onApply={(attributes) => {
        if (!editor.isDestroyed) {
          editor.chain().focus().setIframeEmbed(attributes).run()
        }
        closeIframeDialog()
      }}
      onClose={closeIframeDialog}
    />
  )
}
