import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import {
  buildVideoEmbedUrl,
  defaultVideoAttrs,
  formatStartTime,
  parseStartTime,
  parseVideoUrl,
  providerLabel,
  type VideoAspect,
  type VideoAttributes,
} from '../editor/video/parseVideo'
import { LinkIcon, Play, Video, X } from './Icons'

const ASPECTS: VideoAspect[] = ['16:9', '4:3', '1:1', '9:16', '21:9']
const SUPPORTED =
  'YouTube, Vimeo, Loom, Dailymotion, Wistia, Twitch, or a direct MP4/WebM/Ogg file.'

export type VideoDialogMode = 'insert' | 'edit'

interface VideoDialogProps {
  mode?: VideoDialogMode
  initial?: Partial<VideoAttributes>
  onApply: (attributes: VideoAttributes) => void
  onClose: () => void
}

export function VideoDialog({
  mode = 'insert',
  initial,
  onApply,
  onClose,
}: VideoDialogProps) {
  const [url, setUrl] = useState(initial?.src ?? '')
  const [aspect, setAspect] = useState<VideoAspect>(initial?.aspect ?? '16:9')
  const [startText, setStartText] = useState(formatStartTime(initial?.start ?? 0))
  const [autoplay, setAutoplay] = useState(initial?.autoplay ?? false)
  const [privacy, setPrivacy] = useState(initial?.privacy ?? true)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseVideoUrl(url), [url])
  const start = parseStartTime(startText)
  const startInvalid = start === null
  const dirty = url.trim().length > 0
  const error = dirty && !parsed
  const preview = parsed
    ? defaultVideoAttrs(parsed, {
        aspect,
        start: start ?? 0,
        autoplay,
        muted: autoplay,
        privacy,
        width: initial?.width ?? 100,
        align: initial?.align ?? 'center',
        caption: initial?.caption ?? '',
      })
    : null
  const embedUrl = preview ? buildVideoEmbedUrl(preview) : ''
  const isYoutube = parsed?.provider === 'youtube'
  const canSubmit = Boolean(parsed) && !startInvalid

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

  const submit = useCallback(() => {
    if (!parsed || start === null) return
    onApply(
      defaultVideoAttrs(parsed, {
        aspect,
        start,
        autoplay,
        muted: autoplay,
        privacy,
        width: initial?.width ?? 100,
        align: initial?.align ?? 'center',
        caption: initial?.caption ?? '',
        title: initial?.title || `${parsed.label} video`,
      }),
    )
    onClose()
  }, [aspect, autoplay, initial, onApply, onClose, parsed, privacy, start])

  const onUrlKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return createNotionPortal(
    <div
      className="video-dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="video-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Video settings' : 'Embed video'}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="video-dialog__head">
          <div>
            <div className="video-dialog__title">
              {mode === 'edit' ? 'Video settings' : 'Embed video'}
            </div>
            <div className="video-dialog__subtitle">
              Paste a link or an embed code — it stays a real player, not a screenshot.
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close video dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="video-dialog__field">
          <label className="video-dialog__label" htmlFor="video-url-input">
            Video link
          </label>
          <div className="video-dialog__url" data-error={error ? 'true' : 'false'}>
            <LinkIcon size={15} />
            <input
              id="video-url-input"
              ref={inputRef}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={onUrlKeyDown}
              placeholder="https://youtube.com/watch?v=…"
              spellCheck={false}
              aria-invalid={error}
            />
            {parsed && <span className="video-dialog__provider">{parsed.label}</span>}
          </div>
          {error ? (
            <p className="video-dialog__error">
              That link isn’t supported yet. Try {SUPPORTED.toLowerCase()}
            </p>
          ) : (
            <p className="video-dialog__hint">
              {parsed
                ? `${providerLabel(parsed.provider)} detected · ${
                    providerLabel(parsed.provider) === 'Video file'
                      ? 'streaming directly from the file URL'
                      : 'served from the provider'
                  }`
                : `Supports ${SUPPORTED}`}
            </p>
          )}
        </div>

        {preview && embedUrl ? (
          <div
            className="video-dialog__preview"
            style={{
              aspectRatio: preview.aspect.replace(':', ' / '),
              maxWidth:
                preview.aspect === '9:16'
                  ? 'min(100%, calc(46vh * 0.5625))'
                  : preview.aspect === '1:1'
                    ? 'min(100%, 46vh)'
                    : undefined,
            }}
          >
            {preview.provider === 'file' ? (
              <video src={embedUrl} controls muted playsInline preload="metadata" />
            ) : (
              <iframe
                src={embedUrl}
                title="Video preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        ) : (
          <div className="video-dialog__empty">
            <span className="video-dialog__empty-icon" aria-hidden="true">
              <Video size={30} />
            </span>
            <div>
              <p>Paste a link to preview it here.</p>
              <span>YouTube, Vimeo, Loom, Twitch and direct video files are supported.</span>
            </div>
            <Play size={18} className="video-dialog__empty-play" />
          </div>
        )}

        <div className="video-dialog__options">
          <div className="video-dialog__field video-dialog__field--inline">
            <span className="video-dialog__label">Aspect ratio</span>
            <div className="video-dialog__aspects" role="group" aria-label="Aspect ratio">
              {ASPECTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="video-dialog__aspect"
                  data-active={aspect === value ? 'true' : 'false'}
                  aria-pressed={aspect === value}
                  onClick={() => setAspect(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="video-dialog__field video-dialog__field--inline">
            <label className="video-dialog__label" htmlFor="video-start-input">
              Start at
            </label>
            <input
              id="video-start-input"
              className="video-dialog__input"
              value={startText}
              onChange={(event) => setStartText(event.target.value)}
              placeholder="0:00"
              inputMode="numeric"
              aria-invalid={startInvalid}
            />
            {startInvalid && (
              <p className="video-dialog__error">Use seconds or mm:ss.</p>
            )}
          </div>
        </div>

        <div className="video-dialog__switches">
          <label className="video-dialog__switch">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(event) => setAutoplay(event.target.checked)}
            />
            <span className="video-dialog__switch-track" aria-hidden="true">
              <span className="video-dialog__switch-thumb" />
            </span>
            <span>
              Autoplay <em>(muted)</em>
            </span>
          </label>
          {isYoutube && (
            <label className="video-dialog__switch">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(event) => setPrivacy(event.target.checked)}
              />
              <span className="video-dialog__switch-track" aria-hidden="true">
                <span className="video-dialog__switch-thumb" />
              </span>
              <span>Privacy-enhanced (youtube-nocookie)</span>
            </label>
          )}
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            Tip: paste a video link directly on an empty line to embed it instantly.
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
              {mode === 'edit' ? 'Update video' : 'Embed video'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
