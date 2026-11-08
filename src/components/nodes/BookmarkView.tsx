import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createNotionPortal } from '../NotionPortal'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import {
  fetchBookmarkMetadata,
  normalizeBookmarkUrl,
  type BookmarkAttributes,
} from '../../editor/bookmark/metadata'
import { BookmarkCard } from '../BookmarkCard'
import { LazyBookmarkDialog } from '../lazy/LazyWidgets'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
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

const TOOLBAR_WIDTH = 420

export function BookmarkView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const attrs = node.attrs as unknown as BookmarkAttributes
  const width = Math.min(
    100,
    Math.max(15, typeof attrs.width === 'number' ? attrs.width : 100),
  )
  const align = attrs.align ?? 'center'
  const url = attrs.url ?? ''

  const frameRef = useRef<HTMLDivElement>(null)
  const [toolbarAt, setToolbarAt] = useState<{ top: number; left: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

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
  }, [
    updateToolbarPosition,
    width,
    align,
    selected,
    attrs.title,
    attrs.description,
    attrs.image,
  ])

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

  const remove = () => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run()
  }

  const refresh = () => {
    if (refreshing || !url) return
    setRefreshing(true)
    void fetchBookmarkMetadata(url)
      .then((metadata) => {
        if (editor.isDestroyed) return
        const pos = getPos()
        if (typeof pos !== 'number') return
        updateAttributes({ ...metadata })
      })
      .catch(() => undefined)
      .finally(() => setRefreshing(false))
  }

  const copyLink = () => {
    const safeUrl = normalizeBookmarkUrl(url)
    if (!safeUrl || !navigator.clipboard) return
    void navigator.clipboard
      .writeText(safeUrl)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const openLink = () => {
    const safeUrl = normalizeBookmarkUrl(url)
    if (!safeUrl) return
    window.open(safeUrl, '_blank', 'noopener,noreferrer')
  }

  const toolbar =
    selected && !settingsOpen && toolbarAt
      ? createNotionPortal(
          <div
            className="image-toolbar bookmark-toolbar notion-popover"
            style={{ top: toolbarAt.top, left: toolbarAt.left }}
            role="toolbar"
            aria-label="Bookmark options"
            contentEditable={false}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="bookmark-toolbar__domain">
              {attrs.domain || attrs.siteName || 'Link'}
            </span>
            <span className="image-toolbar__divider" />
            <div className="image-toolbar__sizes" role="group" aria-label="Bookmark width">
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
              className="image-toolbar__btn"
              aria-label="Refresh link preview"
              data-tooltip="Refresh preview"
              data-loading={refreshing ? 'true' : 'false'}
              onClick={refresh}
            >
              <Refresh size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Copy link"
              data-tooltip={copied ? 'Copied' : 'Copy link'}
              onClick={copyLink}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Bookmark settings"
              data-tooltip="Edit bookmark"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn"
              aria-label="Open link in a new tab"
              data-tooltip="Open link"
              onClick={openLink}
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              className="image-toolbar__btn image-toolbar__btn--danger"
              aria-label="Delete bookmark"
              data-tooltip="Delete bookmark"
              onClick={remove}
            >
              <Trash size={15} />
            </button>
          </div>)
      : null

  return (
    <NodeViewWrapper
      className="bookmark-block"
      data-align={align}
      data-selected={selected ? 'true' : 'false'}
      contentEditable={false}
    >
      <div
        ref={frameRef}
        className="bookmark-block__frame"
        style={{ width: `${width}%` }}
      >
        <BookmarkCard
          url={url}
          title={attrs.title}
          description={attrs.description}
          image={attrs.image}
          favicon={attrs.favicon}
          domain={attrs.domain}
          siteName={attrs.siteName}
        />
      </div>

      {toolbar}

      {settingsOpen && (
        <LazyBookmarkDialog
          mode="edit"
          initial={attrs}
          onApply={(next) => updateAttributes({ ...next })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
