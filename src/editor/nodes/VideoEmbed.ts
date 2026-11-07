import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VideoEmbedView } from '../../components/nodes/VideoEmbedView'
import type { VideoAttributes } from '../video/parseVideo'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      /**
       * Inserts a video embed at the current block position.
       */
      setVideoEmbed: (attributes: VideoAttributes) => ReturnType
    }
  }
}

const bool = (value: string | null, fallback: boolean) =>
  value === null ? fallback : value === 'true'

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
      provider: { default: 'file' },
      videoId: { default: '' },
      aspect: { default: '16:9' },
      width: {
        default: 100,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('data-width'))
          return Number.isFinite(value) ? Math.min(100, Math.max(15, value)) : 100
        },
      },
      align: { default: 'center' },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
      },
      start: {
        default: 0,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('data-start'))
          return Number.isFinite(value) && value > 0 ? value : 0
        },
      },
      autoplay: {
        default: false,
        parseHTML: (element) => bool(element.getAttribute('data-autoplay'), false),
      },
      muted: {
        default: false,
        parseHTML: (element) => bool(element.getAttribute('data-muted'), false),
      },
      privacy: {
        default: true,
        parseHTML: (element) => bool(element.getAttribute('data-privacy'), true),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') ?? '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-embed"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as VideoAttributes
    const label = attrs.title || attrs.src
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'video-embed',
        'data-src': attrs.src,
        'data-provider': attrs.provider,
        'data-video-id': attrs.videoId,
        'data-aspect': attrs.aspect,
        'data-width': String(attrs.width),
        'data-align': attrs.align,
        'data-caption': attrs.caption,
        'data-start': String(attrs.start),
        'data-autoplay': String(attrs.autoplay),
        'data-muted': String(attrs.muted),
        'data-privacy': String(attrs.privacy),
        'data-title': attrs.title,
      }),
      ['a', { href: attrs.src, target: '_blank', rel: 'noopener noreferrer' }, label],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView)
  },

  addCommands() {
    return {
      setVideoEmbed:
        (attributes) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.videoEmbed?.create(attributes)
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
