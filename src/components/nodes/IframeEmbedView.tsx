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
  clampIframeHeight,
  clampIframeWidth,
  iframeHostLabel,
  type IframeAttributes,
} from '../../editor/iframe/parseIframe'
import { styleIframeScrollbars } from '../../editor/iframe/scrollbarStyles'
import { Menu, type MenuNode } from '../Menu'
import { LazyIframeDialog } from '../lazy/LazyWidgets'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AspectRatio,
  ChevronDown,
  ExternalLink,
  Frame,
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
  { label: 'S — 240px', value: 240 },
  { label: 'M — 360px', value: 360 },
  { label: 'L — 480px', value: 480 },
  { label: 'XL — 640px', value: 640 },
]

const TOOLBAR_WIDTH = 440

type Corner = 'nw' | 'ne' | 'sw' | 'se'

export function IframeEmbedView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const attrs = node.attrs as unknown as IframeAttributes
  const width = clampIframeWidth(typeof attrs.width === 'number' ? attrs.width : 100)
  const height = clampIframeHeight(typeof attrs.height === 'number' ? attrs.height : 420)
  const align = attrs.align ?? 'center'
  const caption = attrs.caption ?? ''
  const src = attrs.src ?? ''
  const title = attrs.title || iframeHostLabel(src)

  const frameRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const scrollCleanupRef = useRef<(() => void) | null>(null)
  const dragRef = useRef<{
    startX: number
    startWidth: number
    columnWidth: number
    direction: 1 | -1
  } | null>(null)
  const heightDragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const scrollDragRef = useRef<{
    startY: number
    startTop: number
    trackHeight: number
    thumbHeight: number
    maxScroll: number
  } | null>(null)

  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [heightMenuAt, setHeightMenuAt] = useState<{ x: number; y: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)
  const [reloadKey, setReloadKey] = useState(0)
  const [scrollState, setScrollState] = useState<{
    top: number
    height: number
    client: number
  } | null>(null)

  useEffect(() => {
    setCaptionDraft(caption)
  }, [caption])

  const attachIframeTracking = useCallback((iframe: HTMLIFrameElement | null) => {
    scrollCleanupRef.current?.()
    scrollCleanupRef.current = null
    if (!iframe) {
      setScrollState(null)
      return
    }

    // Same-origin embeds can inherit the editor's slim scrollbar. Cross-origin
    // embeds are skipped safely inside the helper.
    styleIframeScrollbars(iframe)

    try {
      const win = iframe.contentWindow
      const doc = iframe.contentDocument
      if (!win || !doc?.documentElement) {
        setScrollState(null)
        return
      }

      let frameId = 0
      const update = () => {
        if (frameId) return
        frameId = window.requestAnimationFrame(() => {
          frameId = 0
          try {
            const root = doc.scrollingElement ?? doc.documentElement
            const scrollHeight = Math.max(
              root.scrollHeight,
              doc.body?.scrollHeight ?? 0,
            )
            const clientHeight = root.clientHeight
            if (scrollHeight <= clientHeight + 1) {
              setScrollState(null)
              return
            }
            setScrollState({
              top: win.scrollY || root.scrollTop || doc.body?.scrollTop || 0,
              height: scrollHeight,
              client: clientHeight,
            })
          } catch {
            setScrollState(null)
          }
        })
      }

      update()
      doc.documentElement.classList.add('notion-custom-scrollbar')
      win.addEventListener('scroll', update, { passive: true })
      const observer =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
      observer?.observe(doc.documentElement)
      if (doc.body) observer?.observe(doc.body)

      scrollCleanupRef.current = () => {
        if (frameId) window.cancelAnimationFrame(frameId)
        win.removeEventListener('scroll', update)
        observer?.disconnect()
        doc.documentElement.classList.remove('notion-custom-scrollbar')
      }
    } catch {
      setScrollState(null)
    }
  }, [])

  useEffect(() => {
    attachIframeTracking(iframeRef.current)
  }, [attachIframeTracking, src, reloadKey])

  useEffect(() => {
    return () => {
      scrollCleanupRef.current?.()
      scrollCleanupRef.current = null
    }
  }, [])

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
  }, [updateToolbarPosition, width, height, align, selected, caption])

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
    const column = element?.closest('.iframe-embed') as HTMLElement | null
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
    const next = clampIframeWidth(drag.startWidth + delta)
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
    const next = clampIframeHeight(drag.startHeight + (event.clientY - drag.startY))
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

  const startScrollDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const iframe = iframeRef.current
    if (!iframe || !scrollState) return
    event.preventDefault()
    event.stopPropagation()

    const rect = event.currentTarget.getBoundingClientRect()
    const trackHeight = Math.max(1, rect.height)
    const thumbHeight = Math.max(
      24,
      (scrollState.client / scrollState.height) * trackHeight,
    )
    const maxScroll = scrollState.height - scrollState.client
    const clickY = event.clientY - rect.top
    const currentThumbTop =
      maxScroll > 0
        ? (scrollState.top / maxScroll) * (trackHeight - thumbHeight)
        : 0
    let startTop = scrollState.top

    if (clickY < currentThumbTop || clickY > currentThumbTop + thumbHeight) {
      const targetThumbTop = Math.max(
        0,
        Math.min(clickY - thumbHeight / 2, trackHeight - thumbHeight),
      )
      const targetScroll =
        (targetThumbTop / Math.max(1, trackHeight - thumbHeight)) * maxScroll
      startTop = targetScroll
      try {
        iframe.contentWindow?.scrollTo({ top: targetScroll })
      } catch {
        /* cross-origin */
      }
    }

    scrollDragRef.current = {
      startY: event.clientY,
      startTop,
      trackHeight,
      thumbHeight,
      maxScroll,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveScrollDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = scrollDragRef.current
    const iframe = iframeRef.current
    if (!drag || !iframe) return
    event.preventDefault()
    event.stopPropagation()
    const scrollableTrack = drag.trackHeight - drag.thumbHeight
    if (scrollableTrack <= 0) return
    const target =
      drag.startTop + ((event.clientY - drag.startY) / scrollableTrack) * drag.maxScroll
    try {
      iframe.contentWindow?.scrollTo({ top: target })
    } catch {
      /* cross-origin */
    }
  }

  const endScrollDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollDragRef.current) return
    event.stopPropagation()
    scrollDragRef.current = null
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

  const trackHeight = Math.max(1, height - 8)
  const thumbHeight = scrollState
    ? Math.max(24, (scrollState.client / scrollState.height) * trackHeight)
    : 0
  const maxScroll = scrollState ? scrollState.height - scrollState.client : 0
  const thumbTop =
    scrollState && maxScroll > 0
      ? Math.max(
          0,
          Math.min(
            (scrollState.top / maxScroll) * Math.max(0, trackHeight - thumbHeight),
            Math.max(0, trackHeight - thumbHeight),
          ),
        )
      : 0

  const toolbar =
    selected && !settingsOpen && toolbarAt
      ? createNotionPortal(
          <div
            className="image-toolbar iframe-toolbar popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Iframe options"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="iframe-toolbar__provider">{iframeHostLabel(src)}</span>
            <span className="image-toolbar__divider" />
            <div className="image-toolbar__sizes" role="group" aria-label="Iframe width">
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
              aria-label="Iframe height"
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
              aria-label="Reload iframe"
              data-tooltip="Reload embed"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <Refresh size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Iframe settings"
              data-tooltip="Iframe settings (URL, title, height)"
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
              aria-label="Open embedded page in a new tab"
              data-tooltip="Open original"
              onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              aria-label="Delete iframe"
              data-tooltip="Delete iframe"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>)
      : null

  return (
    <NodeViewWrapper
      className="iframe-embed"
      data-align={align}
      data-selected={selected ? 'true' : 'false'}
      data-resizing={resizing ? 'true' : 'false'}
      data-has-caption={caption ? 'true' : 'false'}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="iframe-embed__frame"
        style={{ width: `${width}%`, height: `${height}px` }}
      >
        {src ? (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            className="iframe-embed__player"
            src={src}
            title={title}
            allowFullScreen={attrs.allowFullScreen !== false}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={(event) => attachIframeTracking(event.currentTarget)}
          />
        ) : (
          <div className="iframe-embed__empty">
            <Frame size={26} />
            <span>No embed URL yet</span>
          </div>
        )}

        {!selected && (
          <button
            type="button"
            className="iframe-embed__overlay"
            aria-label="Select iframe"
            onClick={(event) => {
              event.preventDefault()
              selectNode()
            }}
          >
            <span className="iframe-embed__badge">
              <Frame size={20} />
            </span>
            <span className="iframe-embed__overlay-label">
              Click to select · then interact
            </span>
          </button>
        )}

        {scrollState && (
          <div
            className="iframe-embed__scrollbar"
            onPointerDown={startScrollDrag}
            onPointerMove={moveScrollDrag}
            onPointerUp={endScrollDrag}
            onPointerCancel={endScrollDrag}
            aria-hidden="true"
          >
            <span
              className="iframe-embed__scrollbar-thumb"
              style={{
                height: `${thumbHeight}px`,
                transform: `translateY(${thumbTop}px)`,
              }}
            />
          </div>
        )}

        {selected &&
          (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
            <span
              key={corner}
              className={`iframe-embed__handle iframe-embed__handle--${corner}`}
              onPointerDown={(event) => startResize(event, corner)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              aria-hidden="true"
            />
          ))}

        {selected && (
          <span
            className="iframe-embed__handle iframe-embed__handle--bottom"
            onPointerDown={startHeightResize}
            onPointerMove={moveHeightResize}
            onPointerUp={endHeightResize}
            onPointerCancel={endHeightResize}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="iframe-embed__caption-wrap" style={{ width: `${width}%` }}>
        <input
          className="iframe-embed__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Iframe caption"
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
          header={<div className="menu__header">Height</div>}
          onClose={() => setHeightMenuAt(null)}
        />
      )}

      {settingsOpen && (
        <LazyIframeDialog
          mode="edit"
          initial={attrs}
          onApply={(next) => updateAttributes({ ...next })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
