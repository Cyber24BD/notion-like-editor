import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { BlockMathView } from '../../components/nodes/BlockMathView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockMath: {
      /**
       * Inserts a display-mode KaTeX equation at the current block position.
       */
      setBlockMath: (latex: string) => ReturnType
    }
  }
}

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  draggable: true,
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
    return [{ tag: 'div[data-type="block-math"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = String(node.attrs.latex ?? '')
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'block-math',
        'data-latex': latex,
        class: 'math-block',
      }),
      ['span', {}, latex],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockMathView)
  },

  addCommands() {
    return {
      setBlockMath:
        (latex) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.blockMath?.create({ latex })
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
