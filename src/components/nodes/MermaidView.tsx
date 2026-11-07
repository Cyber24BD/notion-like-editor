import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import {
  downloadSvg,
  mermaidLiveUrl,
  renderMermaid,
  svgDataUrl,
} from '../../editor/mermaid/render'
import { openMermaidDialog } from '../../editor/mermaid/dialogStore'
import { ImageLightbox, type LightboxImage } from '../ImageLightbox'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Maximize,
  Pencil,
  Trash,
} from '../Icons'

export function MermaidView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const code = String(node.attrs.code ?? '')
  const theme = String(node.attrs.theme ?? 'default')
  const height = typeof node.attrs.height === 'number' ? node.attrs.height : 0
  const caption = String(node.attrs.caption ?? '')
  const empty = !code.trim()

  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(caption)
  const [preview, setPreview] = useState<LightboxImage | null>(null)

  useEffect(() => {
    setCaptionDraft(caption)
  }, [caption])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    let cancelled = false
    if (empty) {
      setSvg('')
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    void renderMermaid(code, theme)
      .then((nextSvg) => {
        if (cancelled) return
        setSvg(nextSvg)
        setLoading(false)
      })
      .catch((renderError) => {
        if (cancelled) return
        setSvg('')
        setError(
          renderError instanceof Error
            ? renderError.message
            : 'Could not render this diagram.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [code, empty, theme])

  const edit = () => {
    openMermaidDialog({
      editor,
      initialCode: code,
      initialTheme: theme,
      initialHeight: height,
      onApply: (nextCode, nextTheme, nextHeight) =>
        updateAttributes({
          code: nextCode,
          theme: nextTheme,
          height: nextHeight,
        }),
    })
  }

  const copyCode = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard
      .writeText(code)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const download = () => {
    if (!svg) return
    downloadSvg(svg, 'mermaid-diagram.svg')
  }

  const openLive = () => {
    if (!code.trim()) return
    window.open(mermaidLiveUrl(code, theme), '_blank', 'noopener,noreferrer')
  }

  const openPreview = () => {
    if (!svg) return
    setPreview({
      src: svgDataUrl(svg),
      alt: 'Mermaid diagram',
      caption: '',
      pos: 0,
    })
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

  return (
    <NodeViewWrapper
      className="mermaid-block"
      data-selected={selected ? 'true' : 'false'}
      data-error={error ? 'true' : 'false'}
      data-empty={empty ? 'true' : 'false'}
      data-loading={loading ? 'true' : 'false'}
      data-has-caption={caption ? 'true' : 'false'}
      data-theme={theme}
      data-height={height}
      contentEditable={false}
      role="button"
      tabIndex={0}
      title={code || 'Mermaid diagram'}
      aria-label={code ? 'Mermaid diagram' : 'Empty Mermaid diagram'}
      onClick={(event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        event.stopPropagation()
        edit()
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          edit()
        }
      }}
    >
      <div
        className="mermaid-block__toolbar"
        contentEditable={false}
        role="toolbar"
        aria-label="Mermaid options"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="mermaid-block__btn"
          aria-label="Edit diagram"
          title="Edit diagram"
          onClick={edit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="mermaid-block__btn"
          aria-label={copied ? 'Mermaid code copied' : 'Copy Mermaid code'}
          title={copied ? 'Copied' : 'Copy Mermaid code'}
          data-copied={copied ? 'true' : 'false'}
          onClick={copyCode}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button
          type="button"
          className="mermaid-block__btn"
          aria-label="Download SVG"
          title="Download SVG"
          disabled={!svg}
          onClick={download}
        >
          <Download size={14} />
        </button>
        <button
          type="button"
          className="mermaid-block__btn"
          aria-label="Preview diagram"
          title="Preview diagram"
          disabled={!svg}
          onClick={openPreview}
        >
          <Maximize size={14} />
        </button>
        <button
          type="button"
          className="mermaid-block__btn"
          aria-label="Open in Mermaid Live"
          title="Open in Mermaid Live"
          disabled={!code.trim()}
          onClick={openLive}
        >
          <ExternalLink size={14} />
        </button>
        <button
          type="button"
          className="mermaid-block__btn mermaid-block__btn--danger"
          aria-label="Delete diagram"
          title="Delete diagram"
          onClick={remove}
        >
          <Trash size={14} />
        </button>
      </div>

      <div
        className="mermaid-block__content notion-scroll"
        style={{ maxHeight: height > 0 ? `${height}px` : undefined }}
      >
        {loading ? (
          <div className="mermaid-block__spinner" aria-hidden="true" />
        ) : error ? (
          <div className="mermaid-block__error">
            <strong>Could not render diagram</strong>
            <span>{error}</span>
          </div>
        ) : svg ? (
          <div
            className="mermaid-block__svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mermaid-block__placeholder">
            Click to add a Mermaid diagram
          </div>
        )}
      </div>

      <div className="mermaid-block__caption-wrap">
        <input
          className="mermaid-block__caption"
          value={captionDraft}
          placeholder="Add a caption…"
          aria-label="Mermaid caption"
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

      {preview && (
        <ImageLightbox
          images={[preview]}
          index={0}
          onIndexChange={() => undefined}
          onClose={() => setPreview(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
