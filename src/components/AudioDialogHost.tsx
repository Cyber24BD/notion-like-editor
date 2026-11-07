import { useEffect } from 'react'
import { closeAudioDialog, useAudioDialog } from '../editor/audio/dialogStore'
import { LazyAudioDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function AudioDialogHost() {
  const state = useAudioDialog()
  const editor = state.editor

  useEffect(() => {
    if (!state.open) return
    return () => closeAudioDialog()
  }, [state.open])

  if (!state.open || !editor) return null

  return (
    <LazyAudioDialog
      mode="insert"
      onApply={(attributes) => {
        if (!editor.isDestroyed) {
          editor.chain().focus().setAudioEmbed(attributes).run()
        }
        closeAudioDialog()
      }}
      onClose={closeAudioDialog}
    />
  )
}
