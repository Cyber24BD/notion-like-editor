import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ToggleView } from '../../components/nodes/ToggleView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggle: (attributes?: { open?: boolean }) => ReturnType
    }
  }
}

export const ToggleBlock = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-open') !== 'false',
        renderHTML: (attributes) => ({ 'data-open': String(attributes.open) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'toggle', class: 'toggle-block' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView)
  },

  addCommands() {
    return {
      setToggle:
        (attributes) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: attributes?.open ?? true },
              content: [{ type: 'paragraph' }],
            })
            .run(),
    }
  },
})
