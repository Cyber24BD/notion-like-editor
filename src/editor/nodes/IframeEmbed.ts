import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { IframeEmbedView } from '../../components/nodes/IframeEmbedView'
import type { IframeAttributes } from '../iframe/parseIframe'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframeEmbed: {
      /**
       * Inserts an iframe embed at the current block position.
       */
      setIframeEmbed: (attributes: IframeAttributes) => ReturnType
    }
  }
}

const bool = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback
  if (value === '') return true
  return value === 'true'
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const IframeEmbed = Node.create({
  name: 'iframeEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-src') ?? element.getAttribute('src') ?? '',
      },
      title: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-title') ?? element.getAttribute('title') ?? '',
      },
      width: {
        default: 100,
        parseHTML: (element) =>
          Math.min(
            100,
            Math.max(15, number(element.getAttribute('data-width') ?? element.getAttribute('width'), 100)),
          ),
      },
      height: {
        default: 420,
        parseHTML: (element) =>
          Math.min(
            2000,
            Math.max(120, number(element.getAttribute('data-height') ?? element.getAttribute('height'), 420)),
          ),
      },
      align: {
        default: 'center',
        parseHTML: (element) =>
          element.getAttribute('data-align') ?? element.getAttribute('align') ?? 'center',
      },
      caption: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-caption') ?? element.getAttribute('caption') ?? '',
      },
      allowFullScreen: {
        default: true,
        parseHTML: (element) =>
          bool(
            element.getAttribute('data-allow-fullscreen') ??
              element.getAttribute('allowfullscreen'),
            true,
          ),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="iframe-embed"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as IframeAttributes
    const label = attrs.title || attrs.src
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'iframe-embed',
        'data-src': attrs.src,
        'data-title': attrs.title,
        'data-width': String(attrs.width),
        'data-height': String(attrs.height),
        'data-align': attrs.align,
        'data-caption': attrs.caption,
        'data-allow-fullscreen': String(attrs.allowFullScreen),
      }),
      ['a', { href: attrs.src, target: '_blank', rel: 'noopener noreferrer' }, label],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(IframeEmbedView)
  },

  addCommands() {
    return {
      setIframeEmbed:
        (attributes) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.iframeEmbed?.create(attributes)
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
