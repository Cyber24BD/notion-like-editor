import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { stripUploadingImages } from '../../src/editor/images/uploadSerialization'

const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
})

const image = (attrs: Record<string, unknown>): JSONContent => ({
  type: 'image',
  attrs,
})

describe('stripUploadingImages', () => {
  it('removes a new image upload placeholder from persisted content', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        paragraph('before'),
        image({
          src: '',
          alt: 'upload',
          uploadId: 'upload-1',
          uploadState: 'uploading',
          uploadProgress: 45,
          uploadPreview: 'blob:preview',
        }),
      ],
    }

    const result = stripUploadingImages(doc)
    expect(result.content).toHaveLength(1)
    expect(result.content?.[0]).toEqual(paragraph('before'))
  })

  it('keeps the old image while a replacement is in flight', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        image({
          src: 'https://cdn.example.com/old.webp',
          alt: 'old',
          title: 'old',
          width: 75,
          uploadId: 'replace-1',
          uploadState: 'preparing',
          uploadProgress: 0,
          uploadError: null,
          uploadPreview: 'blob:new-preview',
        }),
      ],
    }

    const result = stripUploadingImages(doc)
    expect(result.content).toHaveLength(1)
    expect(result.content?.[0].attrs).toEqual({
      src: 'https://cdn.example.com/old.webp',
      alt: 'old',
      title: 'old',
      width: 75,
    })
  })

  it('leaves normal image content untouched', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        image({
          src: 'https://cdn.example.com/photo.webp',
          alt: 'photo',
        }),
      ],
    }

    expect(stripUploadingImages(doc)).toBe(doc)
  })

  it('removes null defaults left behind by a finished upload', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        image({
          src: 'https://cdn.example.com/final.webp',
          alt: 'final',
          uploadId: null,
          uploadState: null,
          uploadProgress: 0,
          uploadError: null,
          uploadPreview: null,
        }),
      ],
    }

    const result = stripUploadingImages(doc)
    expect(result.content?.[0].attrs).toEqual({
      src: 'https://cdn.example.com/final.webp',
      alt: 'final',
    })
  })

  it('removes transient attrs from nested upload nodes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          content: [
            image({
              src: 'https://cdn.example.com/old.png',
              uploadState: 'error',
              uploadError: 'Nope',
              uploadPreview: 'blob:x',
            }),
          ],
        },
      ],
    }

    const result = stripUploadingImages(doc)
    const nested = result.content?.[0].content?.[0]
    expect(nested?.attrs).toEqual({ src: 'https://cdn.example.com/old.png' })
  })
})
