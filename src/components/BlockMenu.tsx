import { useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Menu, type MenuEntry, type MenuNode } from './Menu'
import { moveBlock, selectBlockContent } from './BlockHandle'
import {
  clearBlockRange,
  copyBlockRange,
  deleteBlockRange,
  duplicateBlockRange,
  isBlockRangeSelection,
} from '../editor/nodes/BlockRange'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalloutIcon,
  Code,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  ListBulleted,
  ListOrdered,
  Quote,
  Todo,
  ToggleIcon,
  Trash,
  Type,
} from './Icons'

type TurnKind =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'code'

const TURN_OPTIONS: { kind: TurnKind; label: string; icon: ReactNode }[] = [
  { kind: 'paragraph', label: 'Text', icon: <Type size={16} /> },
  { kind: 'heading1', label: 'Heading 1', icon: <Heading1 size={16} /> },
  { kind: 'heading2', label: 'Heading 2', icon: <Heading2 size={16} /> },
  { kind: 'heading3', label: 'Heading 3', icon: <Heading3 size={16} /> },
  { kind: 'bulletList', label: 'Bulleted list', icon: <ListBulleted size={16} /> },
  { kind: 'orderedList', label: 'Numbered list', icon: <ListOrdered size={16} /> },
  { kind: 'taskList', label: 'To-do list', icon: <Todo size={16} /> },
  { kind: 'toggle', label: 'Toggle list', icon: <ToggleIcon size={16} /> },
  { kind: 'quote', label: 'Quote', icon: <Quote size={16} /> },
  { kind: 'callout', label: 'Callout', icon: <CalloutIcon size={16} /> },
  { kind: 'code', label: 'Code', icon: <Code size={16} /> },
]

interface BlockMenuProps {
  editor: Editor
  target: { pos: number; node: PMNode }
  x: number
  y: number
  onClose: () => void
}

export function BlockMenu({ editor, target, x, y, onClose }: BlockMenuProps) {
  const [view, setView] = useState<'root' | 'turn'>('root')
  const { pos, node } = target

  const doc = editor.state.doc
  const index = doc.resolve(Math.min(pos, doc.content.size)).index(0)
  const canMoveUp = index > 0
  const canMoveDown = index < doc.childCount - 1
  const selection = editor.state.selection
  const rangeActive =
    isBlockRangeSelection(editor) &&
    selection.from <= pos &&
    selection.to >= pos + node.nodeSize
  const blockCount = rangeActive ? selection.ranges.length : 1

  const convert = (kind: TurnKind) => {
    if (node.isLeaf) return
    switch (kind) {
      case 'paragraph':
        editor.chain().focus().setNodeSelection(pos).setParagraph().run()
        break
      case 'heading1':
        editor.chain().focus().setNodeSelection(pos).setHeading({ level: 1 }).run()
        break
      case 'heading2':
        editor.chain().focus().setNodeSelection(pos).setHeading({ level: 2 }).run()
        break
      case 'heading3':
        editor.chain().focus().setNodeSelection(pos).setHeading({ level: 3 }).run()
        break
      case 'quote':
        editor.chain().focus().setNodeSelection(pos).toggleBlockquote().run()
        break
      case 'code':
        editor.chain().focus().setNodeSelection(pos).toggleCodeBlock().run()
        break
      case 'bulletList':
        if (selectBlockContent(editor, pos, node)) {
          editor.chain().focus().toggleBulletList().run()
        }
        break
      case 'orderedList':
        if (selectBlockContent(editor, pos, node)) {
          editor.chain().focus().toggleOrderedList().run()
        }
        break
      case 'taskList':
        if (selectBlockContent(editor, pos, node)) {
          editor.chain().focus().toggleTaskList().run()
        }
        break
      case 'toggle':
        if (selectBlockContent(editor, pos, node)) {
          editor.chain().focus().wrapIn('toggle', { open: true }).run()
        }
        break
      case 'callout':
        if (selectBlockContent(editor, pos, node)) {
          editor.chain().focus().toggleCallout().run()
        }
        break
    }
  }

  const groupEntries: MenuNode[] = [
    {
      id: 'duplicate-range',
      label: `Duplicate ${blockCount} blocks`,
      icon: <Copy size={15} />,
      shortcut: '⌘D',
      onSelect: () => duplicateBlockRange(editor),
    },
    {
      id: 'delete-range',
      label: `Delete ${blockCount} blocks`,
      icon: <Trash size={15} />,
      shortcut: '⌫',
      danger: true,
      onSelect: () => deleteBlockRange(editor),
    },
    {
      id: 'copy-range',
      label: `Copy ${blockCount} blocks`,
      icon: <Copy size={15} />,
      shortcut: '⌘C',
      onSelect: () => void copyBlockRange(editor),
    },
    { type: 'separator', id: 'sep-range' },
    {
      id: 'clear-range',
      label: 'Clear selection',
      icon: <Type size={15} />,
      shortcut: 'Esc',
      onSelect: () => clearBlockRange(editor),
    },
  ]

  const rootEntries: MenuNode[] = [
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy size={15} />,
      shortcut: '⌘D',
      onSelect: () => {
        editor
          .chain()
          .focus()
          .insertContentAt(pos + node.nodeSize, node.toJSON())
          .run()
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash size={15} />,
      shortcut: '⌫',
      danger: true,
      onSelect: () => {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
      },
    },
    { type: 'separator', id: 'sep-1' },
    {
      id: 'turn-into',
      label: 'Turn into',
      icon: <Type size={15} />,
      shortcut: '›',
      keepOpen: true,
      onSelect: () => setView('turn'),
    },
    { type: 'separator', id: 'sep-2' },
    {
      id: 'copy-text',
      label: 'Copy text',
      icon: <Copy size={15} />,
      disabled: !node.textContent,
      onSelect: () => {
        void navigator.clipboard.writeText(node.textContent)
      },
    },
    {
      id: 'move-up',
      label: 'Move up',
      icon: <ArrowUp size={15} />,
      shortcut: '⌘⇧↑',
      disabled: !canMoveUp,
      onSelect: () => moveBlock(editor, pos, node, -1),
    },
    {
      id: 'move-down',
      label: 'Move down',
      icon: <ArrowDown size={15} />,
      shortcut: '⌘⇧↓',
      disabled: !canMoveDown,
      onSelect: () => moveBlock(editor, pos, node, 1),
    },
  ]

  const turnEntries: MenuEntry[] = TURN_OPTIONS.map((option) => ({
    id: option.kind,
    label: option.label,
    icon: option.icon,
    onSelect: () => convert(option.kind),
  }))

  return (
    <Menu
      x={x}
      y={y}
      width={view === 'turn' ? 236 : 228}
      entries={
        view === 'turn' ? turnEntries : rangeActive ? groupEntries : rootEntries
      }
      header={
        rangeActive && view === 'root' ? (
          <div className="notion-menu__header">{blockCount} blocks selected</div>
        ) :
        view === 'turn' ? (
          <button
            type="button"
            className="notion-menu__header notion-menu__header--back"
            onClick={() => setView('root')}
          >
            <ArrowLeft size={14} />
            <span>Turn into</span>
          </button>
        ) : undefined
      }
      onClose={onClose}
    />
  )
}
