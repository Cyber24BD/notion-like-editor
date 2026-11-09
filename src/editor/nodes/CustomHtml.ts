import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CustomHtmlView } from '../../components/nodes/CustomHtmlView'

export interface CustomHtmlAttributes {
  html: string
  css: string
  javascript: string
  allowScripts: boolean
  allowForms: boolean
  allowPopups: boolean
  allowNetwork: boolean
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === 'false') return false
  if (value === 'true') return true
  return fallback
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
      allowScripts: {
        default: true,
        parseHTML: (element) =>
          parseBoolean(element.getAttribute('data-allow-scripts'), true),
        renderHTML: (attributes) => ({
          'data-allow-scripts': String(attributes.allowScripts),
        }),
      },
      allowForms: {
        default: true,
        parseHTML: (element) =>
          parseBoolean(element.getAttribute('data-allow-forms'), true),
        renderHTML: (attributes) => ({
          'data-allow-forms': String(attributes.allowForms),
        }),
      },
      allowPopups: {
        default: false,
        parseHTML: (element) =>
          parseBoolean(element.getAttribute('data-allow-popups'), false),
        renderHTML: (attributes) => ({
          'data-allow-popups': String(attributes.allowPopups),
        }),
      },
      allowNetwork: {
        default: true,
        parseHTML: (element) =>
          parseBoolean(element.getAttribute('data-allow-network'), true),
        renderHTML: (attributes) => ({
          'data-allow-network': String(attributes.allowNetwork),
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
        'data-allow-scripts': String(attrs.allowScripts),
        'data-allow-forms': String(attrs.allowForms),
        'data-allow-popups': String(attrs.allowPopups),
        'data-allow-network': String(attrs.allowNetwork),
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
            allowScripts: true,
            allowForms: true,
            allowPopups: false,
            allowNetwork: true,
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
