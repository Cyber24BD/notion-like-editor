import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CustomHtmlView } from '../../components/nodes/CustomHtmlView'

export interface CustomHtmlAttributes {
  html: string
  css: string
  javascript: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHtml: {
      setCustomHtml: (attributes: Partial<CustomHtmlAttributes>) => ReturnType
    }
  }
}

export const CustomHtml = Node.create({
  name: 'customHtml',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-html') ?? '',
        renderHTML: (attributes) => ({ 'data-html': attributes.html }),
      },
      css: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-css') ?? '',
        renderHTML: (attributes) => ({ 'data-css': attributes.css }),
      },
      javascript: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-javascript') ?? '',
        renderHTML: (attributes) => ({
          'data-javascript': attributes.javascript,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="custom-html"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as CustomHtmlAttributes
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'custom-html',
        'data-html': attrs.html,
        'data-css': attrs.css,
        'data-javascript': attrs.javascript,
        class: 'custom-html-block',
      }),
      ['p', {}, 'Custom HTML block'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomHtmlView)
  },

  addCommands() {
    return {
      setCustomHtml:
        (attributes = {}) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.customHtml?.create({
            html: '',
            css: '',
            javascript: '',
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
