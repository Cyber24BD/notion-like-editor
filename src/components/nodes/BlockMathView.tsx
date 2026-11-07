import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import katex from 'katex'
import { openMathDialog } from '../../editor/math/dialogStore'
import { Check, Copy, Pencil, Trash } from '../Icons'

export function BlockMathView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const latex = String(node.attrs.latex ?? '')
  const empty = !latex.trim()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const rendered = useMemo(() => {
    if (empty) return { html: '', error: false }
    try {
      return {
        html: katex.renderToString(latex, {
          displayMode: true,
          throwOnError: true,
          trust: false,
        }),
        error: false,
      }
    } catch {
      return {
        html: katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          errorColor: '#d44',
          trust: false,
        }),
        error: true,
      }
    }
  }, [empty, latex])

  const edit = () => {
    openMathDialog({
      editor,
      mode: 'block',
      initialLatex: latex,
      allowModeChange: false,
      onApply: (nextLatex) => updateAttributes({ latex: nextLatex }),
    })
  }

  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard
      .writeText(latex)
      .then(() => setCopied(true))
      .catch(() => undefined)
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

  return (
    <NodeViewWrapper
      className="math-block"
      data-selected={selected ? 'true' : 'false'}
      data-error={rendered.error ? 'true' : 'false'}
      data-empty={empty ? 'true' : 'false'}
      contentEditable={false}
      role="button"
      tabIndex={0}
      title={latex || 'Block math'}
      aria-label={latex ? `Block math: ${latex}` : 'Empty block math'}
      onClick={(event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        event.stopPropagation()
        edit()
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          edit()
        }
      }}
    >
      <div
        className="math-block__toolbar"
        contentEditable={false}
        role="toolbar"
        aria-label="Math options"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="math-block__btn"
          aria-label="Edit equation"
          title="Edit equation"
          onClick={edit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="math-block__btn"
          aria-label={copied ? 'LaTeX copied' : 'Copy LaTeX'}
          title={copied ? 'Copied' : 'Copy LaTeX'}
          data-copied={copied ? 'true' : 'false'}
          onClick={copy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button
          type="button"
          className="math-block__btn math-block__btn--danger"
          aria-label="Delete equation"
          title="Delete equation"
          onClick={remove}
        >
          <Trash size={14} />
        </button>
      </div>

      {empty ? (
        <div className="math-block__placeholder">
          Click to add a block equation
        </div>
      ) : (
        <div
          className="math-block__content"
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      )}

      {rendered.error && (
        <div className="math-block__error">Invalid LaTeX — click to edit</div>
      )}
    </NodeViewWrapper>
  )
}
