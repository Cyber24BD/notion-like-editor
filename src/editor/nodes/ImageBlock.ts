import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageBlockView } from '../../components/nodes/ImageBlockView'

export type ImageFrameStyle = 'none' | 'border' | 'rounded' | 'shadow' | 'frame'
export type ImageAlignment = 'left' | 'center' | 'right'

/**
 * Extends the stock image node with Notion-style controls: width, alignment,
 * frame style and a caption. The node type stays `image`, so documents and the
 * slash command keep working unchanged.
 */
export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('data-width'))
          return Number.isFinite(value) ? Math.min(100, Math.max(15, value)) : 100
        },
        renderHTML: (attributes) => ({
          'data-width': String(attributes.width ?? 100),
        }),
      },
      align: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'left',
        renderHTML: (attributes) => ({
          'data-align': String(attributes.align ?? 'left'),
        }),
      },
      frame: {
        default: 'none',
        parseHTML: (element) => element.getAttribute('data-frame') ?? 'none',
        renderHTML: (attributes) => ({
          'data-frame': String(attributes.frame ?? 'none'),
        }),
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: (attributes) => ({
          'data-caption': String(attributes.caption ?? ''),
        }),
      },
      // Transient optimistic-upload state. It is stripped from persisted JSON by
      // stripUploadingImages() and never rendered into HTML.
      uploadId: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      uploadState: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      uploadProgress: {
        default: 0,
        parseHTML: () => 0,
        renderHTML: () => ({}),
      },
      uploadError: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      uploadPreview: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView)
  },
})
