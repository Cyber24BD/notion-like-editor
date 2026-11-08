import { useEffect, useRef } from 'react'
import { X } from './Icons'

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Frequent',
    emojis: ['📄', '📝', '📌', '📚', '🌱', '💡', '🎨', '🚀', '✅', '🔥', '⭐', '🧠'],
  },
  {
    label: 'Work',
    emojis: ['💼', '📊', '📈', '🗂️', '🗒️', '📎', '🖇️', '📅', '⏰', '🔗', '🛠️', '⚙️'],
  },
  {
    label: 'Nature',
    emojis: ['🌿', '🍀', '🌳', '🌸', '🌊', '🌙', '☀️', '🌈', '🪴', '🍃', '🐚', '❄️'],
  },
  {
    label: 'Objects',
    emojis: ['💻', '🖥️', '⌨️', '🖊️', '✏️', '📷', '🎧', '🎵', '📦', '🧩', '🔍', '🗝️'],
  },
  {
    label: 'People',
    emojis: ['👋', '🙌', '👏', '🤝', '💪', '🧑‍💻', '🧑‍🎨', '🕵️', '🧘', '🫶', '🙂', '😎'],
  },
  {
    label: 'Symbols',
    emojis: ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '✨', '❗', '❓', '⚡', '🎯'],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  onRemove?: () => void
  className?: string
}

export function EmojiPicker({ onSelect, onClose, onRemove, className }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className={`emoji-picker notion-popover ${className ?? ''}`}
      role="dialog"
      aria-label="Pick an icon"
    >
      <div className="emoji-picker__head">
        <span className="emoji-picker__title">Icon</span>
        <button className="notion-icon-btn" onClick={onClose} aria-label="Close icon picker">
          <X size={14} />
        </button>
      </div>
      <div className="emoji-picker__scroll notion-scroll">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="emoji-picker__group">
            <div className="emoji-picker__label">{group.label}</div>
            <div className="emoji-picker__grid">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  className="emoji-picker__item"
                  onClick={() => onSelect(emoji)}
                  aria-label={emoji}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {onRemove && (
        <button className="emoji-picker__remove" onClick={onRemove} type="button">
          Remove icon
        </button>
      )}
    </div>
  )
}
