import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/react/menus'
import { useEditorState } from '@tiptap/react'
import type { ColorPaletteKind } from './ColorPalette'
import { LazyColorPalette } from './lazy/LazyWidgets'
import { Menu, type MenuNode } from './Menu'
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  LinkIcon,
  ListBulleted,
  ListOrdered,
  Quote,
  Strike,
  TextColor,
  Todo,
  Type,
  Underline,
  X,
} from './Icons'

interface BubbleToolbarProps {
  editor: Editor
  scrollTarget: HTMLElement | null
}

const MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl'

export function BubbleToolbar({ editor, scrollTarget }: BubbleToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState('')
  const [palette, setPalette] = useState<{
    kind: ColorPaletteKind
    anchor: DOMRect
    trigger: HTMLElement
  } | null>(null)
  const [turnIntoAt, setTurnIntoAt] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const savedSelection = useRef<{ from: number; to: number } | null>(null)

  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      highlight: current.isActive('highlight'),
      link: current.isActive('link'),
      color: (current.getAttributes('textStyle').color as string | undefined) ?? null,
      highlightColor:
        (current.getAttributes('highlight').color as string | undefined) ?? null,
      canLink: !current.isActive('codeBlock'),
    }),
  })

  useEffect(() => {
    if (!linkOpen) return
    setHref((editor.getAttributes('link').href as string | undefined) ?? '')
    window.setTimeout(() => inputRef.current?.focus(), 10)
  }, [editor, linkOpen])

  const applyLink = () => {
    const value = href.trim()
    if (!value) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setLinkOpen(false)
      return
    }
    const normalized = /^(https?:\/\/|mailto:|#|\/)/i.test(value)
      ? value
      : `https://${value}`
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
    setLinkOpen(false)
  }

  const keepSelection = (event: MouseEvent) => event.preventDefault()

  const menuOptions = useMemo(
    () => ({
      strategy: 'fixed' as const,
      placement: 'top' as const,
      offset: 10,
      scrollTarget: scrollTarget ?? window,
    }),
    [scrollTarget],
  )

  const shouldShowMenu = useCallback(
    ({ editor: current, from, to }: { editor: Editor; from: number; to: number }) => {
      const { selection } = current.state
      return (
        from !== to &&
        !selection.empty &&
        selection.$anchor.parent.inlineContent &&
        !current.isActive('codeBlock') &&
        current.isEditable
      )
    },
    [],
  )

  const appendToBody = useCallback(() => document.body, [])

  const openPalette = (
    kind: ColorPaletteKind,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (palette?.kind === kind && palette.trigger === event.currentTarget) {
      setPalette(null)
      return
    }
    const selection = editor.state.selection
    savedSelection.current = { from: selection.from, to: selection.to }
    const anchor = event.currentTarget.getBoundingClientRect()
    setTurnIntoAt(null)
    setPalette({
      kind,
      anchor: new DOMRect(anchor.left, anchor.top, anchor.width, anchor.height),
      trigger: event.currentTarget,
    })
  }

  const applyColor = (color: string | null) => {
    const range = savedSelection.current
    const chain = editor.chain().focus()
    if (range) chain.setTextSelection(range)
    if (palette?.kind === 'highlight') {
      if (color) chain.setHighlight({ color }).run()
      else chain.unsetHighlight().run()
    } else if (color) {
      chain.setColor(color).run()
    } else {
      chain.unsetColor().run()
    }
    setPalette(null)
  }

  const openTurnInto = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setPalette(null)
    setTurnIntoAt({ x: rect.left, y: rect.bottom + 6 })
  }

  const turnIntoEntries: MenuNode[] = [
    {
      id: 'paragraph',
      label: 'Text',
      icon: <Type size={15} />,
      shortcut: editor.isActive('paragraph') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().setParagraph().run(),
    },
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: <Heading1 size={16} />,
      shortcut: editor.isActive('heading', { level: 1 }) ? '✓' : undefined,
      onSelect: () => editor.chain().focus().setHeading({ level: 1 }).run(),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: <Heading2 size={16} />,
      shortcut: editor.isActive('heading', { level: 2 }) ? '✓' : undefined,
      onSelect: () => editor.chain().focus().setHeading({ level: 2 }).run(),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: <Heading3 size={16} />,
      shortcut: editor.isActive('heading', { level: 3 }) ? '✓' : undefined,
      onSelect: () => editor.chain().focus().setHeading({ level: 3 }).run(),
    },
    { type: 'separator', id: 'turn-sep-1' },
    {
      id: 'bullet-list',
      label: 'Bulleted list',
      icon: <ListBulleted size={15} />,
      shortcut: editor.isActive('bulletList') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      label: 'Numbered list',
      icon: <ListOrdered size={15} />,
      shortcut: editor.isActive('orderedList') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'task-list',
      label: 'To-do list',
      icon: <Todo size={15} />,
      shortcut: editor.isActive('taskList') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: <Quote size={15} />,
      shortcut: editor.isActive('blockquote') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code',
      label: 'Code block',
      icon: <Code size={15} />,
      shortcut: editor.isActive('codeBlock') ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ]

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-menu"
      appendTo={appendToBody}
      options={menuOptions}
      shouldShow={shouldShowMenu}
    >
      {linkOpen ? (
        <form
          className="bubble-menu__link"
          onSubmit={(event) => {
            event.preventDefault()
            applyLink()
          }}
        >
          <LinkIcon size={15} />
          <input
            ref={inputRef}
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="Paste a link…"
            aria-label="Link URL"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setLinkOpen(false)
              }
            }}
          />
          <button type="submit" className="bubble-menu__submit" aria-label="Apply link">
            <Check size={14} />
          </button>
          <button
            type="button"
            className="bubble-menu__submit"
            aria-label="Cancel"
            onClick={() => setLinkOpen(false)}
          >
            <X size={14} />
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="bubble-menu__btn bubble-menu__btn--turn"
            aria-haspopup="menu"
            aria-label="Turn into"
            data-tooltip="Turn into"
            onMouseDown={keepSelection}
            onClick={openTurnInto}
          >
            <Type size={15} />
            <ChevronDown size={9} className="bubble-menu__chevron" />
          </button>
          <span className="bubble-menu__divider" />

          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.bold}
            aria-label="Bold"
            data-tooltip={`Bold · ${MOD}B`}
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.italic}
            aria-label="Italic"
            data-tooltip={`Italic · ${MOD}I`}
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.underline}
            aria-label="Underline"
            data-tooltip={`Underline · ${MOD}U`}
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.strike}
            aria-label="Strikethrough"
            data-tooltip={`Strikethrough · ${MOD}⇧S`}
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strike size={15} />
          </button>
          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.code}
            aria-label="Inline code"
            data-tooltip={`Code · ${MOD}E`}
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code size={15} />
          </button>

          <span className="bubble-menu__divider" />

          <button
            type="button"
            className="bubble-menu__btn bubble-menu__btn--color"
            aria-haspopup="dialog"
            aria-label="Text color"
            aria-pressed={marks.color !== null}
            data-tooltip="Text color"
            onMouseDown={keepSelection}
            onClick={(event) => openPalette('text', event)}
          >
            <TextColor size={16} />
            <span
              className="bubble-menu__color-bar"
              style={{ background: marks.color ?? 'var(--text)' }}
            />
          </button>
          <button
            type="button"
            className="bubble-menu__btn bubble-menu__btn--color"
            aria-haspopup="dialog"
            aria-label="Highlight color"
            aria-pressed={marks.highlight}
            data-highlight-color={marks.highlightColor ?? undefined}
            data-tooltip="Highlight"
            onMouseDown={keepSelection}
            onClick={(event) => openPalette('highlight', event)}
          >
            <Highlighter size={16} />
            <span
              className="bubble-menu__color-bar"
              style={{
                background: marks.highlightColor ?? 'var(--highlight-yellow)',
              }}
            />
          </button>

          <span className="bubble-menu__divider" />

          <button
            type="button"
            className="bubble-menu__btn"
            aria-pressed={marks.link}
            aria-label="Link"
            data-tooltip="Link"
            disabled={!marks.canLink}
            onMouseDown={keepSelection}
            onClick={() => {
              setPalette(null)
              setTurnIntoAt(null)
              editor.chain().focus().extendMarkRange('link').run()
              setLinkOpen(true)
            }}
          >
            <LinkIcon size={15} />
          </button>
          <button
            type="button"
            className="bubble-menu__btn"
            aria-label="Clear formatting"
            data-tooltip="Clear formatting"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
          >
            <Eraser size={15} />
          </button>
        </>
      )}

      {turnIntoAt && (
        <Menu
          x={turnIntoAt.x}
          y={turnIntoAt.y}
          width={216}
          entries={turnIntoEntries}
          header={<div className="menu__header">Turn into</div>}
          onClose={() => setTurnIntoAt(null)}
        />
      )}

      {palette && (
        <LazyColorPalette
          kind={palette.kind}
          anchor={palette.anchor}
          trigger={palette.trigger}
          current={palette.kind === 'text' ? marks.color : marks.highlightColor}
          onSelect={applyColor}
          onClose={() => setPalette(null)}
        />
      )}
    </BubbleMenu>
  )
}
