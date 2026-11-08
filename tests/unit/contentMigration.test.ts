import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import {
  CURRENT_CONTENT_VERSION,
  currentDocument,
  isVersionedContent,
  migrateContent,
  migrateVersionedContent,
} from '../../src/editor/contentMigration'

const legacy: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'numberedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
        },
      ],
    },
    {
      type: 'image',
      attrs: {
        src: 'https://cdn.example.com/old.webp',
        uploadState: 'uploading',
        uploadPreview: 'blob:legacy',
      },
    },
  ],
}

describe('content migrations', () => {
  it('migrates legacy numberedList nodes and strips transient upload attrs', () => {
    const result = migrateContent(legacy, 0)
    expect(result.content?.[0].type).toBe('orderedList')
    expect(result.content?.[1].attrs).toEqual({
      src: 'https://cdn.example.com/old.webp',
    })
  })

  it('treats current raw content as already current', () => {
    const result = migrateContent(legacy, CURRENT_CONTENT_VERSION)
    expect(result).toBe(legacy)
  })

  it('runs custom migrations in order', () => {
    const calls: number[] = []
    const result = migrateContent(
      { type: 'doc', content: [] },
      0,
      2,
      {
        0: (content) => {
          calls.push(0)
          return content
        },
        1: (content) => {
          calls.push(1)
          return content
        },
      },
    )
    expect(calls).toEqual([0, 1])
    expect(result.type).toBe('doc')
  })

  it('migrates a versioned document wrapper', () => {
    const migrated = migrateVersionedContent({ version: 0, content: legacy })
    expect(migrated.version).toBe(CURRENT_CONTENT_VERSION)
    expect(migrated.content.content?.[0].type).toBe('orderedList')
  })

  it('detects and creates versioned wrappers', () => {
    expect(isVersionedContent({ version: 1, content: { type: 'doc' } })).toBe(true)
    expect(isVersionedContent(legacy)).toBe(false)
    expect(currentDocument(legacy)).toEqual({
      version: CURRENT_CONTENT_VERSION,
      content: legacy,
    })
  })
})
