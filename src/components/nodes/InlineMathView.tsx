import {
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import katex from 'katex'
import { openMathDialog } from '../../editor/math/dialogStore'

export function InlineMathView({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const latex = String(node.attrs.latex ?? '')
  const empty = !latex.trim()

  const rendered = useMemo(() => {
    if (empty) return { html: '', error: false }
    try {
      return {
        html: katex.renderToString(latex, {
          displayMode: false,
          throwOnError: true,
          trust: false,
        }),
        error: false,
      }
    } catch {
      return {
        html: katex.renderToString(latex, {
          displayMode: false,
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
      mode: 'inline',
      initialLatex: latex,
      allowModeChange: false,
      onApply: (nextLatex) => updateAttributes({ latex: nextLatex }),
    })
  }

  return (
    <NodeViewWrapper
      as="span"
      className="math-inline"
      data-selected={selected ? 'true' : 'false'}
      data-error={rendered.error ? 'true' : 'false'}
      data-empty={empty ? 'true' : 'false'}
      contentEditable={false}
      role="button"
      tabIndex={0}
      title={latex || 'Inline math'}
      aria-label={latex ? `Inline math: ${latex}` : 'Empty inline math'}
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
      onMouseDown={(event: ReactMouseEvent<HTMLElement>) =>
        event.stopPropagation()
      }
    >
      {empty ? (
        <span className="math-inline__placeholder">∑ math</span>
      ) : (
        <span
          className="math-inline__content"
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      )}
    </NodeViewWrapper>
  )
}
