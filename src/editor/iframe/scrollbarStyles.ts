const STYLE_ID = 'notion-iframe-scrollbar-style'

/**
 * Neutral, theme-agnostic scrollbar styling that works on both light and dark
 * embedded pages. It mirrors the slim Notion-style scrollbar used by the editor.
 */
const SCROLLBAR_CSS = `
:root {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.35) transparent;
}

/* The editor renders its own draggable scrollbar for same-origin embeds. */
html.notion-custom-scrollbar {
  scrollbar-width: none;
}

html.notion-custom-scrollbar::-webkit-scrollbar {
  display: none;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.35);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  min-height: 44px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.5);
}

::-webkit-scrollbar-thumb:active {
  background-color: rgba(128, 128, 128, 0.65);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

@media (pointer: coarse) {
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  ::-webkit-scrollbar-thumb {
    border: 0;
    background-color: rgba(128, 128, 128, 0.4);
  }
}
`

/**
 * Styles the scrollbars *inside* a same-origin iframe. Cross-origin documents
 * are intentionally left alone: the browser blocks access to their DOM, so the
 * embedded site keeps full control over its own scrollbars.
 */
export function styleIframeScrollbars(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return
  try {
    const doc = iframe.contentDocument
    if (!doc?.documentElement) return
    if (doc.getElementById(STYLE_ID)) return

    const style = doc.createElement('style')
    style.id = STYLE_ID
    style.textContent = SCROLLBAR_CSS
    ;(doc.head ?? doc.documentElement).appendChild(style)
  } catch {
    // Cross-origin iframe — nothing we can do from the parent document.
  }
}
