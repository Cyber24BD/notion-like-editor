import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createNotionPortal } from './NotionPortal'
import { useFocusTrap } from './useFocusTrap'
import { X } from './Icons'

export type ColorPaletteKind = 'text' | 'highlight'

interface ColorPreset {
  label: string
  value: string | null
  css: string
  preview?: string
  none?: boolean
}

const TEXT_COLORS: ColorPreset[] = [
  { label: 'Default', value: null, css: 'var(--bg-elevated)', preview: 'A' },
  { label: 'Gray', value: 'var(--text-color-gray)', css: 'var(--text-color-gray)' },
  { label: 'Brown', value: 'var(--text-color-brown)', css: 'var(--text-color-brown)' },
  { label: 'Orange', value: 'var(--text-color-orange)', css: 'var(--text-color-orange)' },
  { label: 'Yellow', value: 'var(--text-color-yellow)', css: 'var(--text-color-yellow)' },
  { label: 'Green', value: 'var(--text-color-green)', css: 'var(--text-color-green)' },
  { label: 'Blue', value: 'var(--text-color-blue)', css: 'var(--text-color-blue)' },
  { label: 'Purple', value: 'var(--text-color-purple)', css: 'var(--text-color-purple)' },
  { label: 'Pink', value: 'var(--text-color-pink)', css: 'var(--text-color-pink)' },
  { label: 'Red', value: 'var(--text-color-red)', css: 'var(--text-color-red)' },
]

const HIGHLIGHT_COLORS: ColorPreset[] = [
  { label: 'No highlight', value: null, css: 'transparent', none: true },
  { label: 'Gray', value: 'var(--highlight-gray)', css: 'var(--highlight-gray)' },
  { label: 'Brown', value: 'var(--highlight-brown)', css: 'var(--highlight-brown)' },
  { label: 'Orange', value: 'var(--highlight-orange)', css: 'var(--highlight-orange)' },
  { label: 'Yellow', value: 'var(--highlight-yellow)', css: 'var(--highlight-yellow)' },
  { label: 'Green', value: 'var(--highlight-green)', css: 'var(--highlight-green)' },
  { label: 'Blue', value: 'var(--highlight-blue)', css: 'var(--highlight-blue)' },
  { label: 'Purple', value: 'var(--highlight-purple)', css: 'var(--highlight-purple)' },
  { label: 'Pink', value: 'var(--highlight-pink)', css: 'var(--highlight-pink)' },
  { label: 'Red', value: 'var(--highlight-red)', css: 'var(--highlight-red)' },
]

const RECENT_KEY = 'notion-like:recent-colors'
const MAX_RECENT = 6
const WIDTH = 248
const ESTIMATED_HEIGHT = 292
const HEX = /^#[0-9a-f]{3,8}$/i

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((value): value is string => typeof value === 'string' && HEX.test(value))
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function rememberColor(color: string): string[] {
  const next = [
    color,
    ...readRecent().filter((value) => value.toLowerCase() !== color.toLowerCase()),
  ].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
  return next
}

interface ColorPaletteProps {
  kind: ColorPaletteKind
  anchor: DOMRect
  trigger: HTMLElement | null
  current: string | null
  onSelect: (color: string | null) => void
  onClose: () => void
}

export function ColorPalette({
  kind,
  anchor,
  trigger,
  current,
  onSelect,
  onClose,
}: ColorPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef)
  const inputRef = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const presets = kind === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS
  const customActive = current !== null && HEX.test(current)
  const [customValue, setCustomValue] = useState(() =>
    customActive ? (current as string) : kind === 'text' ? '#d44c47' : '#fdecc8',
  )

  const left = Math.max(
    8,
    Math.min(anchor.left + anchor.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8),
  )
  let top = anchor.bottom + 8
  if (top + ESTIMATED_HEIGHT > window.innerHeight - 8) {
    top = Math.max(8, anchor.top - ESTIMATED_HEIGHT - 8)
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (trigger?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose, trigger])

  // Use native events so the OS picker can stream while open, and commit on
  // close instead of unmounting the input on every frame.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const onInput = () => setCustomValue(input.value)
    const onChange = () => {
      const value = input.value
      setCustomValue(value)
      setRecent(rememberColor(value))
      onSelect(value)
    }
    input.addEventListener('input', onInput)
    input.addEventListener('change', onChange)
    return () => {
      input.removeEventListener('input', onInput)
      input.removeEventListener('change', onChange)
    }
  }, [onSelect])

  const keepSelection = (event: ReactMouseEvent) => event.preventDefault()

  return createNotionPortal(
    <div
      ref={containerRef}
      className="color-palette notion-popover"
      style={{ top, left, width: WIDTH }}
      role="dialog"
      aria-label={kind === 'text' ? 'Text color' : 'Highlight color'}
    >
      <div className="color-palette__head">
        <span className="color-palette__title">
          {kind === 'text' ? 'Text color' : 'Highlight color'}
        </span>
        <button
          type="button"
          className="color-palette__close"
          aria-label="Close color picker"
          onClick={onClose}
        >
          <X size={13} />
        </button>
      </div>

      <div className="color-palette__grid">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={
              preset.none
                ? 'color-palette__swatch color-palette__swatch--none'
                : preset.preview
                  ? 'color-palette__swatch color-palette__swatch--default'
                  : 'color-palette__swatch'
            }
            style={{ background: preset.css }}
            title={preset.label}
            aria-label={preset.label}
            aria-pressed={current === preset.value}
            data-active={current === preset.value ? 'true' : 'false'}
            onMouseDown={keepSelection}
            onClick={() => onSelect(preset.value)}
          >
            {preset.preview && (
              <span
                className="color-palette__preview"
                style={{ color: preset.value ?? 'var(--text)' }}
              >
                {preset.preview}
              </span>
            )}
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <div className="color-palette__label">Recent</div>
          <div className="color-palette__recent">
            {recent.map((color) => (
              <button
                key={color}
                type="button"
                className="color-palette__swatch color-palette__recent-swatch"
                style={{ background: color }}
                title={color}
                aria-label={`Use ${color}`}
                onMouseDown={keepSelection}
                onClick={() => onSelect(color)}
              />
            ))}
          </div>
        </>
      )}

      <label className="color-palette__custom" data-active={customActive ? 'true' : 'false'}>
        <span
          className="color-palette__custom-dot"
          style={customActive ? { background: customValue } : undefined}
          aria-hidden="true"
        />
        <span className="color-palette__custom-label">Custom color…</span>
        {customActive && (
          <span className="color-palette__custom-value">{current?.toUpperCase()}</span>
        )}
        <input
          ref={inputRef}
          type="color"
          value={customValue}
          onChange={() => undefined}
          aria-label="Choose a custom color"
        />
      </label>
    </div>)
}
