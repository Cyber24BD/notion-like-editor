import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidView } from '../../components/nodes/MermaidView'

export interface MermaidAttributes {
  code: string
  theme: string
  height: number
  caption: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Inserts a Mermaid diagram block at the current block position.
       */
      setMermaid: (attributes: Partial<MermaidAttributes>) => ReturnType
    }
  }
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const Mermaid = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') ?? '',
        renderHTML: (attributes) => ({
          'data-code': attributes.code,
        }),
      },
      theme: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-theme') ?? 'default',
        renderHTML: (attributes) => ({
          'data-theme': attributes.theme,
        }),
      },
      height: {
        default: 0,
        parseHTML: (element) =>
          Math.max(0, number(element.getAttribute('data-height'), 0)),
        renderHTML: (attributes) => ({
          'data-height': String(attributes.height),
        }),
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: (attributes) => ({
          'data-caption': attributes.caption,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as MermaidAttributes
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        'data-code': attrs.code,
        'data-theme': attrs.theme,
        'data-height': String(attrs.height),
        'data-caption': attrs.caption,
        class: 'mermaid-block',
      }),
      ['pre', {}, attrs.code],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView)
  },

  addCommands() {
    return {
      setMermaid:
        (attributes = {}) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.mermaid?.create({
            code: '',
            theme: 'default',
            height: 0,
            caption: '',
            ...attributes,
          })
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
