import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createNotionPortal } from './NotionPortal'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { isInTable, selectedRect } from '@tiptap/pm/tables'
import {
  currentCellInfo,
  selectCurrentColumn,
  selectCurrentRow,
  selectWholeTable,
} from '../editor/tableActions'
import { Menu, type MenuNode } from './Menu'
import {
  ChevronDown,
  Merge,
  Plus,
  Split,
  Table as TableIcon,
  Trash,
} from './Icons'

type MenuKind = 'row' | 'column' | 'header'

interface TableToolbarProps {
  editor: Editor
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      inTable: isInTable(current.state),
      canMerge: current.can().mergeCells(),
      canSplit: current.can().splitCell(),
      canDeleteRow: current.can().deleteRow(),
      canDeleteColumn: current.can().deleteColumn(),
    }),
  })

  const toolbarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [menu, setMenu] = useState<{ kind: MenuKind; x: number; y: number } | null>(null)

  const updatePosition = useCallback(() => {
    if (!state.inTable) {
      setPosition(null)
      return
    }
    let tableElement: HTMLElement | null = null
    try {
      const rect = selectedRect(editor.state)
      const dom = editor.view.nodeDOM(rect.tableStart - 1)
      if (dom instanceof HTMLElement) {
        tableElement = dom.matches('table') ? dom : dom.querySelector('table')
      }
    } catch {
      tableElement = null
    }
    if (!tableElement) {
      setPosition(null)
      return
    }

    const rect = tableElement.getBoundingClientRect()
    const width = toolbarRef.current?.offsetWidth ?? 380
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    let top = rect.top - 46
    if (top < 56) top = rect.bottom + 10
    top = Math.min(top, window.innerHeight - 60)
    setPosition((previous) =>
      previous &&
      Math.abs(previous.top - top) < 0.5 &&
      Math.abs(previous.left - left) < 0.5
        ? previous
        : { top, left },
    )
  }, [editor, state.inTable])

  useLayoutEffect(() => {
    updatePosition()
  })

  useEffect(() => {
    if (!state.inTable) return
    let frame = 0
    const onChange = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updatePosition()
      })
    }
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [state.inTable, updatePosition])

  if (!state.inTable || !position) return null

  let headerRow = false
  let headerColumn = false
  try {
    const cell = currentCellInfo(editor)
    headerRow = cell.isHeaderRow
    headerColumn = cell.isHeaderColumn
  } catch {
    /* selection moved out of the table */
  }

  const openMenu =
    (kind: MenuKind) => (event: ReactMouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      setMenu({ kind, x: rect.left, y: rect.bottom + 6 })
    }

  const rowEntries: MenuNode[] = [
    {
      id: 'row-above',
      label: 'Insert row above',
      icon: <Plus size={15} />,
      onSelect: () => editor.chain().focus().addRowBefore().run(),
    },
    {
      id: 'row-below',
      label: 'Insert row below',
      icon: <Plus size={15} />,
      onSelect: () => editor.chain().focus().addRowAfter().run(),
    },
    { type: 'separator', id: 'row-sep-1' },
    {
      id: 'row-select',
      label: 'Select row',
      icon: <TableIcon size={15} />,
      onSelect: () => selectCurrentRow(editor),
    },
    {
      id: 'row-delete',
      label: 'Delete row',
      icon: <Trash size={15} />,
      danger: true,
      disabled: !state.canDeleteRow,
      onSelect: () => editor.chain().focus().deleteRow().run(),
    },
    { type: 'separator', id: 'row-sep-2' },
    {
      id: 'table-select',
      label: 'Select whole table',
      icon: <TableIcon size={15} />,
      onSelect: () => selectWholeTable(editor),
    },
  ]

  const columnEntries: MenuNode[] = [
    {
      id: 'col-left',
      label: 'Insert column left',
      icon: <Plus size={15} />,
      onSelect: () => editor.chain().focus().addColumnBefore().run(),
    },
    {
      id: 'col-right',
      label: 'Insert column right',
      icon: <Plus size={15} />,
      onSelect: () => editor.chain().focus().addColumnAfter().run(),
    },
    { type: 'separator', id: 'col-sep-1' },
    {
      id: 'col-select',
      label: 'Select column',
      icon: <TableIcon size={15} />,
      onSelect: () => selectCurrentColumn(editor),
    },
    {
      id: 'col-delete',
      label: 'Delete column',
      icon: <Trash size={15} />,
      danger: true,
      disabled: !state.canDeleteColumn,
      onSelect: () => editor.chain().focus().deleteColumn().run(),
    },
  ]

  const headerEntries: MenuNode[] = [
    {
      id: 'header-row',
      label: 'Header row',
      icon: <TableIcon size={15} />,
      shortcut: headerRow ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleHeaderRow().run(),
    },
    {
      id: 'header-col',
      label: 'Header column',
      icon: <TableIcon size={15} />,
      shortcut: headerColumn ? '✓' : undefined,
      onSelect: () => editor.chain().focus().toggleHeaderColumn().run(),
    },
    {
      id: 'header-cell',
      label: 'Header cell',
      icon: <TableIcon size={15} />,
      onSelect: () => editor.chain().focus().toggleHeaderCell().run(),
    },
    { type: 'separator', id: 'header-sep' },
    {
      id: 'table-delete',
      label: 'Delete table',
      icon: <Trash size={15} />,
      danger: true,
      onSelect: () => editor.chain().focus().deleteTable().run(),
    },
  ]

  const entries =
    menu?.kind === 'row'
      ? rowEntries
      : menu?.kind === 'column'
        ? columnEntries
        : headerEntries

  return createNotionPortal(
    <>
      <div
        ref={toolbarRef}
        className="table-toolbar popover"
        style={{ top: position.top, left: position.left }}
        role="toolbar"
        aria-label="Table options"
        contentEditable={false}
        onMouseDown={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className="table-toolbar__btn"
          aria-haspopup="menu"
          aria-label="Row options"
          onClick={openMenu('row')}
        >
          <Plus size={14} />
          <span>Row</span>
          <ChevronDown size={11} className="table-toolbar__chevron" />
        </button>
        <button
          type="button"
          className="table-toolbar__btn"
          aria-haspopup="menu"
          aria-label="Column options"
          onClick={openMenu('column')}
        >
          <Plus size={14} />
          <span>Column</span>
          <ChevronDown size={11} className="table-toolbar__chevron" />
        </button>
        <span className="table-toolbar__divider" />
        <button
          type="button"
          className="table-toolbar__btn"
          aria-label="Merge selected cells"
          disabled={!state.canMerge}
          onClick={() => editor.chain().focus().mergeCells().run()}
        >
          <Merge size={14} />
          <span>Merge</span>
        </button>
        <button
          type="button"
          className="table-toolbar__btn"
          aria-label="Split cell"
          disabled={!state.canSplit}
          onClick={() => editor.chain().focus().splitCell().run()}
        >
          <Split size={14} />
          <span>Split</span>
        </button>
        <span className="table-toolbar__divider" />
        <button
          type="button"
          className="table-toolbar__btn"
          aria-haspopup="menu"
          aria-label="Header options"
          onClick={openMenu('header')}
        >
          <TableIcon size={14} />
          <span>Header</span>
          <ChevronDown size={11} className="table-toolbar__chevron" />
        </button>
        <button
          type="button"
          className="table-toolbar__btn table-toolbar__btn--icon table-toolbar__btn--danger"
          aria-label="Delete table"
          data-tooltip="Delete table"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash size={15} />
        </button>
      </div>

      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          width={224}
          entries={entries}
          header={
            <div className="menu__header">
              {menu.kind === 'row'
                ? 'Table row'
                : menu.kind === 'column'
                  ? 'Table column'
                  : 'Headers'}
            </div>
          }
          onClose={() => setMenu(null)}
        />
      )}
    </>)
}
