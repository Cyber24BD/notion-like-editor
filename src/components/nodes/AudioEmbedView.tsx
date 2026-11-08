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
  buildAudioEmbedUrl,
  isAudioFile,
  providerLabel,
  type AudioAttributes,
} from '../../editor/audio/parseAudio'
import { Menu, type MenuNode } from '../Menu'
import { LazyAudioDialog } from '../lazy/LazyWidgets'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AspectRatio,
  Audio,
  ChevronDown,
  ExternalLink,
  Refresh,
  Settings,
  Trash,
} from '../Icons'

const SIZE_PRESETS = [
  { label: 'S', value: 25, title: 'Small — 25% width' },
  { label: 'M', value: 50, title: 'Medium — 50% width' },
  { label: 'L', value: 75, title: 'Large — 75% width' },
  { label: 'Full', value: 100, title: 'Full width' },
]

const HEIGHT_PRESETS = [
  { label: 'S — 120px', value: 120 },
  { label: 'M — 175px', value: 175 },
  { label: 'L — 300px', value: 300 },
  { label: 'XL — 420px', value: 420 },
]

const TOOLBAR_WIDTH = 440
const FILE_HEIGHT = 96

type Corner = 'nw' | 'ne' | 'sw' | 'se'

export function AudioEmbedView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const attrs = node.attrs as unknown as AudioAttributes
  const width = Math.min(
    100,
    Math.max(15, typeof attrs.width === 'number' ? attrs.width : 100),
  )
  const height = Math.max(0, typeof attrs.height === 'number' ? attrs.height : 96)
  const align = attrs.align ?? 'center'
  const caption = attrs.caption ?? ''
  const src = attrs.src ?? ''
  const title = attrs.title || providerLabel(attrs.provider)
  const isFile = isAudioFile(attrs.provider)
  const embedUrl = buildAudioEmbedUrl(attrs)
  const frameHeight = isFile ? FILE_HEIGHT : height

  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    columnWidth: number
    direction: 1 | -1
  } | null>(null)
  const heightDragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [heightMenuAt, setHeightMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [updateToolbarPosition, width, height, align, selected, caption, isFile])

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
    const column = element?.closest('.audio-embed') as HTMLElement | null
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

  const startHeightResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (isFile) return
    event.preventDefault()
    event.stopPropagation()
    heightDragRef.current = { startY: event.clientY, startHeight: height }
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing(true)
  }

  const moveHeightResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const drag = heightDragRef.current
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    const next = Math.round(
      Math.max(80, Math.min(1200, drag.startHeight + (event.clientY - drag.startY))),
    )
    if (next !== height) updateAttributes({ height: next })
  }

  const endHeightResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!heightDragRef.current) return
    event.stopPropagation()
    heightDragRef.current = null
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

  const openHeightMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHeightMenuAt({ x: rect.left, y: rect.bottom + 6 })
  }

  const heightEntries: MenuNode[] = HEIGHT_PRESETS.map((preset) => ({
    id: String(preset.value),
    label: preset.label,
    shortcut: Math.abs(height - preset.value) < 1 ? '✓' : undefined,
    onSelect: () => updateAttributes({ height: preset.value }),
  }))

  const toolbar =
    selected && !settingsOpen && toolbarAt
      ? createNotionPortal(
          <div
            className="image-toolbar audio-toolbar popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Audio options"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="audio-toolbar__provider">
              {providerLabel(attrs.provider)}
            </span>
            <span className="image-toolbar__divider" />
            <div className="image-toolbar__sizes" role="group" aria-label="Audio width">
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
            {!isFile && (
              <>
                <span className="image-toolbar__divider" />
                <button
                  type="button"
                  className="image-toolbar__btn image-toolbar__btn--wide"
                  aria-haspopup="menu"
                  aria-label="Audio height"
                  data-tooltip="Height"
                  onClick={openHeightMenu}
                >
                  <AspectRatio size={15} />
                  <span>{height}px</span>
                  <ChevronDown size={9} />
                </button>
                <button
                  type="button"
                  className="image-toolbar__btn"
                  aria-label="Reload audio embed"
                  data-tooltip="Reload embed"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  <Refresh size={15} />
                </button>
              </>
            )}
            <span className="image-toolbar__divider" />
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Audio settings"
              data-tooltip="Audio settings"
              onClick={() => {
                setHeightMenuAt(null)
                setSettingsOpen(true)
              }}
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Open audio in a new tab"
              data-tooltip="Open original"
              onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              aria-label="Delete audio"
              data-tooltip="Delete audio"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>)
      : null

  return (
    <NodeViewWrapper
      className="audio-embed"
      data-align={align}
      data-selected={selected ? 'true' : 'false'}
      data-resizing={resizing ? 'true' : 'false'}
      data-provider={attrs.provider}
      data-has-caption={caption ? 'true' : 'false'}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="audio-embed__frame"
        style={{ width: `${width}%`, height: `${frameHeight}px` }}
      >
        {isFile ? (
          <div className="audio-embed__file">
            <div className="audio-embed__file-meta">
              <span className="audio-embed__file-icon" aria-hidden="true">
                <Audio size={15} />
              </span>
              <span className="audio-embed__file-title">{title}</span>
            </div>
            <audio
              className="audio-embed__audio"
              src={src}
              controls
              preload="metadata"
            />
          </div>
        ) : (
          <iframe
            key={reloadKey}
            className="audio-embed__player"
            src={embedUrl}
            title={title}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {selected &&
          (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
            <span
              key={corner}
              className={`audio-embed__handle audio-embed__handle--${corner}`}
              onPointerDown={(event) => startResize(event, corner)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              aria-hidden="true"
            />
          ))}

        {selected && !isFile && (
          <span
            className="audio-embed__handle audio-embed__handle--bottom"
            onPointerDown={startHeightResize}
            onPointerMove={moveHeightResize}
            onPointerUp={endHeightResize}
            onPointerCancel={endHeightResize}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="audio-embed__caption-wrap" style={{ width: `${width}%` }}>
        <input
          className="audio-embed__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Audio caption"
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

      {heightMenuAt && (
        <Menu
          x={heightMenuAt.x}
          y={heightMenuAt.y}
          width={196}
          entries={heightEntries}
          header={<div className="menu__header">Audio height</div>}
          onClose={() => setHeightMenuAt(null)}
        />
      )}

      {settingsOpen && (
        <LazyAudioDialog
          mode="edit"
          initial={attrs}
          onApply={(next) => updateAttributes({ ...next })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
