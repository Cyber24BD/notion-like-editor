import { useEffect, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { createNotionPortal } from '../NotionPortal'
import { CustomHtmlFrame } from '../custom-html/CustomHtmlFrame'
import { openCustomHtmlDialog } from '../../editor/customHtml/dialogStore'
import { downloadCustomHtml } from '../../editor/customHtml/document'
import { Code, Download, Maximize, Pencil, Refresh, Trash, X } from '../Icons'

export function CustomHtmlView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const html = String(node.attrs.html ?? '')
  const css = String(node.attrs.css ?? '')
  const javascript = String(node.attrs.javascript ?? '')
  const empty = !html.trim() && !css.trim() && !javascript.trim()

  const [frameError, setFrameError] = useState('')
  const [frameKey, setFrameKey] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    setFrameError('')
  }, [html, css, javascript])

  const edit = () => {
    openCustomHtmlDialog({
      editing: true,
      initialHtml: html,
      initialCss: css,
      initialJavascript: javascript,
      onApply: (nextHtml, nextCss, nextJavascript) =>
        updateAttributes({
          html: nextHtml,
          css: nextCss,
          javascript: nextJavascript,
        }),
    })
  }

  const remove = () => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run()
  }

  const download = () => {
    downloadCustomHtml({ html, css, javascript })
  }

  return (
    <NodeViewWrapper
      className="custom-html-block"
      data-empty={empty ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      data-error={frameError ? 'true' : 'false'}
      contentEditable={false}
      role="group"
      aria-label="Custom HTML block"
    >
      <div
        className="custom-html-block__toolbar"
        role="toolbar"
        aria-label="Custom HTML options"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="custom-html-block__btn"
          aria-label="Edit custom HTML"
          title="Edit custom HTML"
          onClick={edit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="custom-html-block__btn"
          aria-label="Reload custom HTML"
          title="Reload"
          disabled={empty}
          onClick={() => setFrameKey((value) => value + 1)}
        >
          <Refresh size={14} />
        </button>
        <button
          type="button"
          className="custom-html-block__btn"
          aria-label="Preview custom HTML"
          title="Preview"
          disabled={empty}
          onClick={() => setPreviewOpen(true)}
        >
          <Maximize size={14} />
        </button>
        <button
          type="button"
          className="custom-html-block__btn"
          aria-label="Download custom HTML"
          title="Download HTML"
          disabled={empty}
          onClick={download}
        >
          <Download size={14} />
        </button>
        <button
          type="button"
          className="custom-html-block__btn custom-html-block__btn--danger"
          aria-label="Delete custom HTML"
          title="Delete"
          onClick={remove}
        >
          <Trash size={14} />
        </button>
      </div>

      {empty ? (
        <div className="custom-html-block__empty">
          <Code size={24} />
          <strong>Custom HTML block</strong>
          <span>Add HTML, CSS and JavaScript to build any design.</span>
          <button type="button" className="notion-btn" onClick={edit}>
            Add custom code
          </button>
        </div>
      ) : (
        <div className="custom-html-block__frame">
          <CustomHtmlFrame
            html={html}
            css={css}
            javascript={javascript}
            title="Custom HTML block"
            reloadKey={frameKey}
            minHeight={100}
            maxHeight={1400}
            onError={setFrameError}
          />
        </div>
      )}

      {frameError && (
        <div className="custom-html-block__error" role="alert">
          {frameError}
        </div>
      )}

      {previewOpen &&
        createNotionPortal(
          <div
            className="custom-html-preview-scrim"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setPreviewOpen(false)
            }}
          >
            <section
              className="custom-html-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Custom HTML preview"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <header className="custom-html-preview-dialog__head">
                <strong>Custom HTML preview</strong>
                <button
                  type="button"
                  className="notion-icon-btn"
                  aria-label="Close custom HTML preview"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X size={16} />
                </button>
              </header>
              <CustomHtmlFrame
                html={html}
                css={css}
                javascript={javascript}
                title="Custom HTML preview"
                autoHeight={false}
                height="72vh"
                onError={setFrameError}
              />
            </section>
          </div>,
        )}
    </NodeViewWrapper>
  )
}
