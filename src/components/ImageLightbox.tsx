import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AspectRatio,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Maximize,
  Minimize,
  Refresh,
  Warning,
  X,
  ZoomIn,
  ZoomOut,
} from './Icons'

export interface LightboxImage {
  src: string
  alt: string
  caption: string
  pos: number
}

interface ImageLightboxProps {
  images: LightboxImage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const ZOOM_STEP = 1.25
const DOUBLE_CLICK_ZOOM = 2.5

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampZoom(value: number): number {
  return clamp(value, MIN_ZOOM, MAX_ZOOM)
}

function imageExtension(src: string): string {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:image\/([a-zA-Z0-9.+-]+)/)
    if (match) {
      const type = match[1].toLowerCase()
      if (type === 'jpeg') return 'jpg'
      if (type === 'svg+xml') return 'svg'
      return type
    }
  }
  try {
    const path = new URL(src).pathname
    const extension = path.split('.').pop()
    if (extension && extension.length <= 5) return extension.toLowerCase()
  } catch {
    /* ignore */
  }
  return 'png'
}

function downloadName(image: LightboxImage): string {
  const base = (image.alt || image.caption || 'image')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'image'}.${imageExtension(image.src)}`
}

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: ImageLightboxProps) {
  const current = images[index] ?? images[0]
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [fullscreen, setFullscreen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [reloadKey, setReloadKey] = useState(0)

  const overlayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  const baseSize = useMemo(() => {
    if (!natural || viewport.width <= 0 || viewport.height <= 0) return null
    const scale = Math.min(
      1,
      viewport.width / natural.width,
      viewport.height / natural.height,
    )
    return {
      width: natural.width * scale,
      height: natural.height * scale,
    }
  }, [natural, viewport.height, viewport.width])

  const clampPan = useCallback(
    (next: { x: number; y: number }, nextZoom: number) => {
      if (!baseSize || viewport.width <= 0 || viewport.height <= 0) {
        return { x: 0, y: 0 }
      }
      const maxX = Math.max(0, (baseSize.width * nextZoom - viewport.width) / 2)
      const maxY = Math.max(0, (baseSize.height * nextZoom - viewport.height) / 2)
      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      }
    },
    [baseSize, viewport.height, viewport.width],
  )

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((value) => clampZoom(value * ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((value) => clampZoom(value / ZOOM_STEP))
  }, [])

  const goTo = useCallback(
    (nextIndex: number) => {
      const clamped = clamp(nextIndex, 0, images.length - 1)
      if (clamped === index) return
      onIndexChange(clamped)
    },
    [images.length, index, onIndexChange],
  )

  const toggleFullscreen = useCallback(async () => {
    const element = overlayRef.current
    if (!element) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await element.requestFullscreen()
      }
    } catch {
      /* fullscreen may be blocked */
    }
  }, [])

  const copyImage = useCallback(async () => {
    if (!current || !navigator.clipboard || !window.ClipboardItem) return
    try {
      const response = await fetch(current.src)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob }),
      ])
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 1600)
  }, [current])

  const download = useCallback(() => {
    if (!current) return
    const anchor = document.createElement('a')
    anchor.href = current.src
    anchor.download = downloadName(current)
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }, [current])

  const openOriginal = useCallback(() => {
    if (!current) return
    window.open(current.src, '_blank', 'noopener,noreferrer')
  }, [current])

  const retry = useCallback(() => {
    setError(false)
    setLoading(true)
    setNatural(null)
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    overlayRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      setViewport({ width: rect.width, height: rect.height })
    }
    update()
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(element)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom((value) => clampZoom(value * factor))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    setPan((currentPan) => {
      const next = clampPan(currentPan, zoom)
      if (next.x === currentPan.x && next.y === currentPan.y) return currentPan
      return next
    })
  }, [clampPan, zoom])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLoading(true)
    setError(false)
    setNatural(null)
    setCopyState('idle')
    setReloadKey(0)
  }, [index])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
        return
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        zoomOut()
        return
      }
      if (event.key === '0') {
        event.preventDefault()
        resetView()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(index - 1)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(index + 1)
        return
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void toggleFullscreen()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [goTo, index, onClose, resetView, toggleFullscreen, zoomIn, zoomOut])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  if (!current) return null

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    setNatural({ width: image.naturalWidth, height: image.naturalHeight })
    setLoading(false)
    setError(false)
  }

  const handleImageError = () => {
    setError(true)
    setLoading(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const stage = stageRef.current
    if (!stage) return
    event.preventDefault()
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    try {
      stage.setPointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }

    if (pointersRef.current.size === 1) {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      }
      if (zoom > 1) setDragging(true)
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      }
      panRef.current = null
      setDragging(false)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchRef.current.distance > 0) {
        const nextZoom = clampZoom(
          pinchRef.current.zoom * (distance / pinchRef.current.distance),
        )
        setZoom(nextZoom)
      }
      return
    }

    const start = panRef.current
    if (!start || zoom <= 1) return
    const dx = event.clientX - start.startX
    const dy = event.clientY - start.startY
    setPan(
      clampPan(
        {
          x: start.startPanX + dx,
          y: start.startPanY + dy,
        },
        zoom,
      ),
    )
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    try {
      stageRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }

    if (pointersRef.current.size < 2) pinchRef.current = null

    if (pointersRef.current.size === 0) {
      panRef.current = null
      setDragging(false)
    } else if (pointersRef.current.size === 1) {
      const [remaining] = [...pointersRef.current.values()]
      panRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        startPanX: pan.x,
        startPanY: pan.y,
      }
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (zoom > 1) {
      resetView()
    } else {
      setZoom(DOUBLE_CLICK_ZOOM)
      setPan({ x: 0, y: 0 })
    }
  }

  const zoomPercent = Math.round(zoom * 100)
  const canCopy = Boolean(navigator.clipboard && window.ClipboardItem)
  const canFullscreen = Boolean(document.fullscreenEnabled)
  const hasMultiple = images.length > 1

  return createPortal(
    <div
      ref={overlayRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      tabIndex={-1}
      data-dragging={dragging ? 'true' : 'false'}
      data-zoomed={zoom > 1 ? 'true' : 'false'}
    >
      <div className="lightbox__topbar">
        <div className="lightbox__counter">
          {index + 1} / {images.length}
        </div>

        <div className="lightbox__actions">
          <div className="lightbox__zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="lightbox__btn"
              aria-label="Zoom out"
              title="Zoom out (−)"
              disabled={zoom <= MIN_ZOOM}
              onClick={zoomOut}
            >
              <ZoomOut size={16} />
            </button>
            <span className="lightbox__zoom-value">{zoomPercent}%</span>
            <button
              type="button"
              className="lightbox__btn"
              aria-label="Zoom in"
              title="Zoom in (+)"
              disabled={zoom >= MAX_ZOOM}
              onClick={zoomIn}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="lightbox__btn"
              aria-label="Fit to screen"
              title="Fit to screen (0)"
              onClick={resetView}
            >
              <AspectRatio size={16} />
            </button>
            <button
              type="button"
              className="lightbox__btn lightbox__btn--text"
              aria-label="Actual size"
              title="Actual size"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
            >
              1:1
            </button>
          </div>

          <span className="lightbox__divider" />

          <button
            type="button"
            className="lightbox__btn"
            aria-label={
              copyState === 'copied'
                ? 'Image copied'
                : copyState === 'error'
                  ? 'Copy failed'
                  : 'Copy image'
            }
            title={
              copyState === 'copied'
                ? 'Copied'
                : copyState === 'error'
                  ? 'Copy failed'
                  : 'Copy image'
            }
            data-state={copyState}
            disabled={!canCopy}
            onClick={() => void copyImage()}
          >
            {copyState === 'copied' ? (
              <Check size={16} />
            ) : copyState === 'error' ? (
              <Warning size={16} />
            ) : (
              <Copy size={16} />
            )}
          </button>
          <button
            type="button"
            className="lightbox__btn"
            aria-label="Download image"
            title="Download image"
            onClick={download}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="lightbox__btn"
            aria-label="Open original image"
            title="Open original"
            onClick={openOriginal}
          >
            <ExternalLink size={16} />
          </button>
          <button
            type="button"
            className="lightbox__btn"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={fullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
            data-active={fullscreen ? 'true' : 'false'}
            disabled={!canFullscreen}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            type="button"
            className="lightbox__btn lightbox__btn--close"
            aria-label="Close image preview"
            title="Close (Esc)"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="lightbox__stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {loading && !error && (
          <div className="lightbox__spinner" aria-hidden="true" />
        )}

        {error ? (
          <div className="lightbox__error" role="alert">
            <span className="lightbox__error-icon" aria-hidden="true">
              <ImageIcon size={30} />
            </span>
            <p>Could not load this image.</p>
            <span className="lightbox__error-hint">
              The file may be unavailable or blocked by the source.
            </span>
            <div className="lightbox__error-actions">
              <button
                type="button"
                className="lightbox__error-btn"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={retry}
              >
                <Refresh size={14} />
                Retry
              </button>
              <button
                type="button"
                className="lightbox__error-btn"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={openOriginal}
              >
                <ExternalLink size={14} />
                Open original
              </button>
              <button
                type="button"
                className="lightbox__error-btn"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={download}
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>
        ) : (
          <img
            key={`${index}:${reloadKey}:${current.src}`}
            className="lightbox__image"
            src={current.src}
            alt={current.alt || current.caption || 'Image preview'}
            draggable={false}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              width: baseSize ? `${baseSize.width}px` : undefined,
              height: baseSize ? `${baseSize.height}px` : undefined,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              opacity: loading ? 0 : 1,
            }}
          />
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            aria-label="Previous image"
            title="Previous image (←)"
            disabled={index <= 0}
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            aria-label="Next image"
            title="Next image (→)"
            disabled={index >= images.length - 1}
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div className="lightbox__bottombar">
        {(current.caption || current.alt) && (
          <div className="lightbox__caption">{current.caption || current.alt}</div>
        )}
        <div className="lightbox__meta">
          {natural ? `${natural.width} × ${natural.height}px` : 'Loading…'}
          {hasMultiple ? ` · ${index + 1} of ${images.length}` : ''}
        </div>
        <div className="lightbox__hint">
          Scroll to zoom · Drag to pan · Double-click to toggle · Esc to close
        </div>
      </div>
    </div>,
    document.body,
  )
}
