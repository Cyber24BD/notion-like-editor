import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import {
  formatMermaidError,
  mermaidLiveUrl,
  renderMermaid,
} from '../editor/mermaid/render'
import { MERMAID_TEMPLATES } from '../editor/mermaid/templates'
import { Check, Copy, ExternalLink, Mermaid, X } from './Icons'

interface MermaidDialogProps {
  initialCode: string
  initialTheme: string
  initialHeight: number
  onApply: (code: string, theme: string, height: number) => void
  onClose: () => void
}

const THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'base', label: 'Base' },
]

const HEIGHTS = [
  { value: 0, label: 'Auto' },
  { value: 240, label: '240px' },
  { value: 360, label: '360px' },
  { value: 480, label: '480px' },
  { value: 640, label: '640px' },
]

export function MermaidDialog({
  initialCode,
  initialTheme,
  initialHeight,
  onApply,
  onClose,
}: MermaidDialogProps) {
  const [code, setCode] = useState(initialCode)
  const [theme, setTheme] = useState(initialTheme)
  const [height, setHeight] = useState(initialHeight)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const canSubmit = code.trim().length > 0 && !error && !loading

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

  useEffect(() => {
    let cancelled = false
    if (!code.trim()) {
      setSvg('')
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      void renderMermaid(code, theme)
        .then((nextSvg) => {
          if (cancelled) return
          setSvg(nextSvg)
          setLoading(false)
        })
        .catch((renderError) => {
          if (cancelled) return
          setSvg('')
          setError(formatMermaidError(renderError))
          setLoading(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [code, theme])

  const submit = useCallback(() => {
    if (!canSubmit) return
    onApply(code.trim(), theme, height)
    onClose()
  }, [canSubmit, code, height, onApply, onClose, theme])

  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard
      .writeText(code)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const openLive = () => {
    if (!code.trim()) return
    window.open(mermaidLiveUrl(code, theme), '_blank', 'noopener,noreferrer')
  }

  const onCodeKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  return createNotionPortal(
    <div
      ref={dialogRef}
      className="video-dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="video-dialog mermaid-dialog notion-scroll"
        role="dialog"
        aria-modal="true"
        aria-label="Mermaid diagram"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="mermaid-dialog__head">
          <span className="mermaid-dialog__head-icon" aria-hidden="true">
            <Mermaid size={20} />
          </span>
          <div className="mermaid-dialog__head-text">
            <div className="video-dialog__title">
              {initialCode ? 'Edit diagram' : 'Insert diagram'}
            </div>
            <div className="video-dialog__subtitle">
              Write Mermaid syntax and preview flowcharts, sequence diagrams,
              Gantt charts, class diagrams and more.
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close Mermaid dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="video-dialog__field">
          <div className="mermaid-dialog__label-row">
            <label className="video-dialog__label" htmlFor="mermaid-code-input">
              Mermaid code
            </label>
            <span className="mermaid-dialog__badge">{theme}</span>
          </div>
          <div
            className="mermaid-dialog__input-wrap"
            data-error={error ? 'true' : 'false'}
          >
            <textarea
              id="mermaid-code-input"
              ref={inputRef}
              className="mermaid-dialog__textarea notion-scroll"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={onCodeKeyDown}
              placeholder={'flowchart TD\n  A[Start] --> B[End]'}
              spellCheck={false}
              rows={8}
              aria-invalid={Boolean(error)}
            />
          </div>
          {error ? (
            <p className="video-dialog__error">{error}</p>
          ) : (
            <p className="video-dialog__hint">
              Tip: press ⌘/Ctrl + Enter to insert. Use the templates below to
              start quickly.
            </p>
          )}
        </div>

        <div className="video-dialog__field">
          <span className="video-dialog__label">Preview</span>
          <div
            className="mermaid-dialog__preview"
            data-theme={theme}
            data-error={error ? 'true' : 'false'}
            data-empty={code.trim() ? 'false' : 'true'}
            data-loading={loading ? 'true' : 'false'}
            aria-live="polite"
          >
            {loading ? (
              <div className="mermaid-dialog__spinner" aria-hidden="true" />
            ) : error ? (
              <span className="mermaid-dialog__preview-empty">
                Fix the syntax to see the preview.
              </span>
            ) : svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <span className="mermaid-dialog__preview-empty">
                Your diagram preview appears here.
              </span>
            )}
          </div>
        </div>

        <div className="mermaid-dialog__options">
          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="mermaid-theme-select">
              Theme
            </label>
            <select
              id="mermaid-theme-select"
              className="mermaid-dialog__select"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              {THEMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="mermaid-height-select">
              Height
            </label>
            <select
              id="mermaid-height-select"
              className="mermaid-dialog__select"
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            >
              {HEIGHTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="video-dialog__field">
          <span className="video-dialog__label">Templates</span>
          <div className="mermaid-dialog__templates">
            {MERMAID_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="mermaid-dialog__template"
                title={template.label}
                onClick={() => setCode(template.code)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            Diagrams render locally with Mermaid. Nothing is uploaded.
          </span>
          <div className="video-dialog__actions">
            <button
              type="button"
              className="notion-btn mermaid-dialog__copy"
              onClick={copy}
              disabled={!code.trim()}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <button
              type="button"
              className="notion-btn mermaid-dialog__clear"
              onClick={() => setCode('')}
              disabled={!code}
            >
              Clear
            </button>
            <button
              type="button"
              className="notion-btn mermaid-dialog__live"
              onClick={openLive}
              disabled={!code.trim()}
            >
              <ExternalLink size={14} />
              Mermaid Live
            </button>
            <button type="button" className="notion-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="notion-btn notion-btn--primary"
              disabled={!canSubmit}
              onClick={submit}
            >
              {initialCode ? 'Update diagram' : 'Insert diagram'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
