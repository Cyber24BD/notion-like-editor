import { useEffect } from 'react'
import {
  closeMermaidDialog,
  useMermaidDialog,
} from '../editor/mermaid/dialogStore'
import { LazyMermaidDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function MermaidDialogHost() {
  const state = useMermaidDialog()
  const options = state.options

  useEffect(() => {
    if (!state.open) return
    return () => closeMermaidDialog()
  }, [state.open])

  if (!state.open || !options) return null

  return (
    <LazyMermaidDialog
      initialCode={options.initialCode}
      initialTheme={options.initialTheme}
      initialHeight={options.initialHeight}
      onApply={(code, theme, height) => {
        options.onApply(code, theme, height)
        closeMermaidDialog()
      }}
      onClose={closeMermaidDialog}
    />
  )
}
