import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockView } from '../../components/nodes/CodeBlockView'
import { lowlight } from '../code/lowlight'

const bool = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback
  if (value === '') return true
  return value === 'true'
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineNumbers: {
        default: false,
        parseHTML: (element) => bool(element.getAttribute('data-line-numbers'), false),
        renderHTML: (attributes) => ({
          'data-line-numbers': String(attributes.lineNumbers),
        }),
      },
      wrap: {
        default: false,
        parseHTML: (element) => bool(element.getAttribute('data-wrap'), false),
        renderHTML: (attributes) => ({
          'data-wrap': String(attributes.wrap),
        }),
      },
      height: {
        default: 420,
        parseHTML: (element) =>
          Math.max(0, number(element.getAttribute('data-height'), 420)),
        renderHTML: (attributes) => ({
          'data-height': String(attributes.height),
        }),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
}).configure({
  lowlight,
  defaultLanguage: null,
  enableTabIndentation: true,
  tabSize: 2,
})
