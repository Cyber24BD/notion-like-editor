import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import { Fragment } from '@tiptap/pm/model'
import DragHandle from '@tiptap/extension-drag-handle-react'
import { slashItems } from '../editor/slash/items'
import { slashMenu } from '../editor/slash/menuStore'
import { BlockMenu } from './BlockMenu'
import { Grip, Plus } from './Icons'
import { isBlockRangeSelection, selectBlockRange } from '../editor/nodes/BlockRange'

interface BlockTarget {
  pos: number
  node: PMNode
}

interface BlockHandleProps {
  editor: Editor
}

export function BlockHandle({ editor }: BlockHandleProps) {
  const [target, setTarget] = useState<BlockTarget | null>(null)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const targetRef = useRef<BlockTarget | null>(null)
  const rangeAnchorRef = useRef<number | null>(null)
  const menuOpenRef = useRef(false)
  menuOpenRef.current = menuAt !== null

  const handleNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) => {
      if (!node) return
      const doc = editor.state.doc
      const safePos = Math.max(0, Math.min(pos, doc.content.size))
      const $pos = doc.resolve(safePos)
      const depth = Math.min($pos.depth, 1)
      const blockPos = depth > 0 ? $pos.before(depth) : safePos
      const blockNode = doc.nodeAt(blockPos)
      if (!blockNode) return
      const next = { node: blockNode, pos: blockPos }
      targetRef.current = next
      setTarget(next)
    },
    [editor],
  )

  // The stock drag-handle plugin hides itself on every keydown and can get
  // stuck hidden while hovering the block you just typed in. We take over
  // visibility: show while the pointer is over the editor or the handle.
  useEffect(() => {
    let frame = 0
    let lastEvent: MouseEvent | null = null

    const setVisibility = (visible: boolean) => {
      const element = handleRef.current?.closest('.drag-handle') as HTMLElement | null
      if (element) element.dataset.visible = visible ? 'true' : 'false'
    }

    const evaluate = () => {
      frame = 0
      const event = lastEvent
      if (!event || menuOpenRef.current) return
      const node = event.target as Node
      const overHandle = handleRef.current?.contains(node) ?? false
      const overEditor = editor.view.dom.contains(node)
      if (overHandle) {
        setVisibility(true)
        return
      }
      setVisibility(overEditor && targetRef.current !== null)
    }

    const onPointerMove = (event: MouseEvent) => {
      lastEvent = event
      if (!frame) frame = window.requestAnimationFrame(evaluate)
    }

    const hide = () => {
      if (!menuOpenRef.current) setVisibility(false)
    }

    document.addEventListener('mousemove', onPointerMove, { passive: true })
    document.addEventListener('mousedown', onPointerMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', hide)
    window.addEventListener('blur', hide)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.removeEventListener('mousemove', onPointerMove)
      document.removeEventListener('mousedown', onPointerMove)
      document.documentElement.removeEventListener('mouseleave', hide)
      window.removeEventListener('blur', hide)
    }
  }, [editor])

  const insertBlockBelow = useCallback(() => {
    if (!target) return
    const nodeDOM = editor.view.nodeDOM(target.pos) as HTMLElement | null
    const rect = nodeDOM?.getBoundingClientRect()
    const after = target.pos + target.node.nodeSize

    editor
      .chain()
      .focus()
      .insertContentAt(after, { type: 'paragraph' })
      .setTextSelection(after + 1)
      .run()

    slashMenu.open({
      mode: 'insert',
      items: slashItems,
      rect: rect
        ? new DOMRect(rect.left, rect.top, 1, rect.height)
        : null,
      onSelect: (item) => {
        item.run({ editor, range: null })
        slashMenu.close()
      },
    })
  }, [editor, target])

  const openMenu = useCallback(() => {
    if (!target || draggingRef.current) return
    const rect = handleRef.current?.getBoundingClientRect()
    const selection = editor.state.selection
    const rangeActive =
      isBlockRangeSelection(editor) &&
      selection.from <= target.pos &&
      selection.to >= target.pos + target.node.nodeSize
    if (!rangeActive) {
      editor.chain().focus().setNodeSelection(target.pos).run()
    }
    setMenuAt({ x: (rect?.right ?? 96) + 4, y: rect?.top ?? 96 })
  }, [editor, target])

  const handleGripClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!target) return
    if (event.shiftKey) {
      const anchor = rangeAnchorRef.current ?? editor.state.selection.from
      selectBlockRange(editor, anchor, target.pos)
      return
    }
    rangeAnchorRef.current = target.pos
    openMenu()
  }

  return (
    <>
      <DragHandle
        editor={editor}
        className="drag-handle"
        nested={false}
        onNodeChange={handleNodeChange}
        onElementDragStart={() => {
          draggingRef.current = true
        }}
        onElementDragEnd={() => {
          window.setTimeout(() => {
            draggingRef.current = false
          }, 50)
        }}
      >
        <div ref={handleRef} className="block-handle" contentEditable={false}>
          <button
            type="button"
            className="block-handle__btn"
            data-tooltip="Add block below"
            aria-label="Add a block below"
            onClick={insertBlockBelow}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            className="block-handle__btn block-handle__btn--grip"
            data-tooltip="Drag to move"
            aria-label="Drag or open block options"
            onClick={handleGripClick}
          >
            <Grip size={14} />
          </button>
        </div>
      </DragHandle>

      {menuAt && target && (
        <BlockMenu
          editor={editor}
          target={target}
          x={menuAt.x}
          y={menuAt.y}
          onClose={() => setMenuAt(null)}
        />
      )}
    </>
  )
}

/** Shared block movement used by the handle menu. */
export function moveBlock(editor: Editor, pos: number, node: PMNode, direction: -1 | 1) {
  const { state } = editor
  const doc = state.doc
  const index = doc.resolve(pos).index(0)
  const neighbourIndex = index + direction
  if (neighbourIndex < 0 || neighbourIndex >= doc.childCount) return

  const neighbour = doc.child(neighbourIndex)
  const neighbourPos =
    direction === -1 ? pos - neighbour.nodeSize : pos + node.nodeSize
  const from = Math.min(pos, neighbourPos)
  const to = Math.max(pos + node.nodeSize, neighbourPos + neighbour.nodeSize)

  const fragment =
    direction === -1
      ? Fragment.fromArray([node, neighbour])
      : Fragment.fromArray([neighbour, node])

  const tr = state.tr.replaceWith(from, to, fragment)
  const movedStart = from + (direction === -1 ? 0 : neighbour.nodeSize)
  const selectionPos = Math.min(movedStart, tr.doc.content.size)
  tr.setSelection(NodeSelection.create(tr.doc, selectionPos))
  editor.view.dispatch(tr)
}

/** Selects the inner content of a block so conversions keep the text. */
export function selectBlockContent(editor: Editor, pos: number, node: PMNode) {
  const from = pos + 1
  const to = pos + node.nodeSize - 1
  if (from >= to) return false
  editor.commands.setTextSelection({ from, to })
  return true
}
