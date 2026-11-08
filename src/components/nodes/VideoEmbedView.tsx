import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createNotionPortal } from '../NotionPortal'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import {
  buildVideoEmbedUrl,
  providerLabel,
  type VideoAspect,
  type VideoAttributes,
} from '../../editor/video/parseVideo'
import { Menu, type MenuNode } from '../Menu'
import { LazyVideoDialog } from '../lazy/LazyWidgets'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AspectRatio,
  ChevronDown,
  ExternalLink,
  Play,
  Settings,
  Trash,
} from '../Icons'

const SIZE_PRESETS = [
  { label: 'S', value: 25, title: 'Small — 25% width' },
  { label: 'M', value: 50, title: 'Medium — 50% width' },
  { label: 'L', value: 75, title: 'Large — 75% width' },
  { label: 'Full', value: 100, title: 'Full width' },
]

const ASPECTS: VideoAspect[] = ['16:9', '4:3', '1:1', '9:16', '21:9']
const TOOLBAR_WIDTH = 456

type Corner = 'nw' | 'ne' | 'sw' | 'se'

export function VideoEmbedView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const attrs = node.attrs as unknown as VideoAttributes
  const width = typeof attrs.width === 'number' ? attrs.width : 100
  const aspect = ASPECTS.includes(attrs.aspect) ? attrs.aspect : '16:9'
  const align = attrs.align ?? 'center'
  const caption = attrs.caption ?? ''
  const embedUrl = buildVideoEmbedUrl({ ...attrs, aspect })
  const isFile = attrs.provider === 'file'

  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    columnWidth: number
    direction: 1 | -1
  } | null>(null)

  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [aspectMenuAt, setAspectMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)

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
  }, [updateToolbarPosition, width, aspect, align, selected, caption])

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

  const selectNode = () => {
    const pos = getPos()
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos)
  }

  const startResize = (event: ReactPointerEvent<HTMLSpanElement>, corner: Corner) => {
    const element = frameRef.current
    const column = element?.closest('.video-embed') as HTMLElement | null
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
    event.stopPropagation()
    const delta =
      ((event.clientX - drag.startX) / drag.columnWidth) * 100 * drag.direction
    const next = Math.round(Math.max(15, Math.min(100, drag.startWidth + delta)))
    if (next !== width) updateAttributes({ width: next })
  }

  const endResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current) return
    event.stopPropagation()
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

  const openAspectMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setAspectMenuAt({ x: rect.left, y: rect.bottom + 6 })
  }

  const aspectEntries: MenuNode[] = ASPECTS.map((value) => ({
    id: value,
    label: `${value}${value === '9:16' ? '  (portrait)' : value === '1:1' ? '  (square)' : ''}`,
    shortcut: aspect === value ? '✓' : undefined,
    onSelect: () => updateAttributes({ aspect: value }),
  }))

  const [widthPart, heightPart] = aspect.split(':').map(Number)
  const ratio = widthPart / heightPart
  const maxWidth = ratio < 1.2 ? `calc(72vh * ${ratio})` : undefined

  const toolbar =
    selected && !settingsOpen && toolbarAt
      ? createNotionPortal(
          <div
            className="image-toolbar video-toolbar popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Video options"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="video-toolbar__provider">{providerLabel(attrs.provider)}</span>
            <span className="image-toolbar__divider" />
            <div className="image-toolbar__sizes" role="group" aria-label="Video size">
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
              aria-label="Align left"
              data-tooltip="Align left"
              onClick={() => updateAttributes({ align: 'left' })}
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-active={align === 'center' ? 'true' : 'false'}
              aria-label="Align center"
              data-tooltip="Align center"
              onClick={() => updateAttributes({ align: 'center' })}
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              data-active={align === 'right' ? 'true' : 'false'}
              aria-label="Align right"
              data-tooltip="Align right"
              onClick={() => updateAttributes({ align: 'right' })}
            >
              <AlignRight size={15} />
            </button>
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--wide"
              aria-haspopup="menu"
              aria-label="Aspect ratio"
              data-tooltip="Aspect ratio"
              onClick={openAspectMenu}
            >
              <AspectRatio size={15} />
              <span>{aspect}</span>
              <ChevronDown size={9} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Video settings"
              data-tooltip="Video settings (URL, start time)"
              onClick={() => {
                setAspectMenuAt(null)
                setSettingsOpen(true)
              }}
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Open video in a new tab"
              data-tooltip="Open original"
              onClick={() =>
                window.open(attrs.src, '_blank', 'noopener,noreferrer')
              }
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              aria-label="Delete video"
              data-tooltip="Delete video"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>)
      : null

  return (
    <NodeViewWrapper
      className="video-embed"
      data-align={align}
      data-selected={selected ? 'true' : 'false'}
      data-provider={attrs.provider}
      data-resizing={resizing ? 'true' : 'false'}
      data-has-caption={caption ? 'true' : 'false'}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="video-embed__frame"
        style={{
          width: `${width}%`,
          maxWidth,
          aspectRatio: `${widthPart} / ${heightPart}`,
        }}
      >
        {isFile ? (
          <video
            className="video-embed__player"
            src={embedUrl}
            controls
            playsInline
            preload="metadata"
            autoPlay={attrs.autoplay}
            muted={attrs.muted || attrs.autoplay}
            onLoadedMetadata={(event) => {
              if (attrs.start > 0 && event.currentTarget.currentTime < 1) {
                event.currentTarget.currentTime = attrs.start
              }
            }}
          />
        ) : (
          <iframe
            className="video-embed__player"
            src={embedUrl}
            title={attrs.title || providerLabel(attrs.provider)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {!selected && (
          <button
            type="button"
            className="video-embed__overlay"
            aria-label="Select video"
            onClick={(event) => {
              event.preventDefault()
              selectNode()
            }}
          >
            <span className="video-embed__play">
              <Play size={22} />
            </span>
            <span className="video-embed__overlay-label">
              Click to select · then play
            </span>
          </button>
        )}

        {selected &&
          (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
            <span
              key={corner}
              className={`video-embed__handle video-embed__handle--${corner}`}
              onPointerDown={(event) => startResize(event, corner)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              aria-hidden="true"
            />
          ))}
      </div>

      <div
        className="video-embed__caption-wrap"
        style={{ width: `${width}%`, maxWidth }}
      >
        <input
          className="video-embed__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Video caption"
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

      {aspectMenuAt && (
        <Menu
          x={aspectMenuAt.x}
          y={aspectMenuAt.y}
          width={196}
          entries={aspectEntries}
          header={<div className="menu__header">Aspect ratio</div>}
          onClose={() => setAspectMenuAt(null)}
        />
      )}

      {settingsOpen && (
        <LazyVideoDialog
          mode="edit"
          initial={attrs}
          onApply={(next) => updateAttributes({ ...next })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
