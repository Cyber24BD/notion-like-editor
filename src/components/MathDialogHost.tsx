import { useEffect } from 'react'
import { closeMathDialog, useMathDialog } from '../editor/math/dialogStore'
import { LazyMathDialog } from './lazy/LazyWidgets'

/** Eager, tiny host; the actual dialog is loaded the first time it is opened. */
export function MathDialogHost() {
  const state = useMathDialog()
  const options = state.options

  useEffect(() => {
    if (!state.open) return
    return () => closeMathDialog()
  }, [state.open])

  if (!state.open || !options) return null

  return (
    <LazyMathDialog
      mode={options.mode}
      initialLatex={options.initialLatex}
      allowModeChange={options.allowModeChange}
      onApply={(latex, mode) => {
        options.onApply(latex, mode)
        closeMathDialog()
      }}
      onClose={closeMathDialog}
    />
  )
}
