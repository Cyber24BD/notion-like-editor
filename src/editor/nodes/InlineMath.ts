import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InlineMathView } from '../../components/nodes/InlineMathView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineMath: {
      /**
       * Inserts an inline KaTeX equation at the cursor.
       */
      setInlineMath: (latex: string) => ReturnType
    }
  }
}

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') ?? '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = String(node.attrs.latex ?? '')
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'inline-math',
        'data-latex': latex,
        class: 'math-inline',
      }),
      latex,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathView)
  },

  addCommands() {
    return {
      setInlineMath:
        (latex) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    }
  },
})
