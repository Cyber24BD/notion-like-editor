import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createNotionPortal } from '../NotionPortal'
import { cropImageSource, type ImageServices } from '../../editor/images/imageFiles'
import { X } from '../Icons'

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 8
const INITIAL_CROP: CropRect = { x: 10, y: 10, width: 80, height: 80 }
const CORNERS: DragMode[] = ['nw', 'ne', 'sw', 'se']

function clampCrop(
  start: CropRect,
  mode: DragMode,
  dx: number,
  dy: number,
): CropRect {
  let { x, y, width, height } = start

  if (mode === 'move') {
    x = Math.max(0, Math.min(100 - width, start.x + dx))
    y = Math.max(0, Math.min(100 - height, start.y + dy))
    return { x, y, width, height }
  }

  if (mode.includes('w')) {
    const right = start.x + start.width
    x = Math.max(0, Math.min(right - MIN_SIZE, start.x + dx))
    width = right - x
  }
  if (mode.includes('e')) {
    width = Math.max(MIN_SIZE, Math.min(100 - start.x, start.width + dx))
  }
  if (mode.includes('n')) {
    const bottom = start.y + start.height
    y = Math.max(0, Math.min(bottom - MIN_SIZE, start.y + dy))
    height = bottom - y
  }
  if (mode.includes('s')) {
    height = Math.max(MIN_SIZE, Math.min(100 - start.y, start.height + dy))
  }

  return { x, y, width, height }
}

interface CropDialogProps {
  src: string
  services?: ImageServices | null
  onClose: () => void
  onApply: (src: string) => void
}

export function CropDialog({ src, services, onClose, onApply }: CropDialogProps) {
  const [crop, setCrop] = useState<CropRect>(INITIAL_CROP)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const cropRef = useRef(crop)
  cropRef.current = crop
  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    crop: CropRect
    stageWidth: number
    stageHeight: number
  } | null>(null)

  const computeStage = useCallback(() => {
    if (!natural) return
    const availableWidth = Math.max(120, (viewportRef.current?.clientWidth ?? 720) - 2)
    const availableHeight = Math.max(160, Math.min(window.innerHeight * 0.56, 540))
    const scale = Math.min(
      availableWidth / Math.max(1, natural.width),
      availableHeight / Math.max(1, natural.height),
    )
    setStageSize({
      width: Math.max(1, Math.round(natural.width * scale)),
      height: Math.max(1, Math.round(natural.height * scale)),
    })
  }, [natural])

  useEffect(() => {
    computeStage()
    window.addEventListener('resize', computeStage)
    return () => window.removeEventListener('resize', computeStage)
  }, [computeStage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [busy, onClose])

  const begin = (event: ReactPointerEvent<HTMLElement>, mode: DragMode) => {
    const stage = stageRef.current
    if (!stage) return
    event.preventDefault()
    event.stopPropagation()
    const rect = stage.getBoundingClientRect()
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      crop: cropRef.current,
      stageWidth: Math.max(1, rect.width),
      stageHeight: Math.max(1, rect.height),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    const dx = ((event.clientX - drag.startX) / drag.stageWidth) * 100
    const dy = ((event.clientY - drag.startY) / drag.stageHeight) * 100
    setCrop(clampCrop(drag.crop, drag.mode, dx, dy))
  }

  const finish = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    event.stopPropagation()
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* pointer already released */
    }
  }

  const apply = useCallback(async () => {
    setBusy(true)
    setError(null)
    const next = await cropImageSource(
      src,
      {
        x: crop.x / 100,
        y: crop.y / 100,
        width: crop.width / 100,
        height: crop.height / 100,
      },
      services,
    )
    setBusy(false)
    if (!next) {
      setError(
        'This image could not be cropped or uploaded. Images hosted on another site may also block the canvas.',
      )
      return
    }
    onApply(next)
    onClose()
  }, [crop, onApply, onClose, services, src])

  return createNotionPortal(
    <div
      className="crop-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Crop image"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="crop-dialog__head">
          <div>
            <div className="crop-dialog__title">Crop image</div>
            <div className="crop-dialog__hint">
              Drag the box to reposition · drag a corner to resize
            </div>
          </div>
          <button
            type="button"
            className="notion-icon-btn"
            onClick={onClose}
            aria-label="Cancel crop"
            disabled={busy}
          >
            <X size={15} />
          </button>
        </header>

        <div className="crop-stage-wrap">
          <div className="crop-stage-viewport" ref={viewportRef}>
            <div
              className="crop-stage"
              ref={stageRef}
              style={
                stageSize
                  ? { width: `${stageSize.width}px`, height: `${stageSize.height}px` }
                  : undefined
              }
            >
              <img
                src={src}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  const image = event.currentTarget
                  setNatural({
                    width: image.naturalWidth || 1,
                    height: image.naturalHeight || 1,
                  })
                }}
              />
              <div
              className="crop-box"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
              onPointerDown={(event) => begin(event, 'move')}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
            >
              <div className="crop-grid" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    className={`crop-handle crop-handle--${corner}`}
                    onPointerDown={(event) => begin(event, corner)}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={finish}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="crop-dialog__error">{error}</p>}

        <footer className="crop-dialog__foot">
          <button
            type="button"
            className="notion-btn"
            onClick={() => setCrop(INITIAL_CROP)}
            disabled={busy}
          >
            Reset
          </button>
          <div className="crop-dialog__actions">
            <button type="button" className="notion-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="notion-btn notion-btn--primary"
              onClick={() => void apply()}
              disabled={busy}
            >
              {busy ? 'Cropping…' : 'Apply crop'}
            </button>
          </div>
        </footer>
      </div>
    </div>)
}
