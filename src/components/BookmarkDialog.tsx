import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import {
  defaultBookmarkAttrs,
  fallbackBookmarkMetadata,
  fetchBookmarkMetadata,
  normalizeBookmarkUrl,
  type BookmarkAttributes,
} from '../editor/bookmark/metadata'
import { BookmarkCard } from './BookmarkCard'
import { Bookmark, LinkIcon, Refresh, X } from './Icons'

export type BookmarkDialogMode = 'insert' | 'edit'

interface BookmarkDialogProps {
  mode?: BookmarkDialogMode
  initial?: Partial<BookmarkAttributes>
  onApply: (attributes: BookmarkAttributes) => void
  onClose: () => void
}

export function BookmarkDialog({
  mode = 'insert',
  initial,
  onApply,
  onClose,
}: BookmarkDialogProps) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [favicon, setFavicon] = useState(initial?.favicon ?? '')
  const [domain, setDomain] = useState(initial?.domain ?? '')
  const [siteName, setSiteName] = useState(initial?.siteName ?? '')
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [pendingFetch, setPendingFetch] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const didMountRef = useRef(false)
  const lastUrlRef = useRef(initial?.url ?? '')
  const fetchForRef = useRef<(target: string) => void>(() => undefined)

  const parsedUrl = useMemo(() => normalizeBookmarkUrl(url), [url])
  const fallback = useMemo(
    () => (parsedUrl ? fallbackBookmarkMetadata(parsedUrl) : null),
    [parsedUrl],
  )
  const dirty = url.trim().length > 0
  const invalid = dirty && !parsedUrl
  const canSubmit = Boolean(parsedUrl)

  const preview = useMemo(() => {
    if (!parsedUrl || !fallback) return null
    return {
      url: parsedUrl,
      title: title.trim() || fallback.title,
      description: description.trim() || fallback.description,
      image: normalizeBookmarkUrl(image) ?? '',
      favicon: normalizeBookmarkUrl(favicon) ?? fallback.favicon,
      domain: domain || fallback.domain,
      siteName: siteName || fallback.siteName,
    }
  }, [description, domain, fallback, favicon, image, parsedUrl, siteName, title])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      lastUrlRef.current = parsedUrl ?? ''
      return
    }

    const nextUrl = parsedUrl ?? ''

    if (pendingFetch && pendingFetch !== nextUrl) {
      setPendingFetch(null)
    }

    if (lastUrlRef.current === nextUrl) {
      if (pendingFetch && pendingFetch === nextUrl) {
        setPendingFetch(null)
        fetchForRef.current(nextUrl)
      }
      return
    }

    // A URL change invalidates any in-flight metadata request.
    requestIdRef.current += 1
    setFetching(false)
    lastUrlRef.current = nextUrl

    if (!parsedUrl) return
    const next = fallbackBookmarkMetadata(parsedUrl)
    setTitle(next.title)
    setDescription(next.description)
    setImage('')
    setFavicon(next.favicon)
    setDomain(next.domain)
    setSiteName(next.siteName)

    if (pendingFetch && pendingFetch === parsedUrl) {
      setPendingFetch(null)
      fetchForRef.current(parsedUrl)
    }
  }, [parsedUrl, pendingFetch])

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

  const fetchFor = useCallback(async (target: string) => {
    const requestId = ++requestIdRef.current
    setFetching(true)
    setError('')
    try {
      const metadata = await fetchBookmarkMetadata(target)
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setTitle(metadata.title)
      setDescription(metadata.description)
      setImage(metadata.image)
      setFavicon(metadata.favicon)
      setDomain(metadata.domain)
      setSiteName(metadata.siteName)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setError('Could not fetch preview details. The fallback card will still work.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setFetching(false)
      }
    }
  }, [])

  fetchForRef.current = fetchFor

  const fetchDetails = () => {
    if (!parsedUrl || fetching) return
    void fetchFor(parsedUrl)
  }

  const onUrlPaste = (event: ReactClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text/plain').trim()
    const normalized = normalizeBookmarkUrl(text)
    if (!normalized) return
    event.preventDefault()
    setUrl(normalized)
    setPendingFetch(normalized)
  }

  const onUrlKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (parsedUrl && !fetching) {
        void fetchFor(parsedUrl)
      }
    }
  }

  const submit = () => {
    if (!parsedUrl || !fallback) return
    onApply(
      defaultBookmarkAttrs(
        {
          url: parsedUrl,
          title: title.trim() || fallback.title,
          description: description.trim() || fallback.description,
          image: normalizeBookmarkUrl(image) ?? '',
          favicon: normalizeBookmarkUrl(favicon) ?? fallback.favicon,
          domain: domain || fallback.domain,
          siteName: siteName || fallback.siteName,
        },
        {
          width: initial?.width ?? 100,
          align: initial?.align ?? 'center',
        },
      ),
    )
    onClose()
  }

  return createNotionPortal(
    <div
      className="video-dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="video-dialog bookmark-dialog notion-scroll"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Bookmark settings' : 'Add bookmark'}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="bookmark-dialog__head">
          <span className="bookmark-dialog__head-icon" aria-hidden="true">
            <Bookmark size={20} />
          </span>
          <div className="bookmark-dialog__head-text">
            <div className="video-dialog__title">
              {mode === 'edit' ? 'Bookmark settings' : 'Add bookmark'}
            </div>
            <div className="video-dialog__subtitle">
              Paste a link to create a preview card with its favicon, title and
              description.
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            aria-label="Close bookmark dialog"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="video-dialog__field">
          <div className="bookmark-dialog__label-row">
            <label className="video-dialog__label" htmlFor="bookmark-url-input">
              Link URL
            </label>
            {parsedUrl && (
              <span className="bookmark-dialog__host-badge">
                {domain || fallback?.domain}
              </span>
            )}
          </div>
          <div className="bookmark-dialog__url-row">
            <div
              className="bookmark-dialog__input-wrap"
              data-error={invalid ? 'true' : 'false'}
            >
              <LinkIcon size={15} />
              <input
                id="bookmark-url-input"
                ref={inputRef}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onPaste={onUrlPaste}
                onKeyDown={onUrlKeyDown}
                placeholder="https://example.com/article"
                spellCheck={false}
                aria-invalid={invalid}
              />
            </div>
            <button
              type="button"
              className="notion-btn bookmark-dialog__fetch"
              data-loading={fetching ? 'true' : 'false'}
              disabled={!parsedUrl || fetching}
              onClick={fetchDetails}
            >
              <Refresh size={14} />
              {fetching ? 'Fetching…' : 'Fetch details'}
            </button>
          </div>
          {invalid ? (
            <p className="video-dialog__error">
              Enter a valid http(s) URL.
            </p>
          ) : error ? (
            <p className="video-dialog__error">{error}</p>
          ) : (
            <p className="video-dialog__hint">
              {parsedUrl
                ? 'Preview details are fetched from a public metadata service. You can edit them below.'
                : 'Paste a link, or press Enter to fetch its preview details.'}
            </p>
          )}
        </div>

        {preview ? (
          <div className="bookmark-dialog__preview">
            <BookmarkCard
              url={preview.url}
              title={preview.title}
              description={preview.description}
              image={preview.image}
              favicon={preview.favicon}
              domain={preview.domain}
              siteName={preview.siteName}
              interactive={false}
            />
          </div>
        ) : (
          <div className="video-dialog__empty bookmark-dialog__empty">
            <span className="video-dialog__empty-icon" aria-hidden="true">
              <Bookmark size={30} />
            </span>
            <div>
              <p>Paste a link to preview it here.</p>
              <span>Articles, docs, videos, products and any other web page.</span>
            </div>
          </div>
        )}

        <div className="bookmark-dialog__fields">
          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="bookmark-title-input">
              Title
            </label>
            <input
              id="bookmark-title-input"
              className="bookmark-dialog__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={fallback?.title ?? 'Page title'}
            />
          </div>

          <div className="video-dialog__field">
            <label
              className="video-dialog__label"
              htmlFor="bookmark-description-input"
            >
              Description
            </label>
            <textarea
              id="bookmark-description-input"
              className="bookmark-dialog__textarea notion-scroll"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={fallback?.description ?? 'Short description'}
              rows={2}
            />
          </div>

          <div className="video-dialog__field">
            <label className="video-dialog__label" htmlFor="bookmark-image-input">
              Preview image URL <em>(optional)</em>
            </label>
            <input
              id="bookmark-image-input"
              className="bookmark-dialog__input"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/preview.jpg"
              spellCheck={false}
            />
          </div>
        </div>

        <footer className="video-dialog__foot">
          <span className="video-dialog__foot-hint">
            If the site blocks metadata, the card falls back to the domain, URL and
            favicon.
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
              {mode === 'edit' ? 'Update bookmark' : 'Add bookmark'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
