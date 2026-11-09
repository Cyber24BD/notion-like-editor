import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import {
  clampIframeHeight,
  defaultIframeAttrs,
  IFRAME_MAX_HEIGHT,
  IFRAME_MIN_HEIGHT,
  parseIframeInput,
  type IframeAttributes,
} from '../editor/iframe/parseIframe'
import { styleIframeScrollbars } from '../editor/iframe/scrollbarStyles'
import {
  Check,
  Copy,
  ExternalLink,
  Frame,
  LinkIcon,
  Refresh,
  X,
} from './Icons'

export type IframeDialogMode = 'insert' | 'edit'

interface IframeDialogProps {
  mode?: IframeDialogMode
  initial?: Partial<IframeAttributes>
  onApply: (attributes: IframeAttributes) => void
  onClose: () => void
}

export function IframeDialog({
  mode = 'insert',
  initial,
  onApply,
  onClose,
}: IframeDialogProps) {
  const [raw, setRaw] = useState(initial?.src ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [height, setHeight] = useState(initial?.height ?? 420)
  const [allowFullScreen, setAllowFullScreen] = useState(
    initial?.allowFullScreen ?? true,
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const parsed = useMemo(() => parseIframeInput(raw), [raw])
  const host = useMemo(() => {
    if (!parsed) return ''
    try {
      return new URL(parsed.src).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }, [parsed])
  const dirty = raw.trim().length > 0
  const error = dirty && !parsed
  const canSubmit = Boolean(parsed)
  const previewHeight = clampIframeHeight(height)

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
    if (!parsed) return
    onApply(
      defaultIframeAttrs(parsed, {
        title: title.trim() || parsed.title,
        height: clampIframeHeight(height),
        allowFullScreen,
        width: initial?.width ?? 100,
        align: initial?.align ?? 'center',
        caption: initial?.caption ?? '',
      }),
    )
    onClose()
  }, [allowFullScreen, height, initial, onApply, onClose, parsed, title])

  const onRawKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }

  const copyUrl = () => {
    if (!parsed || !navigator.clipboard) return
    void navigator.clipboard
      .writeText(parsed.src)
      .then(() => setCopied(true))
      .catch(() => undefined)
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
        className="video-dialog iframe-dialog notion-scroll"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Iframe settings' : 'Embed iframe'}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="iframe-dialog__head">
          <span className="iframe-dialog__head-icon" aria-hidden="true">
            <Frame size={20} />
          </span>
          <div className="iframe-dialog__head-text">
            <div className="video-dialog__title">
              {mode === 'edit' ? 'Iframe settings' : 'Embed iframe'}
            </div>
            <div className="video-dialog__subtitle">
              Paste a URL or an &lt;iframe&gt; embed code — maps, forms, widgets and
              websites all work.
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close iframe dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="video-dialog__field">
          <div className="iframe-dialog__label-row">
            <label className="video-dialog__label" htmlFor="iframe-url-input">
              Embed URL or iframe code
            </label>
            {parsed && host && (
              <span className="iframe-dialog__host-badge">{host}</span>
            )}
          </div>
          <div className="iframe-dialog__input-wrap" data-error={error ? 'true' : 'false'}>
            <LinkIcon size={15} />
            <textarea
              id="iframe-url-input"
              ref={inputRef}
              className="iframe-dialog__textarea notion-scroll"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              onKeyDown={onRawKeyDown}
              placeholder={'https://example.com/embed\nor <iframe src="…"></iframe>'}
              spellCheck={false}
              rows={3}
              aria-invalid={error}
            />
          </div>
          {error ? (
            <p className="video-dialog__error">
              That doesn’t look like a valid http(s) URL or iframe embed code.
            </p>
          ) : (
            <p className="video-dialog__hint">
              {parsed
                ? `Embedding ${parsed.title} · only http(s) URLs are allowed`
                : 'Tip: paste the full embed code from the source site if the plain URL refuses to load.'}
            </p>
          )}
        </div>

        {parsed ? (
          <div className="iframe-dialog__preview-card">
            <div className="iframe-dialog__preview-bar">
              <span className="iframe-dialog__preview-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="iframe-dialog__preview-host" title={parsed.src}>
                {host || 'Embedded content'}
              </span>
              <div className="iframe-dialog__preview-actions">
                <button
                  type="button"
                  className="iframe-dialog__preview-btn"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  <Refresh size={13} />
                  <span>Reload</span>
                </button>
                <button
                  type="button"
                  className="iframe-dialog__preview-btn"
                  onClick={copyUrl}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  className="iframe-dialog__preview-btn"
                  onClick={() =>
                    window.open(parsed.src, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink size={13} />
                  <span>Open</span>
                </button>
              </div>
            </div>
            <div
              className="iframe-dialog__preview"
              style={{ height: `${previewHeight}px` }}
            >
              <iframe
                key={reloadKey}
                src={parsed.src}
                title={title.trim() || parsed.title}
                allowFullScreen={allowFullScreen}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={(event) => styleIframeScrollbars(event.currentTarget)}
              />
            </div>
          </div>
        ) : (
          <div className="video-dialog__empty iframe-dialog__empty">
            <span className="video-dialog__empty-icon" aria-hidden="true">
              <Frame size={30} />
            </span>
            <div>
              <p>Paste a link to preview it here.</p>
              <span>Google Maps, Figma, CodePen, forms, dashboards and more.</span>
            </div>
          </div>
        )}

        <div className="iframe-dialog__options">
          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="iframe-title-input">
              Title
            </label>
            <input
              id="iframe-title-input"
              className="iframe-dialog__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={parsed?.title ?? 'Embedded content'}
            />
          </div>

          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="iframe-height-input">
              Height
            </label>
            <div className="iframe-dialog__height">
              <input
                className="iframe-dialog__range"
                type="range"
                min={IFRAME_MIN_HEIGHT}
                max={1200}
                step={10}
                value={previewHeight}
                aria-label="Iframe height"
                onChange={(event) => setHeight(Number(event.target.value))}
              />
              <div className="iframe-dialog__height-value">
                <input
                  id="iframe-height-input"
                  className="iframe-dialog__input iframe-dialog__input--number"
                  type="number"
                  min={IFRAME_MIN_HEIGHT}
                  max={IFRAME_MAX_HEIGHT}
                  step={10}
                  value={height}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    setHeight(Number.isFinite(next) ? next : IFRAME_MIN_HEIGHT)
                  }}
                  onBlur={() => setHeight((value) => clampIframeHeight(value))}
                />
                <span>px</span>
              </div>
            </div>
          </div>
        </div>

        <div className="video-dialog__switches iframe-dialog__switches">
          <label className="video-dialog__switch">
            <input
              type="checkbox"
              checked={allowFullScreen}
              onChange={(event) => setAllowFullScreen(event.target.checked)}
            />
            <span className="video-dialog__switch-track" aria-hidden="true">
              <span className="video-dialog__switch-thumb" />
            </span>
            <span>Allow fullscreen</span>
          </label>
          <span className="iframe-dialog__note">
            Scrollbars inside cross-origin embeds are controlled by the embedded
            site.
          </span>
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            Tip: some sites block embedding. If the preview stays blank, use their
            official embed code.
          </span>
          <div className="video-dialog__actions">
            <button type="button" className="notion-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="notion-btn notion-btn--primary"
              disabled={!canSubmit}
              onClick={submit}
            >
              {mode === 'edit' ? 'Update iframe' : 'Embed iframe'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
