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
  buildAudioEmbedUrl,
  defaultAudioAttrs,
  isAudioFile,
  parseAudioUrl,
  providerLabel,
  type AudioAttributes,
} from '../editor/audio/parseAudio'
import { Audio, LinkIcon, X } from './Icons'

export type AudioDialogMode = 'insert' | 'edit'

interface AudioDialogProps {
  mode?: AudioDialogMode
  initial?: Partial<AudioAttributes>
  onApply: (attributes: AudioAttributes) => void
  onClose: () => void
}

const MIN_HEIGHT = 80
const MAX_HEIGHT = 1200
const FILE_HEIGHT = 96

function clampHeight(value: number): number {
  return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(value)))
}

export function AudioDialog({
  mode = 'insert',
  initial,
  onApply,
  onClose,
}: AudioDialogProps) {
  const [raw, setRaw] = useState(initial?.src ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [height, setHeight] = useState(
    clampHeight(initial?.height ?? FILE_HEIGHT),
  )
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const didMountRef = useRef(false)
  const lastDefaultHeightRef = useRef<number | null>(null)

  const parsed = useMemo(() => parseAudioUrl(raw), [raw])
  const isFile = parsed ? isAudioFile(parsed.provider) : false
  const previewHeight = isFile ? FILE_HEIGHT : clampHeight(height)
  const dirty = raw.trim().length > 0
  const error = dirty && !parsed
  const canSubmit = Boolean(parsed)

  const previewAttrs = useMemo(() => {
    if (!parsed) return null
    return defaultAudioAttrs(parsed, {
      title: title.trim() || parsed.title,
      height: isFile ? FILE_HEIGHT : clampHeight(height),
      width: initial?.width ?? 100,
      align: initial?.align ?? 'center',
      caption: initial?.caption ?? '',
    })
  }, [height, initial, isFile, parsed, title])

  const embedUrl = previewAttrs ? buildAudioEmbedUrl(previewAttrs) : ''

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      lastDefaultHeightRef.current = parsed?.height ?? null
      return
    }
    if (!parsed) return
    if (lastDefaultHeightRef.current === parsed.height) return
    lastDefaultHeightRef.current = parsed.height
    setHeight(parsed.height)
  }, [parsed])

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
    if (!parsed) return
    onApply(
      defaultAudioAttrs(parsed, {
        title: title.trim() || parsed.title,
        height: isFile ? FILE_HEIGHT : clampHeight(height),
        width: initial?.width ?? 100,
        align: initial?.align ?? 'center',
        caption: initial?.caption ?? '',
      }),
    )
    onClose()
  }, [height, initial, isFile, onApply, onClose, parsed, title])

  const onRawKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
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
        className="video-dialog audio-dialog notion-scroll"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Audio settings' : 'Embed audio'}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="audio-dialog__head">
          <span className="audio-dialog__head-icon" aria-hidden="true">
            <Audio size={20} />
          </span>
          <div className="audio-dialog__head-text">
            <div className="video-dialog__title">
              {mode === 'edit' ? 'Audio settings' : 'Embed audio'}
            </div>
            <div className="video-dialog__subtitle">
              Paste a link or an embed code — Spotify, SoundCloud, Apple Podcasts,
              Mixcloud, Deezer, Tidal or a direct audio file.
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close audio dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="video-dialog__field">
          <div className="audio-dialog__label-row">
            <label className="video-dialog__label" htmlFor="audio-url-input">
              Audio URL or embed code
            </label>
            {parsed && (
              <span className="audio-dialog__host-badge">
                {providerLabel(parsed.provider)}
              </span>
            )}
          </div>
          <div className="audio-dialog__input-wrap" data-error={error ? 'true' : 'false'}>
            <LinkIcon size={15} />
            <textarea
              id="audio-url-input"
              ref={inputRef}
              className="audio-dialog__textarea notion-scroll"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              onKeyDown={onRawKeyDown}
              placeholder={
                'https://open.spotify.com/track/…\nhttps://soundcloud.com/…\nhttps://example.com/audio.mp3'
              }
              spellCheck={false}
              rows={3}
              aria-invalid={error}
            />
          </div>
          {error ? (
            <p className="video-dialog__error">
              That doesn’t look like a supported audio link or embed code.
            </p>
          ) : (
            <p className="video-dialog__hint">
              {parsed
                ? `${providerLabel(parsed.provider)} detected · ${
                    isFile
                      ? 'streaming directly from the file URL'
                      : 'served from the provider'
                  }`
                : 'Supports Spotify, SoundCloud, Apple Podcasts, Apple Music, Mixcloud, Deezer, Tidal and direct audio files.'}
            </p>
          )}
        </div>

        {parsed ? (
          isFile ? (
            <div className="audio-dialog__file-preview">
              <div className="audio-dialog__file-meta">
                <span className="audio-dialog__file-icon" aria-hidden="true">
                  <Audio size={16} />
                </span>
                <span className="audio-dialog__file-title">
                  {title.trim() || parsed.title}
                </span>
              </div>
              <audio src={parsed.src} controls preload="metadata" />
            </div>
          ) : (
            <div
              className="audio-dialog__preview"
              style={{ height: `${previewHeight}px` }}
            >
              <iframe
                src={embedUrl}
                title={title.trim() || parsed.title}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )
        ) : (
          <div className="video-dialog__empty audio-dialog__empty">
            <span className="video-dialog__empty-icon" aria-hidden="true">
              <Audio size={30} />
            </span>
            <div>
              <p>Paste a link to preview it here.</p>
              <span>
                Spotify, SoundCloud, Apple Podcasts, Mixcloud, Deezer, Tidal and
                direct MP3/WAV/OGG/M4A files.
              </span>
            </div>
          </div>
        )}

        <div className="audio-dialog__options">
          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="audio-title-input">
              Title
            </label>
            <input
              id="audio-title-input"
              className="audio-dialog__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={parsed?.title ?? 'Audio title'}
            />
          </div>

          {!isFile && (
            <div className="video-dialog__field">
              <label className="video-dialog__label" htmlFor="audio-height-input">
                Height
              </label>
              <div className="audio-dialog__height">
                <input
                  className="audio-dialog__range"
                  type="range"
                  min={MIN_HEIGHT}
                  max={600}
                  step={5}
                  value={previewHeight}
                  aria-label="Audio embed height"
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
                <div className="audio-dialog__height-value">
                  <input
                    id="audio-height-input"
                    className="audio-dialog__input audio-dialog__input--number"
                    type="number"
                    min={MIN_HEIGHT}
                    max={MAX_HEIGHT}
                    step={5}
                    value={height}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setHeight(Number.isFinite(next) ? next : MIN_HEIGHT)
                    }}
                    onBlur={() => setHeight((value) => clampHeight(value))}
                  />
                  <span>px</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="audio-dialog__note">
          Direct audio files support MP3, WAV, OGG, OGA, M4A, AAC, FLAC, OPUS,
          WebA, WebM, M3U8, AIFF and CAF. Provider embeds use their official
          players.
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            Tip: paste a supported audio link on an empty line to embed it
            instantly.
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
              {mode === 'edit' ? 'Update audio' : 'Embed audio'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
