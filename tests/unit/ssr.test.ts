// @vitest-environment node
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { NotionEditor } from '../../src/components/PageEditor'

const content = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Server rendered body' }],
    },
  ],
}

describe('server rendering', () => {
  it('renders the page shell without warnings or DOM access', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const html = renderToString(
        createElement(NotionEditor, {
          documentId: 'ssr-smoke',
          title: 'SSR smoke test',
          content,
        }),
      )

      expect(html).toContain('notion-editor-root')
      expect(html).toContain('notion-page')
      expect(html).toContain('SSR smoke test')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})
