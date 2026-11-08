import { useEffect } from 'react'
import {
  closeCustomHtmlDialog,
  useCustomHtmlDialog,
} from '../editor/customHtml/dialogStore'
import { LazyCustomHtmlDialog } from './lazy/LazyWidgets'

/** Eager host; the code editor dialog itself is lazy-loaded on first use. */
export function CustomHtmlDialogHost() {
  const state = useCustomHtmlDialog()
  const options = state.options

  useEffect(() => {
    if (!state.open) return
    return () => closeCustomHtmlDialog()
  }, [state.open])

  if (!state.open || !options) return null

  return (
    <LazyCustomHtmlDialog
      editing={options.editing}
      initialHtml={options.initialHtml}
      initialCss={options.initialCss}
      initialJavascript={options.initialJavascript}
      onApply={(html, css, javascript) => {
        options.onApply(html, css, javascript)
        closeCustomHtmlDialog()
      }}
      onClose={closeCustomHtmlDialog}
    />
  )
}
