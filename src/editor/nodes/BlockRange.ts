import { Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { DOMSerializer } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import {
  NodeRangeSelection,
  getNodeRangeDecorations,
  isNodeRangeSelection,
} from '@tiptap/extension-node-range'
import type { Editor } from '@tiptap/core'

interface BlockBounds {
  from: number
  to: number
}

function blockBoundsAt(doc: PMNode, pos: number): BlockBounds | null {
  const safe = Math.max(0, Math.min(pos, doc.content.size))
  const $pos = doc.resolve(safe)
  const depth = Math.min($pos.depth, 1)
  const from = depth > 0 ? $pos.before(depth) : safe
  const node = doc.nodeAt(from)
  if (!node) return null
  return { from, to: from + node.nodeSize }
}

export function isBlockRangeSelection(editor: Editor): boolean {
  return isNodeRangeSelection(editor.state.selection)
}

/** Selects a range of top-level blocks from two block positions. */
export function selectBlockRange(editor: Editor, fromPos: number, toPos: number): boolean {
  const { doc } = editor.state
  const a = blockBoundsAt(doc, fromPos)
  const b = blockBoundsAt(doc, toPos)
  if (!a || !b) return false
  const from = Math.min(a.from, b.from)
  const to = Math.max(a.to, b.to)
  const selection = NodeRangeSelection.create(doc, from, to, 0)
  editor.view.dispatch(editor.state.tr.setSelection(selection))
  clearNativeSelection()
  return true
}

export function clearBlockRange(editor: Editor): boolean {
  const { selection, doc } = editor.state
  if (!isNodeRangeSelection(selection)) return false
  const pos = Math.min(selection.from + 1, doc.content.size)
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.near(doc.resolve(pos))),
  )
  return true
}

export function deleteBlockRange(editor: Editor): boolean {
  const { selection } = editor.state
  const { state } = editor
  if (!isNodeRangeSelection(selection)) return false

  const { from, to } = selection
  let tr = state.tr
  const paragraph = state.schema.nodes.paragraph
  if (from === 0 && to === state.doc.content.size && paragraph) {
    tr = tr.replaceWith(0, to, paragraph.create())
    tr.setSelection(TextSelection.near(tr.doc.resolve(1)))
  } else {
    tr = tr.delete(from, to)
    const pos = Math.min(from + 1, tr.doc.content.size)
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
  }
  editor.view.dispatch(tr.scrollIntoView())
  return true
}

export function duplicateBlockRange(editor: Editor): boolean {
  const { selection } = editor.state
  const { state } = editor
  if (!isNodeRangeSelection(selection)) return false

  const slice = selection.content()
  const insertPos = selection.to
  const tr = state.tr.insert(insertPos, slice.content)
  const end = Math.min(insertPos + slice.content.size, tr.doc.content.size)
  const next = NodeRangeSelection.create(tr.doc, insertPos, end, 0)
  tr.setSelection(next)
  editor.view.dispatch(tr.scrollIntoView())
  return true
}

interface BlockClipboardPayload {
  text: string
  html: string
}

function blockClipboardPayload(editor: Editor): BlockClipboardPayload | null {
  const { selection } = editor.state
  if (!isNodeRangeSelection(selection)) return null

  const slice = selection.content()
  const text = slice.content.textBetween(0, slice.content.size, '\n')
  const serializer = DOMSerializer.fromSchema(editor.state.schema)
  const holder = document.createElement('div')
  holder.appendChild(serializer.serializeFragment(slice.content))
  return { text, html: holder.innerHTML }
}

export async function copyBlockRange(editor: Editor): Promise<boolean> {
  const payload = blockClipboardPayload(editor)
  if (!payload) return false

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([payload.text], { type: 'text/plain' }),
          'text/html': new Blob([payload.html], { type: 'text/html' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(payload.text)
    }
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(payload.text)
      return true
    } catch {
      return false
    }
  }
}

function clearNativeSelection(): void {
  window.requestAnimationFrame(() => {
    window.getSelection()?.removeAllRanges()
  })
}

/**
 * Adds Notion-style block range selection on top of ProseMirror's tabular
 * NodeRangeSelection. The drag-handle extension already understands this
 * selection and moves the whole range as one slice.
 */
export const BlockRange = Extension.create({
  name: 'blockRange',
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => deleteBlockRange(editor),
      Delete: ({ editor }) => deleteBlockRange(editor),
      Escape: ({ editor }) => clearBlockRange(editor),
      'Mod-d': ({ editor }) => duplicateBlockRange(editor),
    }
  },

  addProseMirrorPlugins() {
    let shiftAnchor: number | null = null

    return [
      new Plugin({
        key: new PluginKey('blockRange'),
        props: {
          attributes: (state) =>
            isNodeRangeSelection(state.selection)
              ? { class: 'ProseMirror-noderangeselection' }
              : { class: '' },
          decorations: (state) =>
            isNodeRangeSelection(state.selection)
              ? getNodeRangeDecorations([...state.selection.ranges])
              : null,
          handleDOMEvents: {
            copy: (view, event) => {
              const payload = blockClipboardPayload({
                state: view.state,
              } as Editor)
              if (!payload || !event.clipboardData) return false
              event.clipboardData.setData('text/plain', payload.text)
              event.clipboardData.setData('text/html', payload.html)
              event.preventDefault()
              return true
            },
            mousedown: (view, event) => {
              if (!event.shiftKey || event.button !== 0 || !view.editable) {
                shiftAnchor = null
                return false
              }

              shiftAnchor = view.state.selection.anchor

              const onUp = (upEvent: MouseEvent) => {
                const anchor = shiftAnchor
                shiftAnchor = null
                if (anchor === null) return
                const coords = view.posAtCoords({
                  left: upEvent.clientX,
                  top: upEvent.clientY,
                })
                if (!coords) return

                const a = blockBoundsAt(view.state.doc, anchor)
                const b = blockBoundsAt(view.state.doc, coords.pos)
                if (!a || !b || a.from === b.from) return

                const selection = NodeRangeSelection.create(
                  view.state.doc,
                  Math.min(a.from, b.from),
                  Math.max(a.to, b.to),
                  0,
                )
                view.dispatch(view.state.tr.setSelection(selection))
                clearNativeSelection()
              }

              document.addEventListener('mouseup', onUp, { once: true })
              return false
            },
          },
        },
      }),
    ]
  },
})
