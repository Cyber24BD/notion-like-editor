import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { BookmarkView } from '../../components/nodes/BookmarkView'
import type { BookmarkAttributes } from '../bookmark/metadata'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookmark: {
      /**
       * Inserts a bookmark/link preview card at the current block position.
       */
      setBookmark: (attributes: BookmarkAttributes) => ReturnType
    }
  }
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const Bookmark = Node.create({
  name: 'bookmark',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-url') ?? element.getAttribute('href') ?? '',
      },
      title: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-title') ?? element.getAttribute('title') ?? '',
      },
      description: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-description') ?? '',
      },
      image: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-image') ?? '',
      },
      favicon: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-favicon') ?? '',
      },
      domain: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-domain') ?? '',
      },
      siteName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-site-name') ?? '',
      },
      width: {
        default: 100,
        parseHTML: (element) =>
          Math.min(
            100,
            Math.max(15, number(element.getAttribute('data-width'), 100)),
          ),
      },
      align: {
        default: 'center',
        parseHTML: (element) =>
          element.getAttribute('data-align') ?? element.getAttribute('align') ?? 'center',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as BookmarkAttributes
    const label = attrs.title || attrs.domain || attrs.url
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'bookmark',
        'data-url': attrs.url,
        'data-title': attrs.title,
        'data-description': attrs.description,
        'data-image': attrs.image,
        'data-favicon': attrs.favicon,
        'data-domain': attrs.domain,
        'data-site-name': attrs.siteName,
        'data-width': String(attrs.width),
        'data-align': attrs.align,
      }),
      ['a', { href: attrs.url, target: '_blank', rel: 'noopener noreferrer' }, label],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView)
  },

  addCommands() {
    return {
      setBookmark:
        (attributes) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.bookmark?.create(attributes)
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
