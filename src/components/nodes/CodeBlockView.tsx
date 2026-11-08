import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from '@tiptap/react'
import {
  CODE_LANGUAGES,
  languageExtension,
  normalizeLanguage,
} from '../../editor/code/lowlight'
import { Menu, type MenuNode } from '../Menu'
import {
  AspectRatio,
  Check,
  ChevronDown,
  Copy,
  Download,
  ListOrdered,
  WrapText,
} from '../Icons'

const HEIGHT_PRESETS = [
  { label: 'S — 240px', value: 240 },
  { label: 'M — 360px', value: 360 },
  { label: 'L — 480px', value: 480 },
  { label: 'XL — 640px', value: 640 },
  { label: 'Auto', value: 0 },
]

export function CodeBlockView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? ''
  const currentLanguage = language ? normalizeLanguage(language) : ''
  const lineNumbers = Boolean(node.attrs.lineNumbers)
  const wrap = Boolean(node.attrs.wrap)
  const height = typeof node.attrs.height === 'number' ? node.attrs.height : 420
  const code = node.textContent
  const lineCount = code.split('\n').length
  const showLineNumbers = lineNumbers && !wrap

  const [copied, setCopied] = useState(false)
  const [heightMenuAt, setHeightMenuAt] = useState<{ x: number; y: number } | null>(
    null,
  )

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const languageOptions = CODE_LANGUAGES.some(
    (option) => option.value === currentLanguage,
  )
    ? CODE_LANGUAGES
    : [
        { value: currentLanguage, label: currentLanguage, extension: 'txt' },
        ...CODE_LANGUAGES,
      ]

  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard
      .writeText(code)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `code.${languageExtension(language)}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const toggleLineNumbers = () => {
    if (wrap) {
      updateAttributes({ wrap: false, lineNumbers: true })
      return
    }
    updateAttributes({ lineNumbers: !lineNumbers })
  }

  const openHeightMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHeightMenuAt({ x: rect.left, y: rect.bottom + 6 })
  }

  const heightEntries: MenuNode[] = HEIGHT_PRESETS.map((preset) => ({
    id: String(preset.value),
    label: preset.label,
    shortcut: height === preset.value ? '✓' : undefined,
    onSelect: () => updateAttributes({ height: preset.value }),
  }))

  return (
    <NodeViewWrapper
      className="code-block"
      data-selected={selected ? 'true' : 'false'}
      data-wrap={wrap ? 'true' : 'false'}
      data-line-numbers={showLineNumbers ? 'true' : 'false'}
    >
      <div
        className="code-block__header"
        contentEditable={false}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="code-block__language-wrap">
          <select
            className="code-block__language"
            value={currentLanguage}
            aria-label="Code language"
            onChange={(event) =>
              updateAttributes({ language: event.target.value || null })
            }
          >
            {languageOptions.map((option) => (
              <option key={option.value || 'auto'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={10} className="code-block__language-chevron" />
        </div>

        <span className="code-block__line-count">
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>

        <div className="code-block__actions">
          <button
            type="button"
            className="code-block__btn"
            aria-label={copied ? 'Copied' : 'Copy code'}
            data-tooltip={copied ? 'Copied' : 'Copy code'}
            onClick={copy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            className="code-block__btn"
            data-active={showLineNumbers ? 'true' : 'false'}
            aria-label="Toggle line numbers"
            data-tooltip={
              wrap
                ? 'Turn off word wrap to show line numbers'
                : 'Toggle line numbers'
            }
            onClick={toggleLineNumbers}
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            className="code-block__btn"
            data-active={wrap ? 'true' : 'false'}
            aria-label="Toggle word wrap"
            data-tooltip="Toggle word wrap"
            onClick={() => updateAttributes({ wrap: !wrap })}
          >
            <WrapText size={14} />
          </button>
          <button
            type="button"
            className="code-block__btn code-block__btn--wide"
            aria-haspopup="menu"
            aria-label="Code block height"
            data-tooltip="Code block height"
            onClick={openHeightMenu}
          >
            <AspectRatio size={14} />
            <span>{height > 0 ? `${height}px` : 'Auto'}</span>
            <ChevronDown size={9} />
          </button>
          <button
            type="button"
            className="code-block__btn"
            aria-label="Download code"
            data-tooltip="Download code"
            onClick={download}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div
        className="code-block__body notion-scroll"
        style={{ maxHeight: height > 0 ? `${height}px` : undefined }}
      >
        {showLineNumbers && (
          <div className="code-block__gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, index) => index + 1).join('\n')}
          </div>
        )}
        <pre className="code-block__pre">
          <NodeViewContent<'code'>
            as="code"
            className="code-block__code"
            style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
          />
        </pre>
      </div>

      {heightMenuAt && (
        <Menu
          x={heightMenuAt.x}
          y={heightMenuAt.y}
          width={196}
          entries={heightEntries}
          header={<div className="notion-menu__header">Code block height</div>}
          onClose={() => setHeightMenuAt(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
