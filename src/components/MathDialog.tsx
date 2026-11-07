import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import katex from 'katex'
import {
  MATH_SYMBOLS,
  MATH_TEMPLATES,
  type MathMode,
} from '../editor/math/types'
import { Check, Copy, Sigma, X } from './Icons'

interface MathDialogProps {
  mode: MathMode
  initialLatex: string
  allowModeChange: boolean
  onApply: (latex: string, mode: MathMode) => void
  onClose: () => void
}

export function MathDialog({
  mode: initialMode,
  initialLatex,
  allowModeChange,
  onApply,
  onClose,
}: MathDialogProps) {
  const [latex, setLatex] = useState(initialLatex)
  const [mode, setMode] = useState<MathMode>(initialMode)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const preview = useMemo(() => {
    if (!latex.trim()) return { html: '', error: '' }
    try {
      return {
        html: katex.renderToString(latex, {
          displayMode: mode === 'block',
          throwOnError: true,
          trust: false,
        }),
        error: '',
      }
    } catch (error) {
      return {
        html: katex.renderToString(latex, {
          displayMode: mode === 'block',
          throwOnError: false,
          errorColor: '#d44',
          trust: false,
        }),
        error: error instanceof Error ? error.message : 'Invalid LaTeX',
      }
    }
  }, [latex, mode])

  const canSubmit = latex.trim().length > 0 && !preview.error

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 20)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const submit = useCallback(() => {
    if (!canSubmit) return
    onApply(latex.trim(), mode)
    onClose()
  }, [canSubmit, latex, mode, onApply, onClose])

  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard
      .writeText(latex)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const insertSnippet = (snippet: string) => {
    const textarea = inputRef.current
    if (!textarea) {
      setLatex((value) => value + snippet)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = latex.slice(0, start) + snippet + latex.slice(end)
    setLatex(next)
    window.requestAnimationFrame(() => {
      textarea.focus()
      const position = start + snippet.length
      textarea.setSelectionRange(position, position)
    })
  }

  const onLatexKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  const renderSnippet = (snippet: string) =>
    katex.renderToString(snippet, {
      displayMode: false,
      throwOnError: false,
      trust: false,
    })

  return createPortal(
    <div
      className="video-dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="video-dialog math-dialog notion-scroll"
        role="dialog"
        aria-modal="true"
        aria-label="Math equation"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="math-dialog__head">
          <span className="math-dialog__head-icon" aria-hidden="true">
            <Sigma size={20} />
          </span>
          <div className="math-dialog__head-text">
            <div className="video-dialog__title">
              {initialLatex ? 'Edit equation' : 'Insert equation'}
            </div>
            <div className="video-dialog__subtitle">
              Write LaTeX and preview it live. Use inline math inside a sentence
              or a block equation on its own line.
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close math dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="math-dialog__mode" role="group" aria-label="Math mode">
          <button
            type="button"
            className="math-dialog__mode-btn"
            data-active={mode === 'inline' ? 'true' : 'false'}
            disabled={!allowModeChange}
            onClick={() => setMode('inline')}
          >
            Inline
          </button>
          <button
            type="button"
            className="math-dialog__mode-btn"
            data-active={mode === 'block' ? 'true' : 'false'}
            disabled={!allowModeChange}
            onClick={() => setMode('block')}
          >
            Block
          </button>
        </div>

        <div className="video-dialog__field">
          <div className="math-dialog__label-row">
            <label className="video-dialog__label" htmlFor="math-latex-input">
              LaTeX
            </label>
            <span className="math-dialog__badge">
              {mode === 'inline' ? 'Inline' : 'Block'}
            </span>
          </div>
          <div
            className="math-dialog__input-wrap"
            data-error={preview.error ? 'true' : 'false'}
          >
            <textarea
              id="math-latex-input"
              ref={inputRef}
              className="math-dialog__textarea notion-scroll"
              value={latex}
              onChange={(event) => setLatex(event.target.value)}
              onKeyDown={onLatexKeyDown}
              placeholder={'\\frac{a}{b} + \\sqrt{x}'}
              spellCheck={false}
              rows={4}
              aria-invalid={Boolean(preview.error)}
            />
          </div>
          {preview.error ? (
            <p className="video-dialog__error">{preview.error}</p>
          ) : (
            <p className="video-dialog__hint">
              Tip: press ⌘/Ctrl + Enter to insert. KaTeX supports fractions,
              roots, sums, integrals, matrices, cases and more.
            </p>
          )}
        </div>

        <div className="video-dialog__field">
          <span className="video-dialog__label">Preview</span>
          <div
            className="math-dialog__preview"
            data-mode={mode}
            data-empty={latex.trim() ? 'false' : 'true'}
            data-error={preview.error ? 'true' : 'false'}
            aria-live="polite"
          >
            {latex.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: preview.html }} />
            ) : (
              <span className="math-dialog__preview-empty">
                Your equation preview appears here.
              </span>
            )}
          </div>
        </div>

        <div className="video-dialog__field">
          <span className="video-dialog__label">Symbols</span>
          <div className="math-dialog__symbols">
            {MATH_SYMBOLS.map((symbol) => (
              <button
                key={symbol.label}
                type="button"
                className="math-dialog__symbol"
                title={symbol.label}
                aria-label={symbol.label}
                onClick={() => insertSnippet(symbol.latex)}
                dangerouslySetInnerHTML={{ __html: renderSnippet(symbol.latex) }}
              />
            ))}
          </div>
        </div>

        <div className="video-dialog__field">
          <span className="video-dialog__label">Templates</span>
          <div className="math-dialog__templates">
            {MATH_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="math-dialog__template"
                title={template.latex}
                onClick={() => insertSnippet(template.latex)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            Inline math sits inside text; block math gets its own centered row.
          </span>
          <div className="video-dialog__actions">
            <button
              type="button"
              className="btn math-dialog__copy"
              onClick={copy}
              disabled={!latex.trim()}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy LaTeX'}
            </button>
            <button
              type="button"
              className="btn math-dialog__clear"
              onClick={() => setLatex('')}
              disabled={!latex}
            >
              Clear
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSubmit}
              onClick={submit}
            >
              {initialLatex ? 'Update equation' : 'Insert equation'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
