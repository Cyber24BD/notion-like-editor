import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PageLinkView } from '../../components/nodes/PageLinkView'

export interface PageLinkAttributes {
  pageId: string
  title: string
  icon: string
}

export interface PageReference {
  id: string
  title: string
  icon: string
}

export interface PageLinkStorage {
  createSubPage: ((title: string) => PageReference | null) | null
}

declare module '@tiptap/core' {
  interface Storage {
    pageLink: PageLinkStorage
  }
}

export const PageLink = Node.create({
  name: 'pageLink',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addStorage(): PageLinkStorage {
    return { createSubPage: null }
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: 'Untitled' },
      icon: { default: '📄' },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-type="page-link"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-link',
        class: 'page-link',
        href: '#',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView)
  },
})
