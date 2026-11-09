import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import { CustomHtmlFrame } from './custom-html/CustomHtmlFrame'
import { Check, Code, Copy, X } from './Icons'
import {
  DEFAULT_CUSTOM_HTML_OPTIONS,
  type CustomHtmlSandboxOptions,
  type CustomHtmlSource,
} from '../editor/customHtml/document'

type CodeTab = 'html' | 'css' | 'javascript'

interface CustomHtmlDialogProps {
  editing?: boolean
  initialHtml: string
  initialCss: string
  initialJavascript: string
  initialOptions?: CustomHtmlSandboxOptions
  onApply: (
    html: string,
    css: string,
    javascript: string,
    options: CustomHtmlSandboxOptions,
  ) => void
  onClose: () => void
}

const TABS: Array<{ id: CodeTab; label: string }> = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'javascript', label: 'JavaScript' },
]

export function CustomHtmlDialog({
  editing = false,
  initialHtml,
  initialCss,
  initialJavascript,
  initialOptions = DEFAULT_CUSTOM_HTML_OPTIONS,
  onApply,
  onClose,
}: CustomHtmlDialogProps) {
  const [html, setHtml] = useState(initialHtml)
  const [css, setCss] = useState(initialCss)
  const [javascript, setJavascript] = useState(initialJavascript)
  const [tab, setTab] = useState<CodeTab>('html')
  const [preview, setPreview] = useState<CustomHtmlSource>({
    html: initialHtml,
    css: initialCss,
    javascript: initialJavascript,
  })
  const [options, setOptions] = useState<CustomHtmlSandboxOptions>(initialOptions)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const firstInputRef = useRef<HTMLTextAreaElement>(null)

  useFocusTrap(dialogRef)

  const canApply = Boolean(html.trim() || css.trim() || javascript.trim())

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() =>
      firstInputRef.current?.focus(),
    )
    return () => {
      window.cancelAnimationFrame(frame)
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
    setError('')
    const timer = window.setTimeout(() => {
      setPreview({ html, css, javascript })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [html, css, javascript])

  const apply = useCallback(() => {
    if (!canApply) return
    onApply(html, css, javascript, options)
    onClose()
  }, [canApply, css, html, javascript, onApply, onClose, options])

  const copy = () => {
    if (!navigator.clipboard) return
    const source = `<style>\n${css}\n</style>\n${html}\n<script>\n${javascript}\n</script>`
    void navigator.clipboard
      .writeText(source)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const onCodeKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      apply()
    }
  }

  const value = tab === 'html' ? html : tab === 'css' ? css : javascript
  const setValue =
    tab === 'html' ? setHtml : tab === 'css' ? setCss : setJavascript
  const placeholder =
    tab === 'html'
      ? '<div class="card">Hello</div>'
      : tab === 'css'
        ? '.card { padding: 24px; }'
        : "document.querySelector('.card')?.addEventListener('click', () => {})"

  return createNotionPortal(
    <div
      className="custom-html-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="custom-html-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-html-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="custom-html-dialog__head">
          <span className="custom-html-dialog__head-icon" aria-hidden="true">
            <Code size={20} />
          </span>
          <div className="custom-html-dialog__head-text">
            <h2 id="custom-html-title" className="custom-html-dialog__title">
              {editing ? 'Edit custom block' : 'Custom HTML block'}
            </h2>
            <p className="custom-html-dialog__subtitle">
              HTML, CSS and JavaScript in an isolated sandbox. Build any design
              without adding another block type.
            </p>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close custom HTML dialog"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="custom-html-dialog__body">
          <div className="custom-html-editor">
            <div
              className="custom-html-tabs"
              role="tablist"
              aria-label="Code type"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className="custom-html-tab"
                  data-active={tab === item.id ? 'true' : 'false'}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
              <span className="custom-html-tabs__spacer" />
              <button
                type="button"
                className="custom-html-tabs__copy"
                onClick={copy}
                aria-label="Copy all custom HTML code"
                title="Copy all code"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <textarea
              ref={tab === 'html' ? firstInputRef : undefined}
              className="custom-html-textarea notion-scroll"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={onCodeKeyDown}
              placeholder={placeholder}
              spellCheck={false}
              aria-label={`${tab} code`}
            />
          </div>

          <div className="custom-html-preview-panel">
            <div className="custom-html-preview-panel__head">
              <span>Live preview</span>
              <span className="custom-html-preview-panel__hint">Sandboxed</span>
            </div>
            {error && (
              <div className="custom-html-preview-panel__error" role="alert">
                {error}
              </div>
            )}
            <div className="custom-html-preview-panel__frame">
              <CustomHtmlFrame
                html={preview.html}
                css={preview.css}
                javascript={preview.javascript}
                options={options}
                minHeight={220}
                maxHeight={440}
                onError={setError}
              />
            </div>
            <p className="custom-html-preview-panel__note">
              {options.allowScripts
                ? 'Scripts run in a sandbox and cannot read this page.'
                : 'Scripts are disabled for this block.'}{' '}
              {options.allowNetwork
                ? 'Network access is enabled, so only use trusted code.'
                : 'Network access is blocked by the frame policy.'}
            </p>
            <details className="custom-html-advanced">
              <summary>Advanced sandbox options</summary>
              <div className="custom-html-advanced__grid">
                <label className="custom-html-option">
                  <input
                    type="checkbox"
                    checked={options.allowScripts}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        allowScripts: event.target.checked,
                      })
                    }
                  />
                  <span>Run JavaScript</span>
                </label>
                <label className="custom-html-option">
                  <input
                    type="checkbox"
                    checked={options.allowForms}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        allowForms: event.target.checked,
                      })
                    }
                  />
                  <span>Allow forms</span>
                </label>
                <label className="custom-html-option">
                  <input
                    type="checkbox"
                    checked={options.allowNetwork}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        allowNetwork: event.target.checked,
                      })
                    }
                  />
                  <span>Allow network</span>
                </label>
                <label className="custom-html-option">
                  <input
                    type="checkbox"
                    checked={options.allowPopups}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        allowPopups: event.target.checked,
                      })
                    }
                  />
                  <span>Allow popups</span>
                </label>
              </div>
              <p className="custom-html-advanced__note">
                Disable scripts for untrusted snippets. Synchronous infinite
                loops can still freeze the browser; reload the block or turn
                scripts off to recover.
              </p>
            </details>
          </div>
        </div>

        {copied && (
          <div className="custom-html-toast" role="status" aria-live="polite">
            Copied HTML, CSS and JavaScript
          </div>
        )}

        <footer className="custom-html-dialog__foot">
          <span className="custom-html-dialog__foot-hint">
            ⌘/Ctrl + Enter to {editing ? 'update' : 'insert'}
          </span>
          <div className="custom-html-dialog__actions">
            <button type="button" className="notion-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="notion-btn notion-btn--primary"
              disabled={!canApply}
              onClick={apply}
            >
              {editing ? 'Update block' : 'Insert block'}
            </button>
          </div>
        </footer>
      </section>
    </div>,
  )
}
