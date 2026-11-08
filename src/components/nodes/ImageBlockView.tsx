import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { pickImageFile, pickImageFileRaw } from '../../editor/images/imageFiles'
import { getImageServices } from '../../editor/images/imageServices'
import {
  cancelImageUpload,
  retryImageUpload,
  startImageReplacement,
} from '../../editor/images/uploadManager'
import { Menu, type MenuNode } from '../Menu'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crop,
  Frame,
  Maximize,
  Replace,
  Trash,
} from '../Icons'
import { LazyCropDialog } from '../lazy/LazyWidgets'
import { ImageLightbox, type LightboxImage } from '../ImageLightbox'

const SIZE_PRESETS = [
  { label: 'S', value: 25, title: 'Small — 25% width' },
  { label: 'M', value: 50, title: 'Medium — 50% width' },
  { label: 'L', value: 75, title: 'Large — 75% width' },
  { label: 'Full', value: 100, title: 'Full width' },
]

const FRAME_OPTIONS = [
  { value: 'none', label: 'Plain' },
  { value: 'border', label: 'Border' },
  { value: 'rounded', label: 'Rounded corners' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'frame', label: 'Polaroid frame' },
]

const TOOLBAR_WIDTH = 420

type Corner = 'nw' | 'ne' | 'sw' | 'se'

function collectImages(doc: PMNode): LightboxImage[] {
  const images: LightboxImage[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return
    const src = String(node.attrs.src ?? '')
    if (!src) return
    images.push({
      src,
      alt: String(node.attrs.alt ?? ''),
      caption: String(node.attrs.caption ?? ''),
      pos,
    })
  })
  return images
}

export function ImageBlockView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const width = typeof node.attrs.width === 'number' ? node.attrs.width : 100
  const align = String(node.attrs.align ?? 'left')
  const frame = String(node.attrs.frame ?? 'none')
  const caption = String(node.attrs.caption ?? '')
  const src = String(node.attrs.src ?? '')
  const alt = String(node.attrs.alt ?? '')
  const uploadId = typeof node.attrs.uploadId === 'string' ? node.attrs.uploadId : ''
  const uploadState = String(node.attrs.uploadState ?? '')
  const uploadProgress = Math.max(
    0,
    Math.min(100, Number(node.attrs.uploadProgress) || 0),
  )
  const uploadError = String(node.attrs.uploadError ?? '')
  const uploadPreview = String(node.attrs.uploadPreview ?? '')
  const displaySrc = uploadPreview || src
  const hasUpload = uploadState !== ''

  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    columnWidth: number
    direction: 1 | -1
  } | null>(null)

  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [styleMenuAt, setStyleMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)
  const [lightbox, setLightbox] = useState<{
    images: LightboxImage[]
    index: number
  } | null>(null)

  useEffect(() => {
    setCaptionDraft(caption)
  }, [caption])

  const updateToolbarPosition = useCallback(() => {
    const element = frameRef.current
    if (!element || !selected) {
      setToolbarAt(null)
      return
    }
    const rect = element.getBoundingClientRect()
    const barWidth = Math.min(TOOLBAR_WIDTH, window.innerWidth - 16)
    let left = rect.left + rect.width / 2 - barWidth / 2
    left = Math.max(8, Math.min(left, window.innerWidth - barWidth - 8))
    let top = rect.top - 48
    if (top < 56) top = rect.bottom + 10
    setToolbarAt({ top, left })
  }, [selected])

  useLayoutEffect(() => {
    updateToolbarPosition()
  }, [updateToolbarPosition, width, align, frame, selected, caption])

  useEffect(() => {
    if (!selected) return
    let frameId = 0
    const onChange = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateToolbarPosition()
      })
    }
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [selected, updateToolbarPosition])

  const startResize = (event: ReactPointerEvent<HTMLSpanElement>, corner: Corner) => {
    const element = frameRef.current
    const column = element?.closest('.image-block') as HTMLElement | null
    if (!element || !column) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      startX: event.clientX,
      startWidth: width,
      columnWidth: Math.max(1, column.getBoundingClientRect().width),
      direction: corner === 'ne' || corner === 'se' ? 1 : -1,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing(true)
  }

  const moveResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current
    if (!drag) return
    event.preventDefault()
    const delta =
      ((event.clientX - drag.startX) / drag.columnWidth) * 100 * drag.direction
    const next = Math.round(Math.max(15, Math.min(100, drag.startWidth + delta)))
    if (next !== width) updateAttributes({ width: next })
  }

  const endResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setResizing(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const remove = () => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run()
  }

  const replace = () => {
    const services = getImageServices(editor)
    if (services?.uploader) {
      void pickImageFileRaw().then((file) => {
        if (!file || editor.isDestroyed) return
        const pos = getPos()
        if (typeof pos !== 'number') return
        startImageReplacement(editor.view, pos, file, services)
      })
      return
    }
    void pickImageFile(services).then((image) => {
      if (!image || editor.isDestroyed) return
      updateAttributes({ src: image.src, alt: image.alt })
    })
  }

  const openStyleMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setStyleMenuAt({ x: rect.left, y: rect.bottom + 6 })
  }

  const openLightbox = () => {
    if (hasUpload) return
    const images = collectImages(editor.state.doc)
    if (images.length === 0) return
    const pos = getPos()
    const index = images.findIndex((image) => image.pos === pos)
    setLightbox({ images, index: index >= 0 ? index : 0 })
  }

  const styleEntries: MenuNode[] = FRAME_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    icon: <span className={`frame-swatch frame-swatch--${option.value}`} />,
    shortcut: frame === option.value ? '✓' : undefined,
    onSelect: () => updateAttributes({ frame: option.value }),
  }))

  const toolbar =
    selected && !cropOpen && !hasUpload && toolbarAt
      ? createPortal(
          <div
            className="image-toolbar popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Image options"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="image-toolbar__sizes" role="group" aria-label="Image size">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className="image-toolbar__size"
                  data-active={Math.abs(width - preset.value) < 1 ? 'true' : 'false'}
                  title={preset.title}
                  aria-label={preset.title}
                  onClick={() => updateAttributes({ width: preset.value })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn"
              data-active={align === 'left' ? 'true' : 'false'}
              data-tooltip="Align left"
              aria-label="Align left"
              onClick={() => updateAttributes({ align: 'left' })}
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-active={align === 'center' ? 'true' : 'false'}
              data-tooltip="Align center"
              aria-label="Align center"
              onClick={() => updateAttributes({ align: 'center' })}
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-active={align === 'right' ? 'true' : 'false'}
              data-tooltip="Align right"
              aria-label="Align right"
              onClick={() => updateAttributes({ align: 'right' })}
            >
              <AlignRight size={15} />
            </button>
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn"
              data-tooltip="Preview"
              aria-label="Preview image"
              onClick={openLightbox}
            >
              <Maximize size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-tooltip="Crop"
              aria-label="Crop image"
              onClick={() => {
                setStyleMenuAt(null)
                setCropOpen(true)
              }}
            >
              <Crop size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--wide"
              data-tooltip="Border & style"
              aria-label="Image border and style"
              onClick={openStyleMenu}
            >
              <Frame size={15} />
              <span>Style</span>
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-tooltip="Replace image"
              aria-label="Replace image"
              onClick={() => void replace()}
            >
              <Replace size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              data-tooltip="Delete image"
              aria-label="Delete image"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>,
          document.body,
        )
      : null

  const styleMenu = styleMenuAt ? (
    <Menu
      x={styleMenuAt.x}
      y={styleMenuAt.y}
      width={208}
      entries={styleEntries}
      header={<div className="menu__header">Image style</div>}
      onClose={() => setStyleMenuAt(null)}
    />
  ) : null

  return (
    <NodeViewWrapper
      className="image-block"
      data-align={align}
      data-frame={frame}
      data-selected={selected ? 'true' : 'false'}
      data-has-caption={caption ? 'true' : 'false'}
      data-resizing={resizing ? 'true' : 'false'}
      data-upload-state={uploadState || undefined}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="image-block__frame"
        style={{ width: `${width}%` }}
      >
        <img
          src={displaySrc}
          alt={alt || caption}
          draggable={false}
          onLoad={updateToolbarPosition}
          onClick={(event) => {
            event.stopPropagation()
            if (!hasUpload) openLightbox()
          }}
        />
        {hasUpload && (
          <div
            className="image-upload-overlay"
            role="status"
            aria-live="polite"
            aria-label="Image upload status"
            contentEditable={false}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {uploadState === 'error' ? (
              <>
                <div className="image-upload-overlay__title">Upload failed</div>
                <div className="image-upload-overlay__message">
                  {uploadError || 'Please try again.'}
                </div>
                <div className="image-upload-overlay__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!uploadId}
                    onClick={() => retryImageUpload(editor.view, uploadId)}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={!uploadId}
                    onClick={() => cancelImageUpload(editor.view, uploadId)}
                  >
                    {src ? 'Keep old image' : 'Remove'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="image-upload-overlay__title">
                  {uploadState === 'preparing'
                    ? 'Preparing image…'
                    : uploadProgress > 0
                      ? `Uploading ${uploadProgress}%`
                      : 'Uploading…'}
                </div>
                <div
                  className="image-upload-overlay__track"
                  data-indeterminate={uploadProgress <= 0 ? 'true' : 'false'}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress > 0 ? uploadProgress : undefined}
                >
                  <span style={{ width: `${uploadProgress}%` }} />
                </div>
                <button
                  type="button"
                  className="btn image-upload-overlay__cancel"
                  disabled={!uploadId}
                  onClick={() => cancelImageUpload(editor.view, uploadId)}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
        {selected &&
          !cropOpen &&
          !hasUpload &&
          (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
            <span
              key={corner}
              className={`image-block__handle image-block__handle--${corner}`}
              onPointerDown={(event) => startResize(event, corner)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              aria-hidden="true"
            />
          ))}
      </div>

      <div className="image-block__caption-wrap" style={{ width: `${width}%` }}>
        <input
          className="image-block__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Image caption"
          onChange={(event) => {
            const next = event.target.value
            setCaptionDraft(next)
            updateAttributes({ caption: next })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              editor.commands.focus('end')
            }
          }}
        />
      </div>

      {toolbar}
      {styleMenu}

      {cropOpen && (
        <LazyCropDialog
          src={src}
          services={getImageServices(editor)}
          onClose={() => setCropOpen(false)}
          onApply={(nextSrc) => updateAttributes({ src: nextSrc })}
        />
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={(nextIndex) =>
            setLightbox((current) =>
              current ? { ...current, index: nextIndex } : current,
            )
          }
          onClose={() => setLightbox(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
