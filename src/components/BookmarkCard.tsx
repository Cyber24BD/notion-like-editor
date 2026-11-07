import { useEffect, useState } from 'react'
import { normalizeBookmarkUrl } from '../editor/bookmark/metadata'

export interface BookmarkCardProps {
  url: string
  title: string
  description: string
  image: string
  favicon: string
  domain: string
  siteName?: string
  interactive?: boolean
  className?: string
}

export function BookmarkCard({
  url,
  title,
  description,
  image,
  favicon,
  domain,
  siteName = '',
  interactive = true,
  className = '',
}: BookmarkCardProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setFaviconFailed(false)
  }, [favicon])

  useEffect(() => {
    setImageFailed(false)
  }, [image])

  const label = domain || siteName || 'Link'
  const initial = (label || title || '?').charAt(0).toUpperCase()
  const showFavicon = Boolean(favicon) && !faviconFailed
  const showImage = Boolean(image) && !imageFailed

  const content = (
    <>
      <div className="bookmark-card__body">
        <div className="bookmark-card__meta">
          {showFavicon ? (
            <img
              className="bookmark-card__favicon"
              src={favicon}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFaviconFailed(true)}
            />
          ) : (
            <span
              className="bookmark-card__favicon bookmark-card__favicon--fallback"
              aria-hidden="true"
            >
              {initial}
            </span>
          )}
          <span className="bookmark-card__domain">{label}</span>
        </div>
        <div className="bookmark-card__title">{title || label || url}</div>
        {description && (
          <div className="bookmark-card__description">{description}</div>
        )}
      </div>

      <div
        className="bookmark-card__media"
        data-empty={showImage ? 'false' : 'true'}
      >
        {showImage ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="bookmark-card__media-fallback" aria-hidden="true">
            {initial}
          </span>
        )}
      </div>
    </>
  )

  const classes = `bookmark-card ${className}`.trim()
  const safeUrl = normalizeBookmarkUrl(url) ?? ''

  if (!interactive || !safeUrl) {
    return (
      <div className={classes} title={url}>
        {content}
      </div>
    )
  }

  return (
    <a
      className={classes}
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      draggable={false}
    >
      {content}
    </a>
  )
}
