import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AudioEmbedView } from '../../components/nodes/AudioEmbedView'
import type { AudioAttributes } from '../audio/parseAudio'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audioEmbed: {
      /**
       * Inserts an audio embed at the current block position.
       */
      setAudioEmbed: (attributes: AudioAttributes) => ReturnType
    }
  }
}

const number = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const AudioEmbed = Node.create({
  name: 'audioEmbed',
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
      provider: {
        default: 'file',
        parseHTML: (element) => element.getAttribute('data-provider') ?? 'file',
      },
      audioId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-audio-id') ?? '',
      },
      title: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-title') ?? element.getAttribute('title') ?? '',
      },
      height: {
        default: 96,
        parseHTML: (element) =>
          Math.max(0, number(element.getAttribute('data-height'), 96)),
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
      caption: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-caption') ?? element.getAttribute('caption') ?? '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audio-embed"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as AudioAttributes
    const label = attrs.title || attrs.src
    const isFile = attrs.provider === 'file'
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'audio-embed',
        'data-src': attrs.src,
        'data-provider': attrs.provider,
        'data-audio-id': attrs.audioId,
        'data-title': attrs.title,
        'data-height': String(attrs.height),
        'data-width': String(attrs.width),
        'data-align': attrs.align,
        'data-caption': attrs.caption,
      }),
      isFile
        ? ['audio', { controls: 'true', src: attrs.src }, label]
        : ['a', { href: attrs.src, target: '_blank', rel: 'noopener noreferrer' }, label],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioEmbedView)
  },

  addCommands() {
    return {
      setAudioEmbed:
        (attributes) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          const node = state.schema.nodes.audioEmbed?.create(attributes)
          if (!node) return false
          if ($from.parent.isTextblock && $from.parent.content.size === 0) {
            return commands.insertContentAt($from.before($from.depth), node)
          }
          return commands.insertContentAt($from.after($from.depth), node)
        },
    }
  },
})
