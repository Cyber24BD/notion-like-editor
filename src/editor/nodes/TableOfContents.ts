import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TableOfContentsView } from '../../components/nodes/TableOfContentsView'

export interface TableOfContentsAttributes {
  title: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      /**
       * Inserts a table of contents block at the current block position.
       */
      setTableOfContents: (attributes?: Partial<TableOfContentsAttributes>) => ReturnType
    }
  }
}

export const TableOfContents = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      title: {
        default: 'Table of contents',
        parseHTML: (element) => element.getAttribute('data-title') ?? 'Table of contents',
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="table-of-contents"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = (node.attrs.title as string) || 'Table of contents'
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'table-of-contents',
        'data-title': title,
      }),
      ['span', {}, title],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView)
  },

  addCommands() {
    return {
      setTableOfContents:
        (attributes = {}) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.tableOfContents?.create({
            title: 'Table of contents',
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
